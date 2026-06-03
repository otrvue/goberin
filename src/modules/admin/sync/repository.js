import pool from "../../../config/db.js";
import crypto from "crypto";

const productRepository = {
    upsertCategory: async (name, slug) => {
        const id = crypto.randomUUID();
        await pool.query(
            "INSERT INTO categories (id, name, slug, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE updatedAt = NOW()",
            [id, name, slug]
        );
        const [rows] = await pool.query("SELECT id FROM categories WHERE name = ?", [name]);
        return rows[0];
    },
    upsertProvider: async (name, slug) => {
        const id = crypto.randomUUID();
        await pool.query(
            "INSERT INTO providers (id, name, slug, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE updatedAt = NOW()",
            [id, name, slug]
        );
        const [rows] = await pool.query("SELECT id FROM providers WHERE name = ?", [name]);
        return rows[0];
    },
    upsertProduct: async (productData) => {
        const { vendor, vendorSku, ...data } = productData;
        const id = crypto.randomUUID();

        // data contains isActive. We want to insert it if new, but NOT update it if exists.
        const cols = ["id", "vendor", "vendorSku", ...Object.keys(data), "createdAt", "updatedAt"];
        const vals = [id, vendor, vendorSku, ...Object.values(data), new Date(), new Date()];
        const placeholders = cols.map(() => "?").join(", ");

        // Exclude isActive from updates to preserve admin curation
        const updates = Object.keys(data)
            .filter(key => key !== 'isActive')
            .map(key => `${key} = VALUES(${key})`)
            .join(", ");

        return await pool.query(
            `INSERT INTO products (${cols.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}, updatedAt = NOW()`,
            vals
        );
    },

    getAllCategories: async () => {
        const [rows] = await pool.query("SELECT * FROM categories");
        return rows;
    },

    getAllProviders: async () => {
        const [rows] = await pool.query("SELECT * FROM providers");
        return rows;
    },

    getExistingProductsByVendor: async (vendor) => {
        const [rows] = await pool.query(
            "SELECT id, sku, vendorSku, basePrice, isActive FROM products WHERE vendor = ?",
            [vendor]
        );
        return rows;
    },

    createManyProducts: async (dataList) => {
        if (dataList.length === 0) return;
        const products = dataList.map(p => [
            crypto.randomUUID(),
            p.sku,
            p.vendorSku,
            p.vendor,
            p.type,
            p.name,
            p.description,
            p.basePrice,
            p.isActive,
            p.categoryId,
            p.providerId,
            new Date(),
            new Date()
        ]);
        return await pool.query(
            "INSERT IGNORE INTO products (id, sku, vendorSku, vendor, type, name, description, basePrice, isActive, categoryId, providerId, createdAt, updatedAt) VALUES ?",
            [products]
        );
    },

    updateProduct: async (id, data) => {
        const updates = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(`${key} = ?`);
            values.push(value);
        }
        values.push(id);
        return await pool.query(`UPDATE products SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`, values);
    },

    createSyncTask: async (vendor, totalItems) => {
        const id = crypto.randomUUID();
        await pool.query(
            "INSERT INTO sync_tasks (id, vendor, totalItems, status, startTime, updatedAt) VALUES (?, ?, ?, 'RUNNING', NOW(), NOW())",
            [id, vendor, totalItems]
        );
        return { id, vendor, totalItems, status: "RUNNING" };
    },

    updateSyncTask: async (id, data) => {
        const updates = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(`${key} = ?`);
            values.push(value);
        }
        values.push(id);
        return await pool.query(`UPDATE sync_tasks SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`, values);
    },

    getActiveSyncTask: async (vendor) => {
        const [rows] = await pool.query(
            "SELECT * FROM sync_tasks WHERE vendor = ? AND status = 'RUNNING' LIMIT 1",
            [vendor]
        );
        return rows[0] || null;
    },

    getLatestSyncTask: async (vendor) => {
        const [rows] = await pool.query(
            "SELECT * FROM sync_tasks WHERE vendor = ? ORDER BY startTime DESC LIMIT 1",
            [vendor]
        );
        return rows[0] || null;
    },

    getAllInternalSkus: async () => {
        const [rows] = await pool.query("SELECT sku FROM products");
        return rows.map(r => r.sku);
    }
};

export default productRepository;
