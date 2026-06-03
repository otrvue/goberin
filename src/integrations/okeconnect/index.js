import axios from "axios";
import logger from "../../config/logger.js";

const OKECONNECT_URL = "https://www.okeconnect.com";
const OKECONNECT_TRX_URL = "https://h2h.okeconnect.com/trx";

const okeconnect = {
    syncProducts: async (apiId = null) => {
        const id = apiId || process.env.OKECONNECT_API_ID;
        const response = await axios.get(`${OKECONNECT_URL}/harga/json?id=${id}`);
        return response.data;
    },

    processTransaction: async (sku, customerNo, refId, qty = null, memberId = null, pin = null, password = null) => {
        const mId = memberId || process.env.OKECONNECT_MEMBER_ID;
        const p = pin || process.env.OKECONNECT_PIN;
        const pass = password || process.env.OKECONNECT_PASSWORD;

        const params = new URLSearchParams({
            product: sku,
            dest: customerNo,
            refID: refId,
            memberID: mId,
            pin: p,
            password: pass
        });

        if (qty) params.append("qty", qty);

        const response = await axios.get(`${OKECONNECT_TRX_URL}?${params.toString()}`);

        // Return raw text to let the caller handle vendor-specific parsing or provide a helper
        const rawBody = response.data;
        if (typeof rawBody === "string" && rawBody.includes("GAGAL")) {
            throw new Error(rawBody);
        }
        return rawBody;
    },

    checkStatus: async (sku, customerNo, refId, memberId = null, pin = null, password = null) => {
        const mId = memberId || process.env.OKECONNECT_MEMBER_ID;
        const p = pin || process.env.OKECONNECT_PIN;
        const pass = password || process.env.OKECONNECT_PASSWORD;

        const params = new URLSearchParams({
            product: sku,
            dest: customerNo,
            refID: refId,
            memberID: mId,
            pin: p,
            password: pass,
            check: "1"
        });

        const response = await axios.get(`${OKECONNECT_TRX_URL}?${params.toString()}`);
        return response.data;
    },

    parseTrxResponse: (rawResponse) => {
        const trxId = rawResponse.match(/T#(\d+)/)?.[1];
        return { trxId };
    },

    parseCallback: (query) => {
        const { refid, message } = query;
        if (!refid || !message) return null;

        const decodedMessage = decodeURIComponent(message);
        const isSuccess = decodedMessage.includes("SUKSES");
        const isFailed = decodedMessage.includes("GAGAL");

        let status = "PENDING";
        let sn = "";

        if (isSuccess) {
            status = "SUCCESS";
            sn = decodedMessage.match(/SN:(.+?)\./)?.[1] || "";
        } else if (isFailed) {
            status = "FAILED";
        }

        return { ref_id: refid, status, sn, message: decodedMessage };
    },

    getBalance: async (memberId = null, pin = null, password = null) => {
        const mId = memberId || process.env.OKECONNECT_MEMBER_ID;
        const p = pin || process.env.OKECONNECT_PIN;
        const pass = password || process.env.OKECONNECT_PASSWORD;

        const params = new URLSearchParams({
            memberID: mId,
            pin: p,
            password: pass
        });

        const response = await axios.get(`${OKECONNECT_TRX_URL}/balance?${params.toString()}`);

        const rawBody = response.data;
        logger.info(`OkeConnect Balance Response: ${rawBody}`);

        if (typeof rawBody === "string" && (
            rawBody.includes("GAGAL") ||
            rawBody.includes("IP tidak sesuai") ||
            rawBody.includes("Salah Password") ||
            rawBody.includes("Pin Salah") ||
            rawBody.includes("User tidak ditemukan")
        )) {
            throw new Error(rawBody);
        }

        if (typeof rawBody !== "string") {
            return rawBody?.balance || null;
        }

        // Parse: "Saldo 284.939" -> 284939
        const match = rawBody.match(/Saldo\s+([\d\.]+)/i);
        if (match) {
            return match[1].replace(/\./g, "");
        }

        // Final fallback: any numeric pattern if "Saldo" isn't found but string is numeric
        const numericMatch = rawBody.match(/([\d\.]+)/);
        if (numericMatch && !rawBody.includes("@")) { // Avoid grabbing IP
            return numericMatch[1].replace(/\./g, "");
        }

        return null;
    }
};

export default okeconnect;
