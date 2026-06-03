import pool from "../../../config/db.js";
import crypto from "crypto";

const telegramController = {
    getLinkStatus: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const [rows] = await pool.query(
                "SELECT telegramId, telegramCode, isTelegramActive, customNotifSuccess, customNotifFailed, boNotifSuccessTitle, boNotifSuccessMessage, boNotifFailedTitle, boNotifFailedMessage FROM users WHERE id = ?",
                [userId]
            );

            const user = rows[0];

            // Generate code if not linked and no code exists
            let code = user.telegramCode;
            if (!user.telegramId && !code) {
                code = crypto.randomBytes(4).toString("hex").toUpperCase();
                await pool.query("UPDATE users SET telegramCode = ? WHERE id = ?", [code, userId]);
            }

            const [configRows] = await pool.query(
                "SELECT name, value FROM web_configs WHERE name IN ('telegram_bot_token', 'telegram_bot_username')"
            );
            const configs = configRows.reduce((acc, row) => {
                acc[row.name] = row.value;
                return acc;
            }, {});

            return res.status(200).json({
                success: true,
                data: {
                    isLinked: !!user.telegramId,
                    telegramId: user.telegramId,
                    isTelegramActive: !!user.isTelegramActive,
                    linkCode: code,
                    botUsername: configs.telegram_bot_username || null,
                    isConfigured: !!configs.telegram_bot_token,
                    customNotifSuccess: user.customNotifSuccess,
                    customNotifFailed: user.customNotifFailed,
                    boNotifSuccessTitle: user.boNotifSuccessTitle,
                    boNotifSuccessMessage: user.boNotifSuccessMessage,
                    boNotifFailedTitle: user.boNotifFailedTitle,
                    boNotifFailedMessage: user.boNotifFailedMessage
                }
            });
        } catch (error) {
            next(error);
        }
    },

    updateSettings: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const {
                isTelegramActive,
                customNotifSuccess,
                customNotifFailed,
                boNotifSuccessTitle,
                boNotifSuccessMessage,
                boNotifFailedTitle,
                boNotifFailedMessage
            } = req.body;

            await pool.query(
                "UPDATE users SET isTelegramActive = ?, customNotifSuccess = ?, customNotifFailed = ?, boNotifSuccessTitle = ?, boNotifSuccessMessage = ?, boNotifFailedTitle = ?, boNotifFailedMessage = ? WHERE id = ?",
                [
                    isTelegramActive ? 1 : 0,
                    customNotifSuccess,
                    customNotifFailed,
                    boNotifSuccessTitle,
                    boNotifSuccessMessage,
                    boNotifFailedTitle,
                    boNotifFailedMessage,
                    userId
                ]
            );

            return res.status(200).json({
                success: true,
                message: "Pengaturan notifikasi Telegram berhasil diperbarui"
            });
        } catch (error) {
            next(error);
        }
    }
};

export default telegramController;
