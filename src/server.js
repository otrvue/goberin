import app from "./app.js";
import logger from "./config/logger.js";
import pool from "./config/db.js";
import seeder from "./config/seeder.js";
import { startDepositScheduler } from "./config/scheduler.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Test Database Connection
        const conn = await pool.getConnection();
        logger.info("Connected to database successfully (mysql2)");
        conn.release();

        // Run Seeder
        await seeder.seed();

        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            // Start background schedulers
            startDepositScheduler();
        });
    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
}

// Handle Graceful Shutdown
process.on("SIGINT", async () => {
    await pool.end();
    logger.info("Database pool closed");
    process.exit(0);
});

startServer();
