import digiflazz from "../../../../integrations/digiflazz/index.js";
import vendorConfigService from "../../../admin/vendorConfig.service.js";
import {
    buildProviderErrorResponse,
    buildUnifiedResponse,
    createProviderDetail,
    mapDigiflazzStatus,
    toNumber
} from "../pascabayar.mapper.js";

const provider = "DIGIFLAZZ";

const getCredentials = async () => {
    return await vendorConfigService.getCredentials(provider);
};

const toResponse = ({ action, request, product, payload, message }) => {
    const status = mapDigiflazzStatus(payload);
    const billAmount = toNumber(payload.price);
    const adminFee = toNumber(payload.admin);
    const totalAmount = billAmount !== undefined || adminFee !== undefined
        ? (billAmount || 0) + (adminFee || 0)
        : undefined;

    return buildUnifiedResponse({
        success: status === "SUCCESS" || status === "PENDING",
        status,
        action,
        request,
        product,
        provider,
        message: message || payload.message || "Request berhasil diproses",
        data: {
            customerName: payload.customer_name,
            productName: payload.product_name,
            billAmount,
            adminFee,
            totalAmount,
            serialNumber: payload.sn,
            providerTransactionId: payload.ref_id,
            providerStatus: payload.status || payload.rc,
            detail: createProviderDetail(payload.desc)
        },
        raw: payload,
        error: status === "FAILED" || status === "NOT_FOUND"
            ? {
                code: payload.rc,
                message: payload.message || "Provider request failed"
            }
            : undefined
    });
};

const withBoundary = async ({ action, request, product, handler }) => {
    try {
        const payload = await handler();
        return toResponse({ action, request, product, payload });
    } catch (error) {
        return buildProviderErrorResponse({
            action,
            request,
            product,
            provider,
            raw: error.response?.data,
            error: {
                code: error.response?.data?.data?.rc,
                message: error.response?.data?.data?.message || error.response?.data?.message || error.message,
                detail: error.response?.data
            }
        });
    }
};

const DigiflazzPascabayarProvider = {
    inquiry: async ({ request, product }) => {
        const creds = await getCredentials();
        return await withBoundary({
            action: "INQUIRY",
            request,
            product,
            handler: () => digiflazz.postpaidInquiry(product.vendorSku, request.customerNo, request.referenceId, creds?.username, creds?.apiKey)
        });
    },

    payment: async ({ request, product }) => {
        const creds = await getCredentials();
        return await withBoundary({
            action: "PAYMENT",
            request,
            product,
            handler: () => digiflazz.postpaidPayment(product.vendorSku, request.customerNo, request.referenceId, creds?.username, creds?.apiKey)
        });
    },

    check: async ({ request, product }) => {
        const creds = await getCredentials();
        return await withBoundary({
            action: "CHECK",
            request,
            product,
            handler: () => digiflazz.postpaidStatus(product.vendorSku, request.customerNo, request.referenceId, creds?.username, creds?.apiKey)
        });
    }
};

export default DigiflazzPascabayarProvider;
