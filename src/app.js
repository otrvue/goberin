import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import logger from "./config/logger.js";

import authRoutes from "./modules/auth/route.js";
import userRoutes from "./modules/user/route.js";
import adminSyncRoutes from "./modules/admin/sync/route.js";
import markupRoutes from "./modules/admin/pricing/route.js";
import promoRoutes from "./modules/admin/promo/route.js";
import trxRoutes from "./modules/transaction/route.js";
import adminBalanceRoutes from "./modules/admin/balance/route.js";
import dashboardRoutes from "./modules/admin/dashboard/route.js";
import adminProductRoutes from "./modules/admin/products/route.js";
import adminTransactionRoutes from "./modules/admin/transactions/route.js";
import adminVendorConfigRoutes from "./modules/admin/vendorConfig/route.js";
import callbackRoutes from "./modules/callback/route.js";
import reportRoutes from "./modules/report/route.js";
import adminUserRoutes from "./modules/admin/users/route.js";
import adminConfigRoutes from "./modules/admin/configs/route.js";
import uploadRoutes from "./modules/upload/route.js";
import userTelegramRoutes from "./modules/user/telegram/route.js";
import telegramCallbackRoutes from "./modules/callback/telegram/route.js";
import landingRoutes from "./modules/landing/route.js";
import depositRoutes from "./modules/deposit/route.js";
import adminPaymentRoutes from "./modules/admin/payment/route.js";


dotenv.config();

// BigInt Serialization Fix for Prisma
BigInt.prototype.toJSON = function () {
    return this.toString();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for rate limiting (required when behind Nginx/Cloudflare)
app.set("trust proxy", 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
// Logging Middleware (Only log state-changing requests or errors to reduce noise)
app.use(morgan("dev", {
    skip: (req, res) => {
        // Skip health checks and successful GET requests (except callbacks) to avoid log bloat
        const isCallback = req.url.startsWith("/api/callbacks");
        return req.url === "/health" || (req.method === "GET" && res.statusCode < 400 && !isCallback);
    },
    stream: { write: (message) => logger.info(message.trim()) }
}));

// Public Routes (System Status & Health)

app.get("/", async (req, res) => {
    let serverIp = "Unknown";
    try {
        const response = await axios.get("https://api.ipify.org?format=json", { timeout: 1000 });
        serverIp = response.data.ip;
    } catch (error) {
        // Fallback or ignore
    }

    res.status(200).json({
        success: true,
        message: "Private API",
        status: "Running",
        data: {
            version: "1.0.0",
            uptime: `${Math.floor(process.uptime())}s`,
            timestamp: new Date().toISOString(),
            contact: "@otrvue",
            server_ip: serverIp,
            client_ip: req.ip || req.headers['x-forwarded-for']
        }
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API is healthy",
        data: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            node_version: process.version,
            platform: process.platform
        }
    });
});

// Module Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin/products/sync", adminSyncRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/markups", markupRoutes);
app.use("/api/admin/promos", promoRoutes);
app.use("/api/trx", trxRoutes);
app.use("/api/admin/balances", adminBalanceRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin/transactions", adminTransactionRoutes);
app.use("/api/admin/vendor-configs", adminVendorConfigRoutes);
app.use("/api/callbacks", callbackRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/configs", adminConfigRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/users/telegram", userTelegramRoutes);
app.use("/api/callbacks/telegram", telegramCallbackRoutes);
app.use("/api/landing", landingRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/admin/payments", adminPaymentRoutes);


// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
