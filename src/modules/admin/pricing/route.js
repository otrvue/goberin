import { Router } from "express";
import markupController from "./controller.js";
import { authenticate, authorize } from "../../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.post("/", markupController.create);
router.get("/", markupController.getAll);
router.put("/:id", markupController.update);
router.delete("/:id", markupController.delete);

export default router;
