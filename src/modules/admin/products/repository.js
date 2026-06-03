import pool from "../../../config/db.js";

const productRepository = {
    getProducts: async ({ page = 1, limit = 20, search, status, categoryId, providerId }) => {
        const offset = (page - 1) * limit;

        let whereClause = "WHERE 1=1";
        const params = [];

        if (search) {
            whereClause += " AND (p.sku LIKE ? OR p.name LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status !== undefined) {
            whereClause += " AND p.isActive = ?";
            params.push(status === "active");
        }
        if (categoryId) {
            whereClause += " AND p.categoryId = ?";
            params.push(categoryId);
        }
        if (providerId) {
            whereClause += " AND p.providerId = ?";
            params.push(providerId);
        }

        const countQuery = `SELECT COUNT(*) as count FROM products p ${whereClause}`;
        const [countRows] = await pool.query(countQuery, params);
        const total = countRows[0].count;

        const dataQuery = `
            SELECT p.*, c.name as categoryName, pr.name as providerName
            FROM products p
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN providers pr ON p.providerId = pr.id
            ${whereClause}
            ORDER BY p.createdAt DESC
            LIMIT ? OFFSET ?
        `;
        const dataParams = [...params, Number(limit), Number(offset)];
        const [items] = await pool.query(dataQuery, dataParams);

        const mappedItems = items.map(item => ({
            ...item,
            category: { name: item.categoryName },
            provider: { name: item.providerName }
        }));

        return {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
            items: mappedItems,
        };
    },

    getCategories: async () => {
        const [rows] = await pool.query("SELECT * FROM categories ORDER BY name ASC");
        return rows;
    },

    getProviders: async (categoryId = null) => {
        if (categoryId) {
            const [rows] = await pool.query(`
                SELECT DISTINCT pr.*
                FROM providers pr
                JOIN products p ON p.providerId = pr.id
                WHERE p.categoryId = ?
                ORDER BY pr.name ASC
            `, [categoryId]);
            return rows;
        }
        const [rows] = await pool.query("SELECT * FROM providers ORDER BY name ASC");
        return rows;
    },

    updateProductById: async (id, data) => {
        const updates = [];
        const params = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(`${key} = ?`);
            params.push(value);
        }
        params.push(id);
        return await pool.query(
            `UPDATE products SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`,
            params
        );
    },

    updateProductBySku: async (sku, data) => {
        const updates = [];
        const params = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(`${key} = ?`);
            params.push(value);
        }
        params.push(sku);
        return await pool.query(
            `UPDATE products SET ${updates.join(", ")}, updatedAt = NOW() WHERE sku = ?`,
            params
        );
    },

    getProductBySku: async (sku) => {
        const [rows] = await pool.query("SELECT * FROM products WHERE sku = ?", [sku]);
        return rows[0];
    },

    updateCategory: async (id, data) => {
        return await pool.query(
            "UPDATE categories SET name = ?, slug = ?, description = ?, updatedAt = NOW() WHERE id = ?",
            [data.name, data.slug, data.description, id]
        );
    },

    updateProvider: async (id, data) => {
        return await pool.query(
            "UPDATE providers SET name = ?, slug = ?, description = ?, updatedAt = NOW() WHERE id = ?",
            [data.name, data.slug, data.description, id]
        );
    },

    bulkUpdateStatus: async ({ skus, categoryId, providerId, isActive }) => {
        let query = "UPDATE products SET isActive = ?, updatedAt = NOW() WHERE ";
        const params = [isActive];

        if (skus && skus.length > 0) {
            query += "sku IN (?)";
            params.push(skus);
        } else if (categoryId) {
            query += "categoryId = ?";
            params.push(categoryId);
        } else if (providerId) {
            query += "providerId = ?";
            params.push(providerId);
        } else {
            throw new Error("Target update tidak valid");
        }

        return await pool.query(query, params);
    },
};

export default productRepository;
