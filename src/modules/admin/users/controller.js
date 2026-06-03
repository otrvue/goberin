import userService from "./service.js";

const userController = {
    getStats: async (req, res, next) => {
        try {
            const stats = await userService.getStats();
            return res.status(200).json({ success: true, data: stats });
        } catch (error) {
            next(error);
        }
    },

    getUsers: async (req, res, next) => {
        try {
            const { page, limit, search, status } = req.query;
            const result = await userService.getUsers({
                page: Number(page) || 1,
                limit: Number(limit) || 20,
                search,
                status
            });
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },

    getUserById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await userService.getUserById(id);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },

    updateUser: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await userService.updateUser(id, req.body);
            return res.status(200).json({
                success: true,
                message: "User berhasil diperbarui",
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    addBalance: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await userService.addBalance(id, req.body);
            return res.status(200).json({
                success: true,
                message: "Saldo berhasil ditambahkan",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

export default userController;
