import pool from "../../config/db.js";
import crypto from "crypto";

const vendorConfigRepository = {
    /**
     * Get config for a specific vendor
     */
    getConfig: async (vendor) => {
        const [rows] = await pool.query("SELECT * FROM vendor_configs WHERE vendor = ?", [vendor]);
        if (rows.length === 0) return null;

        const row = rows[0];
        if (row.config) {
            if (Buffer.isBuffer(row.config)) {
                try {
                    row.config = JSON.parse(row.config.toString());
                } catch (e) { }
            } else if (typeof row.config === "string") {
                try {
                    row.config = JSON.parse(row.config);
                } catch (e) { }
            }
        }
        return row;
    },

    /**
     * Upsert config for a vendor
     */
    upsertConfig: async (vendor, config) => {
        const id = crypto.randomUUID();
        const configStr = JSON.stringify(config);
        return await pool.query(
            "INSERT INTO vendor_configs (id, vendor, config, updatedAt) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE config = VALUES(config), updatedAt = NOW()",
            [id, vendor, configStr]
        );
    },

    /**
     * Get all vendor configs
     */
    getAllConfigs: async () => {
        const [rows] = await pool.query("SELECT * FROM vendor_configs");
        return rows.map(row => {
            if (row.config) {
                if (Buffer.isBuffer(row.config)) {
                    try {
                        row.config = JSON.parse(row.config.toString());
                    } catch (e) { }
                } else if (typeof row.config === "string") {
                    try {
                        row.config = JSON.parse(row.config);
                    } catch (e) { }
                }
            }
            return row;
        });
    }
};

export default vendorConfigRepository;
