import landingService from "./service.js";

const landingController = {
    // Public
    getPublicLanding: async (req, res, next) => {
        try {
            const data = await landingService.getPublicLanding();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    // Admin
    getAdminLanding: async (req, res, next) => {
        try {
            const data = await landingService.getAdminLanding();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    updateLandingConfigs: async (req, res, next) => {
        try {
            await landingService.updateLandingConfigs(req.body);
            return res.status(200).json({ success: true, message: "General landing settings updated" });
        } catch (error) {
            next(error);
        }
    },

    // Features CRUD
    addFeature: async (req, res, next) => {
        try {
            const id = await landingService.addFeature(req.body);
            return res.status(201).json({ success: true, message: "Feature added", data: { id } });
        } catch (error) {
            next(error);
        }
    },
    updateFeature: async (req, res, next) => {
        try {
            const { id } = req.params;
            await landingService.updateFeature(id, req.body);
            return res.status(200).json({ success: true, message: "Feature updated" });
        } catch (error) {
            next(error);
        }
    },
    deleteFeature: async (req, res, next) => {
        try {
            const { id } = req.params;
            await landingService.deleteFeature(id);
            return res.status(200).json({ success: true, message: "Feature deleted" });
        } catch (error) {
            next(error);
        }
    },

    // Metrics CRUD
    addMetric: async (req, res, next) => {
        try {
            const id = await landingService.addMetric(req.body);
            return res.status(201).json({ success: true, message: "Metric added", data: { id } });
        } catch (error) {
            next(error);
        }
    },
    updateMetric: async (req, res, next) => {
        try {
            const { id } = req.params;
            await landingService.updateMetric(id, req.body);
            return res.status(200).json({ success: true, message: "Metric updated" });
        } catch (error) {
            next(error);
        }
    },
    deleteMetric: async (req, res, next) => {
        try {
            const { id } = req.params;
            await landingService.deleteMetric(id);
            return res.status(200).json({ success: true, message: "Metric deleted" });
        } catch (error) {
            next(error);
        }
    },

    // FAQ CRUD
    addFaq: async (req, res, next) => {
        try {
            const id = await landingService.addFaq(req.body);
            return res.status(201).json({ success: true, message: "FAQ added", data: { id } });
        } catch (error) {
            next(error);
        }
    },
    updateFaq: async (req, res, next) => {
        try {
            const { id } = req.params;
            await landingService.updateFaq(id, req.body);
            return res.status(200).json({ success: true, message: "FAQ updated" });
        } catch (error) {
            next(error);
        }
    },
    deleteFaq: async (req, res, next) => {
        try {
            const { id } = req.params;
            await landingService.deleteFaq(id);
            return res.status(200).json({ success: true, message: "FAQ deleted" });
        } catch (error) {
            next(error);
        }
    }
};

export default landingController;
