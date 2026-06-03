import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import uploadController from "./controller.js";
import { authenticate, authorize } from "../../middleware/auth.middleware.js";

const router = Router();

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto.randomBytes(8).toString("hex");
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File Filter (Images Only)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"];
    if (file.mimetype.startsWith("image/") || allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Hanya file gambar (.jpg, .png, .webp, .ico) yang diperbolehkan"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB Limit
});

// POST /api/upload
router.post("/", authenticate, authorize("ADMIN"), upload.single("image"), uploadController.uploadImage);

export default router;
