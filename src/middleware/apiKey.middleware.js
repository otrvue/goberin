import userRepository from "../modules/user/repository.js";

export const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.header("X-API-Key");

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: "API Key is required in X-API-Key header",
                errorCode: "API_KEY_REQUIRED"
            });
        }

        const user = await userRepository.findByApiKey(apiKey);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid API Key",
                errorCode: "INVALID_API_KEY"
            });
        }

        // Attach user to request
        req.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            status: user.status
        };

        next();
    } catch (error) {
        next(error);
    }
};
