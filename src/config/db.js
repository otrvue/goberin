import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Add these to handle BigInt and Decimal consistently if needed
    supportBigNumbers: true,
    bigNumberStrings: true,
});

// Test connection
pool.getConnection()
    .then(conn => {
        console.log("Database connected successfully (mysql2)");
        conn.release();
    })
    .catch(err => {
        console.error("Database connection failed:", err.message);
    });

export default pool;
