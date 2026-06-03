import { Router } from "express";
import configController from "./controller.js";
import { authenticate, authorize } from "../../../middleware/auth.middleware.js";
import { requireTwoFactor } from "../../../middleware/twoFactor.middleware.js";

const router = Router();

router.get("/", authenticate, authorize("ADMIN"), configController.getConfigs);
router.patch("/", authenticate, authorize("ADMIN"), requireTwoFactor, configController.updateConfigs);
router.post("/telegram/setup", authenticate, authorize("ADMIN"), requireTwoFactor, configController.setupTelegram);
router.post("/email/test", authenticate, authorize("ADMIN"), configController.testEmail);

export default router;
