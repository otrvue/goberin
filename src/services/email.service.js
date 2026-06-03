import nodemailer from "nodemailer";
import configRepository from "../modules/admin/configs/repository.js";
import logger from "../config/logger.js";

const emailService = {
    getTransporter: async () => {
        const configs = await configRepository.getConfigs();

        return nodemailer.createTransport({
            host: configs.smtp_host,
            port: parseInt(configs.smtp_port),
            secure: parseInt(configs.smtp_port) === 465,
            auth: {
                user: configs.smtp_user,
                pass: configs.smtp_pass,
            },
        });
    },

    sendMail: async ({ to, subject, html, text }) => {
        try {
            const configs = await configRepository.getConfigs();
            const transporter = await emailService.getTransporter();

            const info = await transporter.sendMail({
                from: `"${configs.smtp_from_name}" <${configs.smtp_from_email}>`,
                to,
                replyTo: configs.smtp_from_email,
                subject,
                text, // Plain text version for better deliverability
                html,
            });

            logger.info(`Email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            logger.error("Error sending email:", error);
            throw new Error(`Gagal mengirim email: ${error.message}`);
        }
    },

    sendVerificationEmail: async (user, token) => {
        const configs = await configRepository.getConfigs();
        let verificationLink;

        if (configs.email_verification_url) {
            verificationLink = configs.email_verification_url.replace("{{token}}", token);
        } else {
            const baseUrl = (process.env.PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
            verificationLink = `${baseUrl}/api/auth/verify-email?token=${token}`;
        }

        const siteName = configs.site_name || "GOBERIN";
        const baseUrl = (process.env.PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
        const siteLogo = configs.site_logo
            ? (configs.site_logo.startsWith("http") ? configs.site_logo : `${baseUrl}${configs.site_logo.startsWith("/") ? "" : "/"}${configs.site_logo}`)
            : null;

        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; background-color: #f9f9f9;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    ${siteLogo ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${siteLogo}" alt="${siteName}" style="max-height: 50px;"></div>` : ""}
                    <h2 style="color: #1a1a1a; text-align: center;">Halo, ${user.username}!</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #444; text-align: center;">
                        Terima kasih telah bergabung di <strong>${siteName}</strong>. 
                        Untuk mengamankan akun Anda, silakan verifikasi alamat email Anda.
                    </p>
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${verificationLink}" 
                           style="background: #007bff; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
                           Verifikasi Akun Saya
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #777; text-align: center;">
                        Atau klik/copy link berikut ke browser Anda:
                    </p>
                    <p style="font-size: 13px; color: #007bff; word-break: break-all; text-align: center; background: #f0f7ff; padding: 10px; border-radius: 4px;">
                        ${verificationLink}
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        &copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.<br>
                        Jika Anda tidak melakukan pendaftaran ini, abaikan saja email ini.
                    </p>
                </div>
            </div>
        `;

        const text = `
Halo, ${user.username}!

Terima kasih telah bergabung di ${siteName}.
Untuk mengamankan akun Anda, silakan verifikasi alamat email Anda dengan mengklik link di bawah ini:

${verificationLink}

Jika Anda tidak dapat mengklik link di atas, silakan copy dan paste ke browser Anda.

Link ini akan segera kedaluwarsa. Jika Anda tidak merasa mendaftar di ${siteName}, abaikan email ini.

© ${new Date().getFullYear()} ${siteName}. All rights reserved.
        `;

        return await emailService.sendMail({
            to: user.email,
            subject: configs.email_verification_subject || `Verifikasi Akun ${siteName} Anda`,
            html,
            text,
        });
    },
    sendPasswordResetEmail: async (user, token) => {
        const configs = await configRepository.getConfigs();
        let resetLink;

        let baseUrl;
        if (configs.email_verification_url) {
            try {
                baseUrl = new URL(configs.email_verification_url).origin;
            } catch (e) {
                baseUrl = (process.env.PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
            }
        } else {
            baseUrl = (process.env.PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
        }
        resetLink = `${baseUrl}/reset-password?token=${token}`;

        const siteName = configs.site_name || "GOBERIN";
        const siteLogo = configs.site_logo
            ? (configs.site_logo.startsWith("http") ? configs.site_logo : `${baseUrl}${configs.site_logo.startsWith("/") ? "" : "/"}${configs.site_logo}`)
            : null;

        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; background-color: #f9f9f9;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    ${siteLogo ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${siteLogo}" alt="${siteName}" style="max-height: 50px;"></div>` : ""}
                    <h2 style="color: #1a1a1a; text-align: center;">Reset Password</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #444; text-align: center;">
                        Halo ${user.name || user.username}, Anda menerima email ini karena kami menerima permintaan untuk mereset password akun Anda.
                    </p>
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${resetLink}" 
                           style="background: #e74c3c; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
                           Reset Password
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #777; text-align: center;">
                        Link reset password ini akan kedaluwarsa dalam 1 jam. Jika Anda tidak merasa meminta reset password, abaikan email ini.
                    </p>
                    <p style="font-size: 13px; color: #e74c3c; word-break: break-all; text-align: center; background: #fff5f5; padding: 10px; border-radius: 4px; margin-top: 20px;">
                        ${resetLink}
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        &copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.
                    </p>
                </div>
            </div>
        `;

        const text = `
Halo, ${user.username}!

Anda menerima email ini karena kami menerima permintaan untuk mereset password akun Anda.
Silakan klik link di bawah ini untuk mereset password Anda:

${resetLink}

Jika Anda tidak merasa meminta reset password, abaikan email ini.
Link ini akan kedaluwarsa dalam 1 jam.

© ${new Date().getFullYear()} ${siteName}. All rights reserved.
        `;

        return await emailService.sendMail({
            to: user.email,
            subject: `Reset Password ${siteName} Anda`,
            html,
            text,
        });
    }
};

export default emailService;
