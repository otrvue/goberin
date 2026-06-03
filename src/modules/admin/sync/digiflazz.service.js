import logger from "../../../config/logger.js";
import productRepository from "./repository.js";
import digiflazz from "../../../integrations/digiflazz/index.js";
import vendorConfigService from "../vendorConfig.service.js";

const PROVIDER_ABBR = {
    "DANA": "DN",
    "GOPAY": "GP",
    "OVO": "OV",
    "LINKAJA": "LA",
    "SHOPEEPAY": "SP",
    "TELKOMSEL": "TSEL",
    "INDOSAT": "ISAT",
    "XL": "XL",
    "AXIS": "AX",
    "THREE": "TRI",
    "SMARTFREN": "SM",
    "PLN": "PLN",
    "GOJEK": "GJ",
    "GRAB": "GRB",
    "MAXIM": "MX",
    "BRI": "BRI",
    "BNI": "BNI",
    "BCA": "BCA",
    "MANDIRI": "MDR",
    "PBB": "PBB",
    "PDAM": "PDAM",
    "BPJS": "BPJS"
};

const isSkuClear = (sku) => {
    if (!sku) return false;
    // Reject if contains lowercase (most clean SKUs are UPPER)
    if (/[a-z]/.test(sku)) return false;
    // Reject if starts with common technical prefixes
    const lower = sku.toLowerCase();
    const badPrefixes = ['pre', 'post', 'pst', 'pln', 'pro', 'df'];
    if (badPrefixes.some(p => lower.startsWith(p))) return false;
    // Reject if purely numeric and long
    if (/^\d{8,}$/.test(sku)) return false;
    // Reject if too short
    if (sku.length < 3) return false;

    return true;
};

const generateSkuFromName = (name, providerName) => {
    let prefix = "";
    const providerUpper = providerName.toUpperCase();
    for (const [key, abbr] of Object.entries(PROVIDER_ABBR)) {
        if (providerUpper.includes(key)) {
            prefix = abbr;
            break;
        }
    }
    if (!prefix) prefix = providerUpper.substring(0, 3).replace(/[^A-Z]/g, '');

    const cleanName = name.replace(/\./g, '');
    const numbers = cleanName.match(/\d+/g);
    let amount = "";
    if (numbers) {
        const lastNum = numbers[numbers.length - 1];
        if (parseInt(lastNum) >= 1000) {
            amount = (parseInt(lastNum) / 1000).toString();
        } else {
            amount = lastNum;
        }
    } else {
        // If no numbers, use keyword descriptive descriptors
        const keywords = name.replace(new RegExp(providerName, 'gi'), '')
            .trim()
            .split(' ')
            .filter(w => w.length > 1)
            .slice(0, 2)
            .map(w => w.substring(0, 3).toUpperCase())
            .join('');
        amount = keywords || "PROD";
    }
    return `${prefix}${amount}`.toUpperCase();
};

const digiflazzService = {
    syncProducts: async () => {
        const activeTask = await productRepository.getActiveSyncTask("DIGIFLAZZ");
        if (activeTask) {
            throw { status: 400, message: "Proses sinkronisasi DigiFlazz sedang berjalan", errorCode: "SYNC_ALREADY_RUNNING" };
        }

        let task = await productRepository.createSyncTask("DIGIFLAZZ", 0);

        try {
            const creds = await vendorConfigService.getCredentials("DIGIFLAZZ");
            const allItems = await digiflazz.syncProducts(creds?.username, creds?.apiKey);
            await productRepository.updateSyncTask(task.id, { totalItems: allItems.length });

            // 1. Fetch & Cache
            const [categories, providers, allInternalSkus] = await Promise.all([
                productRepository.getAllCategories(),
                productRepository.getAllProviders(),
                productRepository.getAllInternalSkus()
            ]);

            const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
            const providerMap = new Map(providers.map(p => [p.name.toLowerCase(), p.id]));
            const skuSet = new Set(allInternalSkus);
            const existingProducts = await productRepository.getExistingProductsByVendor("DIGIFLAZZ");
            const existingMap = new Map(existingProducts.map(p => [p.vendorSku, p]));

            const toCreate = [];
            const toUpdate = [];
            let createdCount = 0;
            let updatedCount = 0;
            let processedItems = 0;

            for (const item of allItems) {
                const categoryNormalized = item.category.toLowerCase();
                const providerNormalized = item.brand.toLowerCase();

                let categoryId = categoryMap.get(categoryNormalized);
                if (!categoryId) {
                    const cat = await productRepository.upsertCategory(item.category, categoryNormalized.replace(/\s+/g, "-"));
                    categoryId = cat.id;
                    categoryMap.set(categoryNormalized, categoryId);
                }

                let providerId = providerMap.get(providerNormalized);
                if (!providerId) {
                    const prov = await productRepository.upsertProvider(item.brand, providerNormalized.replace(/\s+/g, "-"));
                    providerId = prov.id;
                    providerMap.set(providerNormalized, providerId);
                }

                const isActive = item.buyer_product_status && item.seller_product_status;
                const basePrice = Number(item.price || item.admin || 0);
                const existing = existingMap.get(item.buyer_sku_code);

                let internalSku;
                if (existing) {
                    internalSku = existing.sku;
                } else {
                    let baseSku;
                    if (isSkuClear(item.buyer_sku_code)) {
                        baseSku = item.buyer_sku_code.toUpperCase();
                    } else {
                        baseSku = generateSkuFromName(item.product_name, item.brand);
                    }

                    internalSku = baseSku;
                    let counter = 0;
                    const suffixes = "ABCDEFGH";
                    while (skuSet.has(internalSku)) {
                        const suffix = suffixes[counter] || `V${counter + 2}`;
                        internalSku = `${baseSku}${suffix}`;
                        counter++;
                    }
                    skuSet.add(internalSku);
                }

                const productData = {
                    sku: internalSku, vendorSku: item.buyer_sku_code, vendor: "DIGIFLAZZ",
                    type: item.type, name: item.product_name, description: item.desc || "",
                    basePrice, isActive, categoryId, providerId,
                };

                if (!existing) {
                    toCreate.push(productData);
                } else if (existing.basePrice !== basePrice || existing.isActive !== isActive) {
                    toUpdate.push({ id: existing.id, data: productData });
                } else {
                    processedItems++;
                }

                // Push batches inside loop to avoid waiting until the end
                if (toCreate.length >= 50) {
                    await productRepository.createManyProducts(toCreate);
                    createdCount += toCreate.length;
                    processedItems += toCreate.length;
                    toCreate.length = 0;
                    await productRepository.updateSyncTask(task.id, {
                        processedItems,
                        createdCount
                    });
                }

                if (toUpdate.length >= 20) {
                    await Promise.all(toUpdate.map(u => productRepository.updateProduct(u.id, u.data)));
                    updatedCount += toUpdate.length;
                    processedItems += toUpdate.length;
                    toUpdate.length = 0;
                    await productRepository.updateSyncTask(task.id, {
                        processedItems,
                        updatedCount
                    });
                }

                if (processedItems % 500 === 0) {
                    await productRepository.updateSyncTask(task.id, { processedItems });
                }
            }

            // Flush remaining batches
            if (toCreate.length > 0) {
                await productRepository.createManyProducts(toCreate);
                createdCount += toCreate.length;
                processedItems += toCreate.length;
                await productRepository.updateSyncTask(task.id, {
                    processedItems,
                    createdCount
                });
            }

            if (toUpdate.length > 0) {
                await Promise.all(toUpdate.map(u => productRepository.updateProduct(u.id, u.data)));
                updatedCount += toUpdate.length;
                processedItems += toUpdate.length;
                await productRepository.updateSyncTask(task.id, {
                    processedItems,
                    updatedCount
                });
            }

            await productRepository.updateSyncTask(task.id, {
                status: "COMPLETED",
                endTime: new Date(),
                processedItems: allItems.length
            });

            return { syncCount: createdCount + updatedCount, vendor: "DIGIFLAZZ" };
        } catch (error) {
            await productRepository.updateSyncTask(task.id, {
                status: "FAILED",
                errorMessage: error.message,
                endTime: new Date()
            });
            logger.error("DigiFlazz Sync Error:", error.message);
            throw error;
        }
    },

    getStatus: async (vendor) => {
        return await productRepository.getLatestSyncTask(vendor);
    }
};

export default digiflazzService;
