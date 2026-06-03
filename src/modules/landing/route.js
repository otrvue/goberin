import express from "express";
import landingController from "./controller.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.get("/public", landingController.getPublicLanding);

// Admin
router.get("/admin", authenticate, authorize("ADMIN"), landingController.getAdminLanding);
router.patch("/admin", authenticate, authorize("ADMIN"), landingController.updateLandingConfigs);

// Features
router.post("/admin/features", authenticate, authorize("ADMIN"), landingController.addFeature);
router.put("/admin/features/:id", authenticate, authorize("ADMIN"), landingController.updateFeature);
router.delete("/admin/features/:id", authenticate, authorize("ADMIN"), landingController.deleteFeature);

// Metrics
router.post("/admin/metrics", authenticate, authorize("ADMIN"), landingController.addMetric);
router.put("/admin/metrics/:id", authenticate, authorize("ADMIN"), landingController.updateMetric);
router.delete("/admin/metrics/:id", authenticate, authorize("ADMIN"), landingController.deleteMetric);

// FAQs
router.post("/admin/faqs", authenticate, authorize("ADMIN"), landingController.addFaq);
router.put("/admin/faqs/:id", authenticate, authorize("ADMIN"), landingController.updateFaq);
router.delete("/admin/faqs/:id", authenticate, authorize("ADMIN"), landingController.deleteFaq);

export default router;
