import logger from "../config/logger.js";

export const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    const errorCode = err.errorCode || "INTERNAL_ERROR";

    if (status >= 500) {
        logger.error(`${status} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        logger.error(err.stack);
    } else {
        logger.warn(`${status} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    }

    res.status(status).json({
        success: false,
        message: status === 500 ? "Something went wrong" : message,
        errorCode,
        data: null,
    });
};

export const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: "Endpoint tidak ditemukan. Pastikan URL yang Anda tuju sudah benar sesuai dokumentasi NEOPAY Private API.",
        errorCode: "ROUTE_NOT_FOUND",
        data: {
            path: req.originalUrl,
            method: req.method
        }
    });
};
