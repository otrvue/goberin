import pool from "../../../config/db.js";

const transactionRepository = {
    getTransactions: async ({ page = 1, limit = 20, search, status }) => {
        const offset = (page - 1) * limit;

        let whereClause = "WHERE 1=1";
        const params = [];

        if (search) {
            whereClause += " AND (t.customerNo LIKE ? OR t.id LIKE ? OR t.vendorTrxId LIKE ? OR p.sku LIKE ? OR u.username LIKE ?)";
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }
        if (status) {
            whereClause += " AND t.status = ?";
            params.push(status);
        }

        const joins = `
            FROM transactions t
            LEFT JOIN users u ON t.userId = u.id
            LEFT JOIN products p ON t.productId = p.id
        `;

        const countQuery = `SELECT COUNT(*) as count ${joins} ${whereClause}`;
        const [countRows] = await pool.query(countQuery, params);
        const total = countRows[0].count;

        const dataQuery = `
            SELECT t.*, 
                   u.username as userUsername, u.name as userName,
                   p.name as productName, p.sku as productSku,
                   c.name as categoryName, pr.name as providerName
            ${joins}
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN providers pr ON p.providerId = pr.id
            ${whereClause}
            ORDER BY t.createdAt DESC
            LIMIT ? OFFSET ?
        `;
        const dataParams = [...params, Number(limit), Number(offset)];
        const [items] = await pool.query(dataQuery, dataParams);

        // Map items to match Prisma's nested structure if UI expects it
        const mappedItems = items.map(item => ({
            ...item,
            user: { username: item.userUsername, name: item.userName },
            product: {
                name: item.productName,
                sku: item.productSku,
                category: { name: item.categoryName },
                provider: { name: item.providerName }
            }
        }));

        return {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
            items: mappedItems,
        };
    },

    getTransactionById: async (id) => {
        const query = `
            SELECT t.*, 
                   u.username as userUsername, u.name as userName,
                   p.name as productName, p.sku as productSku,
                   c.name as categoryName, pr.name as providerName
            FROM transactions t
            LEFT JOIN users u ON t.userId = u.id
            LEFT JOIN products p ON t.productId = p.id
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN providers pr ON p.providerId = pr.id
            WHERE t.id = ?
        `;
        const [rows] = await pool.query(query, [id]);
        if (rows.length === 0) return null;

        const item = rows[0];
        return {
            ...item,
            user: { username: item.userUsername, name: item.userName },
            product: {
                name: item.productName,
                sku: item.productSku,
                category: { name: item.categoryName },
                provider: { name: item.providerName }
            }
        };
    },

    updateTransaction: async (id, data) => {
        const updates = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(`${key} = ?`);
            values.push(value);
        }
        values.push(id);

        const query = `UPDATE transactions SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`;
        await pool.query(query, values);

        return { id, ...data };
    }
};

export default transactionRepository;
