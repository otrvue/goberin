import pool from "../../config/db.js";

const userRepository = {
    findById: async (id) => {
        const [rows] = await pool.query(
            "SELECT id, email, username, name, role, status, isEmailVerified, isTwoFactorEnabled, apiKey, bukaolshopApiKey, bukaolshopToken, callbackUrl, telegramId, isTelegramActive, createdAt FROM users WHERE id = ?",
            [id]
        );
        return rows[0] || null;
    },
    getBalanceLogs: async (userId) => {
        const [rows] = await pool.query(
            "SELECT * FROM balance_logs WHERE userId = ? ORDER BY createdAt DESC",
            [userId]
        );
        return rows;
    },
    calculateBalance: async (userId) => {
        const [rows] = await pool.query(
            "SELECT SUM(amount) as total FROM balance_logs WHERE userId = ?",
            [userId]
        );
        return rows[0].total || 0;
    },
    findAuthById: async (id) => {
        const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
        return rows[0] || null;
    },
    updatePassword: async (id, hashedPassword) => {
        return await pool.query(
            "UPDATE users SET password = ?, updatedAt = NOW() WHERE id = ?",
            [hashedPassword, id]
        );
    },
    findByApiKey: async (apiKey) => {
        const [rows] = await pool.query("SELECT * FROM users WHERE apiKey = ?", [apiKey]);
        return rows[0] || null;
    },
    updateApiKey: async (id, apiKey) => {
        return await pool.query(
            "UPDATE users SET apiKey = ?, updatedAt = NOW() WHERE id = ?",
            [apiKey, id]
        );
    },
    updateCallbackUrl: async (id, callbackUrl) => {
        return await pool.query(
            "UPDATE users SET callbackUrl = ?, updatedAt = NOW() WHERE id = ?",
            [callbackUrl, id]
        );
    },
    updateBukaOlshopConfig: async (id, { apiKey, token }) => {
        return await pool.query(
            "UPDATE users SET bukaolshopApiKey = ?, bukaolshopToken = ?, updatedAt = NOW() WHERE id = ?",
            [apiKey, token, id]
        );
    },
};

export default userRepository;
