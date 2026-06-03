import express from "express";
import adminPaymentController from "./controller.js";
import { authenticate, authorize } from "../../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/settings", authenticate, authorize('ADMIN'), adminPaymentController.getSettings);
router.put("/settings", authenticate, authorize('ADMIN'), adminPaymentController.updateSettings);
router.post("/test-connection", authenticate, authorize('ADMIN'), adminPaymentController.testConnection);

export default router;
