import { Router } from "express";
import telegramService from "../../../services/telegram.service.js";

const router = Router();

// POST /api/callbacks/telegram
router.post("/", async (req, res, next) => {
    try {
        // Telegram doesn't expect a specific response other than 200 OK
        // We handle logic asynchronously or within the service
        await telegramService.handleWebhook(req.body);
        return res.status(200).send("OK");
    } catch (error) {
        console.error("Telegram Webhook Error:", error);
        // Still return 200 to Telegram to avoid retries on failure
        return res.status(200).send("OK");
    }
});

export default router;
