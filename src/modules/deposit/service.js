import depositRepository from "./repository.js";
import dompetx from "../../integrations/dompetx/index.js";
import logger from "../../config/logger.js";

const depositService = {
    getPaymentChannels: async () => {
        const settings = await depositRepository.getSettings();
        if (settings.dompetx_status !== "active") {
            throw { status: 400, message: "Metode pembayaran sedang tidak tersedia", errorCode: "PAYMENT_DISABLED" };
        }
        const channels = await dompetx.getPaymentMethods(settings.dompetx_api_key);
        return channels.data;
    },

    createDeposit: async (userId, data) => {
        const settings = await depositRepository.getSettings();
        if (settings.dompetx_status !== "active") {
            throw { status: 400, message: "Pendaftaran deposit sedang dinonaktifkan", errorCode: "PAYMENT_DISABLED" };
        }

        const minDeposit = 10000;
        if (Number(data.amount) < minDeposit) {
            throw {
                status: 400,
                message: `Minimal deposit adalah Rp ${minDeposit.toLocaleString('id-ID')}`,
                errorCode: "MIN_DEPOSIT_LIMIT"
            };
        }

        const reference = `DEP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const expiresAt = new Date(Date.now() + 25 * 60 * 1000); // 25 minutes expiry

        const dompetxData = {
            method: data.method,
            amount: data.amount,
            reference: reference,
            currency: "IDR"
        };

        const response = await dompetx.createTransaction(settings.dompetx_api_key, dompetxData);

        // Wait, the detail might have QR data. The create API returns basic data.
        // Usually, we need the detail to get qrString/qrImage.
        const detail = await dompetx.getTransactionDetail(settings.dompetx_api_key, response.id);

        const deposit = await depositRepository.createDeposit({
            userId,
            externalId: response.id,
            amount: data.amount,
            method: data.method,
            reference: reference,
            status: "PENDING",
            qrData: detail.qrData ? JSON.stringify(detail.qrData) : null,
            paymentData: JSON.stringify(detail),
            expiresAt,
        });

        return deposit;
    },

    handleCallback: async (payload) => {
        const { data, eventType } = payload;
        const deposit = await depositRepository.getDepositByReference(data.reference);

        if (!deposit) {
            logger.warn(`Deposit not found for reference: ${data.reference}`);
            return;
        }

        if (deposit.status !== "PENDING") {
            logger.info(`Deposit ${deposit.reference} already processed with status: ${deposit.status}`);
            return;
        }

        if (data.status === "paid") {
            await depositRepository.updateDeposit(deposit.id, {
                status: "PAID",
                paidAt: new Date()
            }, {
                userId: deposit.userId,
                amount: deposit.amount,
                type: "TOPUP",
                notes: `Deposit via DompetX: ${deposit.reference}`
            });
            logger.info(`Deposit ${deposit.reference} marked as PAID and balance updated.`);
        } else if (data.status === "cancelled") {
            await depositRepository.updateDeposit(deposit.id, { status: "CANCELLED" });
        }
    },

    getUserDeposits: async (userId, { page = 1, limit = 10 }) => {
        const offset = (page - 1) * limit;
        return await depositRepository.getUserDeposits(userId, limit, offset);
    },

    getDepositDetail: async (id) => {
        const deposit = await depositRepository.getDepositById(id);
        if (!deposit) throw { status: 404, message: "Deposit tidak ditemukan" };

        // Check for expiry and auto-cancel on both local DB and DompetX
        if (deposit.status === "PENDING" && new Date(deposit.expiresAt) < new Date()) {
            // Cancel on DompetX
            try {
                const settings = await depositRepository.getSettings();
                await dompetx.cancelTransaction(settings.dompetx_api_key, deposit.externalId);
                logger.info(`Deposit ${deposit.reference} cancelled on DompetX (expired).`);
            } catch (cancelErr) {
                logger.warn(`Failed to cancel deposit ${deposit.reference} on DompetX: ${cancelErr.message}`);
            }
            await depositRepository.updateDeposit(deposit.id, { status: "EXPIRED" });
            deposit.status = "EXPIRED";
        }

        // If paymentData is missing (due to legacy bug), try to sync it now
        if (deposit.status === "PENDING" && !deposit.paymentData) {
            return await depositService.syncDepositStatus(id);
        }

        return deposit;
    },

    syncDepositStatus: async (id) => {
        const deposit = await depositRepository.getDepositById(id);
        if (!deposit) throw { status: 404, message: "Deposit tidak ditemukan" };

        if (deposit.status !== "PENDING") return deposit;

        const settings = await depositRepository.getSettings();
        const detail = await dompetx.getTransactionDetail(settings.dompetx_api_key, deposit.externalId);

        if (detail.status === "paid") {
            await depositRepository.updateDeposit(deposit.id, {
                status: "PAID",
                paymentData: JSON.stringify(detail),
                paidAt: new Date()
            }, {
                userId: deposit.userId,
                amount: deposit.amount,
                type: "TOPUP",
                notes: `Deposit via DompetX (Sync): ${deposit.reference}`
            });
            deposit.status = "PAID";
        } else if (detail.status === "cancelled") {
            await depositRepository.updateDeposit(deposit.id, { status: "CANCELLED", paymentData: JSON.stringify(detail) });
            deposit.status = "CANCELLED";
        } else if (new Date(deposit.expiresAt) < new Date()) {
            // Cancel on DompetX
            try {
                await dompetx.cancelTransaction(settings.dompetx_api_key, deposit.externalId);
                logger.info(`Deposit ${deposit.reference} cancelled on DompetX (expired via sync).`);
            } catch (cancelErr) {
                logger.warn(`Failed to cancel deposit ${deposit.reference} on DompetX: ${cancelErr.message}`);
            }
            await depositRepository.updateDeposit(deposit.id, { status: "EXPIRED", paymentData: JSON.stringify(detail) });
            deposit.status = "EXPIRED";
        } else {
            // Keep status pending but update paymentData to ensure user has info
            await depositRepository.updateDeposit(deposit.id, { paymentData: JSON.stringify(detail) });
        }

        deposit.paymentData = JSON.stringify(detail);
        return deposit;
    }
};

export default depositService;
