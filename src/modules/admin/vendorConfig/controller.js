import vendorConfigService from "../vendorConfig.service.js";
import logger from "../../../config/logger.js";

const vendorConfigController = {
    /**
     * Get all vendor configurations
     */
    getConfigs: async (req, res, next) => {
        try {
            const configs = await vendorConfigService.getConfigs();
            res.status(200).json({
                success: true,
                data: configs
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update configuration for a vendor
     */
    updateConfig: async (req, res, next) => {
        try {
            const { vendor } = req.params;
            const configData = req.body;

            if (!["DIGIFLAZZ", "OKECONNECT", "H2H"].includes(vendor)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid vendor name"
                });
            }

            await vendorConfigService.updateConfig(vendor, configData);

            res.status(200).json({
                success: true,
                message: `Configuration for ${vendor} updated successfully`
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Test connection for a vendor
     */
    testConnection: async (req, res, next) => {
        try {
            const { vendor } = req.params;

            if (!["DIGIFLAZZ", "OKECONNECT", "H2H"].includes(vendor)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid vendor name"
                });
            }

            const result = await vendorConfigService.testConnection(vendor);

            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            next(error);
        }
    }
};

export default vendorConfigController;
