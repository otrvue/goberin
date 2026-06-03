import { Router } from "express";
import trxController from "./controller.js";
import { authenticate, requireActiveStatus } from "../../middleware/auth.middleware.js";
import { apiKeyAuth } from "../../middleware/apiKey.middleware.js";

const router = Router();

// Middleware to support both JWT and API Key
const dualAuth = (req, res, next) => {
    if (req.header("X-API-Key")) {
        return apiKeyAuth(req, res, next);
    }
    return authenticate(req, res, next);
};

// Product routes
router.get("/products", dualAuth, trxController.getProducts);
router.get("/categories", dualAuth, trxController.getCategories);
router.get("/providers", dualAuth, trxController.getProviders);

// Secured Routes
router.use(dualAuth, requireActiveStatus);
router.post("/prepaid", trxController.prepaid);
router.post("/postpaid/inquiry", trxController.postpaidInquiry);
router.post("/postpaid/pay", trxController.postpaidPay);
router.get("/history", trxController.getHistory);
router.get("/status/:id", dualAuth, requireActiveStatus, trxController.getStatus);
router.post("/bukaolshop", dualAuth, requireActiveStatus, trxController.bukaolshopTransaction);

export default router;
