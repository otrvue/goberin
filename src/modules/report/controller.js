import reportService from "./service.js";
import { z } from "zod";

const createReportSchema = z.object({
    transactionId: z.string().uuid().or(z.string().min(1)),
    message: z.string().min(5).max(1000),
});

const processReportSchema = z.object({
    status: z.enum(["PENDING", "PROCESSED", "REJECTED"]),
    keterangan: z.string().min(1).max(2000),
});

const reportController = {
    createReport: async (req, res, next) => {
        try {
            const validatedData = createReportSchema.parse(req.body);
            const result = await reportService.createReport(req.user.id, validatedData);
            return res.status(201).json({
                success: true,
                message: "Laporan berhasil dikirim",
                data: result
            });
        } catch (error) {
            if (error.name === "ZodError") {
                return res.status(400).json({ success: false, message: "Validation Error", data: error.errors });
            }
            next(error);
        }
    },

    getUserReports: async (req, res, next) => {
        try {
            const result = await reportService.getUserReports(req.user.id);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getAdminReports: async (req, res, next) => {
        try {
            const { status, page, limit } = req.query;
            const result = await reportService.getAdminReports({ status, page, limit });
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    processReport: async (req, res, next) => {
        try {
            const { id } = req.params;
            const validatedData = processReportSchema.parse(req.body);
            const result = await reportService.processReport(id, validatedData);
            return res.status(200).json({
                success: true,
                message: "Laporan berhasil diproses",
                data: result
            });
        } catch (error) {
            if (error.name === "ZodError") {
                return res.status(400).json({ success: false, message: "Validation Error", data: error.errors });
            }
            next(error);
        }
    }
};

export default reportController;
