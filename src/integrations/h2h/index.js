import axios from "axios";
import logger from "../../config/logger.js";

const H2H_URL = "https://api.h2h.id/api/trx";

const h2h = {
    /**
     * Get H2H.id Balance
     */
    getBalance: async (memberId, pin, password) => {
        try {
            const response = await axios.get(`${H2H_URL}/balance`, {
                params: {
                    memberID: memberId,
                    pin,
                    password
                }
            });

            if (response.data.status === false) {
                throw new Error(response.data.message || "Gagal mengambil saldo");
            }

            return response.data.data.balance;
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            logger.error(`H2H.id Balance Error: ${msg}`);
            throw new Error(msg);
        }
    },

    /**
     * Get H2H.id Pricelist
     */
    syncProducts: async (memberId, pin, password) => {
        try {
            const response = await axios.get(`${H2H_URL}/pricelist`, {
                params: {
                    memberID: memberId,
                    pin,
                    password
                }
            });

            if (response.data.status === false) {
                throw new Error(response.data.message || "Gagal mengambil daftar harga");
            }

            // Filter out SMM products as per user request
            return (response.data.data || []).filter(item => item.type !== 'smm');
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            logger.error(`H2H.id Pricelist Error: ${msg}`);
            throw new Error(msg);
        }
    },

    /**
     * Process Transaction (Reguler, Open Denom, or Postpaid Pay)
     */
    processTransaction: async (sku, dest, refId, memberId, pin, password, qty = null, inquiryId = null) => {
        try {
            const params = {
                product: sku,
                dest,
                refID: refId,
                memberID: memberId,
                pin,
                password
            };

            if (qty) params.qty = qty;
            if (inquiryId) params.inquiry_id = inquiryId;

            const response = await axios.get(`${H2H_URL}`, { params });

            if (response.data.status === false) {
                throw new Error(response.data.message || "Gagal memproses transaksi");
            }

            return response.data.data;
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            logger.error(`H2H.id Order Error: ${msg}`);
            throw new Error(msg);
        }
    },

    /**
     * Get Transaction Status
     */
    getStatus: async (refId, memberId, pin, password) => {
        try {
            const response = await axios.get(`${H2H_URL}/status`, {
                params: {
                    refID: refId,
                    memberID: memberId,
                    pin,
                    password
                }
            });

            if (response.data.status === false) {
                throw new Error(response.data.message || "Gagal mengecek status");
            }

            return response.data.data;
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            logger.error(`H2H.id Status Check Error: ${msg}`);
            throw new Error(msg);
        }
    },

    /**
     * Bill Inquiry (Cek Tagihan)
     */
    billInquiry: async (sku, customerNo, refId, memberId, pin, password) => {
        try {
            const response = await axios.get(`${H2H_URL}/inquiry`, {
                params: {
                    product: sku,
                    dest: customerNo,
                    refID: refId,
                    memberID: memberId,
                    pin,
                    password
                }
            });

            if (response.data.status === false) {
                throw new Error(response.data.message || "Gagal melakukan inquiry tagihan");
            }

            return response.data.data;
        } catch (error) {
            const msg = error.response?.data?.message || error.message;
            logger.error(`H2H.id Bill Inquiry Error: ${msg}`);
            throw new Error(msg);
        }
    }
};

export default h2h;
