import userRepository from "./repository.js";

const userService = {
    getStats: async () => {
        return await userRepository.getStats();
    },

    getUsers: async (filters) => {
        return await userRepository.getUsers(filters);
    },

    getUserById: async (id) => {
        const user = await userRepository.getUserById(id);
        if (!user) throw { status: 404, message: "User tidak ditemukan" };
        return user;
    },

    updateUser: async (id, data) => {
        return await userRepository.updateUser(id, data);
    },

    addBalance: async (userId, data) => {
        if (!data.amount || isNaN(data.amount)) {
            throw { status: 400, message: "Jumlah saldo tidak valid" };
        }
        return await userRepository.addBalance(userId, data);
    }
};

export default userService;
