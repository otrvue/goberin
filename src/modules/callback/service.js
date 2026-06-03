import trxRepository from "../transaction/repository.js";
import logger from "../../config/logger.js";
import digiflazz from "../../integrations/digiflazz/index.js";
import okeconnect from "../../integrations/okeconnect/index.js";
import vendorConfigService from "../admin/vendorConfig.service.js";
import outboundCallbackService from "../../services/callback.service.js";
import notificationService from "../../services/notification.service.js";
import userRepository from "../user/repository.js";
import pascabayarRepository, { parseMetadata } from "../transaction/pascabayar/pascabayar.repository.js";
import { applyPricingToCheckData, calculatePascabayarPricing } from "../transaction/pascabayar/pascabayar.pricing.js";
import { buildPascabayarNote } from "../transaction/pascabayar/pascabayar.notes.js";

// Inline pricing engine similar to transaction/service.js
const pricingEngine = {
    calculateSellingPrice: (product, allMarkups, overrideBasePrice = null) => {
        const basePrice = overrideBasePrice !== null ? Number(overrideBasePrice) : Number(product.basePrice);
        let markupTotal = 0;
        let discountTotal = 0;

        const productMarkups = allMarkups.filter(m =>
            (m.productId === product.id) ||
            (m.providerId === product.providerId && !m.productId) ||
            (!m.providerId && !m.productId)
        );

        productMarkups.forEach(markup => {
            if (markup.type === 'MARKUP') {
                markupTotal += Number(markup.amount);
            } else if (markup.type === 'DISCOUNT') {
                discountTotal += Number(markup.amount);
            }
        });

        return {
            basePrice,
            markupPrice: markupTotal,
            promoDiscount: discountTotal,
            totalPrice: basePrice + markupTotal - discountTotal
        };
    }
};

const cleanMessage = (message) => {
    if (!message) return "";
    // Remove "Saldo X.XXX" or "Saldo: X.XXX" pattern
    return message.replace(/\.?\s*Saldo[:\s]*[\d.,]+/gi, "").trim();
};

const loadTransactionByProviderRef = async (providerRef) => {
    let transaction = await trxRepository.getTransactionById(providerRef);
    if (transaction) {
        transaction.metadata = parseMetadata(transaction.metadata);
        return transaction;
    }

    transaction = await pascabayarRepository.findByProviderReference(providerRef);
    return transaction;
};

const isUnifiedPascabayar = (transaction) => {
    const metadata = parseMetadata(transaction.metadata);
    return metadata.flow === "PASCABAYAR_UNIFIED";
};

const updateUnifiedInquiryMetadata = async (transaction, partialBillData, extra = {}) => {
    const product = await trxRepository.getProductById(transaction.productId);
    const metadata = parseMetadata(transaction.metadata);
    const mergedBillData = {
        ...(metadata.billData || {}),
        ...partialBillData
    };
    const pricing = calculatePascabayarPricing(product, {
        billAmount: mergedBillData.billAmount,
        adminFee: mergedBillData.adminFee,
        totalAmount: mergedBillData.totalAmount
    });
    const normalizedBillData = applyPricingToCheckData(product, mergedBillData);
    const balance = await pascabayarRepository.getUserBalance(transaction.userId);
    const nextStatus = metadata.stage === "PAYMENT_REQUESTED" ? (extra.status || transaction.status) : "PENDING";
    const note = buildPascabayarNote({
        transaction: {
            ...transaction,
            vendorTrxId: extra.providerTransactionId || metadata.providerTransactionId || transaction.vendorTrxId
        },
        product,
        status: nextStatus,
        message: extra.notes || transaction.notes,
        balance
    });

    await trxRepository.updateTransaction(transaction.id, {
        status: nextStatus,
        vendorTrxId: extra.providerTransactionId || metadata.providerTransactionId || transaction.vendorTrxId,
        basePrice: pricing.providerTotal,
        markupPrice: pricing.markupAmount,
        totalPrice: pricing.totalAmount,
        notes: note,
        metadata: JSON.stringify({
            ...metadata,
            stage: metadata.stage === "PAYMENT_REQUESTED" ? "PAYMENT_COMPLETED" : "INQUIRY_COMPLETED",
            providerInquiryId: extra.providerInquiryId || metadata.providerInquiryId,
            providerTransactionId: extra.providerTransactionId || metadata.providerTransactionId,
            paymentStatus: extra.status || metadata.paymentStatus,
            billData: normalizedBillData,
            pricing: {
                providerTotal: pricing.providerTotal,
                markupAmount: pricing.markupAmount,
                totalAmount: pricing.totalAmount,
                markupType: pricing.markupType,
                markupValue: pricing.markupValue
            }
        })
    });
};

const callbackService = {
    handleDigiflazz: async (payload, signature = null) => {
        const creds = await vendorConfigService.getCredentials("DIGIFLAZZ");
        const data = digiflazz.parseCallback(payload, creds?.webhookId, creds?.webhookSecret, signature);
        if (!data) return;

        if (data.type === "PING") {
            logger.info(`DigiFlazz Ping Event Received: hook_id=${data.hookId}, url=${data.url}`);
            return;
        }

        if (data.type !== "TRANSACTION") return;

        const transaction = await loadTransactionByProviderRef(data.ref_id);
        if (!transaction) {
            logger.warn(`DigiFlazz Callback: Transaction ${data.ref_id} not found`);
            return;
        }

        // Idempotency check
        if (transaction.status === "SUCCESS" || transaction.status === "REFUNDED") return;

        const user = await userRepository.findById(transaction.userId);
        const unifiedPascabayar = isUnifiedPascabayar(transaction);

        if (data.status === "SUCCESS") {
            const cleanedNotes = cleanMessage(data.message) || "Success";
            if (unifiedPascabayar) {
                await updateUnifiedInquiryMetadata(transaction, {}, {
                    status: "SUCCESS",
                    providerTransactionId: data.ref_id,
                    notes: cleanedNotes
                });
                await trxRepository.updateTransaction(transaction.id, {
                    sn: data.sn || ""
                });
            } else {
                await trxRepository.updateTransaction(transaction.id, {
                    status: "SUCCESS",
                    sn: data.sn || "",
                    notes: cleanedNotes,
                });
            }
            await notificationService.sendAllNotifications(user, transaction, "SUCCESS", data.sn, cleanedNotes);
        } else if (data.status === "FAILED") {
            const cleanedNotes = cleanMessage(data.message) || "Failed from vendor";
            if (unifiedPascabayar) {
                const balance = await pascabayarRepository.getUserBalance(transaction.userId);
                const product = await trxRepository.getProductById(transaction.productId);
                await trxRepository.updateTransaction(transaction.id, {
                    status: "FAILED",
                    notes: buildPascabayarNote({
                        transaction,
                        product,
                        status: "FAILED",
                        message: cleanedNotes,
                        balance
                    }),
                    metadata: JSON.stringify({
                        ...parseMetadata(transaction.metadata),
                        paymentStatus: "FAILED",
                        stage: "PAYMENT_COMPLETED"
                    })
                });
            } else {
                await trxRepository.refundTransaction(transaction, cleanedNotes);
            }
            await notificationService.sendAllNotifications(user, transaction, "FAILED", null, cleanedNotes);
        }

        // Trigger outbound callback to partner
        outboundCallbackService.sendCallback(transaction.id);
    },

    handleOkeconnect: async (query) => {
        const data = okeconnect.parseCallback(query);
        if (!data) return;

        const transaction = await loadTransactionByProviderRef(data.ref_id);
        if (!transaction) {
            logger.warn(`OkeConnect Callback: Transaction ${data.ref_id} not found`);
            return;
        }

        // Idempotency check
        if (transaction.status === "SUCCESS" || transaction.status === "REFUNDED") return;

        const user = await userRepository.findById(transaction.userId);
        const unifiedPascabayar = isUnifiedPascabayar(transaction);
        const metadata = parseMetadata(transaction.metadata);

        if (data.status === "SUCCESS") {
            const cleanedNotes = cleanMessage(data.message) || "Success";
            let snValue = data.sn;

            if (unifiedPascabayar && metadata.stage !== "PAYMENT_REQUESTED") {
                const amountMatch = data.message.match(/TAG:(\d+)/i) || data.message.match(/Sebesar\s+Rp\.?\s*([\d\.]+)/i);
                const adminMatch = data.message.match(/ADMIN?:?(\d+)/i);
                const billAmount = amountMatch ? Number(amountMatch[1].replace(/\./g, "")) : 0;
                const adminFee = adminMatch ? Number(adminMatch[1].replace(/\./g, "")) : 0;

                await updateUnifiedInquiryMetadata(transaction, {
                    customerName: metadata.billData?.customerName || null,
                    productName: transaction.product?.name,
                    billAmount,
                    adminFee,
                    totalAmount: billAmount + adminFee,
                    detail: {
                        message: cleanedNotes
                    },
                    providerStatus: "PENDING"
                }, {
                    providerInquiryId: metadata.providerInquiryId || data.ref_id,
                    providerTransactionId: metadata.providerTransactionId || data.ref_id,
                    notes: cleanedNotes
                });

                outboundCallbackService.sendCallback(transaction.id);
                return;
            }

            // If it was an inquiry request, try to extract amount and save in TTAG format for caching
            if (transaction.notes === "Inquiry Request") {
                const amountMatch = data.message.match(/TAG:(\d+)/i) || data.message.match(/Sebesar\s+Rp\.\s+([\d\.]+)/i);
                const adminMatch = data.message.match(/ADMIN?:(\d+)/i);

                if (amountMatch) {
                    const amount = amountMatch[1].replace(/\./g, "");
                    const admin = adminMatch ? adminMatch[1] : "0";
                    const vendorTotal = parseInt(amount) + parseInt(admin);
                    let userTotal = vendorTotal;
                    try {
                        const product = await trxRepository.getProductById(transaction.productId);
                        if (product) {
                            const payProduct = await trxRepository.findRelatedPaymentProduct(product.providerId);
                            const pricingProduct = payProduct || product;
                            const allMarkups = await trxRepository.getMarkups({ userId: transaction.userId });
                            const pricing = pricingEngine.calculateSellingPrice(pricingProduct, allMarkups);
                            userTotal = vendorTotal + (pricing.totalPrice || 0);
                        }
                    } catch (err) {
                        logger.error("Error calculating unified SN in callback:", err);
                    }
                    snValue = `TTAG:${userTotal}`;

                    // Store structured data for caching
                    await trxRepository.updateTransaction(transaction.id, {
                        status: "SUCCESS",
                        sn: snValue,
                        notes: JSON.stringify({
                            price: parseInt(amount),
                            admin: parseInt(admin),
                            customer_name: data.customer_name || null,
                            message: cleanedNotes
                        }),
                    });
                } else {
                    if (unifiedPascabayar) {
                        await updateUnifiedInquiryMetadata(transaction, metadata.billData || {}, {
                            status: "SUCCESS",
                            providerTransactionId: metadata.providerTransactionId || data.ref_id,
                            notes: cleanedNotes
                        });
                        await trxRepository.updateTransaction(transaction.id, {
                            sn: snValue,
                        });
                    } else {
                        await trxRepository.updateTransaction(transaction.id, {
                            status: "SUCCESS",
                            sn: snValue,
                            notes: cleanedNotes,
                        });
                    }
                }
            } else {
                if (unifiedPascabayar) {
                    await updateUnifiedInquiryMetadata(transaction, metadata.billData || {}, {
                        status: "SUCCESS",
                        providerTransactionId: metadata.providerTransactionId || data.ref_id,
                        notes: cleanedNotes
                    });
                    await trxRepository.updateTransaction(transaction.id, {
                        sn: snValue,
                    });
                } else {
                    await trxRepository.updateTransaction(transaction.id, {
                        status: "SUCCESS",
                        sn: snValue,
                        notes: cleanedNotes,
                    });
                }
            }
            await notificationService.sendAllNotifications(user, transaction, "SUCCESS", snValue, cleanedNotes);
        } else if (data.status === "FAILED") {
            const cleanedNotes = cleanMessage(data.message) || "Failed from vendor";
            if (unifiedPascabayar) {
                const balance = await pascabayarRepository.getUserBalance(transaction.userId);
                const product = await trxRepository.getProductById(transaction.productId);
                await trxRepository.updateTransaction(transaction.id, {
                    status: "FAILED",
                    notes: buildPascabayarNote({
                        transaction,
                        product,
                        status: "FAILED",
                        message: cleanedNotes,
                        balance
                    }),
                    metadata: JSON.stringify({
                        ...metadata,
                        paymentStatus: "FAILED",
                        stage: metadata.stage === "PAYMENT_REQUESTED" ? "PAYMENT_COMPLETED" : metadata.stage
                    })
                });
            } else {
                await trxRepository.refundTransaction(transaction, cleanedNotes);
            }
            await notificationService.sendAllNotifications(user, transaction, "FAILED", null, cleanedNotes);
        }

        // Trigger outbound callback to partner
        outboundCallbackService.sendCallback(transaction.id);
    },

    handleH2h: async (payload) => {
        logger.info("Received H2H Callback Raw: " + JSON.stringify(payload));
        const refId = payload.refID || payload.ref_id || payload.refid;
        const status = payload.transaction_status || payload.status;
        let sn = payload.serial_number || payload.sn;
        const message = payload.message || payload.status_description || payload.keterangan;

        // Try to extract SN from message if missing
        if (!sn && message) {
            const snMatch = message.match(/SN\/Ref:\s*(.+?)(?=\.?\s*Saldo|$)/i);
            if (snMatch) sn = snMatch[1].trim();
        }

        if (!refId) {
            logger.warn("H2H Callback missing refID/ref_id");
            return;
        }

        const transaction = await loadTransactionByProviderRef(refId);
        if (!transaction) {
            logger.warn(`H2H.id Callback: Transaction ${refId} not found`);
            return;
        }

        // Idempotency check
        if (transaction.status === "SUCCESS" || transaction.status === "REFUNDED") return;

        const user = await userRepository.findById(transaction.userId);
        const unifiedPascabayar = isUnifiedPascabayar(transaction);
        const metadata = parseMetadata(transaction.metadata);

        let isSuccess = ["success", "completed"].includes(status?.toLowerCase());
        let isFailed = ["failed", "rejected"].includes(status?.toLowerCase());

        // fallback if status field is missing but mentioned in message
        if (!isSuccess && !isFailed && message) {
            const msgLower = message.toLowerCase();
            if (msgLower.includes("sukses")) isSuccess = true;
            if (msgLower.includes("gagal")) isFailed = true;
        }

        if (isSuccess) {
            if (unifiedPascabayar) {
                await updateUnifiedInquiryMetadata(transaction, metadata.billData || {}, {
                    status: "SUCCESS",
                    providerTransactionId: payload.invoice || metadata.providerTransactionId,
                    notes: cleanMessage(message) || "Success"
                });
                await trxRepository.updateTransaction(transaction.id, {
                    sn: sn || "",
                });
            } else {
                await trxRepository.updateTransaction(transaction.id, {
                    status: "SUCCESS",
                    sn: sn || "",
                    notes: cleanMessage(message) || "Success",
                });
            }
            await notificationService.sendAllNotifications(user, transaction, "SUCCESS", sn, cleanMessage(message));
        } else if (isFailed) {
            const cleanedNotes = cleanMessage(message) || "Failed from vendor";
            if (unifiedPascabayar) {
                const balance = await pascabayarRepository.getUserBalance(transaction.userId);
                const product = await trxRepository.getProductById(transaction.productId);
                await trxRepository.updateTransaction(transaction.id, {
                    status: "FAILED",
                    notes: buildPascabayarNote({
                        transaction,
                        product,
                        status: "FAILED",
                        message: cleanedNotes,
                        balance
                    }),
                    metadata: JSON.stringify({
                        ...metadata,
                        paymentStatus: "FAILED",
                        stage: metadata.stage === "PAYMENT_REQUESTED" ? "PAYMENT_COMPLETED" : metadata.stage
                    })
                });
            } else {
                await trxRepository.refundTransaction(transaction, cleanedNotes);
            }
            await notificationService.sendAllNotifications(user, transaction, "FAILED", null, cleanedNotes);
        }

        // Trigger outbound callback to partner
        logger.info(`Triggering outbound callback for H2H transaction ${transaction.id}`);
        outboundCallbackService.sendCallback(transaction.id);
    }
};

export default callbackService;
