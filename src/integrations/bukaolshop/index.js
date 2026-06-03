import axios from "axios";
import logger from "../../config/logger.js";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const bukaolshop = {
    /**
     * Get user info from BukaOlshop
     * @param {string} apiKey - BukaOlshop API Key (Bearer)
     * @param {string} token - BukaOlshop API Token (Query)
     * @param {string} tokenUser - End user token
     * @param {string} idUser - End user ID
     */
    getUserInfo: async (apiKey, token, tokenUser, idUser) => {
        try {
            const response = await axios.get("https://openapi.bukaolshop.net/v1/user/info", {
                params: { token, token_user: tokenUser, id_user: idUser }
            });

            if (response.data.code !== 200) {
                throw new Error(response.data.status || "Failed to fetch user info");
            }

            return response.data.data;
        } catch (error) {
            const msg = error.response?.data?.status || error.message;
            logger.error(`BukaOlshop getUserInfo Error: ${msg}`);
            throw new Error(msg);
        }
    },

    /**
     * Update member balance in BukaOlshop with retry mechanism for rate limits
     * BukaOlshop has a 5-second cooldown for balance updates on the same user.
     */
    updateBalance: async (apiKey, params, retries = 5) => {
        for (let i = 0; i <= retries; i++) {
            try {
                const formParams = new URLSearchParams();
                for (const key in params) {
                    if (params[key] !== undefined && params[key] !== null) {
                        formParams.append(key, params[key]);
                    }
                }

                const response = await axios.post("https://bukaolshop.net/api/v1/member/saldo", formParams, {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                });

                if (response.data.code === 200) {
                    return response.data;
                }

                // If not 200, check if it's a frequency limit error
                const statusMsg = response.data.status?.toLowerCase() || "";
                const isRateLimit = statusMsg.includes("limit") ||
                    statusMsg.includes("tunggu") ||
                    statusMsg.includes("beberapa saat") ||
                    statusMsg.includes("cepat") ||
                    statusMsg.includes("detik") ||
                    statusMsg.includes("jarak") ||
                    statusMsg.includes("dekat") ||
                    statusMsg.includes("frekuensi") ||
                    statusMsg.includes("frequency") ||
                    response.data.code === 429;

                if (isRateLimit) {
                    if (i < retries) {
                        logger.warn(`BukaOlshop balance update rate limited for user ${params.id_user}: "${statusMsg}". Retrying in 6s... (Attempt ${i + 1}/${retries})`);
                        await sleep(6500); // 6.5s to be safe
                        continue;
                    }
                }

                throw new Error(response.data.status || "Failed to update balance");
            } catch (error) {
                const statusMsg = error.response?.data?.status?.toLowerCase() || error.message?.toLowerCase() || "";

                // Retry on rate limit or network errors
                const isRateLimit = statusMsg.includes("limit") ||
                    statusMsg.includes("tunggu") ||
                    statusMsg.includes("cepat") ||
                    statusMsg.includes("detik") ||
                    statusMsg.includes("jarak") ||
                    statusMsg.includes("dekat") ||
                    statusMsg.includes("frekuensi") ||
                    statusMsg.includes("frequency");

                if (i < retries && (isRateLimit || error.code === "ECONNABORTED" || !error.response)) {
                    logger.warn(`BukaOlshop balance update error for user ${params.id_user}: ${statusMsg}. Retrying in 6.5s... (Attempt ${i + 1}/${retries})`);
                    await sleep(6500);
                    continue;
                }

                const msg = error.response?.data?.status || error.message;
                logger.error(`BukaOlshop updateBalance Error after ${i} retries: ${msg}`);
                throw new Error(msg);
            }
        }
    },

    /**
     * Send notification to BukaOlshop user
     */
    sendNotification: async (apiKey, idUser, title, message) => {
        try {
            const formParams = new URLSearchParams();
            formParams.append("id_user", idUser);
            formParams.append("judul_notifikasi", title);
            formParams.append("pesan_notifikasi", message);

            const response = await axios.post("https://bukaolshop.net/api/v1/member/notifikasi", formParams, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            return response.data;
        } catch (error) {
            const msg = error.response?.data?.status || error.message;
            logger.error(`BukaOlshop sendNotification Error: ${msg}`);
            // Don't throw error here to avoid breaking the main transaction flow if notification fails
            return { success: false, message: msg };
        }
    },

    /**
     * Test BukaOlshop API Key
     */
    testConnection: async (apiKey) => {
        try {
            const response = await axios.get("https://bukaolshop.net/api/v1/aplikasi/info", {
                headers: { Authorization: `Bearer ${apiKey}` }
            });

            if (response.data.code !== 200) {
                return { success: false, message: response.data.status };
            }

            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, message: error.response?.data?.status || error.message };
        }
    }
};

export default bukaolshop;
