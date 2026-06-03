import productService from "./service.js";

const productController = {
    getProducts: async (req, res, next) => {
        try {
            const result = await productService.getProducts(req.query);
            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },

    getCategories: async (req, res, next) => {
        try {
            const categories = await productService.getCategories();
            return res.status(200).json({
                success: true,
                data: categories,
            });
        } catch (error) {
            next(error);
        }
    },

    getProviders: async (req, res, next) => {
        try {
            const { categoryId } = req.query;
            const providers = await productService.getProviders(categoryId);
            return res.status(200).json({
                success: true,
                data: providers,
            });
        } catch (error) {
            next(error);
        }
    },

    updateCategory: async (req, res, next) => {
        try {
            const { id } = req.params;
            await productService.updateCategory(id, req.body);
            return res.status(200).json({
                success: true,
                message: "Category updated successfully",
            });
        } catch (error) {
            next(error);
        }
    },

    updateProvider: async (req, res, next) => {
        try {
            const { id } = req.params;
            await productService.updateProvider(id, req.body);
            return res.status(200).json({
                success: true,
                message: "Provider updated successfully",
            });
        } catch (error) {
            next(error);
        }
    },

    updateProduct: async (req, res, next) => {
        try {
            const { sku } = req.params;
            const product = await productService.updateProduct(sku, req.body);
            return res.status(200).json({
                success: true,
                message: "Product updated successfully",
                data: product,
            });
        } catch (error) {
            next(error);
        }
    },

    bulkUpdateStatus: async (req, res, next) => {
        try {
            await productService.bulkUpdateStatus(req.body);
            return res.status(200).json({
                success: true,
                message: "Bulk product update successful",
            });
        } catch (error) {
            next(error);
        }
    },
};

export default productController;
