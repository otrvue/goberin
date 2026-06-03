import vendorConfigRepository from "./vendorConfig.repository.js";
import digiflazz from "../../integrations/digiflazz/index.js";
import okeconnect from "../../integrations/okeconnect/index.js";
import h2h from "../../integrations/h2h/index.js";
import logger from "../../config/logger.js";

const vendorConfigService = {
    /**
     * Get all configs (with masked sensitive data)
     */
    getConfigs: async () => {
        const configs = await vendorConfigRepository.getAllConfigs();
        return configs.map(item => {
            const sanitizedConfig = { ...item.config };

            // Mask sensitive fields
            const sensitiveKeys = ["apiKey", "password", "pin", "api_key", "secret"];
            for (const key in sanitizedConfig) {
                if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                    sanitizedConfig[key] = "********";
                }
            }

            const callbackUrl = `${process.env.PUBLIC_API_BASE_URL || ""}/api/callbacks/${item.vendor.toLowerCase()}`;

            return {
                vendor: item.vendor,
                config: sanitizedConfig,
                callbackUrl,
                updatedAt: item.updatedAt
            };
        });
    },

    /**
     * Update config for a vendor
     */
    updateConfig: async (vendor, configData) => {
        // Basic validation could be added here per vendor
        return await vendorConfigRepository.upsertConfig(vendor, configData);
    },

    /**
     * Test connection using current DB config
     */
    testConnection: async (vendor) => {
        const config = await vendorConfigRepository.getConfig(vendor);
        if (!config || !config.config) {
            throw new Error(`Configuration for ${vendor} not found in database`);
        }

        const creds = config.config;

        try {
            if (vendor === "DIGIFLAZZ") {
                // DigiFlazz check balance as a connectivity test
                const balance = await digiflazz.getBalance(creds.username, creds.apiKey);
                return { success: true, message: `Connected!`, data: { balance } };
            }

            if (vendor === "OKECONNECT") {
                // OkeConnect check balance
                // We'll wrap it to get the raw message if it's not a success number
                try {
                    const balance = await okeconnect.getBalance(creds.memberId, creds.pin, creds.password);
                    if (balance === null) {
                        return { success: false, message: "Vendor returned an unparseable response. Check your credentials." };
                    }
                    return { success: true, message: `Connected!`, data: { balance } };
                } catch (err) {
                    return { success: false, message: `Vendor Error: ${err.message}` };
                }
            }

            if (vendor === "H2H") {
                // H2H.id check balance
                try {
                    const balance = await h2h.getBalance(creds.memberId, creds.pin, creds.password);
                    return { success: true, message: `Connected!`, data: { balance } };
                } catch (err) {
                    return { success: false, message: `Vendor Error: ${err.message}` };
                }
            }

            throw new Error(`Testing not implemented for ${vendor}`);
        } catch (error) {
            const errorMsg = error.response?.data?.data?.message || error.message;
            logger.error(`Vendor Test Connection Failed (${vendor}): ${errorMsg}`);
            return { success: false, message: errorMsg };
        }
    },

    /**
     * Helper to get credentials (Database prioritized, then Environment)
     */
    getCredentials: async (vendor) => {
        const dbConfig = await vendorConfigRepository.getConfig(vendor);
        if (dbConfig && dbConfig.config) {
            return dbConfig.config;
        }

        // Fallback to Env
        if (vendor === "DIGIFLAZZ") {
            return {
                username: process.env.DIGIFLAZZ_USERNAME,
                apiKey: process.env.DIGIFLAZZ_API_KEY,
                webhookId: process.env.DIGIFLAZZ_WEBHOOK_ID,
                webhookSecret: process.env.DIGIFLAZZ_WEBHOOK_SECRET
            };
        }

        if (vendor === "OKECONNECT") {
            return {
                memberId: process.env.OKECONNECT_MEMBER_ID,
                pin: process.env.OKECONNECT_PIN,
                password: process.env.OKECONNECT_PASSWORD,
                apiId: process.env.OKECONNECT_API_ID
            };
        }

        if (vendor === "H2H") {
            return {
                memberId: process.env.H2H_MEMBER_ID,
                pin: process.env.H2H_PIN,
                password: process.env.H2H_PASSWORD
            };
        }

        return null;
    }
};

export default vendorConfigService;
