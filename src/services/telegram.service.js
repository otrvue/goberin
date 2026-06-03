import axios from "axios";
import pool from "../config/db.js";
import configRepository from "../modules/admin/configs/repository.js";
import logger from "../config/logger.js";

const telegramService = {
    sendMessage: async (chatId, text) => {
        try {
            const configs = await configRepository.getConfigs();
            const token = configs.telegram_bot_token;

            if (!token) {
                logger.error("Telegram Bot Token not configured");
                return false;
            }

            const url = `https://api.telegram.org/bot${token}/sendMessage`;
            await axios.post(url, {
                chat_id: chatId,
                text: text,
                parse_mode: "HTML"
            });
            return true;
        } catch (error) {
            logger.error(`Error sending Telegram message: ${error.response?.data?.description || error.message}`);
            return false;
        }
    },

    sendNotification: async (user, transaction, status) => {
        if (!user.isTelegramActive || !user.telegramId) return;

        const configs = await configRepository.getConfigs();
        let template = status === "SUCCESS"
            ? (user.customNotifSuccess || configs.default_notif_success)
            : (user.customNotifFailed || configs.default_notif_failed);

        if (!template) {
            template = status === "SUCCESS"
                ? "Transaksi <b>{{productName}}</b> ke <b>{{customerNo}}</b> BERHASIL. SN: {{sn}}"
                : "Transaksi <b>{{productName}}</b> ke <b>{{customerNo}}</b> GAGAL. Catatan: {{note}}";
        }

        // Replace placeholders
        const message = template
            .replace(/{{productName}}/g, transaction.productName || "Produk")
            .replace(/{{customerNo}}/g, transaction.customerNo)
            .replace(/{{transactionId}}/g, transaction.id)
            .replace(/{{sn}}/g, transaction.sn || "-")
            .replace(/{{note}}/g, transaction.note || "-")
            .replace(/{{price}}/g, transaction.price?.toLocaleString() || "0");

        await telegramService.sendMessage(user.telegramId, message);
    },

    handleWebhook: async (update) => {
        if (!update.message || !update.message.text) return;

        const { text, chat } = update.message;
        const chatId = chat.id.toString();

        logger.info(`[Telegram] Webhook received from ${chatId}: "${text}"`);

        const configs = await configRepository.getConfigs();
        if (!configs.telegram_bot_token) {
            logger.warn(`[Telegram] Received message but bot token is not configured.`);
            return;
        }

        if (text.startsWith("/start")) {
            const code = text.split(" ")[1];
            if (!code) {
                await telegramService.sendMessage(chatId, "Selamat datang! Untuk menautkan akun, gunakan perintah /start &lt;kode_anda&gt;.");
                return;
            }

            // Find user by code
            const [users] = await pool.query("SELECT id, username FROM users WHERE telegramCode = ?", [code]);
            if (users.length === 0) {
                await telegramService.sendMessage(chatId, "Kode tidak valid atau sudah kedaluwarsa.");
                return;
            }

            const user = users[0];
            // Link telegramId and clear code
            await pool.query("UPDATE users SET telegramId = ?, telegramCode = NULL, isTelegramActive = 1 WHERE id = ?", [chatId, user.id]);

            await telegramService.sendMessage(chatId, `Akun @${user.username} berhasil ditautkan! Anda akan menerima notifikasi transaksi lewat sini.`);
        }
    }
};

export default telegramService;
