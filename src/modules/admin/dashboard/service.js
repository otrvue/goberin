import dashboardRepository from "./repository.js";

const dashboardService = {
    getStats: async () => {
        return await dashboardRepository.getFinancialStats();
    },

    getCharts: async (period) => {
        const rawData = await dashboardRepository.getSalesOverview(period);

        const days = period === "month" ? 30 : 7;
        const labels = [];
        const volumeData = [];
        const revenueData = [];
        const profitData = [];

        // Map data by date for easy lookup
        const dataMap = {};
        rawData.forEach(item => {
            const dateStr = new Date(item.date).toISOString().split("T")[0];
            dataMap[dateStr] = item;
        });

        // Generate date range and fill data
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];

            labels.push(dateStr);
            const dayData = dataMap[dateStr] || { volume: 0, revenue: 0, profit: 0 };

            volumeData.push(Number(dayData.volume || 0));
            revenueData.push(Number(dayData.revenue || 0));
            profitData.push(Number(dayData.profit || 0));
        }

        return {
            labels,
            datasets: [
                {
                    label: "Total Volume",
                    data: volumeData,
                    borderColor: "rgb(75, 192, 192)",
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    fill: true
                },
                {
                    label: "Total Revenue",
                    data: revenueData,
                    borderColor: "rgb(255, 99, 132)",
                    backgroundColor: "rgba(255, 99, 132, 0.2)",
                    fill: true
                },
                {
                    label: "Total Profit",
                    data: profitData,
                    borderColor: "rgb(54, 162, 235)",
                    backgroundColor: "rgba(54, 162, 235, 0.2)",
                    fill: true
                }
            ]
        };
    },
};

export default dashboardService;
