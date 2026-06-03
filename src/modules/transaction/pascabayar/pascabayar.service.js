import DigiflazzPascabayarProvider from "./providers/digiflazz.pascabayar.provider.js";
import OkeconnectPascabayarProvider from "./providers/okeconnect.pascabayar.provider.js";
import H2hPascabayarProvider from "./providers/h2h.pascabayar.provider.js";
import { normalizePascabayarRequest, validatePascabayarProduct } from "./pascabayar.validator.js";
import pascabayarRepository, { parseMetadata } from "./pascabayar.repository.js";
import { applyPricingToCheckData, calculatePascabayarPricing } from "./pascabayar.pricing.js";
import { buildPascabayarNote } from "./pascabayar.notes.js";
import { buildFrontendBillData } from "./pascabayar.mapper.js";

const PROVIDERS = {
    DIGIFLAZZ: DigiflazzPascabayarProvider,
    OKECONNECT: OkeconnectPascabayarProvider,
    H2H: H2hPascabayarProvider
};

const createSimpleError = (message, code = "BAD_REQUEST", status = "PROVIDER_ERROR") => ({
    success: false,
    status,
    message,
    error: {
        code,
        message
    }
});

const pickProvider = (vendor) => PROVIDERS[vendor];

const buildMetadata = ({ product, request, transactionId, providerResponse, pricing, stage, override = {} }) => ({
    flow: "PASCABAYAR_UNIFIED",
    stage,
    productId: product.id,
    sku: product.sku,
    vendor: product.vendor,
    vendorSku: product.vendorSku,
    providerInquiryId: override.providerInquiryId || providerResponse?.data?.providerTransactionId || null,
    providerTransactionId: override.providerTransactionId || providerResponse?.data?.providerTransactionId || null,
    providerRefId: override.providerRefId || request.referenceId,
    providerPaymentRefId: override.providerPaymentRefId || null,
    customerNo: request.customerNo,
    transactionId,
    billData: providerResponse?.data ? {
        customerName: providerResponse.data.customerName,
        productName: providerResponse.data.productName,
        billAmount: providerResponse.data.billAmount,
        adminFee: providerResponse.data.adminFee,
        totalAmount: providerResponse.data.totalAmount,
        period: providerResponse.data.period,
        dueDate: providerResponse.data.dueDate,
        detail: providerResponse.data.detail,
        providerStatus: providerResponse.data.providerStatus
    } : null,
    pricing: pricing ? {
        providerTotal: pricing.providerTotal,
        markupAmount: pricing.markupAmount,
        totalAmount: pricing.totalAmount,
        markupType: pricing.markupType,
        markupValue: pricing.markupValue
    } : null,
    providerResponse: providerResponse?.raw || null
});

const normalizeCheckDataFromMetadata = (product, metadata) => {
    const billData = metadata.billData || {};
    return applyPricingToCheckData(product, {
        customerName: billData.customerName,
        productName: billData.productName,
        billAmount: billData.billAmount,
        adminFee: billData.adminFee,
        totalAmount: billData.totalAmount,
        period: billData.period,
        dueDate: billData.dueDate,
        detail: {
            ...(billData.detail || {}),
            providerStatus: billData.providerStatus,
            providerInquiryId: metadata.providerInquiryId,
            providerTransactionId: metadata.providerTransactionId,
            providerRefId: metadata.providerRefId
        }
    });
};

const buildExistingInquiryResponse = async (transaction, product, metadata) => {
    const normalized = metadata.billData ? normalizeCheckDataFromMetadata(product, metadata) : undefined;
    const data = normalized ? buildFrontendBillData({
        status: transaction.status || "PENDING",
        billData: normalized,
        notes: transaction.notes
    }) : undefined;

    return {
        success: true,
        status: "DUPLICATE_REFERENCE_ID",
        transactionId: transaction.id,
        inquiryId: metadata.providerInquiryId || metadata.providerRefId,
        message: "referenceId sudah digunakan, mengembalikan data transaksi yang sudah ada",
        data
    };
};

const loadTransactionContext = async (userId, transactionId) => {
    const transaction = await pascabayarRepository.getTransactionById(transactionId);
    if (!transaction) {
        return { error: createSimpleError("Transaksi tidak ditemukan", "TRANSACTION_NOT_FOUND", "NOT_FOUND") };
    }

    if (transaction.userId !== userId) {
        return { error: createSimpleError("Akses ditolak", "FORBIDDEN", "PROVIDER_ERROR") };
    }

    const product = await pascabayarRepository.getProductBySku(transaction.product?.sku);
    if (!product) {
        return { error: createSimpleError("Produk transaksi tidak ditemukan", "PRODUCT_NOT_FOUND", "INVALID_PRODUCT") };
    }

    return {
        transaction,
        product,
        metadata: parseMetadata(transaction.metadata)
    };
};

const PascabayarTransactionService = {
    inquiry: async (payload) => {
        const request = normalizePascabayarRequest(payload);
        const validation = await validatePascabayarProduct({ action: "INQUIRY", request });

        if (validation.error) {
            return validation.error;
        }

        const product = validation.product;
        const existingTransaction = await pascabayarRepository.findLatestByReferenceId(request.referenceId);
        if (existingTransaction) {
            const existingProduct = await pascabayarRepository.getProductBySku(existingTransaction.product?.sku || request.sku);
            const existingMetadata = parseMetadata(existingTransaction.metadata);
            return await buildExistingInquiryResponse(existingTransaction, existingProduct || product, existingMetadata);
        }

        const provider = pickProvider(product.vendor);
        if (!provider?.inquiry) {
            return createSimpleError(`Provider ${product.vendor} belum memiliki handler inquiry`, "PROVIDER_HANDLER_MISSING");
        }

        if (product.vendor === "OKECONNECT") {
            const initialPricing = calculatePascabayarPricing(product, {});
            const initialMetadata = buildMetadata({
                product,
                request,
                pricing: initialPricing,
                stage: "INQUIRY_PENDING_CALLBACK",
                override: {
                    providerRefId: request.referenceId
                }
            });
            const transaction = await pascabayarRepository.createInquiryTransaction({
                userId: payload.userId,
                product,
                request,
                pricing: initialPricing,
                metadata: initialMetadata
            });
            const currentBalance = await pascabayarRepository.getUserBalance(payload.userId);

            const providerResponse = await provider.inquiry({ request, product });
            const vendorTrxId = providerResponse.data?.providerTransactionId || request.referenceId;
            await pascabayarRepository.updateTransaction(transaction.id, {
                vendorTrxId,
                notes: buildPascabayarNote({
                    transaction: { ...transaction, vendorTrxId },
                    product,
                    status: "PENDING",
                    message: providerResponse.message || "transaksi sedang di proses biller",
                    balance: currentBalance
                }),
                metadata: {
                    ...initialMetadata,
                    transactionId: transaction.id,
                    providerTransactionId: providerResponse.data?.providerTransactionId || null,
                    providerResponse: providerResponse.raw || null
                }
            });

            if (!providerResponse.success && providerResponse.status !== "PENDING") {
                await pascabayarRepository.updateTransaction(transaction.id, {
                    status: providerResponse.status,
                    notes: providerResponse.message
                });
                return providerResponse;
            }

            return {
                success: true,
                status: "PENDING",
                transactionId: transaction.id,
                inquiryId: request.referenceId,
                message: "Inquiry berhasil, menunggu callback provider",
                data: buildFrontendBillData({
                    status: "PENDING",
                    billData: {},
                    notes: buildPascabayarNote({
                        transaction: { ...transaction, vendorTrxId },
                        product,
                        status: "PENDING",
                        message: providerResponse.message || "transaksi sedang di proses biller",
                        balance: currentBalance
                    })
                })
            };
        }

        const providerResponse = await provider.inquiry({ request, product });
        if (!providerResponse.success && providerResponse.status !== "PENDING") {
            return providerResponse;
        }

        const pricing = calculatePascabayarPricing(product, {
            billAmount: providerResponse.data?.billAmount,
            adminFee: providerResponse.data?.adminFee,
            totalAmount: providerResponse.data?.totalAmount
        });

        const transaction = await pascabayarRepository.createInquiryTransaction({
            userId: payload.userId,
            product,
            request,
            pricing,
            metadata: buildMetadata({
                product,
                request,
                providerResponse,
                pricing,
                stage: product.vendor === "OKECONNECT" ? "INQUIRY_PENDING_CALLBACK" : "INQUIRY_COMPLETED"
            })
        });

        const metadata = buildMetadata({
            product,
            request,
            transactionId: transaction.id,
            providerResponse,
            pricing,
            stage: product.vendor === "OKECONNECT" ? "INQUIRY_PENDING_CALLBACK" : "INQUIRY_COMPLETED"
        });
        const currentBalance = await pascabayarRepository.getUserBalance(payload.userId);

        await pascabayarRepository.updateTransaction(transaction.id, {
            vendorTrxId: metadata.providerInquiryId || metadata.providerTransactionId || metadata.providerRefId,
            metadata,
            notes: buildPascabayarNote({
                transaction: {
                    ...transaction,
                    vendorTrxId: metadata.providerInquiryId || metadata.providerTransactionId || metadata.providerRefId
                },
                product,
                status: "PENDING",
                message: providerResponse.message || "transaksi sedang di proses biller",
                balance: currentBalance
            })
        });

        return {
            success: true,
            status: "PENDING",
            transactionId: transaction.id,
            inquiryId: metadata.providerInquiryId || metadata.providerRefId,
            message: "Inquiry berhasil",
            data: buildFrontendBillData({
                status: "PENDING",
                billData: normalizeCheckDataFromMetadata(product, metadata),
                notes: buildPascabayarNote({
                    transaction: {
                        ...transaction,
                        vendorTrxId: metadata.providerInquiryId || metadata.providerTransactionId || metadata.providerRefId
                    },
                    product,
                    status: "PENDING",
                    message: providerResponse.message || "transaksi sedang di proses biller",
                    balance: currentBalance
                })
            })
        };
    },

    check: async ({ userId, transactionId }) => {
        const context = await loadTransactionContext(userId, transactionId);
        if (context.error) {
            return context.error;
        }

        const { transaction, product, metadata } = context;
        const provider = pickProvider(product.vendor);

        if (!metadata.stage || metadata.stage === "INQUIRY_PENDING_CALLBACK" || metadata.stage === "INQUIRY_COMPLETED") {
            if (!metadata.billData) {
                return {
                    success: true,
                    status: "PENDING",
                    transactionId: transaction.id,
                    message: "Menunggu data tagihan dari provider",
                    data: buildFrontendBillData({
                        status: "PENDING",
                        billData: {},
                        notes: transaction.notes
                    })
                };
            }

            const normalized = normalizeCheckDataFromMetadata(product, metadata);

            return {
                success: true,
                status: transaction.status || "PENDING",
                transactionId: transaction.id,
                data: buildFrontendBillData({
                    status: transaction.status || "PENDING",
                    billData: normalized,
                    notes: transaction.notes
                })
            };
        }

        const providerRefId = metadata.providerPaymentRefId || metadata.providerRefId;
        const providerResponse = await provider.check({
            request: {
                customerNo: transaction.customerNo,
                sku: product.sku,
                referenceId: providerRefId,
                metadata
            },
            product
        });

        const responseData = providerResponse.data
            ? applyPricingToCheckData(product, providerResponse.data)
            : undefined;

        await pascabayarRepository.updateTransaction(transaction.id, {
            status: providerResponse.status,
            vendorTrxId: providerResponse.data?.providerTransactionId || transaction.vendorTrxId,
            metadata: {
                ...metadata,
                providerTransactionId: providerResponse.data?.providerTransactionId || metadata.providerTransactionId,
                paymentStatus: providerResponse.status,
                billData: responseData || metadata.billData
            },
            notes: providerResponse.message
        });

        return {
            success: providerResponse.success,
            status: providerResponse.status,
            transactionId: transaction.id,
            data: buildFrontendBillData({
                status: providerResponse.status,
                billData: responseData || {},
                notes: providerResponse.message || transaction.notes
            }),
            message: providerResponse.message
        };
    },

    payment: async ({ userId, transactionId }) => {
        const context = await loadTransactionContext(userId, transactionId);
        if (context.error) {
            return context.error;
        }

        const { transaction, product, metadata } = context;
        const provider = pickProvider(product.vendor);

        if (!metadata.billData && product.vendor !== "OKECONNECT") {
            return createSimpleError("Inquiry belum lengkap atau data tagihan belum tersedia", "INQUIRY_NOT_READY");
        }

        if (product.vendor === "OKECONNECT" && !metadata.billData && metadata.stage === "INQUIRY_PENDING_CALLBACK") {
            return createSimpleError("Masih menunggu callback inquiry dari OKECONNECT", "INQUIRY_PENDING_CALLBACK");
        }

        const providerPaymentRefId = metadata.providerPaymentRefId || transaction.id;
        const providerResponse = await provider.payment({
            request: {
                customerNo: transaction.customerNo,
                sku: product.sku,
                referenceId: providerPaymentRefId,
                metadata: {
                    ...metadata,
                    inquiryId: metadata.providerInquiryId
                }
            },
            product
        });

        const responseData = providerResponse.data
            ? applyPricingToCheckData(product, providerResponse.data)
            : normalizeCheckDataFromMetadata(product, metadata);

        await pascabayarRepository.updateTransaction(transaction.id, {
            status: providerResponse.status,
            vendorTrxId: providerResponse.data?.providerTransactionId || transaction.vendorTrxId,
            basePrice: Number(responseData?.detail?.providerTotal || transaction.basePrice || 0),
            markupPrice: Number(responseData?.detail?.markupAmount || transaction.markupPrice || 0),
            totalPrice: Number(responseData?.totalAmount || transaction.totalPrice || 0),
            metadata: {
                ...metadata,
                stage: "PAYMENT_REQUESTED",
                providerPaymentRefId,
                providerTransactionId: providerResponse.data?.providerTransactionId || metadata.providerTransactionId,
                paymentStatus: providerResponse.status,
                billData: responseData || metadata.billData
            },
            notes: providerResponse.message
        });

        return {
            success: providerResponse.success,
            status: providerResponse.status,
            transactionId: transaction.id,
            message: providerResponse.status === "SUCCESS" ? "Pembayaran berhasil" : providerResponse.message || "Pembayaran diproses",
            data: buildFrontendBillData({
                status: providerResponse.status,
                billData: responseData || {},
                notes: providerResponse.message || transaction.notes
            })
        };
    }
};

export default PascabayarTransactionService;
