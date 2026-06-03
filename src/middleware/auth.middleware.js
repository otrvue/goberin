import jwt from "jsonwebtoken";
import userRepository from "../modules/user/repository.js";
import logger from "../config/logger.js";
import { isDevVerificationBypassEnabled } from "../config/auth-flags.js";

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "No token provided",
                errorCode: "UNAUTHORIZED",
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userRepository.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
                errorCode: "UNAUTHORIZED",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            logger.warn(`Auth: Token expired for request ${req.originalUrl}`);
            return res.status(401).json({
                success: false,
                message: "Sesi Anda telah berakhir, silakan login kembali",
                errorCode: "TOKEN_EXPIRED",
            });
        }

        if (error.name === "JsonWebTokenError") {
            logger.warn(`Auth: Invalid token for request ${req.originalUrl}`);
            return res.status(401).json({
                success: false,
                message: "Token tidak valid, silakan login kembali",
                errorCode: "INVALID_TOKEN",
            });
        }

        logger.error("Authentication error:", error);
        return res.status(401).json({
            success: false,
            message: "Autentikasi gagal",
            errorCode: "UNAUTHORIZED",
        });
    }
};

export const requireActiveStatus = (req, res, next) => {
    if (isDevVerificationBypassEnabled()) {
        return next();
    }

    // Admin is always considered active for system routes
    if (req.user && (req.user.status === "ACTIVE" || req.user.role === "ADMIN")) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Akun Anda sedang dinonaktifkan atau belum aktif. Silakan hubungi admin atau verifikasi email Anda.",
        errorCode: "ACCOUNT_INACTIVE",
    });
};

export const authorize = (roles = []) => {
    if (typeof roles === "string") {
        roles = [roles];
    }

    return (req, res, next) => {
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
                errorCode: "FORBIDDEN",
            });
        }

        next();
    };
};
