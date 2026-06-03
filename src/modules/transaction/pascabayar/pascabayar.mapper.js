import { PASCABAYAR_STATUSES } from "./pascabayar.types.js";

const SECRET_KEYS = new Set(["apikey", "api_key", "password", "pin", "sign", "signature", "token"]);

const sanitizeRaw = (value) => {
    if (Array.isArray(value)) {
        return value.map(sanitizeRaw);
    }

    if (!value || typeof value !== "object") {
        return value;
    }

    return Object.entries(value).reduce((acc, [key, entryValue]) => {
        acc[key] = SECRET_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : sanitizeRaw(entryValue);
        return acc;
    }, {});
};

export const toNumber = (value) => {
    if (value === null || value === undefined || value === "") {
        return undefined;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
};

export const buildUnifiedResponse = ({
    success,
    status,
    action,
    request,
    product,
    provider,
    message,
    data,
    raw,
    error
}) => {
    const resolvedProvider = provider || product?.vendor;

    return {
        success,
        status,
        action,
        referenceId: request.referenceId,
        provider: resolvedProvider,
        sku: request.sku,
        vendorSku: product?.vendorSku,
        customerNo: request.customerNo,
        message,
        data,
        raw: sanitizeRaw(raw),
        error: error ? {
            code: error.code,
            message: error.message,
            detail: sanitizeRaw(error.detail)
        } : undefined
    };
};

export const buildProviderErrorResponse = ({ action, request, product, provider, raw, error, message }) => {
    return buildUnifiedResponse({
        success: false,
        status: PASCABAYAR_STATUSES.PROVIDER_ERROR,
        action,
        request,
        product,
        provider,
        raw,
        message: message || error?.message || "Provider error",
        error: {
            code: error?.code || "PROVIDER_ERROR",
            message: error?.message || "Provider error",
            detail: error?.detail
        }
    });
};

export const detectNotFoundStatus = (message = "") => {
    const normalized = String(message).toLowerCase();
    return normalized.includes("tidak ada") ||
        normalized.includes("tidak ditemukan") ||
        normalized.includes("nomor tujuan salah") ||
        normalized.includes("pelanggan") ||
        normalized.includes("tagihan tidak") ||
        normalized.includes("customer not found");
};

export const mapDigiflazzStatus = (payload = {}) => {
    const status = String(payload.status || "").toLowerCase();
    const rc = String(payload.rc || "");
    const message = payload.message || payload.rc || "";

    if (status === "sukses" || rc === "00") {
        return PASCABAYAR_STATUSES.SUCCESS;
    }

    if (status === "pending" || rc === "03") {
        return PASCABAYAR_STATUSES.PENDING;
    }

    if (detectNotFoundStatus(message)) {
        return PASCABAYAR_STATUSES.NOT_FOUND;
    }

    return PASCABAYAR_STATUSES.FAILED;
};

export const mapH2hStatus = (payload = {}) => {
    const txStatus = String(payload.transaction_status || payload.status_label || "").toLowerCase();
    const message = payload.reason || payload.provider_message || payload.status_description || "";

    if (txStatus === "success" || txStatus === "sukses") {
        return PASCABAYAR_STATUSES.SUCCESS;
    }

    if (txStatus === "pending" || txStatus === "menunggu" || txStatus === "diproses") {
        return PASCABAYAR_STATUSES.PENDING;
    }

    if (txStatus === "failed" || txStatus === "gagal") {
        return detectNotFoundStatus(message) ? PASCABAYAR_STATUSES.NOT_FOUND : PASCABAYAR_STATUSES.FAILED;
    }

    return PASCABAYAR_STATUSES.PENDING;
};

export const mapOkeconnectStatus = (raw = "") => {
    const text = String(raw);
    const normalized = text.toLowerCase();

    if (normalized.includes("sukses")) {
        return PASCABAYAR_STATUSES.SUCCESS;
    }

    if (normalized.includes("akan diproses")) {
        return PASCABAYAR_STATUSES.PENDING;
    }

    if (normalized.includes("gagal")) {
        return detectNotFoundStatus(text) ? PASCABAYAR_STATUSES.NOT_FOUND : PASCABAYAR_STATUSES.FAILED;
    }

    if (detectNotFoundStatus(text)) {
        return PASCABAYAR_STATUSES.NOT_FOUND;
    }

    return PASCABAYAR_STATUSES.PROVIDER_ERROR;
};

export const createProviderDetail = (detail) => {
    if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
        return undefined;
    }

    return sanitizeRaw(detail);
};
