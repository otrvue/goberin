import markupService from "./service.js";
import { z } from "zod";

const markupSchema = z.object({
    name: z.string(),
    target: z.enum(["PRODUCT", "PROVIDER", "CATEGORY", "GLOBAL"]),
    targetId: z.string().uuid().nullable().optional(),
    type: z.enum(["FIXED", "PERCENTAGE"]),
    value: z.number().or(z.string().transform(v => Number(v))),
    priority: z.number().optional(),
    isActive: z.boolean().optional(),
});

const markupController = {
    create: async (req, res, next) => {
        try {
            const validatedData = markupSchema.parse(req.body);
            const result = await markupService.createMarkup(validatedData);
            return res.status(201).json({ success: true, message: "Markup created", data: result });
        } catch (error) {
            next(error);
        }
    },
    getAll: async (req, res, next) => {
        try {
            const result = await markupService.getAllMarkups();
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },
    update: async (req, res, next) => {
        try {
            const validatedData = markupSchema.partial().parse(req.body);
            const result = await markupService.updateMarkup(req.params.id, validatedData);
            return res.status(200).json({ success: true, message: "Markup updated", data: result });
        } catch (error) {
            next(error);
        }
    },
    delete: async (req, res, next) => {
        try {
            await markupService.deleteMarkup(req.params.id);
            return res.status(200).json({ success: true, message: "Markup deleted" });
        } catch (error) {
            next(error);
        }
    },
};

export default markupController;
