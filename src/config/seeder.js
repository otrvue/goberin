import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "./db.js";
import logger from "./logger.js";
import dotenv from "dotenv";

dotenv.config();

const seeder = {
    seed: async () => {
        try {
            await seeder.seedAdmin();
            await seeder.seedConfigs();
            logger.info("Database seeding completed successfully");
        } catch (error) {
            logger.error("Seeding failed:", error);
        }
    },

    seedAdmin: async () => {
        const [users] = await pool.query("SELECT id FROM users LIMIT 1");
        if (users.length > 0) return;

        logger.info("No users found. Seeding initial admin...");

        const email = process.env.INITIAL_ADMIN_EMAIL || "admin@neopay.com";
        const username = process.env.INITIAL_ADMIN_USERNAME || "admin";
        const password = process.env.INITIAL_ADMIN_PASSWORD || "password123";
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = crypto.randomUUID();

        await pool.query(
            "INSERT INTO users (id, email, username, password, name, role, status, isEmailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'ADMIN', 'ACTIVE', 1, NOW(), NOW())",
            [id, email, username, hashedPassword, "System Administrator"]
        );

        logger.info(`Initial admin created: ${username} (${email})`);
    },

    seedConfigs: async () => {
        const defaults = {
            site_name: process.env.SITE_NAME || "GOBERIN",
            smtp_host: process.env.SMTP_HOST || "smtp.mailtrap.io",
            smtp_port: process.env.SMTP_PORT || "587",
            smtp_user: process.env.SMTP_USER || "",
            smtp_pass: process.env.SMTP_PASS || "",
            smtp_from_email: process.env.SMTP_FROM_EMAIL || "noreply@neopay.com",
            smtp_from_name: process.env.SMTP_FROM_NAME || "NEOPAY",
            email_verification_url: `${process.env.PUBLIC_API_BASE_URL}/api/auth/verify-email?token={{token}}`,
            telegram_bot_token: "",
            telegram_bot_username: ""
        };

        logger.info("Checking web configurations...");

        const queries = Object.entries(defaults).map(([name, value]) => {
            return pool.query(
                "INSERT INTO web_configs (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE updatedAt = NOW()",
                [name, value]
            );
        });

        await Promise.all(queries);
        logger.info("Web configurations synchronized with environment defaults");
    }
};

export default seeder;
