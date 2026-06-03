import rateLimit from "express-rate-limit";
import logger from "../config/logger.js";

/**
 * Rate limiter untuk endpoint sensitif (login, resend verification, forgot password).
 * Mencegah brute force dan spam email.
 */

// Strict: untuk endpoint yang mengirim email (resend, forgot-password)
export const emailRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 menit
    max: 3, // max 3 request per 5 menit per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.",
        errorCode: "RATE_LIMIT_EXCEEDED",
    },
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded for email endpoint: ${req.ip} -> ${req.originalUrl}`);
        res.status(429).json(options.message);
    },
});

// Moderate: untuk login endpoint (brute force protection)
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 10, // max 10 login attempts per 15 menit per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
        errorCode: "RATE_LIMIT_EXCEEDED",
    },
    handler: (req, res, next, options) => {
        logger.warn(`Login rate limit exceeded: ${req.ip}`);
        res.status(429).json(options.message);
    },
});
