import express from "express";
import depositController from "./controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/channels", authenticate, depositController.getChannels);
router.post("/", authenticate, depositController.create);
router.get("/", authenticate, depositController.list);
router.get("/:id", authenticate, depositController.getDetail);
router.post("/:id/sync", authenticate, depositController.syncStatus);

export default router;
