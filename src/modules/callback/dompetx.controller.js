import depositService from "../deposit/service.js";
import logger from "../../config/logger.js";

const dompetxCallbackController = {
    handle: async (req, res) => {
        try {
            logger.info("DompetX Callback received", req.body);
            await depositService.handleCallback(req.body);
            res.json({ status: "success", message: "Callback processed" });
        } catch (error) {
            logger.error(`DompetX Callback Processing Error: ${error.message}`);
            res.status(500).json({ status: "error", message: error.message });
        }
    }
};

export default dompetxCallbackController;
