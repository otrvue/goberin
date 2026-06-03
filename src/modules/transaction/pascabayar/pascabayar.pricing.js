const getPrimaryMarkup = (product) => {
    if (!product?.markups?.length) {
        return null;
    }

    return product.markups[0];
};

export const calculateMarkup = (baseAmount, markupType, markupValue) => {
    const amount = Number(baseAmount || 0);
    const value = Number(markupValue || 0);

    if (!amount || !markupType || !value) {
        return 0;
    }

    if (markupType === "PERCENTAGE") {
        return Math.ceil(amount * (value / 100));
    }

    return Math.ceil(value);
};

export const calculatePascabayarPricing = (product, providerAmounts = {}) => {
    const billAmount = Number(providerAmounts.billAmount || 0);
    const providerAdminFee = Number(providerAmounts.adminFee || 0);
    const providerTotal = Number(
        providerAmounts.totalAmount !== undefined && providerAmounts.totalAmount !== null
            ? providerAmounts.totalAmount
            : billAmount + providerAdminFee
    );

    const markup = getPrimaryMarkup(product);
    const markupAmount = calculateMarkup(providerTotal, markup?.type, markup?.value);

    return {
        billAmount,
        providerAdminFee,
        providerTotal,
        markupType: markup?.type || null,
        markupValue: markup ? Number(markup.value || 0) : 0,
        markupAmount,
        totalAmount: providerTotal + markupAmount
    };
};

export const applyPricingToCheckData = (product, data = {}) => {
    const pricing = calculatePascabayarPricing(product, {
        billAmount: data.billAmount,
        adminFee: data.adminFee,
        totalAmount: data.totalAmount
    });

    return {
        ...data,
        billAmount: pricing.billAmount || data.billAmount,
        adminFee: pricing.providerAdminFee,
        totalAmount: pricing.totalAmount,
        detail: {
            ...(data.detail || {}),
            providerTotal: pricing.providerTotal,
            markupType: pricing.markupType,
            markupValue: pricing.markupValue,
            markupAmount: pricing.markupAmount
        }
    };
};
