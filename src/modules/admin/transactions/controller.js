import transactionService from "./service.js";

const transactionController = {
    getTransactions: async (req, res, next) => {
        try {
            const result = await transactionService.getTransactions(req.query);
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    getTransactionById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await transactionService.getTransactionById(id);
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error.message === "TRANSACTION_NOT_FOUND") {
                return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan" });
            }
            next(error);
        }
    },

    updateTransaction: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await transactionService.updateTransaction(id, req.body);
            return res.status(200).json({
                success: true,
                message: "Transaksi berhasil diperbarui",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
};

export default transactionController;
