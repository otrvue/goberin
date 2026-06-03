import { Router } from "express";
import authController from "./controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { loginRateLimiter, emailRateLimiter } from "../../middleware/rateLimiter.middleware.js";

const router = Router();

router.post("/register", emailRateLimiter, authController.register);
router.post("/login", loginRateLimiter, authController.login);
router.post("/login/verify", loginRateLimiter, authController.verify2FA);
router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authenticate, emailRateLimiter, authController.resendVerificationEmail);
router.post("/resend-verification-email", emailRateLimiter, authController.resendVerificationByEmail);
router.post("/forgot-password", emailRateLimiter, authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/reset-password/status/:token", authController.verifyResetToken);
router.post("/logout", authenticate, authController.logout);

// 2FA Management (Requires login)
router.get("/2fa/setup", authenticate, authController.setup2FA);
router.post("/2fa/enable", authenticate, authController.enable2FA);
router.post("/2fa/disable", authenticate, authController.disable2FA);
router.post("/2fa/otp/send", authenticate, authController.sendOtp);

export default router;
