import adminPaymentService from "./service.js";

const adminPaymentController = {
    getSettings: async (req, res) => {
        try {
            const settings = await adminPaymentService.getSettings();
            res.json({ status: "success", data: settings });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    },

    updateSettings: async (req, res) => {
        try {
            await adminPaymentService.updateSettings(req.body);
            res.json({ status: "success", message: "Pengaturan berhasil diperbarui" });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    },

    testConnection: async (req, res) => {
        try {
            const result = await adminPaymentService.testConnection();
            res.json(result);
        } catch (error) {
            res.status(error.status || 500).json({ status: "error", message: error.message });
        }
    }
};

export default adminPaymentController;
