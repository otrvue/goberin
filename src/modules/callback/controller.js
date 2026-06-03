import callbackService from "./service.js";

const callbackController = {
    digiflazz: async (req, res, next) => {
        try {
            const signature = req.headers["x-hub-signature"] || req.headers["x-digiflazz-signature"];
            await callbackService.handleDigiflazz(req.body, signature);
            return res.status(200).send("OK");
        } catch (error) {
            next(error);
        }
    },

    okeconnect: async (req, res, next) => {
        try {
            await callbackService.handleOkeconnect(req.query);
            return res.status(200).send("OK");
        } catch (error) {
            next(error);
        }
    },

    h2h: async (req, res, next) => {
        try {
            // H2H.id might send GET or POST. Merge body and query for simplicity
            const payload = { ...req.query, ...req.body };
            await callbackService.handleH2h(payload);
            return res.status(200).send("OK");
        } catch (error) {
            next(error);
        }
    },
};

export default callbackController;
