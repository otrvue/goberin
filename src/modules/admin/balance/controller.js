import trxRepository from "../../transaction/repository.js";
import balanceService from "./service.js";

const balanceController = {
    getVendorBalances: async (req, res, next) => {
        try {
            const result = await trxRepository.getVendorBalances();
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },

    syncVendorBalances: async (req, res, next) => {
        try {
            const result = await balanceService.syncVendorBalances();
            return res.status(200).json({
                success: true,
                message: "Vendor balances synced successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getBalanceLogs: async (req, res, next) => {
        try {
            const result = await balanceService.getBalanceLogs(req.query);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

export default balanceController;
