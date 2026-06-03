import pool from "../../../config/db.js";

const userRepository = {
    getStats: async () => {
        const [rows] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive
            FROM users
        `);
        return rows[0];
    },

    getUserById: async (id) => {
        const [rows] = await pool.query(`
            SELECT 
                u.id, u.email, u.username, u.name, u.role, u.status, 
                u.isEmailVerified, u.isTwoFactorEnabled, u.apiKey, 
                u.bukaolshopApiKey, u.bukaolshopToken, u.callbackUrl, 
                u.createdAt, u.updatedAt,
                (SELECT SUM(amount) FROM balance_logs WHERE userId = u.id) as balance
            FROM users u
            WHERE u.id = ?
        `, [id]);
        return rows[0] || null;
    },

    getUsers: async ({ page = 1, limit = 20, search, status }) => {
        const offset = (page - 1) * limit;
        let whereClause = "WHERE 1=1";
        const params = [];

        if (search) {
            whereClause += " AND (name LIKE ? OR email LIKE ? OR username LIKE ?)";
            const pattern = `%${search}%`;
            params.push(pattern, pattern, pattern);
        }

        if (status) {
            whereClause += " AND status = ?";
            params.push(status);
        }

        const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
        const [countRows] = await pool.query(countQuery, params);
        const total = countRows[0].count;

        const dataQuery = `
            SELECT 
                u.id, u.email, u.username, u.name, u.role, u.status, u.createdAt, u.updatedAt,
                (SELECT SUM(amount) FROM balance_logs WHERE userId = u.id) as balance
            FROM users u
            ${whereClause.replace('WHERE', 'WHERE')} 
            ORDER BY u.createdAt DESC
            LIMIT ? OFFSET ?
        `;
        params.push(Number(limit), Number(offset));
        const [rows] = await pool.query(dataQuery, params);

        return {
            items: rows,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    updateUser: async (id, data) => {
        const updates = [];
        const params = [];

        for (const [key, value] of Object.entries(data)) {
            updates.push(`${key} = ?`);
            params.push(value);
        }

        if (updates.length === 0) return null;

        params.push(id);
        const query = `UPDATE users SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`;
        await pool.query(query, params);

        const [rows] = await pool.query("SELECT id, email, username, name, role, status FROM users WHERE id = ?", [id]);
        return rows[0];
    },

    addBalance: async (userId, { amount, description, reference }) => {
        const { v4: uuidv4 } = await import("uuid");
        const logId = uuidv4();

        await pool.query(
            "INSERT INTO balance_logs (id, userId, amount, type, notes, createdAt) VALUES (?, ?, ?, ?, ?, NOW(3))",
            [logId, userId, amount, 'TOPUP', description || "Manual adjustment by Admin",]
        );

        const [rows] = await pool.query(
            "SELECT SUM(amount) as total FROM balance_logs WHERE userId = ?",
            [userId]
        );

        return {
            logId,
            newBalance: rows[0].total || 0
        };
    }
};

export default userRepository;
