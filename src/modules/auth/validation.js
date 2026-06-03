import { z } from "zod";

export const registerSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3),
    password: z.string().min(6),
    name: z.string().optional(),
});

export const loginSchema = z.object({
    username: z.string(), // can be username or email
    password: z.string(),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(6),
});
