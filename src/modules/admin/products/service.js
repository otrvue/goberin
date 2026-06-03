import productRepository from "./repository.js";

const productService = {
    getProducts: async (filters) => {
        return await productRepository.getProducts(filters);
    },

    getCategories: async () => {
        return await productRepository.getCategories();
    },

    getProviders: async (categoryId) => {
        return await productRepository.getProviders(categoryId);
    },

    updateProduct: async (oldSku, data) => {
        // If SKU is changing, check for uniqueness
        if (data.sku && data.sku !== oldSku) {
            const existing = await productRepository.getProductBySku(data.sku);
            if (existing) {
                throw { status: 400, message: "SKU sudah digunakan oleh produk lain", errorCode: "DUPLICATE_SKU" };
            }
        }
        return await productRepository.updateProductBySku(oldSku, data);
    },

    updateCategory: async (id, data) => {
        return await productRepository.updateCategory(id, data);
    },

    updateProvider: async (id, data) => {
        return await productRepository.updateProvider(id, data);
    },

    bulkUpdateStatus: async (data) => {
        return await productRepository.bulkUpdateStatus(data);
    },
};

export default productService;
