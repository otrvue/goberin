import { Router } from "express";
import transactionController from "./controller.js";
import { authenticate, authorize } from "../../../middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, authorize("ADMIN"), transactionController.getTransactions);
router.get("/:id", authenticate, authorize("ADMIN"), transactionController.getTransactionById);
router.patch("/:id", authenticate, authorize("ADMIN"), transactionController.updateTransaction);

export default router;
