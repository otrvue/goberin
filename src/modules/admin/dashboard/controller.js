import dashboardService from "./service.js";

const dashboardController = {
    getStats: async (req, res, next) => {
        try {
            const stats = await dashboardService.getStats();
            return res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error) {
            next(error);
        }
    },

    getCharts: async (req, res, next) => {
        try {
            const { period = "week" } = req.query;
            const charts = await dashboardService.getCharts(period);
            return res.status(200).json({
                success: true,
                data: charts,
            });
        } catch (error) {
            next(error);
        }
    },
};

export default dashboardController;
