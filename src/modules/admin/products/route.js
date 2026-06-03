import { Router } from "express";
import productController from "./controller.js";
import { authenticate, authorize } from "../../../middleware/auth.middleware.js";
import { requireTwoFactor } from "../../../middleware/twoFactor.middleware.js";

const router = Router();

router.get("/", authenticate, authorize("ADMIN"), productController.getProducts);
router.get("/categories", authenticate, authorize("ADMIN"), productController.getCategories);
router.get("/providers", authenticate, authorize("ADMIN"), productController.getProviders);

router.put("/categories/:id", authenticate, authorize("ADMIN"), productController.updateCategory);
router.put("/providers/:id", authenticate, authorize("ADMIN"), productController.updateProvider);
router.patch("/:sku", authenticate, authorize("ADMIN"), productController.updateProduct);
router.post("/bulk-status", authenticate, authorize("ADMIN"), productController.bulkUpdateStatus);

export default router;
