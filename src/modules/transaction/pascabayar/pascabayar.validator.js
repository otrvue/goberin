import trxRepository from "../repository.js";
import { ALLOWED_PASCABAYAR_VENDORS, PASCABAYAR_STATUSES } from "./pascabayar.types.js";
import { buildUnifiedResponse } from "./pascabayar.mapper.js";

const invalidResponse = ({ action, request, product, message, code, provider }) => buildUnifiedResponse({
    success: false,
    status: PASCABAYAR_STATUSES.INVALID_PRODUCT,
    action,
    request,
    product,
    provider,
    message,
    error: { code, message }
});

export const normalizePascabayarRequest = (payload = {}) => {
    const customerNo = payload.customerNo === undefined || payload.customerNo === null
        ? ""
        : String(payload.customerNo).trim();
    const sku = payload.sku === undefined || payload.sku === null
        ? ""
        : String(payload.sku).trim();
    const referenceId = payload.referenceId === undefined || payload.referenceId === null
        ? ""
        : String(payload.referenceId).trim();

    return {
        ...payload,
        customerNo,
        sku,
        referenceId
    };
};

export const validatePascabayarProduct = async ({ action, request }) => {
    if (!request.customerNo || !request.sku || !request.referenceId) {
        return {
            error: invalidResponse({
                action,
                request,
                message: "customerNo, sku, dan referenceId wajib diisi",
                code: "INVALID_REQUEST"
            })
        };
    }

    const product = await trxRepository.getProductBySku(request.sku);

    if (!product) {
        return {
            error: invalidResponse({
                action,
                request,
                message: "Produk tidak ditemukan",
                code: "PRODUCT_NOT_FOUND"
            })
        };
    }

    if (product.sku !== request.sku) {
        return {
            error: invalidResponse({
                action,
                request,
                product,
                message: "SKU produk tidak sesuai dengan request",
                code: "SKU_MISMATCH",
                provider: product.vendor
            })
        };
    }

    if (!product.isActive) {
        return {
            error: invalidResponse({
                action,
                request,
                product,
                message: "Produk tidak aktif",
                code: "PRODUCT_INACTIVE",
                provider: product.vendor
            })
        };
    }

    if (!product.vendorSku) {
        return {
            error: invalidResponse({
                action,
                request,
                product,
                message: "Vendor SKU produk belum dikonfigurasi",
                code: "VENDOR_SKU_MISSING",
                provider: product.vendor
            })
        };
    }

    if (!ALLOWED_PASCABAYAR_VENDORS.includes(product.vendor)) {
        return {
            error: invalidResponse({
                action,
                request,
                product,
                message: "Vendor produk tidak didukung untuk pascabayar",
                code: "INVALID_VENDOR",
                provider: product.vendor
            })
        };
    }

    if (product.type !== "POSTPAID") {
        return {
            error: invalidResponse({
                action,
                request,
                product,
                message: "Produk bukan tipe POSTPAID",
                code: "INVALID_PRODUCT_TYPE",
                provider: product.vendor
            })
        };
    }

    return { product };
};
