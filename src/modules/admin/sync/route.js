import { Router } from "express";
import syncController from "./controller.js";
import { authenticate, authorize } from "../../../middleware/auth.middleware.js";

const router = Router();

router.post("/digiflazz", authenticate, authorize("ADMIN"), syncController.syncDigiflazz);
router.post("/okeconnect", authenticate, authorize("ADMIN"), syncController.syncOkeconnect);
router.post("/h2h", authenticate, authorize("ADMIN"), syncController.syncH2h);
router.get("/status/:vendor", authenticate, authorize("ADMIN"), syncController.getSyncStatus);

export default router;
