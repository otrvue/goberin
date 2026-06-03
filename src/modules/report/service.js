import reportRepository from "./repository.js";
import trxRepository from "../transaction/repository.js";

const reportService = {
    createReport: async (userId, { transactionId, message }) => {
        // 1. Get Transaction
        const transaction = await trxRepository.getTransactionById(transactionId);
        if (!transaction) {
            throw { status: 404, message: "Transaksi tidak ditemukan", errorCode: "TRANSACTION_NOT_FOUND" };
        }

        // 2. Check Ownership
        if (transaction.userId !== userId) {
            throw { status: 403, message: "Anda tidak memiliki akses ke transaksi ini", errorCode: "FORBIDDEN" };
        }

        // 3. Check Status and Time (Must be PENDING for > 15 minutes)
        if (transaction.status !== "PENDING") {
            throw { status: 400, message: "Hanya transaksi PENDING yang dapat dilaporkan", errorCode: "INVALID_TRANSACTION_STATUS" };
        }

        const createdAt = new Date(transaction.createdAt);
        const now = new Date();
        const diffInMinutes = (now - createdAt) / (1000 * 60);

        if (diffInMinutes < 15) {
            throw {
                status: 400,
                message: `Transaksi baru berjalan ${Math.floor(diffInMinutes)} menit. Mohon tunggu setidaknya 15 menit sebelum melapor.`,
                errorCode: "TOO_EARLY_TO_REPORT"
            };
        }

        // 4. Create Report
        return await reportRepository.create({
            transactionId,
            userId,
            message
        });
    },

    getUserReports: async (userId) => {
        return await reportRepository.findByUserId(userId);
    },

    getAdminReports: async (filters) => {
        return await reportRepository.findAll(filters);
    },

    processReport: async (reportId, { status, keterangan }) => {
        const report = await reportRepository.findById(reportId);
        if (!report) {
            throw { status: 404, message: "Laporan tidak ditemukan", errorCode: "REPORT_NOT_FOUND" };
        }

        return await reportRepository.update(reportId, { status, keterangan });
    }
};

export default reportService;
