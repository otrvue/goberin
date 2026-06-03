import pool from "../config/db.js";
import logger from "../config/logger.js";
import telegramService from "./telegram.service.js";
import bukaolshop from "../integrations/bukaolshop/index.js";
import userRepository from "../modules/user/repository.js";

const notificationService = {
    sendAllNotifications: async (user, transaction, status, sn, note) => {
        // 1. Send Telegram Notification to Partner
        try {
            await telegramService.sendNotification(user, {
                ...transaction,
                sn,
                note
            }, status);
        } catch (e) {
            logger.error(`Telegram Notif Error: ${e.message}`);
        }

        // 2. Send BukaOlshop Notification to End User
        if (transaction.bukaolshopIdUser && user.bukaolshopApiKey) {
            try {
                if (status === "SUCCESS") {
                    const title = user.boNotifSuccessTitle || "Transaksi Berhasil";
                    const message = (user.boNotifSuccessMessage || "Pesanan Pesanan Anda sukses! SN: {{sn}}")
                        .replace(/{{sn}}/g, sn || "-")
                        .replace(/{{productName}}/g, transaction.productName || "Produk");

                    await bukaolshop.sendNotification(user.bukaolshopApiKey, transaction.bukaolshopIdUser, title, message);
                } else if (status === "FAILED") {
                    const title = user.boNotifFailedTitle || "Transaksi Gagal";
                    const message = (user.boNotifFailedMessage || "Pesanan Gagal: {{note}}. Saldo dikembalikan.")
                        .replace(/{{note}}/g, note || "Kegagalan vendor")
                        .replace(/{{productName}}/g, transaction.productName || "Produk");

                    await bukaolshop.updateBalance(user.bukaolshopApiKey, {
                        id_user: transaction.bukaolshopIdUser,
                        tipe: "tambah",
                        jumlah: transaction.totalPrice,
                        catatan_saldo: `Refund: ${note || "Gagal dari vendor"}`,
                        notifikasi: true,
                        judul_notifikasi: title,
                        pesan_notifikasi: message
                    });
                }
            } catch (e) {
                logger.error(`BukaOlshop Notif Error: ${e.message}`);
            }
        }
    },

    // Helper to send notifications by transaction ID (fetches user/trx first)
    triggerFromTransaction: async (transactionId, status, sn, note) => {
        try {
            // We need a way to get transaction with full details including productName
            // For now, assume we use a specialized repository method
            const [rows] = await pool.query(`
            SELECT t.*, p.name as productName 
            FROM transactions t 
            LEFT JOIN products p ON t.productId = p.id 
            WHERE t.id = ?
        `, [transactionId]);

            const transaction = rows[0];

            if (!transaction) return;

            const user = await userRepository.findById(transaction.userId);
            await notificationService.sendAllNotifications(user, transaction, status, sn, note);
        } catch (e) {
            logger.error(`Trigger Notif Error: ${e.message}`);
        }
    }
};

export default notificationService;
