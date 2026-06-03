const formatStatusLabel = (status) => {
    if (!status) return "Pending";
    const normalized = String(status).toUpperCase();
    if (normalized === "SUCCESS") return "Success";
    if (normalized === "FAILED") return "Failed";
    if (normalized === "NOT_FOUND") return "Not Found";
    return "Pending";
};

const formatBalance = (balance) => {
    return new Intl.NumberFormat("id-ID").format(Number(balance || 0));
};

const formatCreatedAt = (createdAt) => {
    const date = new Date(createdAt);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}/${month} ${hours}:${minutes}`;
};

export const buildPascabayarNote = ({ transaction, product, status, message, balance }) => {
    const safeMessage = String(message || "-").trim();

    return `T#${transaction.id} R#${transaction.vendorTrxId || "-"} ${product.name} ${product.sku}.${transaction.customerNo} ${formatStatusLabel(status)} Ket:${safeMessage} @${formatCreatedAt(transaction.createdAt)}. Saldo ${formatBalance(balance)}`;
};
