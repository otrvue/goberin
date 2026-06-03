import bcrypt from "bcryptjs";
import crypto from "crypto";
import userRepository from "./repository.js";
import bukaolshop from "../../integrations/bukaolshop/index.js";

const userService = {
    getProfile: async (userId) => {
        const user = await userRepository.findById(userId);
        if (!user) throw { status: 404, message: "User not found", errorCode: "USER_NOT_FOUND" };

        const balance = await userRepository.calculateBalance(userId);

        // Mask sensitive data
        const mask = (str) => {
            if (!str) return null;
            if (str.length < 10) return "****";
            return str.substring(0, 6) + "..." + str.substring(str.length - 4);
        };

        const safeUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role,
            status: user.status,
            isEmailVerified: user.isEmailVerified,
            isTwoFactorEnabled: user.isTwoFactorEnabled,
            apiKey: mask(user.apiKey),
            bukaolshopApiKey: mask(user.bukaolshopApiKey),
            bukaolshopToken: mask(user.bukaolshopToken),
            callbackUrl: user.callbackUrl,
            balance: balance,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        return safeUser;
    },

    changePassword: async (userId, oldPassword, newPassword) => {
        const user = await userRepository.findAuthById(userId);
        if (!user) throw { status: 404, message: "User not found", errorCode: "USER_NOT_FOUND" };

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) throw { status: 400, message: "Password lama salah", errorCode: "INVALID_OLD_PASSWORD" };

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        return await userRepository.updatePassword(userId, hashed);
    },

    generateApiKey: async (userId) => {
        const user = await userRepository.findById(userId);
        if (!user) throw { status: 404, message: "User not found", errorCode: "USER_NOT_FOUND" };

        const apiKey = "neo_" + crypto.randomBytes(24).toString("hex");
        await userRepository.updateApiKey(userId, apiKey);

        return apiKey;
    },

    setCallbackUrl: async (userId, callbackUrl) => {
        const user = await userRepository.findById(userId);
        if (!user) throw { status: 404, message: "User not found", errorCode: "USER_NOT_FOUND" };

        return await userRepository.updateCallbackUrl(userId, callbackUrl);
    },

    updateBukaOlshopConfig: async (userId, { apiKey, token }) => {
        const user = await userRepository.findById(userId);
        if (!user) throw { status: 404, message: "User not found", errorCode: "USER_NOT_FOUND" };

        return await userRepository.updateBukaOlshopConfig(userId, { apiKey, token });
    },

    testBukaOlshopConfig: async (userId) => {
        const user = await userRepository.findById(userId);
        if (!user.bukaolshopApiKey || !user.bukaolshopToken) {
            throw {
                status: 400,
                message: "Data BukaOlshop belum disimpan. Silakan simpan API Key dan Token terlebih dahulu.",
                errorCode: "CONFIG_NOT_FOUND"
            };
        }

        return await bukaolshop.testConnection(user.bukaolshopApiKey);
    }
};

export default userService;
