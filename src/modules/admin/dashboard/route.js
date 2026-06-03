import { Router } from "express";
import dashboardController from "./controller.js";
import { authenticate, authorize } from "../../../middleware/auth.middleware.js";

const router = Router();

router.get("/stats", authenticate, authorize("ADMIN"), dashboardController.getStats);
router.get("/charts", authenticate, authorize("ADMIN"), dashboardController.getCharts);

export default router;
