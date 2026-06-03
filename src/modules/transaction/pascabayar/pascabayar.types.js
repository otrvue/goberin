/**
 * @typedef {Object} PascabayarBaseRequest
 * @property {string} customerNo
 * @property {string} sku
 * @property {string} referenceId
 * @property {number=} amount
 * @property {number=} adminFee
 * @property {string=} buyerSkuCode
 * @property {string=} customerName
 * @property {string=} phone
 * @property {unknown=} raw
 * @property {Record<string, unknown>=} metadata
 */

export const PASCABAYAR_ACTIONS = {
    INQUIRY: "INQUIRY",
    PAYMENT: "PAYMENT",
    CHECK: "CHECK"
};

export const PASCABAYAR_STATUSES = {
    PENDING: "PENDING",
    SUCCESS: "SUCCESS",
    FAILED: "FAILED",
    NOT_FOUND: "NOT_FOUND",
    INVALID_PRODUCT: "INVALID_PRODUCT",
    PROVIDER_ERROR: "PROVIDER_ERROR"
};

export const ALLOWED_PASCABAYAR_VENDORS = ["DIGIFLAZZ", "OKECONNECT", "H2H"];
