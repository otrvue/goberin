import pool from "../../../config/db.js";

const configRepository = {
    getConfigs: async () => {
        const [rows] = await pool.query("SELECT name, value FROM web_configs");
        return rows.reduce((acc, row) => {
            acc[row.name] = row.value;
            return acc;
        }, {});
    },

    updateConfigs: async (configs) => {
        const queries = Object.entries(configs).map(([name, value]) => {
            return pool.query(
                "INSERT INTO web_configs (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?, updatedAt = NOW()",
                [name, value, value]
            );
        });
        await Promise.all(queries);
        return await configRepository.getConfigs();
    }
};

export default configRepository;
