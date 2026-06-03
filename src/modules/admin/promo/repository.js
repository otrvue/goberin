import pool from "../../../config/db.js";
import crypto from "crypto";

const promoRepository = {
    create: async (data, productIds) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const promoId = crypto.randomUUID();
            const columns = ["id", ...Object.keys(data), "createdAt", "updatedAt"];
            const values = [promoId, ...Object.values(data), new Date(), new Date()];
            const placeholders = columns.map(() => "?").join(", ");

            await conn.query(
                `INSERT INTO promos (${columns.join(", ")}) VALUES (${placeholders})`,
                values
            );

            if (productIds && productIds.length > 0) {
                const promoProducts = productIds.map(productId => [
                    crypto.randomUUID(),
                    promoId,
                    productId
                ]);
                await conn.query(
                    "INSERT INTO promo_products (id, promoId, productId) VALUES ?",
                    [promoProducts]
                );
            }

            await conn.commit();
            return { id: promoId, ...data };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },
    findAll: async () => {
        const [promos] = await pool.query("SELECT * FROM promos ORDER BY createdAt DESC");
        if (promos.length === 0) return [];

        const promoIds = promos.map(p => p.id);
        const [promoProducts] = await pool.query(`
            SELECT pp.*, p.name as productName, p.sku as productSku
            FROM promo_products pp
            JOIN products p ON pp.productId = p.id
            WHERE pp.promoId IN (?)
        `, [promoIds]);

        return promos.map(promo => ({
            ...promo,
            products: promoProducts
                .filter(pp => pp.promoId === promo.id)
                .map(pp => ({
                    ...pp,
                    product: { name: pp.productName, sku: pp.productSku }
                }))
        }));
    },
    findById: async (id) => {
        const [rows] = await pool.query("SELECT * FROM promos WHERE id = ?", [id]);
        if (rows.length === 0) return null;

        const [products] = await pool.query(
            "SELECT * FROM promo_products WHERE promoId = ?",
            [id]
        );

        return { ...rows[0], products };
    },
    update: async (id, data, productIds) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            if (Object.keys(data).length > 0) {
                const updates = [];
                const values = [];
                for (const [key, value] of Object.entries(data)) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
                values.push(id);
                await conn.query(
                    `UPDATE promos SET ${updates.join(", ")}, updatedAt = NOW() WHERE id = ?`,
                    values
                );
            }

            if (productIds) {
                await conn.query("DELETE FROM promo_products WHERE promoId = ?", [id]);
                if (productIds.length > 0) {
                    const promoProducts = productIds.map(productId => [
                        crypto.randomUUID(),
                        id,
                        productId
                    ]);
                    await conn.query(
                        "INSERT INTO promo_products (id, promoId, productId) VALUES ?",
                        [promoProducts]
                    );
                }
            }

            await conn.commit();
            return promoRepository.findById(id);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },
    delete: async (id) => {
        return await pool.query("DELETE FROM promos WHERE id = ?", [id]);
    },
};

export default promoRepository;
