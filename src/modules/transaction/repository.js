import pool from "../../config/db.js";
import crypto from "crypto";

const trxRepository = {
    getProductsWithRelations: async (filters = {}, skip = 0, take = 50) => {
        let query = `
            SELECT p.*, c.name as categoryName, c.slug as categorySlug, 
                   pr.name as providerName, pr.slug as providerSlug
            FROM products p
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN providers pr ON p.providerId = pr.id
            WHERE p.isActive = true
        `;
        const params = [];
        if (filters.search) {
            query += " AND (p.name LIKE ? OR p.sku LIKE ?)";
            const pattern = `%${filters.search}%`;
            params.push(pattern, pattern);
        }

        if (filters.categoryId) {
            query += " AND p.categoryId = ?";
            params.push(filters.categoryId);
        }
        if (filters.providerId) {
            query += " AND p.providerId = ?";
            params.push(filters.providerId);
        }
        if (filters.type) {
            query += " AND p.type = ?";
            params.push(filters.type);
        }

        query += " ORDER BY p.name ASC LIMIT ? OFFSET ?";
        params.push(Number(take), Number(skip));

        const [products] = await pool.query(query, params);
        if (products.length === 0) return [];

        const productIds = products.map(p => p.id);

        // Fetch Markups
        const [markups] = await pool.query(
            "SELECT * FROM markup_prices WHERE isActive = true AND productId IN (?)",
            [productIds]
        );

        // Fetch Promos
        const [promoProducts] = await pool.query(`
            SELECT pp.*, pr.name as promoName, pr.discount, pr.type as promoType, pr.startTime, pr.endTime
            FROM promo_products pp
            JOIN promos pr ON pp.promoId = pr.id
            WHERE pp.productId IN(?) 
            AND pr.isActive = true 
            AND pr.startTime <= NOW() 
            AND pr.endTime >= NOW()
    `, [productIds]);

        // Map relations back to products to match Prisma structure
        return products.map(p => ({
            ...p,
            category: { id: p.categoryId, name: p.categoryName, slug: p.categorySlug },
            provider: { id: p.providerId, name: p.providerName, slug: p.providerSlug },
            markups: markups.filter(m => m.productId === p.id),
            promoProducts: promoProducts.filter(pp => pp.productId === p.id).map(pp => ({
                ...pp,
                promo: {
                    id: pp.promoId,
                    name: pp.promoName,
                    discount: pp.discount,
                    type: pp.promoType,
                    startTime: pp.startTime,
                    endTime: pp.endTime
                }
            }))
        }));
    },

    countProducts: async (filters = {}) => {
        let query = "SELECT COUNT(*) as count FROM products WHERE isActive = true";
        const params = [];

        if (filters.categoryId) {
            query += " AND categoryId = ?";
            params.push(filters.categoryId);
        }
        if (filters.providerId) {
            query += " AND providerId = ?";
            params.push(filters.providerId);
        }

        const [rows] = await pool.query(query, params);
        return rows[0].count;
    },

    getProductById: async (id) => {
        const [products] = await pool.query(`
            SELECT p.*, c.name as categoryName, c.slug as categorySlug,
    pr.name as providerName, pr.slug as providerSlug, p.commission
            FROM products p
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN providers pr ON p.providerId = pr.id
            WHERE p.id = ?
    `, [id]);

        if (products.length === 0) return null;
        const p = products[0];

        const [markups] = await pool.query(
            "SELECT * FROM markup_prices WHERE isActive = true AND (productId = ? OR (productId IS NULL AND (categoryId = ? OR providerId = ?))) ORDER BY priority DESC",
            [id, p.categoryId, p.providerId]
        );

        const [promoProducts] = await pool.query(`
            SELECT pp.*, pr.name as promoName, pr.discount, pr.type as promoType, pr.startTime, pr.endTime
            FROM promo_products pp
            JOIN promos pr ON pp.promoId = pr.id
            WHERE pp.productId = ?
    AND pr.isActive = true 
            AND pr.startTime <= NOW() 
            AND pr.endTime >= NOW()
    `, [id]);

        return {
            ...p,
            category: { id: p.categoryId, name: p.categoryName, slug: p.categorySlug },
            provider: { id: p.providerId, name: p.providerName, slug: p.providerSlug },
            markups,
            promoProducts: promoProducts.map(pp => ({
                ...pp,
                promo: {
                    id: pp.promoId,
                    name: pp.promoName,
                    discount: pp.discount,
                    type: pp.promoType,
                    startTime: pp.startTime,
                    endTime: pp.endTime
                }
            }))
        };
    },

    getProductBySku: async (sku) => {
        const [products] = await pool.query(`
            SELECT p.*, c.name as categoryName, c.slug as categorySlug,
    pr.name as providerName, pr.slug as providerSlug, p.commission
            FROM products p
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN providers pr ON p.providerId = pr.id
            WHERE p.sku = ?
    `, [sku]);

        if (products.length === 0) return null;
        return trxRepository.getProductById(products[0].id);
    },

    getTransactionById: async (id) => {
        const [rows] = await pool.query(`
            SELECT t.*, p.name as productName, p.sku as productSku
            FROM transactions t
            LEFT JOIN products p ON t.productId = p.id
            WHERE t.id = ?
    `, [id]);

        if (rows.length === 0) return null;
        const t = rows[0];
        return {
            ...t,
            product: { id: t.productId, name: t.productName, sku: t.productSku }
        };
    },

    getMarkups: async (filters) => {
        const [rows] = await pool.query(`
            SELECT * FROM markup_prices 
            WHERE isActive = true
AND(
    target = 'GLOBAL' 
                OR(target = 'CATEGORY' AND categoryId = ?)
                OR(target = 'PROVIDER' AND providerId = ?)
                OR(target = 'PRODUCT' AND productId = ?)
)
            ORDER BY priority DESC
        `, [filters.categoryId, filters.providerId, filters.productId]);
        return rows;
    },

    getAllActiveMarkups: async () => {
        const [rows] = await pool.query(
            "SELECT * FROM markup_prices WHERE isActive = true ORDER BY priority DESC"
        );
        return rows;
    },

    createTransaction: async (data, balanceLogData) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Check user balance
            const [balanceRows] = await conn.query(
                "SELECT SUM(amount) as total FROM balance_logs WHERE userId = ?",
                [data.userId]
            );
            const currentBalance = balanceRows[0].total || 0;

            if (Number(currentBalance) < Number(data.totalPrice)) {
                throw { status: 400, message: "Saldo tidak cukup", errorCode: "INSUFFICIENT_BALANCE" };
            }

            // 2. Create transaction
            const transactionId = crypto.randomUUID();
            const transactionData = { ...data, id: transactionId, createdAt: new Date(), updatedAt: new Date() };

            const columns = Object.keys(transactionData);
            const values = Object.values(transactionData);
            const placeholders = columns.map(() => "?").join(", ");

            await conn.query(
                `INSERT INTO transactions(${columns.join(", ")}) VALUES(${placeholders})`,
                values
            );

            // 3. Deduct balance
            const balanceLogId = crypto.randomUUID();
            const logData = {
                id: balanceLogId,
                userId: data.userId,
                amount: balanceLogData.amount,
                type: balanceLogData.type,
                notes: balanceLogData.notes || `Transaksi: ${transactionId} `,
                createdAt: new Date()
            };

            const logCols = Object.keys(logData);
            const logVals = Object.values(logData);
            const logPlaceholders = logCols.map(() => "?").join(", ");

            await conn.query(
                `INSERT INTO balance_logs(${logCols.join(", ")}) VALUES(${logPlaceholders})`,
                logVals
            );

            await conn.commit();
            return transactionData;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    updateTransaction: async (id, data) => {
        if (data.notes && data.notes.length > 5000) {
            data.notes = data.notes.substring(0, 5000) + "...";
        }

        const updates = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            updates.push(`${key} = ?`);
            values.push(value);
        }
        values.push(id);

        await pool.query(
            `UPDATE transactions SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ? `,
            values
        );
        return { id, ...data };
    },

    refundTransaction: async (transaction, notes) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Update status
            await conn.query(
                "UPDATE transactions SET status = 'REFUNDED', notes = ?, updatedAt = NOW() WHERE id = ?",
                [notes, transaction.id]
            );

            // 2. Refund balance
            const balanceLogId = crypto.randomUUID();
            await conn.query(
                "INSERT INTO balance_logs (id, userId, amount, type, notes, createdAt) VALUES (?, ?, ?, 'REFUND', ?, NOW())",
                [balanceLogId, transaction.userId, transaction.totalPrice, `Refund Gagal: ${transaction.id} `]
            );

            await conn.commit();
            return { ...transaction, status: "REFUNDED", notes };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    getUserTransactions: async (userId, filters = {}, limit = 50, page = 1) => {
        const offset = (page - 1) * limit;
        let query = "SELECT t.*, p.name as productName, p.sku as productSku FROM transactions t LEFT JOIN products p ON t.productId = p.id WHERE t.userId = ?";
        const params = [userId];

        if (filters.idUser) {
            query += " AND t.bukaolshopIdUser = ?";
            params.push(filters.idUser);
        }
        if (filters.tokenUser) {
            query += " AND t.bukaolshopTokenUser = ?";
            params.push(filters.tokenUser);
        }
        if (filters.search) {
            query += " AND (t.id LIKE ? OR t.customerNo LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)";
            const searchPattern = `%${filters.search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }
        if (filters.status) {
            query += " AND t.status = ?";
            params.push(filters.status);
        }

        const countQuery = `SELECT COUNT(*) as count FROM(${query}) as sub`;
        const [countRows] = await pool.query(countQuery, params);
        const total = countRows[0].count;

        query += " ORDER BY t.createdAt DESC LIMIT ? OFFSET ?";
        params.push(Number(limit), Number(offset));

        const [rows] = await pool.query(query, params);
        return {
            items: rows.map(r => ({
                ...r,
                product: { id: r.productId, name: r.productName, sku: r.productSku }
            })),
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit)
        };
    },

    getVendorBalances: async () => {
        const [rows] = await pool.query("SELECT * FROM vendor_balances");
        return rows;
    },

    updateVendorBalance: async (vendor, balance) => {
        const [rows] = await pool.query("SELECT id FROM vendor_balances WHERE vendor = ?", [vendor]);
        if (rows.length > 0) {
            return await pool.query(
                "UPDATE vendor_balances SET balance = ?, updatedAt = NOW(), lastChecked = NOW() WHERE vendor = ?",
                [balance, vendor]
            );
        } else {
            const id = crypto.randomUUID();
            return await pool.query(
                "INSERT INTO vendor_balances (id, vendor, balance, lastChecked, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
                [id, vendor, balance]
            );
        }
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

    getTransactionWithRelations: async (id) => {
        const [rows] = await pool.query(`
            SELECT t.*,
    u.callbackUrl, u.email, u.username,
    p.sku as productSku, p.name as productName,
    c.name as categoryName, pr.name as providerName
            FROM transactions t
            LEFT JOIN users u ON t.userId = u.id
            LEFT JOIN products p ON t.productId = p.id
            LEFT JOIN categories c ON p.categoryId = c.id
            LEFT JOIN providers pr ON p.providerId = pr.id
            WHERE t.id = ?
    `, [id]);

        if (rows.length === 0) return null;
        const t = rows[0];
        return {
            ...t,
            user: { callbackUrl: t.callbackUrl, email: t.email, username: t.username },
            product: {
                sku: t.productSku,
                name: t.productName,
                category: { name: t.categoryName },
                provider: { name: t.providerName }
            }
        };
    },

    findLastSuccessfulInquiry: async (userId, productId, customerNo) => {
        const [rows] = await pool.query(`
            SELECT t.* FROM transactions t
            JOIN products p_target ON p_target.id = ?
            JOIN products p_inq ON p_inq.id = t.productId
            WHERE t.userId = ? 
                AND t.customerNo = ?
                AND p_inq.providerId = p_target.providerId
                AND t.status = 'SUCCESS' 
                AND t.sn LIKE '%TTAG:%'
            ORDER BY t.createdAt DESC 
            LIMIT 1
    `, [productId, userId, customerNo]);
        return rows[0] || null;
    },

    getBalanceLogs: async ({ page = 1, limit = 20, search, userId, type }) => {
        const offset = (page - 1) * (limit || 20);
        let whereClause = "WHERE 1=1";
        const params = [];

        if (search) {
            whereClause += " AND (l.notes LIKE ? OR u.username LIKE ? OR u.email LIKE ?)";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (userId) {
            whereClause += " AND l.userId = ?";
            params.push(userId);
        }
        if (type) {
            whereClause += " AND l.type = ?";
            params.push(type);
        }

        const countQuery = `SELECT COUNT(*) as count FROM balance_logs l LEFT JOIN users u ON l.userId = u.id ${whereClause}`;
        const [countRows] = await pool.query(countQuery, params);
        const total = countRows[0].count;

        const dataQuery = `
            SELECT l.*, u.username, u.email
            FROM balance_logs l
            LEFT JOIN users u ON l.userId = u.id
            ${whereClause}
            ORDER BY l.createdAt DESC
            LIMIT ? OFFSET ?
        `;
        const dataParams = [...params, Number(limit || 20), Number(offset)];
        const [items] = await pool.query(dataQuery, dataParams);

        return {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / (limit || 20)),
            items,
        };
    },
    findRelatedPaymentProduct: async (providerId) => {
        const [rows] = await pool.query(`
            SELECT * FROM products 
            WHERE providerId = ? 
                AND type != "INQUIRY"
                AND (vendorSku LIKE "B%" OR basePrice > 0)
            ORDER BY basePrice DESC
            LIMIT 1
        `, [providerId]);
        return rows[0] || null;
    },
};

export default trxRepository;
