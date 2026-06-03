import axios from "axios";
import crypto from "crypto";
import logger from "../../config/logger.js";

const DIGIFLAZZ_URL = "https://api.digiflazz.com/v1";

const digiflazz = {
    generateSign: (cmd, username, apiKey) => {
        const u = username || process.env.DIGIFLAZZ_USERNAME;
        const k = apiKey || process.env.DIGIFLAZZ_API_KEY;
        return crypto.createHash("md5").update(u + k + cmd).digest("hex");
    },

    syncProducts: async (username = null, apiKey = null) => {
        const u = username || process.env.DIGIFLAZZ_USERNAME;

        const fetchItems = async (cmd) => {
            try {
                const sign = digiflazz.generateSign(cmd, u, apiKey);
                const response = await axios.post(`${DIGIFLAZZ_URL}/price-list`, {
                    cmd,
                    username: u,
                    sign,
                });
                return response.data.data;
            } catch (error) {
                const msg = error.response?.data?.data?.message || error.message;
                throw new Error(`Sync Error (${cmd}): ${msg}`);
            }
        };

        const prepaidItems = await fetchItems("prepaid");
        const postpaidItems = await fetchItems("pasca");

        if (!Array.isArray(prepaidItems)) {
            logger.error("DigiFlazz Sync: prepaidItems is not an array", prepaidItems);
            throw new Error(`DigiFlazz API Error (Prepaid): ${JSON.stringify(prepaidItems)}`);
        }
        if (!Array.isArray(postpaidItems)) {
            logger.error("DigiFlazz Sync: postpaidItems is not an array", postpaidItems);
            throw new Error(`DigiFlazz API Error (Postpaid): ${JSON.stringify(postpaidItems)}`);
        }

        return [
            ...prepaidItems.map(item => ({ ...item, type: "PREPAID" })),
            ...postpaidItems.map(item => ({ ...item, type: "POSTPAID" })),
        ];
    },

    processTransaction: async (sku, customerNo, refId, username = null, apiKey = null) => {
        const u = username || process.env.DIGIFLAZZ_USERNAME;
        const sign = digiflazz.generateSign(refId, u, apiKey);

        const response = await axios.post(`${DIGIFLAZZ_URL}/transaction`, {
            username: u,
            buyer_sku_code: sku,
            customer_no: customerNo,
            ref_id: refId,
            sign,
        });

        return response.data.data;
    },

    postpaidInquiry: async (sku, customerNo, refId, username = null, apiKey = null) => {
        const u = username || process.env.DIGIFLAZZ_USERNAME;
        const sign = digiflazz.generateSign(refId, u, apiKey);

        const response = await axios.post(`${DIGIFLAZZ_URL}/transaction`, {
            commands: "inq-pasca",
            username: u,
            buyer_sku_code: sku,
            customer_no: customerNo,
            ref_id: refId,
            sign,
        });

        return response.data.data;
    },

    postpaidPayment: async (sku, customerNo, refId, username = null, apiKey = null) => {
        const u = username || process.env.DIGIFLAZZ_USERNAME;
        const sign = digiflazz.generateSign(refId, u, apiKey);

        const response = await axios.post(`${DIGIFLAZZ_URL}/transaction`, {
            commands: "pay-pasca",
            username: u,
            buyer_sku_code: sku,
            customer_no: customerNo,
            ref_id: refId,
            sign,
        });

        return response.data.data;
    },

    postpaidStatus: async (sku, customerNo, refId, username = null, apiKey = null) => {
        const u = username || process.env.DIGIFLAZZ_USERNAME;
        const sign = digiflazz.generateSign(refId, u, apiKey);

        const response = await axios.post(`${DIGIFLAZZ_URL}/transaction`, {
            commands: "status-pasca",
            username: u,
            buyer_sku_code: sku,
            customer_no: customerNo,
            ref_id: refId,
            sign,
        });

        return response.data.data;
    },

    parseCallback: (payload, webhookId = null, webhookSecret = null, signature = null) => {
        const expectedHookId = webhookId || process.env.DIGIFLAZZ_WEBHOOK_ID;
        const secret = webhookSecret || process.env.DIGIFLAZZ_WEBHOOK_SECRET;

        // Optional: Signature verification if secret and signature are provided
        if (secret && signature) {
            const hmac = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
            if (hmac !== signature) {
                logger.warn("DigiFlazz Callback: HMAC signature mismatch");
                // return null; // Uncomment to enforce verification
            }
        }

        // Check for Ping Event
        if (payload.hook_id && payload.sed && payload.hook) {
            if (expectedHookId && payload.hook_id !== expectedHookId) {
                logger.warn(`DigiFlazz Ping: Hook ID mismatch. Expected ${expectedHookId}, got ${payload.hook_id}`);
                return null;
            }
            return { type: "PING", hookId: payload.hook_id, url: payload.hook.url };
        }

        const data = payload.data;
        if (!data) return null;

        const { ref_id, status, rc, sn, message } = data;

        let internalStatus = "PENDING";
        if (status.toLowerCase() === "sukses" || rc === "00") {
            internalStatus = "SUCCESS";
        } else if (status.toLowerCase() === "gagal" || ["01", "02", "40", "41", "44", "49", "58"].includes(rc)) {
            internalStatus = "FAILED";
        }

        return { type: "TRANSACTION", ref_id, status: internalStatus, sn, message };
    },

    getBalance: async (username = null, apiKey = null) => {
        const u = username || process.env.DIGIFLAZZ_USERNAME;
        const sign = digiflazz.generateSign("depo", u, apiKey);

        const response = await axios.post(`${DIGIFLAZZ_URL}/cek-saldo`, {
            cmd: "deposit",
            username: u,
            sign,
        });

        return response.data.data.deposit;
    }
};

export default digiflazz;
