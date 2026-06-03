import depositRepository from "../../deposit/repository.js";
import dompetx from "../../../integrations/dompetx/index.js";

const adminPaymentService = {
    getSettings: async () => {
        return await depositRepository.getSettings('DOMPETX');
    },

    updateSettings: async (settings) => {
        await depositRepository.updateSettings(settings, 'DOMPETX');
    },

    testConnection: async () => {
        const settings = await depositRepository.getSettings('DOMPETX');
        if (!settings.dompetx_api_key) {
            throw { status: 400, message: "API Key DompetX belum diatur" };
        }

        try {
            await dompetx.getPaymentMethods(settings.dompetx_api_key);
            return { status: "success", message: "Koneksi ke DompetX berhasil" };
        } catch (error) {
            throw { status: 400, message: `Koneksi gagal: ${error.message}` };
        }
    }
};

export default adminPaymentService;
