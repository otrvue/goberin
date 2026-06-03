import transactionRepository from "./repository.js";
import notificationService from "../../../services/notification.service.js";

const transactionService = {
    getTransactions: async (filters) => {
        return await transactionRepository.getTransactions(filters);
    },

    getTransactionById: async (id) => {
        const transaction = await transactionRepository.getTransactionById(id);
        if (!transaction) {
            throw new Error("TRANSACTION_NOT_FOUND");
        }
        return transaction;
    },

    updateTransaction: async (id, data) => {
        const result = await transactionRepository.updateTransaction(id, data);

        // Trigger notifications if status changed to SUCCESS or FAILED manually
        if (data.status === "SUCCESS" || data.status === "FAILED") {
            // We use triggerFromTransaction to handle fetching full details
            await notificationService.triggerFromTransaction(id, data.status, data.sn, data.notes);
        }

        return result;
    }
};

export default transactionService;
