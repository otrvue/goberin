import totpService from "../services/totp.service.js";
import otpService from "../services/otp.service.js";
import authRepository from "../modules/auth/repository.js";
import { isDevVerificationBypassEnabled } from "../config/auth-flags.js";

export const requireTwoFactor = async (req, res, next) => {
    try {
        if (isDevVerificationBypassEnabled()) {
            return next();
        }

        const userId = req.user.id;
        const code = req.header("X-2FA-Code");

        // Fetch full user data including security secrets
        const user = await authRepository.findAuthById(userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
                errorCode: "UNAUTHORIZED"
            });
        }

        if (!code) {
            return res.status(403).json({
                success: false,
                message: "Aksi ini memerlukan verifikasi 2FA. Silakan masukkan kode Authenticator atau OTP email Anda.",
                errorCode: "TWO_FACTOR_REQUIRED",
                data: {
                    type: user.isTwoFactorEnabled ? "TOTP" : "EMAIL_OTP"
                }
            });
        }

        let isValid = false;
        if (user.isTwoFactorEnabled) {
            isValid = totpService.verifyToken(code, user.twoFactorSecret);
        }

        // If not valid or TOTP not enabled, fallback to Email OTP
        if (!isValid) {
            const result = await otpService.verifyOtp(userId, code);
            isValid = result.success;
        }

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: "Kode 2FA tidak valid atau sudah kadaluarsa",
                errorCode: "INVALID_2FA_CODE"
            });
        }

        // Verification successful, proceed
        next();
    } catch (error) {
        next(error);
    }
};
