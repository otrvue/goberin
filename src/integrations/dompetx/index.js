import axios from "axios";
import crypto from "crypto";
import logger from "../../config/logger.js";

const DOMPETX_URL = "https://api.dompetx.com/v1";

const dompetx = {
    generateSignature: (apiKey, timestamp, body) => {
        const bodyString = typeof body === "string" ? body : JSON.stringify(body);
        const signatureData = timestamp + "." + bodyString;
        return crypto
            .createHmac("sha256", apiKey)
            .update(signatureData)
            .digest("hex");
    },

    createTransaction: async (apiKey, data) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const body = {
            method: data.method,
            amount: Number(data.amount),
            currency: data.currency || "IDR",
            reference: data.reference
        };

        const signature = dompetx.generateSignature(apiKey, timestamp, body);

        try {
            const response = await axios.post(`${DOMPETX_URL}/payments`, body, {
                headers: {
                    "X-DOMPAY-API-Key": apiKey,
                    "X-DOMPAY-Signature": signature,
                    "X-DOMPAY-Timestamp": timestamp,
                    "Idempotency-Key": `req_${Date.now()}_${data.reference}`,
                    "Content-Type": "application/json"
                }
            });
            return response.data;
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            logger.error(`DompetX Create Transaction Error: ${msg}`);
            throw new Error(`DompetX Error: ${msg}`);
        }
    },

    getPaymentMethods: async (apiKey) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const body = "{}";
        const signature = dompetx.generateSignature(apiKey, timestamp, body);

        try {
            const response = await axios.get(`${DOMPETX_URL}/payments/channel`, {
                headers: {
                    "X-DOMPAY-API-Key": apiKey,
                    "X-DOMPAY-Signature": signature,
                    "X-DOMPAY-Timestamp": timestamp
                }
            });
            return response.data;
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            logger.error(`DompetX Get Payment Methods Error: ${msg}`);
            throw new Error(`DompetX Error: ${msg}`);
        }
    },

    getTransactionDetail: async (apiKey, id) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const body = ""; // For GET requests, body is empty
        const signature = dompetx.generateSignature(apiKey, timestamp, body);

        try {
            const response = await axios.get(`${DOMPETX_URL}/payments/detail/${id}`, {
                headers: {
                    "X-DOMPAY-API-Key": apiKey,
                    "X-DOMPAY-Signature": signature,
                    "X-DOMPAY-Timestamp": timestamp
                }
            });
            return response.data;
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            logger.error(`DompetX Get Transaction Detail Error: ${msg}`);
            throw new Error(`DompetX Error: ${msg}`);
        }
    },

    checkStatus: async (apiKey, transactionId) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const body = "";
        const signature = dompetx.generateSignature(apiKey, timestamp, body);

        try {
            const response = await axios.get(`${DOMPETX_URL}/payments/check-status/${transactionId}`, {
                headers: {
                    "X-DOMPAY-API-Key": apiKey,
                    "X-DOMPAY-Signature": signature,
                    "X-DOMPAY-Timestamp": timestamp
                }
            });
            return response.data;
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            logger.error(`DompetX Check Status Error: ${msg}`);
            throw new Error(`DompetX Error: ${msg}`);
        }
    },

    cancelTransaction: async (apiKey, id) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const body = "";
        const signature = dompetx.generateSignature(apiKey, timestamp, body);

        try {
            const response = await axios.post(`${DOMPETX_URL}/payments/cancel/${id}`, null, {
                headers: {
                    "X-DOMPAY-API-Key": apiKey,
                    "X-DOMPAY-Signature": signature,
                    "X-DOMPAY-Timestamp": timestamp
                }
            });
            return response.data;
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            logger.error(`DompetX Cancel Transaction Error: ${msg}`);
            throw new Error(`DompetX Error: ${msg}`);
        }
    }
};

export default dompetx;
