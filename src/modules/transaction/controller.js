import trxService from "./service.js";
import { z } from "zod";

const prepaidSchema = z.object({
    productId: z.string().uuid().optional(),
    sku: z.string().optional(),
    customerNo: z.string().min(5),
    nominal: z.number().positive().optional(),
}).refine(data => data.productId || data.sku, {
    message: "Either productId or sku must be provided",
    path: ["productId"]
});

const postpaidInquirySchema = z.object({
    productId: z.string().uuid().optional(),
    sku: z.string().optional(),
    customerNo: z.string().min(5),
}).refine(data => data.productId || data.sku, {
    message: "Either productId or sku must be provided",
    path: ["productId"]
});

const bukaolshopSchema = z.object({
    productId: z.string().uuid().optional(),
    sku: z.string().optional(),
    customerNo: z.string().min(5),
    tokenUser: z.string(),
    idUser: z.string(),
    pin: z.string().optional(),
    nominal: z.number().positive().optional(),
}).refine(data => data.productId || data.sku, {
    message: "Either productId or sku must be provided",
    path: ["productId"]
});

const trxController = {
    getProducts: async (req, res, next) => {
        try {
            const { page, limit, categoryId, providerId, search } = req.query;
            const result = await trxService.getProducts({ page, limit, categoryId, providerId, search });
            return res.status(200).json({
                success: true,
                data: result.products,
                pagination: result.pagination
            });
        } catch (error) {
            next(error);
        }
    },

    prepaid: async (req, res, next) => {
        try {
            const validatedData = prepaidSchema.parse(req.body);
            const result = await trxService.processPrepaid(req.user.id, validatedData);
            return res.status(200).json({
                success: true,
                message: "Transaksi prabayar sedang diproses",
                data: result,
            });
        } catch (error) {
            if (error.name === "ZodError") {
                return res.status(400).json({ success: false, message: "Validation Error", data: error.errors });
            }
            next(error);
        }
    },

    postpaidInquiry: async (req, res, next) => {
        try {
            const validatedData = postpaidInquirySchema.parse(req.body);
            const result = await trxService.processPostpaidInquiry(req.user.id, validatedData);
            return res.status(200).json({
                success: true,
                message: "Inquiry pascabayar berhasil",
                data: result,
            });
        } catch (error) {
            if (error.name === "ZodError") {
                return res.status(400).json({ success: false, message: "Validation Error", data: error.errors });
            }
            next(error);
        }
    },

    postpaidPay: async (req, res, next) => {
        try {
            const validatedData = postpaidInquirySchema.parse(req.body);
            const result = await trxService.processPostpaidPay(req.user.id, validatedData);
            return res.status(200).json({
                success: true,
                message: "Pembayaran pascabayar sedang diproses",
                data: result,
            });
        } catch (error) {
            if (error.name === "ZodError") {
                return res.status(400).json({ success: false, message: "Validation Error", data: error.errors });
            }
            next(error);
        }
    },

    getHistory: async (req, res, next) => {
        try {
            const { idUser, tokenUser, limit = 50, page = 1, status, search } = req.query;
            const result = await trxService.getHistory(req.user.id, { idUser, tokenUser, status, search }, Number(limit), Number(page));
            return res.status(200).json({
                success: true,
                data: result.items,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                }
            });
        } catch (error) {
            next(error);
        }
    },

    getStatus: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await trxService.getTransactionStatus(req.user.id, id);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },

    bukaolshopTransaction: async (req, res, next) => {
        try {
            const validatedData = bukaolshopSchema.parse(req.body);
            const result = await trxService.processBukaOlshopTransaction(req.user.id, validatedData);

            return res.status(200).json({
                success: true,
                message: "Transaksi BukaOlshop sedang diproses",
                data: result,
            });
        } catch (error) {
            if (error.name === "ZodError") {
                return res.status(400).json({ success: false, message: "Validation Error", data: error.errors });
            }
            next(error);
        }
    },

    getCategories: async (req, res, next) => {
        try {
            const result = await trxService.getCategories();
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },

    getProviders: async (req, res, next) => {
        try {
            const { categoryId } = req.query;
            const result = await trxService.getProviders(categoryId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },
};

export default trxController;
