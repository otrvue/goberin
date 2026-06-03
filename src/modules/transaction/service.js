import logger from "../../config/logger.js";
import digiflazz from "../../integrations/digiflazz/index.js";
import okeconnect from "../../integrations/okeconnect/index.js";
import h2h from "../../integrations/h2h/index.js";
import bukaolshop from "../../integrations/bukaolshop/index.js";
import trxRepository from "./repository.js";
import userRepository from "../user/repository.js";
import vendorConfigService from "../admin/vendorConfig.service.js";
import outboundCallbackService from "../../services/callback.service.js";
import notificationService from "../../services/notification.service.js";

const pricingEngine = {
    calculateSellingPrice: (product, allMarkups, overrideBasePrice = null) => {
        const basePrice = overrideBasePrice !== null ? Number(overrideBasePrice) : Number(product.basePrice);
        let markupTotal = 0;
        let promoDiscount = 0;

        // Apply relevant markups
        const relevantMarkups = allMarkups.filter(m =>
            m.target === "GLOBAL" ||
            (m.target === "CATEGORY" && m.categoryId === product.categoryId) ||
            (m.target === "PROVIDER" && m.providerId === product.providerId) ||
            (m.target === "PRODUCT" && m.productId === product.id)
        ).sort((a, b) => b.priority - a.priority);

        if (relevantMarkups.length > 0) {
            const m = relevantMarkups[0];
            if (m.type === "FIXED") markupTotal = Number(m.value);
            else markupTotal = basePrice * (Number(m.value) / 100);
        }

        // Apply promo if exists
        const promo = product.promoProducts?.[0]?.promo;
        if (promo && promo.isActive) {
            if (promo.type === "FIXED") promoDiscount = Number(promo.discount);
            else promoDiscount = (basePrice + markupTotal) * (Number(promo.discount) / 100);
        }

        const totalPrice = Math.ceil(basePrice + markupTotal - promoDiscount);
        return {
            basePrice,
            markupPrice: markupTotal,
            promoDiscount,
            totalPrice
        };
    }
};

const trxService = {
    getProducts: async ({ page = 1, limit = 50, categoryId, providerId, type, search }) => {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const filters = {};
        if (categoryId) filters.categoryId = categoryId;
        if (providerId) filters.providerId = providerId;
        if (type) filters.type = type;
        if (search) filters.search = search;

        const [products, total] = await Promise.all([
            trxRepository.getProductsWithRelations(filters, skip, take),
            trxRepository.countProducts(filters)
        ]);

        const allMarkups = await trxRepository.getAllActiveMarkups();

        const formattedProducts = products.map(product => {
            const pricing = pricingEngine.calculateSellingPrice(product, allMarkups);
            return {
                ...product,
                pricing
            };
        });

        return {
            products: formattedProducts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        };
    },

    countProducts: async (params = {}) => {
        const { categoryId, providerId } = params;
        const filters = {};
        if (categoryId) filters.categoryId = categoryId;
        if (providerId) filters.providerId = providerId;

        return await trxRepository.countProducts(filters);
    },

    processPrepaid: async (userId, params) => {
        const { productId, sku, customerNo, nominal } = params;
        const [product, allMarkups] = await Promise.all([
            productId ? trxRepository.getProductById(productId) : trxRepository.getProductBySku(sku),
            trxRepository.getAllActiveMarkups()
        ]);
        if (!product || !product.isActive) throw { status: 400, message: "Produk tidak aktif", errorCode: "PRODUCT_INACTIVE" };

        const pricing = pricingEngine.calculateSellingPrice(product, allMarkups, nominal);

        const transaction = await trxRepository.createTransaction({
            userId,
            productId: product.id,
            customerNo,
            basePrice: pricing.basePrice,
            markupPrice: pricing.markupPrice,
            promoDiscount: pricing.promoDiscount,
            totalPrice: pricing.totalPrice,
            status: "PENDING",
        }, {
            userId,
            amount: -pricing.totalPrice,
            type: "TRANSACTION",
        });

        // Process to Vendor in Background
        (async () => {
            logger.info(`Background Transaction Started (${transaction.id})`);
            try {
                const creds = await vendorConfigService.getCredentials(product.vendor);
                if (product.vendor === "DIGIFLAZZ") {
                    const data = await digiflazz.processTransaction(product.vendorSku, customerNo, transaction.id, creds?.username, creds?.apiKey);
                    const isFailed = data.status?.toLowerCase() === "gagal" || (data.rc && data.rc !== "00" && data.rc !== "03");

                    await trxRepository.updateTransaction(transaction.id, {
                        vendorTrxId: data.ref_id,
                        notes: data.message,
                        status: isFailed ? "FAILED" : (data.status?.toLowerCase() === "sukses" ? "SUCCESS" : "PENDING")
                    });

                    if (isFailed) {
                        await trxRepository.refundTransaction(transaction, "Vendor Fail: " + data.message);
                        await notificationService.triggerFromTransaction(transaction.id, "FAILED", null, data.message);
                        await outboundCallbackService.sendCallback(transaction.id);
                    }
                } else if (product.vendor === "OKECONNECT") {
                    const rawResponse = await okeconnect.processTransaction(product.vendorSku, customerNo, transaction.id, nominal, creds?.memberId, creds?.pin, creds?.password);
                    const { trxId } = okeconnect.parseTrxResponse(rawResponse);
                    await trxRepository.updateTransaction(transaction.id, {
                        vendorTrxId: trxId,
                    });
                } else if (product.vendor === "H2H") {
                    const data = await h2h.processTransaction(product.vendorSku, customerNo, transaction.id, creds?.memberId, creds?.pin, creds?.password, nominal);
                    await trxRepository.updateTransaction(transaction.id, {
                        vendorTrxId: data.invoice,
                        notes: data.message,
                    });
                }
                logger.info(`Background Transaction Success (${transaction.id})`);
            } catch (error) {
                const vendorResponse = error.response?.data;
                const errorMsg = vendorResponse?.data?.message || vendorResponse?.message || error.message || "Vendor Error";
                logger.error(`Background Transaction Error (${transaction.id}):`, {
                    message: errorMsg,
                    vendorResponse,
                    stack: error.stack
                });
                await trxRepository.refundTransaction(transaction, "Vendor Error: " + errorMsg);
                await notificationService.triggerFromTransaction(transaction.id, "FAILED", null, errorMsg);
                await outboundCallbackService.sendCallback(transaction.id);
            }
        })();

        return transaction;
    },

    processPostpaidInquiry: async (userId, params) => {
        const { productId, sku, customerNo } = params;
        const [product, allMarkups] = await Promise.all([
            productId ? trxRepository.getProductById(productId) : trxRepository.getProductBySku(sku),
            trxRepository.getAllActiveMarkups()
        ]);
        if (!product || !product.isActive) throw { status: 400, message: "Produk tidak aktif", errorCode: "PRODUCT_INACTIVE" };

        let pricingProduct = product;
        if (product.vendor === "H2H" || product.vendor === "OKECONNECT" || product.vendor === "DIGIFLAZZ") {
            const payProduct = await trxRepository.findRelatedPaymentProduct(product.providerId);
            if (payProduct) {
                pricingProduct = payProduct;
            }
        }

        const pricing = pricingEngine.calculateSellingPrice(pricingProduct, allMarkups);
        const deductionPricing = product.vendor === "DIGIFLAZZ" ? { basePrice: 0, markupPrice: 0, promoDiscount: 0, totalPrice: 0 } : pricingEngine.calculateSellingPrice(product, allMarkups);

        // Check for existing successful inquiry first to avoid redundant vendor calls
        const lastInquiry = await trxRepository.findLastSuccessfulInquiry(userId, product.id, customerNo);
        if (lastInquiry && lastInquiry.notes) {
            const inquiryAge = (new Date() - new Date(lastInquiry.createdAt)) / (1000 * 60);
            if (inquiryAge < 10) {
                try {
                    const data = (function () {
                        try { return JSON.parse(lastInquiry.notes); } catch (e) { return {}; }
                    })();

                    const sn = lastInquiry.sn || "";
                    const ttagMatch = sn.match(/TTAG:(\d+)/);
                    const snTotal = ttagMatch ? parseInt(ttagMatch[1]) : 0;

                    const vendorAdmin = (product.vendor === "H2H" ? (data.admin_fee || 0) : (data.admin || 0));
                    const vendorPrice = (product.vendor === "H2H" ? data.bill_amount : data.price);

                    let billAmount = 0;
                    if (vendorPrice !== undefined && vendorPrice !== null) {
                        billAmount = Number(vendorPrice);
                    } else {
                        // Fallback: Try to get from SN (Unified or Raw)
                        const profit = Number(pricing.totalPrice);
                        if (snTotal > profit + 1000) {
                            billAmount = snTotal - vendorAdmin - profit;
                        } else {
                            billAmount = snTotal - vendorAdmin;
                        }
                    }

                    const userAdmin = vendorAdmin + pricing.totalPrice;
                    const userTotal = billAmount + userAdmin;

                    return {
                        customerName: data.customer_name,
                        adminFee: userAdmin,
                        billAmount: billAmount,
                        totalVendor: billAmount + vendorAdmin,
                        markupPrice: pricing.markupPrice,
                        promoDiscount: pricing.promoDiscount,
                        totalPrice: userTotal,
                        refId: lastInquiry.id,
                        customerNo: customerNo,
                        period: data.period,
                        expiredAt: data.expired_at,
                        inquiryId: product.vendor === "H2H" ? data.inquiry_id : undefined,
                        desc: data.desc,
                        fromCache: true
                    };
                } catch (e) {
                    logger.warn("Failed to parse cached inquiry notes");
                }
            }
        }

        if (product.vendor === "DIGIFLAZZ") {
            const transaction = await trxRepository.createTransaction({
                userId,
                productId: product.id,
                customerNo,
                basePrice: 0,
                markupPrice: 0,
                promoDiscount: 0,
                totalPrice: 0,
                status: "PENDING",
                notes: "Inquiry Request",
            }, {
                userId,
                amount: 0,
                type: "TRANSACTION",
            });

            try {
                const creds = await vendorConfigService.getCredentials("DIGIFLAZZ");
                const data = await digiflazz.postpaidInquiry(product.vendorSku, customerNo, transaction.id, creds?.username, creds?.apiKey);
                const userAdmin = (data.admin || 0) + pricing.totalPrice;
                const billAmount = data.price;
                const userTotal = billAmount + userAdmin;

                await trxRepository.updateTransaction(transaction.id, {
                    vendorTrxId: data.ref_id,
                    sn: `TTAG:${userTotal}`,
                    status: "SUCCESS",
                    notes: JSON.stringify(data),
                });

                return {
                    customerName: data.customer_name,
                    adminFee: userAdmin,
                    billAmount: data.price,
                    totalVendor: data.price + (data.admin || 0),
                    markupPrice: pricing.markupPrice,
                    promoDiscount: pricing.promoDiscount,
                    totalPrice: userTotal,
                    refId: transaction.id,
                    customerNo: customerNo,
                    desc: data.desc
                };
            } catch (error) {
                await trxRepository.updateTransaction(transaction.id, { status: "FAILED", notes: error.message });
                logger.error("DigiFlazz Inquiry Error:", error.response?.data || error.message);
                throw { status: 500, message: "Gagal melakukan inquiry ke DigiFlazz", errorCode: "INQUIRY_ERROR" };
            }
        } else if (product.vendor === "OKECONNECT") {
            const transaction = await trxRepository.createTransaction({
                userId,
                productId: product.id,
                customerNo,
                basePrice: deductionPricing.basePrice,
                markupPrice: deductionPricing.markupPrice,
                promoDiscount: deductionPricing.promoDiscount,
                totalPrice: deductionPricing.totalPrice,
                status: "PENDING",
                notes: "Inquiry Request",
            }, {
                userId,
                amount: -deductionPricing.totalPrice,
                type: "TRANSACTION",
            });

            try {
                const creds = await vendorConfigService.getCredentials("OKECONNECT");
                const rawResponse = await okeconnect.processTransaction(product.vendorSku, customerNo, transaction.id, null, creds?.memberId, creds?.pin, creds?.password);
                const { trxId } = okeconnect.parseTrxResponse(rawResponse);
                await trxRepository.updateTransaction(transaction.id, { vendorTrxId: trxId });

                return {
                    success: true,
                    message: "Permintaan cek tagihan dikirim. Mohon tunggu callback.",
                    transactionId: transaction.id,
                };
            } catch (error) {
                await trxRepository.updateTransaction(transaction.id, { status: "FAILED", notes: error.message });
                throw { status: 500, message: "Gagal mengirim inquiry ke OkeConnect", errorCode: "INQUIRY_ERROR" };
            }
        } else if (product.vendor === "H2H") {
            const transaction = await trxRepository.createTransaction({
                userId,
                productId: product.id,
                customerNo,
                basePrice: deductionPricing.basePrice,
                markupPrice: deductionPricing.markupPrice,
                promoDiscount: deductionPricing.promoDiscount,
                totalPrice: deductionPricing.totalPrice,
                status: "PENDING",
                notes: "Inquiry Request",
            }, {
                userId,
                amount: -deductionPricing.totalPrice,
                type: "TRANSACTION",
            });

            try {
                const creds = await vendorConfigService.getCredentials("H2H");
                const data = await h2h.billInquiry(product.vendorSku, customerNo, transaction.id, creds?.memberId, creds?.pin, creds?.password);
                const userAdmin = (data.admin_fee || 0) + pricing.totalPrice;
                const billAmount = data.bill_amount;
                const userTotal = billAmount + userAdmin;

                const savedData = { ...data };
                delete savedData.payment_code;
                delete savedData.product_code;

                await trxRepository.updateTransaction(transaction.id, {
                    vendorTrxId: data.inquiry_id,
                    sn: `TTAG:${userTotal}`,
                    status: "SUCCESS",
                    notes: JSON.stringify(savedData),
                });

                return {
                    customerName: data.customer_name,
                    adminFee: userAdmin,
                    billAmount: data.bill_amount,
                    totalVendor: data.total_amount,
                    markupPrice: pricing.markupPrice,
                    promoDiscount: pricing.promoDiscount,
                    totalPrice: userTotal,
                    refId: transaction.id,
                    period: data.period,
                    expiredAt: data.expired_at,
                    customerNo: data.customer_no,
                    inquiryId: data.inquiry_id
                };
            } catch (error) {
                await trxRepository.updateTransaction(transaction.id, { status: "FAILED", notes: error.message });
                logger.error("H2H.id Inquiry Error:", error.message);
                throw { status: 500, message: "Gagal melakukan inquiry ke H2H.id", errorCode: "INQUIRY_ERROR" };
            }
        }
    },

    processPostpaidPay: async (userId, params) => {
        const { productId, sku, customerNo } = params;
        const [product, allMarkups] = await Promise.all([
            productId ? trxRepository.getProductById(productId) : trxRepository.getProductBySku(sku),
            trxRepository.getAllActiveMarkups()
        ]);
        if (!product || !product.isActive) throw { status: 400, message: "Produk tidak aktif", errorCode: "PRODUCT_INACTIVE" };

        let pricing;
        let inquiryId = params.inquiryId;

        // Enforce Inquiry for all vendors
        if (product.vendor === "OKECONNECT" || product.vendor === "H2H" || product.vendor === "DIGIFLAZZ") {
            const lastInquiry = await trxRepository.findLastSuccessfulInquiry(userId, product.id, customerNo);
            const inquiryAge = lastInquiry ? (new Date() - new Date(lastInquiry.createdAt)) / (1000 * 60) : 999;

            if (!lastInquiry || inquiryAge > 10) {
                throw {
                    status: 400,
                    message: "Data tagihan kedaluwarsa atau tidak ditemukan. Silakan lakukan Inquiry (Cek Tagihan) terlebih dahulu.",
                    errorCode: "INQUIRY_NEEDED"
                };
            }

            // Extract bill amount from SN: TTAG:10000
            const sn = lastInquiry.sn || "";
            const ttagMatch = sn.match(/TTAG:(\d+)/);
            if (!ttagMatch) {
                throw { status: 500, message: "Gagal membaca nominal tagihan dari data Inquiry", errorCode: "INVALID_INQUIRY_DATA" };
            }

            const billAmount = parseInt(ttagMatch[1]);

            let pricingProduct = product;
            if (product.vendor === "H2H" || product.vendor === "OKECONNECT" || product.vendor === "DIGIFLAZZ") {
                const payProduct = await trxRepository.findRelatedPaymentProduct(product.providerId);
                if (payProduct) {
                    pricingProduct = payProduct;
                }
            }

            const calc = pricingEngine.calculateSellingPrice(pricingProduct, allMarkups);

            // Try to extract real vendor total from inquiry notes JSON to be robust
            let vendorTotal = 0;
            try {
                const data = JSON.parse(lastInquiry.notes);
                if (product.vendor === "H2H") {
                    vendorTotal = data.total_amount || data.bill_amount + (data.admin_fee || 0);
                } else {
                    vendorTotal = (data.price || 0) + (data.admin || 0);
                }
            } catch (e) {
                // Fallback to reverse-calculating from the unified SN total
                vendorTotal = billAmount - Number(calc.totalPrice);
            }

            // Ensure vendorTotal is not 0 if the fallback failed or JSON was partially valid but and empty
            if (!vendorTotal || vendorTotal <= 0) {
                vendorTotal = billAmount - Number(calc.totalPrice);
            }

            pricing = {
                basePrice: vendorTotal,
                markupPrice: calc.markupPrice,
                promoDiscount: calc.promoDiscount,
                totalPrice: billAmount, // Use the total shown in inquiry/SN
            };

            // For H2H, use vendorTrxId from inquiry as inquiryId if not provided
            if (product.vendor === "H2H" && !inquiryId) {
                inquiryId = lastInquiry.vendorTrxId;
            }
        } else {
            pricing = pricingEngine.calculateSellingPrice(product, allMarkups);
        }

        const transaction = await trxRepository.createTransaction({
            userId,
            productId: product.id,
            customerNo,
            basePrice: pricing.basePrice,
            markupPrice: pricing.markupPrice,
            promoDiscount: pricing.promoDiscount,
            totalPrice: pricing.totalPrice,
            status: "PENDING",
            notes: "Postpaid Payment",
        }, {
            userId,
            amount: -pricing.totalPrice,
            type: "TRANSACTION",
        });

        // Process to Vendor in Background
        (async () => {
            logger.info(`Background Postpaid Started (${transaction.id})`);
            try {
                const creds = await vendorConfigService.getCredentials(product.vendor);
                if (product.vendor === "DIGIFLAZZ") {
                    let data;
                    if (product.type === "POSTPAID") {
                        data = await digiflazz.postpaidPayment(product.vendorSku, customerNo, transaction.id, creds?.username, creds?.apiKey);
                    } else {
                        data = await digiflazz.processTransaction(product.vendorSku, customerNo, transaction.id, creds?.username, creds?.apiKey);
                    }

                    const isFailed = data.status?.toLowerCase() === "gagal" || (data.rc && data.rc !== "00" && data.rc !== "03");

                    await trxRepository.updateTransaction(transaction.id, {
                        vendorTrxId: data.ref_id,
                        notes: data.message,
                        status: isFailed ? "FAILED" : (data.status?.toLowerCase() === "sukses" ? "SUCCESS" : "PENDING")
                    });

                    if (isFailed) {
                        await trxRepository.refundTransaction(transaction, "Vendor Fail: " + data.message);
                        await notificationService.triggerFromTransaction(transaction.id, "FAILED", null, data.message);
                        await outboundCallbackService.sendCallback(transaction.id);
                    }
                } else if (product.vendor === "OKECONNECT") {
                    const rawResponse = await okeconnect.processTransaction(product.vendorSku, customerNo, transaction.id, null, creds?.memberId, creds?.pin, creds?.password);
                    const { trxId } = okeconnect.parseTrxResponse(rawResponse);
                    await trxRepository.updateTransaction(transaction.id, {
                        vendorTrxId: trxId,
                    });
                } else if (product.vendor === "H2H") {
                    const data = await h2h.processTransaction(product.vendorSku, customerNo, transaction.id, creds?.memberId, creds?.pin, creds?.password, null, inquiryId);
                    await trxRepository.updateTransaction(transaction.id, {
                        vendorTrxId: data.invoice,
                        notes: data.message,
                    });
                }
                logger.info(`Background Postpaid Success (${transaction.id})`);
            } catch (error) {
                const vendorResponse = error.response?.data;
                const errorMsg = vendorResponse?.data?.message || vendorResponse?.message || error.message || "Vendor Error";
                logger.error(`Background Postpaid Error (${transaction.id}):`, {
                    message: errorMsg,
                    vendorResponse,
                    stack: error.stack
                });
                await trxRepository.refundTransaction(transaction, "Vendor Error: " + errorMsg);
                await notificationService.triggerFromTransaction(transaction.id, "FAILED", null, errorMsg);
                await outboundCallbackService.sendCallback(transaction.id);
            }
        })();

        return transaction;
    },

    getHistory: async (userId, filters = {}, limit = 50, page = 1) => {
        return await trxRepository.getUserTransactions(userId, filters, limit, page);
    },

    processBukaOlshopTransaction: async (userId, params) => {
        const { productId, sku, customerNo, tokenUser, idUser, pin, nominal } = params;

        const partner = await userRepository.findById(userId);
        if (!partner.bukaolshopApiKey || !partner.bukaolshopToken) {
            throw { status: 400, message: "Konfigurasi BukaOlshop belum lengkap", errorCode: "BUKAOLSHOP_CONFIG_MISSING" };
        }

        const [product, allMarkups] = await Promise.all([
            productId ? trxRepository.getProductById(productId) : trxRepository.getProductBySku(sku),
            trxRepository.getAllActiveMarkups()
        ]);

        if (!product || !product.isActive) throw { status: 400, message: "Produk tidak aktif", errorCode: "PRODUCT_INACTIVE" };

        let pricing;

        if (product.type === "POSTPAID") {
            const lastInquiry = await trxRepository.findLastSuccessfulInquiry(userId, product.id, customerNo);
            if (!lastInquiry) {
                throw { status: 400, message: "Inquiry needed", errorCode: "INQUIRY_NEEDED" };
            }
            const sn = lastInquiry.sn || "";
            const ttagMatch = sn.match(/TTAG:(\d+)/);
            const billAmount = ttagMatch ? parseInt(ttagMatch[1]) : 0;
            const calc = pricingEngine.calculateSellingPrice(product, allMarkups);
            pricing = {
                basePrice: billAmount - Number(calc.totalPrice),
                markupPrice: calc.markupPrice,
                promoDiscount: calc.promoDiscount,
                totalPrice: billAmount,
            };
        } else {
            pricing = pricingEngine.calculateSellingPrice(product, allMarkups, nominal);
        }

        const boUser = await bukaolshop.getUserInfo(partner.bukaolshopApiKey, partner.bukaolshopToken, tokenUser, idUser);
        if (Number(boUser.jumlah_saldo) < pricing.totalPrice) {
            throw { status: 400, message: `Saldo BukaOlshop user tidak cukup. Butuh RP ${pricing.totalPrice}`, errorCode: "INSUFFICIENT_BO_BALANCE" };
        }

        const deductParams = {
            id_user: idUser,
            tipe: "kurang",
            jumlah: pricing.totalPrice,
            catatan_saldo: `Pembelian ${product.name} - ${customerNo}`,
            notifikasi: true,
            judul_notifikasi: "Transaksi Diproses",
            pesan_notifikasi: `Pesanan ${product.name} sebesar Rp ${pricing.totalPrice} sedang diproses.`
        };
        if (pin) deductParams.pin = pin;

        await bukaolshop.updateBalance(partner.bukaolshopApiKey, deductParams);

        const transaction = await trxRepository.createTransaction({
            userId,
            productId: product.id,
            customerNo,
            basePrice: pricing.basePrice,
            markupPrice: pricing.markupPrice,
            promoDiscount: pricing.promoDiscount,
            totalPrice: pricing.totalPrice,
            status: "PENDING",
            bukaolshopIdUser: idUser,
            bukaolshopTokenUser: tokenUser,
        }, {
            userId,
            amount: -pricing.totalPrice,
            type: "TRANSACTION",
            notes: `BukaOlshop: ${idUser} - ${product.name}`
        });

        // Background Processing
        (async () => {
            logger.info(`Background BukaOlshop Transaction Started (${transaction.id})`);
            try {
                const creds = await vendorConfigService.getCredentials(product.vendor);
                if (product.vendor === "DIGIFLAZZ") {
                    let data;
                    if (product.type === "POSTPAID") {
                        data = await digiflazz.postpaidPayment(product.vendorSku, customerNo, transaction.id, creds?.username, creds?.apiKey);
                    } else {
                        data = await digiflazz.processTransaction(product.vendorSku, customerNo, transaction.id, creds?.username, creds?.apiKey);
                    }

                    const isFailed = data.status?.toLowerCase() === "gagal" || (data.rc && data.rc !== "00" && data.rc !== "03");

                    await trxRepository.updateTransaction(transaction.id, {
                        vendorTrxId: data.ref_id,
                        notes: data.message,
                        status: isFailed ? "FAILED" : (data.status?.toLowerCase() === "sukses" ? "SUCCESS" : "PENDING")
                    });

                    if (isFailed) {
                        await trxRepository.refundTransaction(transaction, "Vendor Fail: " + data.message);
                        const refundParams = {
                            id_user: idUser,
                            tipe: "tambah",
                            jumlah: pricing.totalPrice,
                            catatan_saldo: `Refund: ${data.message}`,
                            notifikasi: true,
                            judul_notifikasi: "Transaksi Gagal",
                            pesan_notifikasi: `Pesanan ${product.name} gagal: ${data.message}. Saldo dikembalikan.`
                        };
                        if (pin) refundParams.pin = pin;
                        await bukaolshop.updateBalance(partner.bukaolshopApiKey, refundParams);
                        await notificationService.triggerFromTransaction(transaction.id, "FAILED", null, data.message);
                        await outboundCallbackService.sendCallback(transaction.id);
                    }
                } else if (product.vendor === "OKECONNECT") {
                    const rawResponse = await okeconnect.processTransaction(product.vendorSku, customerNo, transaction.id, nominal, creds?.memberId, creds?.pin, creds?.password);
                    const { trxId } = okeconnect.parseTrxResponse(rawResponse);
                    await trxRepository.updateTransaction(transaction.id, { vendorTrxId: trxId, notes: "Processing" });
                } else if (product.vendor === "H2H") {
                    const data = await h2h.processTransaction(product.vendorSku, customerNo, transaction.id, creds?.memberId, creds?.pin, creds?.password, nominal);
                    await trxRepository.updateTransaction(transaction.id, { vendorTrxId: data.invoice, notes: data.message });
                }
                logger.info(`Background BukaOlshop Transaction Success (${transaction.id})`);
            } catch (error) {
                const vendorResponse = error.response?.data;
                const errorMsg = vendorResponse?.data?.message || vendorResponse?.message || error.message || "Vendor Error";
                logger.error(`Background BukaOlshop Transaction Error (${transaction.id}):`, errorMsg);

                await trxRepository.refundTransaction(transaction, "Vendor Error: " + errorMsg);
                const refundParams = {
                    id_user: idUser,
                    tipe: "tambah",
                    jumlah: pricing.totalPrice,
                    catatan_saldo: `Refund: ${errorMsg}`,
                    notifikasi: true,
                    judul_notifikasi: "Transaksi Gagal",
                    pesan_notifikasi: `Pesanan ${product.name} gagal: ${errorMsg}. Saldo dikembalikan.`
                };
                if (pin) refundParams.pin = pin;

                try {
                    await bukaolshop.updateBalance(partner.bukaolshopApiKey, refundParams);
                } catch (refundError) {
                    logger.error(`Failed to refund BukaOlshop user (${idUser}) for transaction ${transaction.id}:`, refundError.message);
                }
                await notificationService.triggerFromTransaction(transaction.id, "FAILED", null, errorMsg);
                await outboundCallbackService.sendCallback(transaction.id);
            }
        })();

        return transaction;
    },

    getTransactionStatus: async (userId, transactionId) => {
        const transaction = await trxRepository.getTransactionById(transactionId);
        if (!transaction) throw { status: 404, message: "Transaksi tidak ditemukan", errorCode: "TRANSACTION_NOT_FOUND" };
        if (transaction.userId !== userId) throw { status: 403, message: "Akses ditolak", errorCode: "FORBIDDEN" };

        return {
            id: transaction.id,
            status: transaction.status,
            sn: transaction.sn,
            notes: transaction.notes,
            updatedAt: transaction.updatedAt
        };
    },

    getCategories: async () => {
        return await trxRepository.getCategories();
    },

    getProviders: async (categoryId) => {
        return await trxRepository.getProviders(categoryId);
    }
};

export default trxService;
export { pricingEngine };
