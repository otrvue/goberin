import pool from "../../config/db.js";
import crypto from "crypto";

const userRepository = {
    create: async (data, verificationToken) => {
        const id = crypto.randomUUID();
        const { email, username, password, name, role = "USER" } = data;
        await pool.query(
            "INSERT INTO users (id, email, username, password, name, role, emailVerificationToken, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
            [id, email, username, password, name, role, verificationToken]
        );
        return { id, email, username, name, role };
    },
    findByVerificationToken: async (token) => {
        const [rows] = await pool.query("SELECT * FROM users WHERE emailVerificationToken = ?", [token]);
        return rows[0] || null;
    },
    updateVerificationStatus: async (userId, isVerified) => {
        return await pool.query(
            "UPDATE users SET isEmailVerified = ?, status = ?, emailVerificationToken = NULL, updatedAt = NOW() WHERE id = ?",
            [isVerified ? 1 : 0, isVerified ? "ACTIVE" : "INACTIVE", userId]
        );
    },
    updateVerificationToken: async (userId, token) => {
        return await pool.query(
            "UPDATE users SET emailVerificationToken = ?, updatedAt = NOW() WHERE id = ?",
            [token, userId]
        );
    },
    findByEmail: async (email) => {
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        return rows[0] || null;
    },
    findByUsername: async (username) => {
        const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        return rows[0] || null;
    },
    updateOtp: async (userId, code, expiresAt) => {
        return await pool.query(
            "UPDATE users SET otpCode = ?, otpExpiresAt = ?, updatedAt = NOW() WHERE id = ?",
            [code, expiresAt, userId]
        );
    },
    updateTwoFactorStatus: async (userId, enabled, secret = null) => {
        return await pool.query(
            "UPDATE users SET isTwoFactorEnabled = ?, twoFactorSecret = ?, updatedAt = NOW() WHERE id = ?",
            [enabled ? 1 : 0, secret, userId]
        );
    },
    findById: async (id) => {
        const [rows] = await pool.query(
            "SELECT id, email, username, name, role, status, isEmailVerified, isTwoFactorEnabled, twoFactorSecret, apiKey, createdAt FROM users WHERE id = ?",
            [id]
        );
        return rows[0] || null;
    },
    findAuthById: async (id) => {
        const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
        return rows[0] || null;
    },
    findByResetToken: async (token) => {
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE passwordResetToken = ? AND passwordResetExpiresAt > NOW()",
            [token]
        );
        return rows[0] || null;
    },
    updateResetToken: async (userId, token, expiresAt) => {
        return await pool.query(
            "UPDATE users SET passwordResetToken = ?, passwordResetExpiresAt = ?, updatedAt = NOW() WHERE id = ?",
            [token, expiresAt, userId]
        );
    },
    updatePassword: async (userId, hashedPassword) => {
        return await pool.query(
            "UPDATE users SET password = ?, passwordResetToken = NULL, passwordResetExpiresAt = NULL, updatedAt = NOW() WHERE id = ?",
            [hashedPassword, userId]
        );
    },
};

export default userRepository;
