import markupRepository from "./repository.js";

const markupService = {
    createMarkup: async (data) => {
        // Map targetId to specific database columns
        if (data.targetId) {
            if (data.target === "PRODUCT") data.productId = data.targetId;
            if (data.target === "PROVIDER") data.providerId = data.targetId;
            if (data.target === "CATEGORY") data.categoryId = data.targetId;
        }
        delete data.targetId;

        // Dynamic priority assignment
        const priorityMap = {
            PRODUCT: 4,
            PROVIDER: 3,
            CATEGORY: 2,
            GLOBAL: 1,
        };

        if (data.priority === undefined) {
            data.priority = priorityMap[data.target];
        }

        return await markupRepository.create(data);
    },
    getAllMarkups: async () => {
        return await markupRepository.findAll();
    },
    updateMarkup: async (id, data) => {
        // Map targetId to specific database columns
        if (data.targetId) {
            if (data.target === "PRODUCT") data.productId = data.targetId;
            if (data.target === "PROVIDER") data.providerId = data.targetId;
            if (data.target === "CATEGORY") data.categoryId = data.targetId;
        }
        delete data.targetId;

        if (data.target && data.priority === undefined) {
            const priorityMap = {
                PRODUCT: 4,
                PROVIDER: 3,
                CATEGORY: 2,
                GLOBAL: 1,
            };
            data.priority = priorityMap[data.target];
        }
        return await markupRepository.update(id, data);
    },
    deleteMarkup: async (id) => {
        return await markupRepository.delete(id);
    },
};

export default markupService;
