import authService from "./service.js";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "./validation.js";

const authController = {
    register: async (req, res, next) => {
        try {
            const validatedData = registerSchema.parse(req.body);
            const user = await authService.register(validatedData);

            return res.status(201).json({
                success: true,
                message: "User registered successfully",
                data: user,
            });
        } catch (error) {
            if (error.name === "ZodError") {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errorCode: "VALIDATION_ERROR",
                    data: error.errors,
                });
            }
            next(error);
        }
    },

    login: async (req, res, next) => {
        try {
            const validatedData = loginSchema.parse(req.body);
            const result = await authService.login(validatedData);

            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: result,
            });
        } catch (error) {
            if (error.name === "ZodError") {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errorCode: "VALIDATION_ERROR",
                    data: error.errors,
                });
            }
            next(error);
        }
    },

    verifyEmail: async (req, res, next) => {
        try {
            const { token } = req.query;
            const result = await authService.verifyEmail(token);
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    },

    resendVerificationEmail: async (req, res, next) => {
        try {
            const result = await authService.resendVerificationEmail(req.user.id);
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            return res.status(error.status || 400).json({
                success: false,
                message: error.message
            });
        }
    },

    resendVerificationByEmail: async (req, res, next) => {
        try {
            const { email } = req.body;
            if (!email) throw { status: 400, message: "Email diperlukan" };

            const result = await authService.resendVerificationByEmail(email);
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            return res.status(error.status || 400).json({
                success: false,
                message: error.message
            });
        }
    },

    verify2FA: async (req, res, next) => {
        try {
            const { tempToken, code } = req.body;
            if (!tempToken || !code) {
                throw { status: 400, message: "Token dan kode verifikasi diperlukan" };
            }

            const result = await authService.verify2FA(tempToken, code);
            return res.status(200).json({
                success: true,
                message: "Verifikasi berhasil",
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    setup2FA: async (req, res, next) => {
        try {
            const result = await authService.setup2FA(req.user.id);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    enable2FA: async (req, res, next) => {
        try {
            const result = await authService.enable2FA(req.user.id, req.body);
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    },

    disable2FA: async (req, res, next) => {
        try {
            const result = await authService.disable2FA(req.user.id, req.body);
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    },

    sendOtp: async (req, res, next) => {
        try {
            const result = await authService.sendOtp(req.user.id);
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    },

    forgotPassword: async (req, res, next) => {
        try {
            const { email } = forgotPasswordSchema.parse(req.body);
            const result = await authService.forgotPassword(email);
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            if (error.name === "ZodError") {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errorCode: "VALIDATION_ERROR",
                    data: error.errors,
                });
            }
            next(error);
        }
    },

    resetPassword: async (req, res, next) => {
        try {
            const { token, password } = resetPasswordSchema.parse(req.body);
            const result = await authService.resetPassword(token, password);
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            if (error.name === "ZodError") {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errorCode: "VALIDATION_ERROR",
                    data: error.errors,
                });
            }
            next(error);
        }
    },

    verifyResetToken: async (req, res, next) => {
        try {
            const { token } = req.params;
            if (!token) throw { status: 400, message: "Token reset password diperlukan" };

            const result = await authService.verifyResetToken(token);
            return res.status(200).json({
                success: true,
                message: "Token valid",
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    logout: async (req, res, next) => {
        try {
            const result = await authService.logout();
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    }
};

export default authController;
