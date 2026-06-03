import digiflazz from "../../../integrations/digiflazz/index.js";
import okeconnect from "../../../integrations/okeconnect/index.js";
import h2h from "../../../integrations/h2h/index.js";
import trxRepository from "../../transaction/repository.js";
import vendorConfigService from "../vendorConfig.service.js";
import logger from "../../../config/logger.js";

const balanceService = {
    syncVendorBalances: async () => {
        const errors = {};
        try {
            const [dfCreds, okCreds, h2hCreds] = await Promise.all([
                vendorConfigService.getCredentials("DIGIFLAZZ"),
                vendorConfigService.getCredentials("OKECONNECT"),
                vendorConfigService.getCredentials("H2H")
            ]);

            const [dfBalance, okBalance, h2hBalance] = await Promise.all([
                digiflazz.getBalance(dfCreds?.username, dfCreds?.apiKey).catch(err => {
                    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
                    logger.error(`Sync DigiFlazz Balance Error: ${detail}`);
                    errors.DIGIFLAZZ = detail;
                    return null;
                }),
                okeconnect.getBalance(okCreds?.memberId, okCreds?.pin, okCreds?.password).catch(err => {
                    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
                    logger.error(`Sync OkeConnect Balance Error: ${detail}`);
                    errors.OKECONNECT = detail;
                    return null;
                }),
                h2h.getBalance(h2hCreds?.memberId, h2hCreds?.pin, h2hCreds?.password).catch(err => {
                    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
                    logger.error(`Sync H2H Balance Error: ${detail}`);
                    errors.H2H = detail;
                    return null;
                }),
            ]);

            const updates = [];

            // Helper to clean and validate balance
            const parseBalance = (val) => {
                if (val === null || val === undefined) return NaN;
                const str = String(val).replace(/[^\d]/g, ""); // Remove non-digits
                // If it's too long (like an IP 12516313619), it's probably not a balance
                if (str === "" || str.length > 10) return NaN;
                return Number(str);
            };

            const dfNum = parseBalance(dfBalance);
            const okNum = parseBalance(okBalance);
            const h2hNum = parseBalance(h2hBalance);

            if (!isNaN(dfNum)) {
                updates.push(trxRepository.updateVendorBalance("DIGIFLAZZ", dfNum));
            }
            if (!isNaN(okNum)) {
                updates.push(trxRepository.updateVendorBalance("OKECONNECT", okNum));
            }
            if (!isNaN(h2hNum)) {
                updates.push(trxRepository.updateVendorBalance("H2H", h2hNum));
            }

            await Promise.all(updates);
            const balances = await trxRepository.getVendorBalances();

            return {
                balances,
                errors: Object.keys(errors).length > 0 ? errors : null
            };
        } catch (error) {
            logger.error("Sync Vendor Balances Error:", error.message);
            throw error;
        }
    },

    getBalanceLogs: async (filters) => {
        return await trxRepository.getBalanceLogs(filters);
    }
};

export default balanceService;
