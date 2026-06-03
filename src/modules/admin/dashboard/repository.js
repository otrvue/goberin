import pool from "../../../config/db.js";

const dashboardRepository = {
    getFinancialStats: async () => {
        const [statsRows] = await pool.query(`
            SELECT 
                COUNT(id) as count,
                SUM(totalPrice) as totalRevenue,
                SUM(basePrice) as totalCost
            FROM transactions
            WHERE status = 'SUCCESS'
        `);

        const [totalRows] = await pool.query("SELECT COUNT(id) as totalTransactions FROM transactions");

        const stats = statsRows[0];
        const successTransactions = stats.count || 0;
        const totalTransactions = totalRows[0].totalTransactions || 0;

        return {
            totalVolume: successTransactions,
            totalRevenue: stats.totalRevenue || 0,
            totalCost: stats.totalCost || 0,
            totalProfit: (stats.totalRevenue || 0) - (stats.totalCost || 0),
            successRate: totalTransactions > 0 ? (successTransactions / totalTransactions) * 100 : 0,
        };
    },

    getSalesOverview: async (period = "week") => {
        const days = period === "month" ? 30 : 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const [sales] = await pool.query(`
            SELECT 
                DATE(createdAt) as date,
                SUM(totalPrice) as revenue,
                SUM(totalPrice - basePrice) as profit,
                COUNT(id) as volume
            FROM transactions
            WHERE status = 'SUCCESS' AND createdAt >= ?
            GROUP BY DATE(createdAt)
            ORDER BY DATE(createdAt) ASC
        `, [startDate]);

        return sales;
    }
};

export default dashboardRepository;
