import crypto from "crypto";
import pool from "../../../config/db.js";
import trxRepository from "../repository.js";

export const parseMetadata = (metadata) => {
    if (!metadata) {
        return {};
    }

    if (typeof metadata === "object") {
        return metadata;
    }

    try {
        return JSON.parse(metadata);
    } catch (error) {
        return {};
    }
};

const serializeMetadata = (metadata) => JSON.stringify(metadata || {});

const pascabayarRepository = {
    getProductBySku: async (sku) => {
        return await trxRepository.getProductBySku(sku);
    },

    getTransactionById: async (transactionId) => {
        const transaction = await trxRepository.getTransactionById(transactionId);
        if (!transaction) {
            return null;
        }

        return {
            ...transaction,
            metadata: parseMetadata(transaction.metadata)
        };
    },

    createInquiryTransaction: async ({ userId, product, request, pricing, metadata }) => {
        const transaction = {
            id: crypto.randomUUID(),
            userId,
            productId: product.id,
            customerNo: request.customerNo,
            basePrice: pricing.providerTotal,
            markupPrice: pricing.markupAmount,
            promoDiscount: 0,
            totalPrice: pricing.totalAmount,
            status: "PENDING",
            vendorTrxId: metadata.providerInquiryId || metadata.providerTransactionId || metadata.providerRefId || request.referenceId,
            notes: "Pascabayar Inquiry",
            metadata: serializeMetadata(metadata),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const columns = Object.keys(transaction);
        const values = Object.values(transaction);
        const placeholders = columns.map(() => "?").join(", ");

        await pool.query(
            `INSERT INTO transactions(${columns.join(", ")}) VALUES(${placeholders})`,
            values
        );

        return transaction;
    },

    updateTransaction: async (transactionId, data) => {
        const updateData = { ...data };
        if (updateData.metadata && typeof updateData.metadata !== "string") {
            updateData.metadata = serializeMetadata(updateData.metadata);
        }

        return await trxRepository.updateTransaction(transactionId, updateData);
    },

    mergeMetadata: async (transaction, metadata) => {
        const currentMetadata = parseMetadata(transaction.metadata);
        const mergedMetadata = {
            ...currentMetadata,
            ...metadata
        };

        await trxRepository.updateTransaction(transaction.id, {
            metadata: serializeMetadata(mergedMetadata)
        });

        return mergedMetadata;
    },

    findByProviderReference: async (providerReference) => {
        const [rows] = await pool.query(`
            SELECT t.*, p.name as productName, p.sku as productSku
            FROM transactions t
            LEFT JOIN products p ON t.productId = p.id
            WHERE JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.providerRefId')) = ?
               OR JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.providerPaymentRefId')) = ?
            ORDER BY t.createdAt DESC
            LIMIT 1
        `, [providerReference, providerReference]);

        if (!rows.length) {
            return null;
        }

        const transaction = rows[0];
        return {
            ...transaction,
            product: { id: transaction.productId, name: transaction.productName, sku: transaction.productSku },
            metadata: parseMetadata(transaction.metadata)
        };
    },

    findLatestByReferenceId: async (referenceId) => {
        const [rows] = await pool.query(`
            SELECT t.*, p.name as productName, p.sku as productSku
            FROM transactions t
            LEFT JOIN products p ON t.productId = p.id
            WHERE JSON_UNQUOTE(JSON_EXTRACT(t.metadata, '$.providerRefId')) = ?
            ORDER BY t.createdAt DESC
            LIMIT 1
        `, [referenceId]);

        if (!rows.length) {
            return null;
        }

        const transaction = rows[0];
        return {
            ...transaction,
            product: { id: transaction.productId, name: transaction.productName, sku: transaction.productSku },
            metadata: parseMetadata(transaction.metadata)
        };
    },

    getUserBalance: async (userId) => {
        const [rows] = await pool.query(
            "SELECT SUM(amount) as total FROM balance_logs WHERE userId = ?",
            [userId]
        );

        return Number(rows[0]?.total || 0);
    }
};

export default pascabayarRepository;
