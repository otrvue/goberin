import { Router } from "express";
import userController from "./controller.js";
import { authenticate, requireActiveStatus } from "../../middleware/auth.middleware.js";
import { requireTwoFactor } from "../../middleware/twoFactor.middleware.js";

const router = Router();

router.get("/profile", authenticate, userController.getProfile);
router.put("/change-password", authenticate, requireActiveStatus, userController.changePassword);
router.post("/generate-api-key", authenticate, requireActiveStatus, requireTwoFactor, userController.generateApiKey);
router.put("/regenerate-api-key", authenticate, requireActiveStatus, requireTwoFactor, userController.generateApiKey);
router.put("/callback-url", authenticate, requireActiveStatus, requireTwoFactor, userController.updateCallbackUrl);
router.put("/bukaolshop-config", authenticate, requireActiveStatus, requireTwoFactor, userController.updateBukaOlshopConfig);
router.post("/bukaolshop-test", authenticate, requireActiveStatus, userController.testBukaOlshopConfig);

export default router;
