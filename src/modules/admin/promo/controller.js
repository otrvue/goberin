import promoService from "./service.js";
import { z } from "zod";

const promoSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    discount: z.number().or(z.string().transform(v => Number(v))),
    type: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    startTime: z.string().transform(v => new Date(v)),
    endTime: z.string().transform(v => new Date(v)),
    isActive: z.boolean().optional(),
    productIds: z.array(z.string().uuid()),
});

const promoController = {
    create: async (req, res, next) => {
        try {
            const validatedData = promoSchema.parse(req.body);
            const { productIds, ...promoData } = validatedData;
            const result = await promoService.createPromo(promoData, productIds);
            return res.status(201).json({ success: true, message: "Promo created", data: result });
        } catch (error) {
            next(error);
        }
    },
    getAll: async (req, res, next) => {
        try {
            const result = await promoService.getAllPromos();
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },
    update: async (req, res, next) => {
        try {
            const validatedData = promoSchema.partial().parse(req.body);
            const { productIds, ...promoData } = validatedData;
            const result = await promoService.updatePromo(req.params.id, promoData, productIds);
            return res.status(200).json({ success: true, message: "Promo updated", data: result });
        } catch (error) {
            next(error);
        }
    },
    delete: async (req, res, next) => {
        try {
            await promoService.deletePromo(req.params.id);
            return res.status(200).json({ success: true, message: "Promo deleted" });
        } catch (error) {
            next(error);
        }
    },
};

export default promoController;
