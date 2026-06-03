import { Router } from "express";
import balanceController from "./controller.js";
import { authenticate, authorize, requireActiveStatus } from "../../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate, authorize(["ADMIN"]), requireActiveStatus);
router.get("/vendors", balanceController.getVendorBalances);
router.post("/vendors/sync", balanceController.syncVendorBalances);
router.get("/logs", balanceController.getBalanceLogs);

export default router;
