import { Router } from "express";
import reportController from "./controller.js";
import { authenticate, authorize, requireActiveStatus } from "../../middleware/auth.middleware.js";

const router = Router();

// User routes
router.post("/", authenticate, requireActiveStatus, reportController.createReport);
router.get("/", authenticate, requireActiveStatus, reportController.getUserReports);

// Admin routes
router.get("/admin", authenticate, authorize("ADMIN"), requireActiveStatus, reportController.getAdminReports);
router.patch("/admin/:id", authenticate, authorize("ADMIN"), requireActiveStatus, reportController.processReport);

export default router;
