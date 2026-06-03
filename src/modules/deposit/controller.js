import depositService from "./service.js";

const depositController = {
    getChannels: async (req, res) => {
        try {
            const channels = await depositService.getPaymentChannels();
            res.json({ status: "success", data: channels });
        } catch (error) {
            res.status(error.status || 500).json({
                status: "error",
                message: error.message,
                errorCode: error.errorCode
            });
        }
    },

    create: async (req, res) => {
        try {
            const deposit = await depositService.createDeposit(req.user.id, req.body);
            res.status(201).json({ status: "success", data: deposit });
        } catch (error) {
            res.status(error.status || 500).json({
                status: "error",
                message: error.message,
                errorCode: error.errorCode
            });
        }
    },

    list: async (req, res) => {
        try {
            const { page, limit } = req.query;
            const deposits = await depositService.getUserDeposits(req.user.id, { page, limit });
            res.json({ status: "success", data: deposits });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    },

    getDetail: async (req, res) => {
        try {
            const deposit = await depositService.getDepositDetail(req.params.id);
            res.json({ status: "success", data: deposit });
        } catch (error) {
            res.status(error.status || 500).json({ status: "error", message: error.message });
        }
    },

    syncStatus: async (req, res) => {
        try {
            const deposit = await depositService.syncDepositStatus(req.params.id);
            res.json({ status: "success", data: deposit });
        } catch (error) {
            res.status(error.status || 500).json({ status: "error", message: error.message });
        }
    }
};

export default depositController;
