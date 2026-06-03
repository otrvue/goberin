import userService from "./service.js";

const userController = {
    getProfile: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const profile = await userService.getProfile(userId);

            return res.status(200).json({
                success: true,
                message: "Profile retrieved successfully",
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    },

    changePassword: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                throw { status: 400, message: "Password lama dan baru harus diisi", errorCode: "PASSWORDS_REQUIRED" };
            }

            if (newPassword.length < 6) {
                throw { status: 400, message: "Password baru minimal 6 karakter", errorCode: "PASSWORD_TOO_SHORT" };
            }

            await userService.changePassword(userId, oldPassword, newPassword);

            return res.status(200).json({
                success: true,
                message: "Password berhasil diubah",
            });
        } catch (error) {
            next(error);
        }
    },

    generateApiKey: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const apiKey = await userService.generateApiKey(userId);

            return res.status(200).json({
                success: true,
                message: "API Key generated successfully",
                data: { apiKey },
            });
        } catch (error) {
            next(error);
        }
    },

    updateCallbackUrl: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { callbackUrl } = req.body;

            if (!callbackUrl) {
                throw { status: 400, message: "Callback URL is required" };
            }

            await userService.setCallbackUrl(userId, callbackUrl);

            return res.status(200).json({
                success: true,
                message: "Callback URL updated successfully",
            });
        } catch (error) {
            next(error);
        }
    },

    updateBukaOlshopConfig: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { apiKey, token } = req.body;

            if (!apiKey || !token) {
                throw { status: 400, message: "API Key dan Token BukaOlshop harus diisi", errorCode: "CONFIG_INCOMPLETE" };
            }

            await userService.updateBukaOlshopConfig(userId, { apiKey, token });

            return res.status(200).json({
                success: true,
                message: "Konfigurasi BukaOlshop berhasil disimpan",
            });
        } catch (error) {
            next(error);
        }
    },

    testBukaOlshopConfig: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const result = await userService.testBukaOlshopConfig(userId);

            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },
};

export default userController;
