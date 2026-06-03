import crypto from "crypto";
import authRepository from "../modules/auth/repository.js";
import emailService from "./email.service.js";
import logger from "../config/logger.js";

const otpService = {
    generateOtp: async (userId, userEmail) => {
        // Generate 6 digit numeric OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

        await authRepository.updateOtp(userId, otp, expiresAt);

        // Send to email
        await emailService.sendMail({
            to: userEmail,
            subject: "Verification Code (OTP) - NEOPAY",
            text: `Kode OTP Anda adalah: ${otp}. Kode ini akan kadaluarsa dalam 5 menit.`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; text-align: center;">
                    <h2>Kode Verifikasi (OTP)</h2>
                    <p>Gunakan kode di bawah ini untuk melanjutkan aksi Anda:</p>
                    <div style="font-size: 32px; font-weight: bold; background: #f4f4f4; padding: 15px; margin: 20px 0; letter-spacing: 5px;">
                        ${otp}
                    </div>
                    <p style="color: #666; font-size: 14px;">Kode ini akan kadaluarsa dalam 5 menit. Jangan bagikan kode ini kepada siapapun.</p>
                </div>
            `
        });

        return { otp, expiresAt };
    },

    verifyOtp: async (userId, code) => {
        const user = await authRepository.findAuthById(userId);

        if (!user || !user.otpCode) {
            return { success: false, message: "OTP tidak ditemukan atau sudah kadaluarsa" };
        }

        if (user.otpCode !== code) {
            return { success: false, message: "Kode OTP tidak valid" };
        }

        if (new Date() > new Date(user.otpExpiresAt)) {
            return { success: false, message: "Kode OTP sudah kadaluarsa" };
        }

        // Clear OTP after success
        await authRepository.updateOtp(userId, null, null);
        return { success: true };
    }
};

export default otpService;
