import { Router } from "express";
import userController from "./controller.js";
import { authenticate, authorize } from "../../../middleware/auth.middleware.js";
import { requireTwoFactor } from "../../../middleware/twoFactor.middleware.js";

const router = Router();

router.get("/stats", authenticate, authorize("ADMIN"), userController.getStats);
router.get("/", authenticate, authorize("ADMIN"), userController.getUsers);
router.get("/:id", authenticate, authorize("ADMIN"), userController.getUserById);
router.patch("/:id", authenticate, authorize("ADMIN"), requireTwoFactor, userController.updateUser);
router.post("/:id/balance", authenticate, authorize("ADMIN"), requireTwoFactor, userController.addBalance);

export default router;
