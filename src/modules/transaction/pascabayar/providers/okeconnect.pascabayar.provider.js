import okeconnect from "../../../../integrations/okeconnect/index.js";
import vendorConfigService from "../../../admin/vendorConfig.service.js";
import {
    buildProviderErrorResponse,
    buildUnifiedResponse,
    mapOkeconnectStatus
} from "../pascabayar.mapper.js";

const provider = "OKECONNECT";

const parseRawMessage = (raw) => {
    const text = String(raw || "");

    return {
        transactionId: text.match(/T#(\d+)/i)?.[1],
        refId: text.match(/R#([^\s]+)/i)?.[1],
        serialNumber: text.match(/SN:(.+?)\./i)?.[1],
        providerStatus: text.includes("SUKSES")
            ? "SUKSES"
            : text.includes("GAGAL")
                ? "GAGAL"
                : text.includes("akan diproses")
                    ? "PENDING"
                    : undefined,
        detail: { message: text }
    };
};

const getCredentials = async () => {
    return await vendorConfigService.getCredentials(provider);
};

const perform = async ({ action, request, product, call }) => {
    try {
        const raw = await call();
        const parsed = parseRawMessage(raw);
        const status = mapOkeconnectStatus(raw);

        return buildUnifiedResponse({
            success: status === "SUCCESS" || status === "PENDING",
            status,
            action,
            request,
            product,
            provider,
            message: parsed.detail.message || "Request berhasil diproses",
            data: {
                providerTransactionId: parsed.transactionId,
                providerStatus: parsed.providerStatus,
                serialNumber: parsed.serialNumber,
                detail: parsed.detail
            },
            raw,
            error: status === "FAILED" || status === "NOT_FOUND"
                ? { code: "OKECONNECT_ERROR", message: parsed.detail.message }
                : undefined
        });
    } catch (error) {
        return buildProviderErrorResponse({
            action,
            request,
            product,
            provider,
            raw: error.response?.data,
            error: {
                code: "OKECONNECT_PROVIDER_ERROR",
                message: error.message,
                detail: error.response?.data
            }
        });
    }
};

const OkeconnectPascabayarProvider = {
    inquiry: async ({ request, product }) => {
        const creds = await getCredentials();
        return await perform({
            action: "INQUIRY",
            request,
            product,
            call: () => okeconnect.processTransaction(product.vendorSku, request.customerNo, request.referenceId, request.amount, creds?.memberId, creds?.pin, creds?.password)
        });
    },

    payment: async ({ request, product }) => {
        const creds = await getCredentials();
        return await perform({
            action: "PAYMENT",
            request,
            product,
            call: () => okeconnect.processTransaction(product.vendorSku, request.customerNo, request.referenceId, request.amount, creds?.memberId, creds?.pin, creds?.password)
        });
    },

    check: async ({ request, product }) => {
        const creds = await getCredentials();
        return await perform({
            action: "CHECK",
            request,
            product,
            call: () => okeconnect.checkStatus(product.vendorSku, request.customerNo, request.referenceId, creds?.memberId, creds?.pin, creds?.password)
        });
    }
};

export default OkeconnectPascabayarProvider;
