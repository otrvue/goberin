import speakeasy from "speakeasy";
import qrcode from "qrcode";
import configRepository from "../modules/admin/configs/repository.js";

const totpService = {
    generateSecret: async () => {
        const configs = await configRepository.getConfigs();
        const siteName = configs.site_name || "GOBERIN";

        const secret = speakeasy.generateSecret({
            length: 20,
            name: siteName
        });
        return secret.base32;
    },

    generateQrCode: async (userEmail, secret, siteName = null) => {
        if (!siteName) {
            const configs = await configRepository.getConfigs();
            siteName = configs.site_name || "GOBERIN";
        }

        const otpauth = speakeasy.otpauthURL({
            secret: secret,
            label: userEmail,
            issuer: siteName,
            encoding: 'base32'
        });

        try {
            return await qrcode.toDataURL(otpauth);
        } catch (error) {
            throw new Error("Gagal membuat QR Code untuk Authenticator");
        }
    },

    verifyToken: (token, secret) => {
        try {
            return speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 1 // allowing 1 step window for better UX
            });
        } catch (error) {
            return false;
        }
    }
};

export default totpService;
