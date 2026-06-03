import configService from "./service.js";

const configController = {
    getConfigs: async (req, res, next) => {
        try {
            const configs = await configService.getAllConfigs();
            return res.status(200).json({ success: true, data: configs });
        } catch (error) {
            next(error);
        }
    },

    updateConfigs: async (req, res, next) => {
        try {
            await configService.updateConfigs(req.body);
            return res.status(200).json({
                success: true,
                message: "Konfigurasi berhasil diperbarui",
            });
        } catch (error) {
            next(error);
        }
    },

    setupTelegram: async (req, res, next) => {
        try {
            const result = await configService.setupTelegramBot();
            return res.status(200).json({
                success: true,
                message: "Webhook Telegram berhasil diatur",
                data: result
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    testEmail: async (req, res, next) => {
        try {
            const { email } = req.body;
            if (!email) throw new Error("Email tujuan diperlukan");

            await configService.testEmail(email);
            return res.status(200).json({
                success: true,
                message: `Email uji coba berhasil dikirim ke ${email}. Silakan cek kotak masuk Anda.`
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default configController;
