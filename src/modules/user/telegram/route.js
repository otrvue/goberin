import { Router } from "express";
import telegramController from "./controller.js";
import { authenticate, requireActiveStatus } from "../../../middleware/auth.middleware.js";

const router = Router();

router.get("/status", authenticate, requireActiveStatus, telegramController.getLinkStatus);
router.put("/settings", authenticate, requireActiveStatus, telegramController.updateSettings);
router.post("/settings", authenticate, requireActiveStatus, telegramController.updateSettings);

export default router;
