import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userRepository from "./repository.js";
import emailService from "../../services/email.service.js";
import otpService from "../../services/otp.service.js";
import totpService from "../../services/totp.service.js";
import logger from "../../config/logger.js";

const authService = {
    register: async (userData) => {
        const { email, username, password, name } = userData;

        // Check if user already exists
        const existingEmail = await userRepository.findByEmail(email);
        if (existingEmail) throw { status: 400, message: "Email already registered", errorCode: "EMAIL_EXISTS" };

        const existingUsername = await userRepository.findByUsername(username);
        if (existingUsername) throw { status: 400, message: "Username already taken", errorCode: "USERNAME_TAKEN" };

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        // Create user
        const user = await userRepository.create({
            email,
            username,
            password: hashedPassword,
            name,
        }, verificationToken);

        // Send verification email (async, don't wait to respond to user if it's slow, but here we wait for simplicity or handle error)
        try {
            await emailService.sendVerificationEmail(user, verificationToken);
        } catch (error) {
            logger.error(`Failed to send verification email to ${email}:`, error);
            // We still created the user, they can request resend later or admin can help
        }

        logger.info(`User registered: ${user.username} (${user.id})`);

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            message: "Registrasi berhasil. Silakan cek email Anda untuk verifikasi akun."
        };
    },

    verifyEmail: async (token) => {
        if (!token) throw { status: 400, message: "Token verifikasi diperlukan" };

        const user = await userRepository.findByVerificationToken(token);
        if (!user) throw { status: 400, message: "Token verifikasi tidak valid atau sudah kadaluarsa" };

        await userRepository.updateVerificationStatus(user.id, true);

        logger.info(`User email verified: ${user.username} (${user.id})`);
        return { message: "Email berhasil diverifikasi. Akun Anda kini aktif." };
    },

    resendVerificationEmail: async (userId) => {
        const user = await userRepository.findById(userId);
        if (!user) throw { status: 404, message: "User tidak ditemukan" };
        if (user.isEmailVerified) throw { status: 400, message: "Email sudah terverifikasi" };

        const newToken = crypto.randomBytes(32).toString("hex");
        await userRepository.updateVerificationToken(userId, newToken);
        await emailService.sendVerificationEmail(user, newToken);

        return { message: "Email verifikasi berhasil dikirim ulang. Silakan cek inbox Anda." };
    },

    resendVerificationByEmail: async (email) => {
        const user = await userRepository.findByEmail(email);

        // Normalize response: always return same message to prevent email enumeration
        const successMessage = "Jika email terdaftar dan belum terverifikasi, email verifikasi akan dikirimkan. Silakan cek inbox atau folder spam Anda.";

        if (!user || user.isEmailVerified) {
            return { message: successMessage };
        }

        const newToken = crypto.randomBytes(32).toString("hex");
        await userRepository.updateVerificationToken(user.id, newToken);
        await emailService.sendVerificationEmail(user, newToken);

        return { message: successMessage };
    },

    login: async (credentials) => {
        const { username, password } = credentials;

        let user = await userRepository.findByUsername(username);
        if (!user) {
            user = await userRepository.findByEmail(username);
        }

        if (!user) throw { status: 401, message: "Invalid credentials", errorCode: "INVALID_CREDENTIALS" };

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw { status: 401, message: "Invalid credentials", errorCode: "INVALID_CREDENTIALS" };

        // Check email verification
        if (!user.isEmailVerified) {
            // Auto-resend verification email
            try {
                const newToken = crypto.randomBytes(32).toString("hex");
                await userRepository.updateVerificationToken(user.id, newToken);
                await emailService.sendVerificationEmail(user, newToken);
            } catch (error) {
                logger.error(`Failed to resend verification email to ${user.email}:`, error);
            }

            throw {
                status: 403,
                message: "Email Anda belum diverifikasi. Kami telah mengirimkan ulang email verifikasi ke alamat email Anda. Silakan cek inbox atau folder spam.",
                errorCode: "EMAIL_NOT_VERIFIED"
            };
        }

        // 2FA Logic
        const tempToken = jwt.sign(
            { userId: user.id, isTemp: true },
            process.env.JWT_SECRET,
            { expiresIn: "5m" }
        );

        if (user.isTwoFactorEnabled) {
            return {
                requires2FA: true,
                type: "TOTP",
                tempToken,
                message: "Silakan masukkan kode dari Google Authenticator Anda."
            };
        } else {
            // Send Email OTP as fallback
            await otpService.generateOtp(user.id, user.email);
            return {
                requires2FA: true,
                type: "EMAIL_OTP",
                tempToken,
                message: "Silakan masukkan kode OTP yang dikirim ke email Anda."
            };
        }
    },

    verify2FA: async (tempToken, code) => {
        try {
            const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
            if (!decoded.isTemp) throw new Error("Invalid token type");

            const user = await userRepository.findAuthById(decoded.userId);
            if (!user) throw { status: 404, message: "User not found" };

            let isValid = false;
            if (user.isTwoFactorEnabled) {
                isValid = totpService.verifyToken(code, user.twoFactorSecret);
            }

            // If not valid or TOTP not enabled, fallback to Email OTP
            if (!isValid) {
                const result = await otpService.verifyOtp(user.id, code);
                if (result.success) {
                    isValid = true;
                }
            }

            if (!isValid) {
                throw { status: 400, message: "Kode 2FA tidak valid", errorCode: "INVALID_2FA_CODE" };
            }

            // Generate real JWT
            const token = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
            );

            const { password: _, ...userWithoutPassword } = user;
            return { user: userWithoutPassword, token };
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                throw { status: 401, message: "Sesi login berakhir, silakan login ulang", errorCode: "TEMP_TOKEN_EXPIRED" };
            }
            throw error;
        }
    },

    setup2FA: async (userId) => {
        const user = await userRepository.findById(userId);
        if (!user) throw { status: 404, message: "User not found" };

        const secret = await totpService.generateSecret();
        const qrCode = await totpService.generateQrCode(user.email, secret);

        return { secret, qrCode };
    },

    enable2FA: async (userId, { totpCode, emailOtp, secret }) => {
        const user = await userRepository.findById(userId);
        if (!user) throw { status: 404, message: "User not found" };

        const otpResult = await otpService.verifyOtp(userId, emailOtp);
        if (!otpResult.success) throw { status: 400, message: "Email OTP tidak valid: " + otpResult.message };

        const isTotpValid = totpService.verifyToken(totpCode, secret);
        if (!isTotpValid) throw { status: 400, message: "Kode Authenticator tidak valid" };

        await userRepository.updateTwoFactorStatus(userId, true, secret);

        return { message: "Google Authenticator berhasil diaktifkan" };
    },

    disable2FA: async (userId, { code }) => {
        const user = await userRepository.findAuthById(userId);
        if (!user) throw { status: 404, message: "User not found" };

        let isValid = false;

        // Try TOTP first if enabled
        if (user.isTwoFactorEnabled) {
            isValid = totpService.verifyToken(code, user.twoFactorSecret);
        }

        // If not valid or TOTP not enabled, fallback to Email OTP
        if (!isValid) {
            const result = await otpService.verifyOtp(userId, code);
            isValid = result.success;
        }

        if (!isValid) {
            throw {
                status: 400,
                message: "Kode verifikasi tidak valid atau sudah kadaluarsa. Pastikan Anda menggunakan kode Authenticator atau OTP Email terbaru."
            };
        }

        await userRepository.updateTwoFactorStatus(userId, false, null);
        return { message: "Google Authenticator berhasil dinonaktifkan. Akun Anda kini kembali menggunakan proteksi Email OTP." };
    },

    sendOtp: async (userId) => {
        const user = await userRepository.findById(userId);
        if (!user) throw { status: 404, message: "User tidak ditemukan" };

        await otpService.generateOtp(user.id, user.email);
        return { message: "Kode OTP telah dikirim ke email Anda" };
    },

    forgotPassword: async (email) => {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            // Return success even if user not found for security reasons
            return { message: "Jika email terdaftar di sistem kami, instruksi reset password akan dikirimkan." };
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

        await userRepository.updateResetToken(user.id, resetToken, expiresAt);
        await emailService.sendPasswordResetEmail(user, resetToken);

        return { message: "Jika email terdaftar di sistem kami, instruksi reset password akan dikirimkan." };
    },

    resetPassword: async (token, newPassword) => {
        const user = await userRepository.findByResetToken(token);
        if (!user) {
            throw { status: 400, message: "Token reset password tidak valid atau sudah kadaluarsa" };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userRepository.updatePassword(user.id, hashedPassword);

        return { message: "Password berhasil diperbarui. Silakan login dengan password baru Anda." };
    },

    verifyResetToken: async (token) => {
        const user = await userRepository.findByResetToken(token);
        if (!user) {
            throw { status: 400, message: "Token reset password tidak valid atau sudah kadaluarsa" };
        }
        return {
            valid: true,
            email: user.email,
            username: user.username
        };
    },

    logout: async () => {
        // Since we use JWT with no server-side blacklist for now, 
        // logout is mostly handled client-side.
        // We can add server-side logic here later if needed (e.g. invalidating refresh tokens).
        return { message: "Berhasil keluar" };
    }
};

export default authService;
