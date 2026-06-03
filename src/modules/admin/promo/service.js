import promoRepository from "./repository.js";

const promoService = {
    createPromo: async (data, productIds) => {
        return await promoRepository.create(data, productIds);
    },
    getAllPromos: async () => {
        return await promoRepository.findAll();
    },
    updatePromo: async (id, data, productIds) => {
        return await promoRepository.update(id, data, productIds);
    },
    deletePromo: async (id) => {
        return await promoRepository.delete(id);
    },
};

export default promoService;
