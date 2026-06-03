import pool from "../../config/db.js";
import crypto from "crypto";

const depositRepository = {
    createDeposit: async (data) => {
        const id = crypto.randomUUID();
        const transactionData = {
            ...data,
            id,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const columns = Object.keys(transactionData);
        const values = Object.values(transactionData);
        const placeholders = columns.map(() => "?").join(", ");

        await pool.query(
            `INSERT INTO deposits (${columns.join(", ")}) VALUES (${placeholders})`,
            values
        );
        return transactionData;
    },

    getDepositById: async (id) => {
        const [rows] = await pool.query("SELECT * FROM deposits WHERE id = ?", [id]);
        return rows[0] || null;
    },

    getDepositByReference: async (reference) => {
        const [rows] = await pool.query("SELECT * FROM deposits WHERE reference = ?", [reference]);
        return rows[0] || null;
    },

    updateDeposit: async (id, data, balanceLogData = null) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const updates = [];
            const values = [];
            for (const [key, value] of Object.entries(data)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
            values.push(id);

            await conn.query(
                `UPDATE deposits SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`,
                values
            );

            if (balanceLogData) {
                const logId = crypto.randomUUID();
                await conn.query(
                    "INSERT INTO balance_logs (id, userId, amount, type, notes, createdAt) VALUES (?, ?, ?, ?, ?, NOW())",
                    [logId, balanceLogData.userId, balanceLogData.amount, balanceLogData.type, balanceLogData.notes]
                );
            }

            await conn.commit();
            return { id, ...data };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    getUserDeposits: async (userId, limit = 10, offset = 0) => {
        const [items] = await pool.query(
            "SELECT * FROM deposits WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?",
            [userId, Number(limit), Number(offset)]
        );
        const [countRows] = await pool.query(
            "SELECT COUNT(*) as count FROM deposits WHERE userId = ?",
            [userId]
        );
        return { items, total: countRows[0].count };
    },

    getExpiredDeposits: async (minutes = 25) => {
        const [rows] = await pool.query(
            "SELECT * FROM deposits WHERE status = 'PENDING' AND expiresAt < NOW()",
            []
        );
        return rows;
    },

    getSettings: async (group = 'DOMPETX') => {
        const [rows] = await pool.query("SELECT * FROM payment_settings WHERE `group` = ?", [group]);
        const settings = {};
        rows.forEach(r => {
            settings[r.key] = r.value;
        });
        return settings;
    },

    updateSettings: async (settings, group = 'DOMPETX') => {
        const queries = Object.entries(settings).map(([key, value]) => {
            const id = crypto.randomUUID();
            return pool.query(
                "INSERT INTO payment_settings (id, `key`, `value`, `group`, updatedAt) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updatedAt = NOW()",
                [id, key, value, group]
            );
        });
        await Promise.all(queries);
    }
};

export default depositRepository;
