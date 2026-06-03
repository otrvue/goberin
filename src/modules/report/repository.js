import pool from "../../config/db.js";
import crypto from "crypto";

const reportRepository = {
    create: async (data) => {
        const id = crypto.randomUUID();
        const reportData = {
            id,
            ...data,
            status: "PENDING",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const columns = Object.keys(reportData);
        const values = Object.values(reportData);
        const placeholders = columns.map(() => "?").join(", ");

        await pool.query(
            `INSERT INTO reports (${columns.join(", ")}) VALUES (${placeholders})`,
            values
        );
        return reportData;
    },

    findByUserId: async (userId) => {
        const [rows] = await pool.query(
            `SELECT r.*, t.customerNo, p.name as productName 
             FROM reports r
             LEFT JOIN transactions t ON r.transactionId = t.id
             LEFT JOIN products p ON t.productId = p.id
             WHERE r.userId = ? 
             ORDER BY r.createdAt DESC`,
            [userId]
        );
        return rows;
    },

    findAll: async ({ status, page = 1, limit = 20 }) => {
        const offset = (page - 1) * limit;
        let query = `
            SELECT r.*, t.customerNo, p.name as productName, u.username as userUsername
            FROM reports r
            LEFT JOIN transactions t ON r.transactionId = t.id
            LEFT JOIN products p ON t.productId = p.id
            LEFT JOIN users u ON r.userId = u.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += " AND r.status = ?";
            params.push(status);
        }

        query += " ORDER BY r.createdAt DESC LIMIT ? OFFSET ?";
        params.push(Number(limit), Number(offset));

        const [items] = await pool.query(query, params);

        const countQuery = `SELECT COUNT(*) as count FROM reports WHERE 1=1 ${status ? "AND status = ?" : ""}`;
        const [countRows] = await pool.query(countQuery, status ? [status] : []);
        const total = countRows[0].count;

        return {
            items,
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit)
        };
    },

    findById: async (id) => {
        const [rows] = await pool.query(
            `SELECT r.*, t.customerNo, p.name as productName, u.username as userUsername
             FROM reports r
             LEFT JOIN transactions t ON r.transactionId = t.id
             LEFT JOIN products p ON t.productId = p.id
             LEFT JOIN users u ON r.userId = u.id
             WHERE r.id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    update: async (id, data) => {
        const updates = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(`${key} = ?`);
            values.push(value);
        }
        values.push(id);

        await pool.query(
            `UPDATE reports SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`,
            values
        );
        return { id, ...data };
    }
};

export default reportRepository;
