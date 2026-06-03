import pool from "../../../config/db.js";
import crypto from "crypto";

const markupRepository = {
    create: async (data) => {
        const id = crypto.randomUUID();
        const columns = ["id", ...Object.keys(data), "createdAt", "updatedAt"];
        const values = [id, ...Object.values(data), new Date(), new Date()];
        const placeholders = columns.map(() => "?").join(", ");

        await pool.query(
            `INSERT INTO markup_prices (${columns.join(", ")}) VALUES (${placeholders})`,
            values
        );
        return { id, ...data };
    },
    findAll: async () => {
        const [rows] = await pool.query(`
            SELECT m.*, 
                   p.name as productName, p.sku as productSku,
                   pr.name as providerName,
                   c.name as categoryName
            FROM markup_prices m
            LEFT JOIN products p ON m.productId = p.id
            LEFT JOIN providers pr ON m.providerId = pr.id
            LEFT JOIN categories c ON m.categoryId = c.id
            ORDER BY m.priority DESC
        `);

        return rows.map(r => ({
            ...r,
            product: r.productId ? { name: r.productName, sku: r.productSku } : null,
            provider: r.providerId ? { name: r.providerName } : null,
            category: r.categoryId ? { name: r.categoryName } : null,
        }));
    },
    findById: async (id) => {
        const [rows] = await pool.query("SELECT * FROM markup_prices WHERE id = ?", [id]);
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
            `UPDATE markup_prices SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`,
            values
        );
        return { id, ...data };
    },
    delete: async (id) => {
        return await pool.query("DELETE FROM markup_prices WHERE id = ?", [id]);
    },
};

export default markupRepository;
