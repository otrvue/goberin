import h2h from "../../../../integrations/h2h/index.js";
import vendorConfigService from "../../../admin/vendorConfig.service.js";
import {
    buildProviderErrorResponse,
    buildUnifiedResponse,
    createProviderDetail,
    detectNotFoundStatus,
    mapH2hStatus,
    toNumber
} from "../pascabayar.mapper.js";

const provider = "H2H";

const getCredentials = async () => {
    return await vendorConfigService.getCredentials(provider);
};

const buildSuccess = ({ action, request, product, payload, messageOverride }) => {
    const status = action === "INQUIRY" ? "SUCCESS" : mapH2hStatus(payload);
    const billAmount = toNumber(payload.bill_amount || payload.price);
    const adminFee = toNumber(payload.admin_fee);
    const totalAmount = toNumber(payload.total_amount || payload.price);

    return buildUnifiedResponse({
        success: status === "SUCCESS" || status === "PENDING",
        status,
        action,
        request,
        product,
        provider,
        message: messageOverride || payload.message || payload.status_description || "Request berhasil diproses",
        data: {
            customerName: payload.customer_name,
            productName: payload.product_name,
            billAmount,
            adminFee,
            totalAmount,
            period: payload.period,
            dueDate: payload.due_date || payload.expired_at,
            serialNumber: payload.serial_number,
            providerTransactionId: payload.invoice || payload.inquiry_id,
            providerStatus: payload.transaction_status || payload.status_label,
            paidAt: payload.time,
            detail: createProviderDetail({
                statusDescription: payload.status_description,
                providerMessage: payload.provider_message,
                reason: payload.reason,
                desc: payload.desc,
                inquiryId: payload.inquiry_id
            })
        },
        raw: payload,
        error: status === "FAILED" || status === "NOT_FOUND"
            ? {
                code: payload.reason ? "H2H_FAILED" : undefined,
                message: payload.reason || payload.provider_message || payload.status_description || "Provider request failed"
            }
            : undefined
    });
};

const perform = async ({ action, request, product, call }) => {
    try {
        const payload = await call();
        return buildSuccess({ action, request, product, payload });
    } catch (error) {
        const message = error.response?.data?.message || error.message || "Provider error";
        const status = detectNotFoundStatus(message) ? "NOT_FOUND" : "PROVIDER_ERROR";

        return buildUnifiedResponse({
            success: false,
            status,
            action,
            request,
            product,
            provider,
            message,
            raw: error.response?.data,
            error: {
                code: status === "NOT_FOUND" ? "NOT_FOUND" : "H2H_PROVIDER_ERROR",
                message,
                detail: error.response?.data
            }
        });
    }
};

const H2hPascabayarProvider = {
    inquiry: async ({ request, product }) => {
        const creds = await getCredentials();
        return await perform({
            action: "INQUIRY",
            request,
            product,
            call: () => h2h.billInquiry(product.vendorSku, request.customerNo, request.referenceId, creds?.memberId, creds?.pin, creds?.password)
        });
    },

    payment: async ({ request, product }) => {
        const creds = await getCredentials();
        const inquiryId = request.metadata?.inquiryId || request.metadata?.inquiry_id;

        if (!inquiryId) {
            return buildProviderErrorResponse({
                action: "PAYMENT",
                request,
                product,
                provider,
                error: {
                    code: "INQUIRY_ID_REQUIRED",
                    message: "H2H payment memerlukan metadata.inquiryId dari hasil inquiry"
                }
            });
        }

        return await perform({
            action: "PAYMENT",
            request,
            product,
            call: () => h2h.processTransaction(product.vendorSku, request.customerNo, request.referenceId, creds?.memberId, creds?.pin, creds?.password, null, inquiryId)
        });
    },

    check: async ({ request, product }) => {
        const creds = await getCredentials();
        return await perform({
            action: "CHECK",
            request,
            product,
            call: () => h2h.getStatus(request.referenceId, creds?.memberId, creds?.pin, creds?.password)
        });
    }
};

export default H2hPascabayarProvider;
