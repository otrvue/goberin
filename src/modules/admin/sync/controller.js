import digiflazzService from "./digiflazz.service.js";
import okeconnectService from "./okeconnect.service.js";
import h2hService from "./h2h.service.js";
import logger from "../../../config/logger.js";

const syncController = {
    syncDigiflazz: async (req, res, next) => {
        try {
            // Jalankan di background tanpa await
            digiflazzService.syncProducts().catch(err => {
                logger.error("Background DigiFlazz Sync Error:", err);
            });

            return res.status(200).json({
                success: true,
                message: "DigiFlazz sync started in background",
            });
        } catch (error) {
            next(error);
        }
    },

    syncOkeconnect: async (req, res, next) => {
        try {
            // Jalankan di background tanpa await
            okeconnectService.syncProducts().catch(err => {
                logger.error("Background OkeConnect Sync Error:", err);
            });

            return res.status(200).json({
                success: true,
                message: "OkeConnect sync started in background",
            });
        } catch (error) {
            next(error);
        }
    },

    syncH2h: async (req, res, next) => {
        try {
            // Jalankan di background tanpa await
            h2hService.syncProducts().catch(err => {
                logger.error("Background H2h Sync Error:", err);
            });

            return res.status(200).json({
                success: true,
                message: "H2h sync started in background",
            });
        } catch (error) {
            next(error);
        }
    },

    getSyncStatus: async (req, res, next) => {
        try {
            const { vendor } = req.params;
            let service;
            if (vendor.toUpperCase() === "DIGIFLAZZ") {
                service = digiflazzService;
            } else if (vendor.toUpperCase() === "OKECONNECT") {
                service = okeconnectService;
            } else if (vendor.toUpperCase() === "H2H") {
                service = h2hService;
            } else {
                throw { status: 400, message: "Vendor tidak valid", errorCode: "INVALID_VENDOR" };
            }
            const status = await service.getStatus(vendor.toUpperCase());

            return res.status(200).json({
                success: true,
                data: status || { status: "IDLE", message: "No sync task found" },
            });
        } catch (error) {
            next(error);
        }
    },
};

export default syncController;
