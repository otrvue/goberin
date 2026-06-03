import { Router } from "express";
import callbackController from "./controller.js";

import dompetxCallbackController from "./dompetx.controller.js";

const router = Router();

// Public endpoints but should ideally have IP/Signature checks
router.post("/digiflazz", callbackController.digiflazz);
router.get("/okeconnect", callbackController.okeconnect);
router.post("/dompetx", dompetxCallbackController.handle);

// H2H.id handles both GET and POST
router.get("/h2h", callbackController.h2h);
router.post("/h2h", callbackController.h2h);

export default router;
