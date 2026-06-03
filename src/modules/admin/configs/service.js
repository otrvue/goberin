import axios from "axios";
import configRepository from "./repository.js";
import emailService from "../../../services/email.service.js";

const configService = {
    getAllConfigs: async () => {
        return await configRepository.getConfigs();
    },

    updateConfigs: async (configs) => {
        const result = await configRepository.updateConfigs(configs);

        // Auto-setup Telegram Webhook if token exists
        if (configs.telegram_bot_token || configs.telegram_bot_username) {
            try {
                await configService.setupTelegramBot();
                console.log("Automatic Telegram webhook setup successful");
            } catch (error) {
                console.warn("Automatic Telegram webhook setup skipped:", error.message);
                // We don't throw here to avoid blocking general config updates
            }
        }

        return result;
    },

    setupTelegramBot: async () => {
        const configs = await configRepository.getConfigs();
        const token = configs.telegram_bot_token;
        const baseUrl = process.env.PUBLIC_API_BASE_URL;

        if (!token) throw new Error("Telegram Bot Token belum diatur di Web Config");
        if (!baseUrl) throw new Error("PUBLIC_API_BASE_URL belum diatur di environment (.env)");

        const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/callbacks/telegram`;

        try {
            const response = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
                url: webhookUrl
            });
            return response.data;
        } catch (error) {
            const msg = error.response?.data?.description || error.message;
            throw new Error(`Gagal set webhook Telegram: ${msg}`);
        }
    },

    testEmail: async (targetEmail) => {
        const configs = await configRepository.getConfigs();
        if (!configs.smtp_host || !configs.smtp_user || !configs.smtp_pass) {
            throw new Error("Konfigurasi SMTP belum lengkap");
        }

        return await emailService.sendMail({
            to: targetEmail,
            subject: "SMTP Test Connection",
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h3>SMTP Test Berhasil!</h3>
                    <p>Konfigurasi email Anda sudah benar dan sistem siap mengirimkan email notifikasi.</p>
                </div>
            `
        });
    }
};

export default configService;
