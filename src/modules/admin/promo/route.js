import { Router } from "express";
import promoController from "./controller.js";
import { authenticate, authorize } from "../../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.post("/", promoController.create);
router.get("/", promoController.getAll);
router.put("/:id", promoController.update);
router.delete("/:id", promoController.delete);

export default router;
