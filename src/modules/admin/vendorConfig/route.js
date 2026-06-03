import express from "express";
import vendorConfigController from "./controller.js";
import { authenticate, authorize } from "../../../middleware/auth.middleware.js";

const router = express.Router();

// Only ADMIN can access these
router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", vendorConfigController.getConfigs);
router.put("/:vendor", vendorConfigController.updateConfig);
router.post("/:vendor/test", vendorConfigController.testConnection);

export default router;
