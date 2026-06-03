import axios from "axios";
import logger from "../config/logger.js";
import trxRepository from "../modules/transaction/repository.js";

const callbackService = {
    sendCallback: async (transactionId) => {
        try {
            const transaction = await trxRepository.getTransactionWithRelations(transactionId);

            if (!transaction || !transaction.user.callbackUrl) {
                return;
            }

            const payload = {
                id: transaction.id,
                productId: transaction.productId,
                sku: transaction.product.sku,
                customerNo: transaction.customerNo,
                status: transaction.status,
                sn: transaction.sn,
                notes: transaction.notes,
                totalPrice: transaction.totalPrice,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
            };

            // Append query parameters as requested by user
            let finalUrl = transaction.user.callbackUrl;
            try {
                const urlObj = new URL(finalUrl);
                urlObj.searchParams.append("refid", transaction.id);
                urlObj.searchParams.append("message", transaction.notes || transaction.status);
                finalUrl = urlObj.toString();
            } catch (e) {
                logger.warn(`Invalid callback URL for ${transactionId}: ${finalUrl}`);
            }

            logger.info(`Sending outbound callback to ${finalUrl} for transaction ${transactionId}`);

            // Sending callback asynchronously
            axios.post(finalUrl, payload, {
                headers: { "Content-Type": "application/json" },
                timeout: 10000,
            }).catch(err => {
                logger.error(`Outbound callback failed for ${transactionId}: ${err.message}`);
            });

        } catch (error) {
            logger.error(`Error in sendCallback for ${transactionId}: ${error.message}`);
        }
    }
};

export default callbackService;
