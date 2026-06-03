import logger from "../../../config/logger.js";
import productRepository from "./repository.js";
import okeconnect from "../../../integrations/okeconnect/index.js";
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
    // Reject if contains lowercase
    if (/[a-z]/.test(sku)) return false;
    // Reject if starts with common technical prefixes
    const lower = sku.toLowerCase();
    const badPrefixes = ['pre', 'post', 'pst', 'pln', 'pro', 'ok'];
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
        // If no numbers, use descriptive descriptors
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

const okeconnectService = {
    syncProducts: async () => {
        const activeTask = await productRepository.getActiveSyncTask("OKECONNECT");
        if (activeTask) {
            throw { status: 400, message: "Proses sinkronisasi OkeConnect sedang berjalan", errorCode: "SYNC_ALREADY_RUNNING" };
        }

        let task = await productRepository.createSyncTask("OKECONNECT", 0);

        try {
            const creds = await vendorConfigService.getCredentials("OKECONNECT");
            const items = await okeconnect.syncProducts(creds?.apiId);
            await productRepository.updateSyncTask(task.id, { totalItems: items.length });

            // 1. Cache
            const [categories, providers, allInternalSkus] = await Promise.all([
                productRepository.getAllCategories(),
                productRepository.getAllProviders(),
                productRepository.getAllInternalSkus()
            ]);

            const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
            const providerMap = new Map(providers.map(p => [p.name.toLowerCase(), p.id]));
            const skuSet = new Set(allInternalSkus);
            const existingProducts = await productRepository.getExistingProductsByVendor("OKECONNECT");
            const existingMap = new Map(existingProducts.map(p => [p.vendorSku, p]));

            const toCreate = [];
            const toUpdate = [];
            let createdCount = 0;
            let updatedCount = 0;
            let processedItems = 0;

            for (const item of items) {
                const categoryNormalized = item.kategori.toLowerCase();
                const providerNormalized = item.produk.toLowerCase();

                let categoryId = categoryMap.get(categoryNormalized);
                if (!categoryId) {
                    const cat = await productRepository.upsertCategory(item.kategori, categoryNormalized.replace(/\s+/g, "-"));
                    categoryId = cat.id;
                    categoryMap.set(categoryNormalized, categoryId);
                }

                let providerId = providerMap.get(providerNormalized);
                if (!providerId) {
                    const prov = await productRepository.upsertProvider(item.produk, providerNormalized.replace(/\s+/g, "-"));
                    providerId = prov.id;
                    providerMap.set(providerNormalized, providerId);
                }

                let type = "PREPAID";
                const priceValue = Number(item.harga);
                if (priceValue === 0) {
                    type = "INQUIRY";
                } else if (priceValue < 0) {
                    type = "POSTPAID";
                }

                const isActive = item.status === "1";
                const basePrice = Math.abs(priceValue);
                const existing = existingMap.get(item.kode);

                let internalSku;
                if (existing) {
                    internalSku = existing.sku;
                } else {
                    let baseSku;
                    if (isSkuClear(item.kode)) {
                        baseSku = item.kode.toUpperCase();
                    } else {
                        baseSku = generateSkuFromName(item.keterangan, item.produk);
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
                    sku: internalSku, vendorSku: item.kode, vendor: "OKECONNECT",
                    type: type, name: item.keterangan, description: item.produk,
                    basePrice, isActive, categoryId, providerId,
                };

                if (!existing) {
                    toCreate.push(productData);
                } else if (existing.basePrice !== basePrice || existing.isActive !== isActive) {
                    toUpdate.push({ id: existing.id, data: productData });
                } else {
                    // Item matches, count it as processed immediately
                    processedItems++;
                }

                // Batch save inside loop
                if (toCreate.length >= 50) {
                    await productRepository.createManyProducts(toCreate);
                    createdCount += toCreate.length;
                    processedItems += toCreate.length;
                    toCreate.length = 0;
                    await productRepository.updateSyncTask(task.id, {
                        processedItems: Math.min(processedItems, items.length),
                        createdCount
                    });
                }

                if (toUpdate.length >= 20) {
                    await Promise.all(toUpdate.map(u => productRepository.updateProduct(u.id, u.data)));
                    updatedCount += toUpdate.length;
                    processedItems += toUpdate.length;
                    toUpdate.length = 0;
                    await productRepository.updateSyncTask(task.id, {
                        processedItems: Math.min(processedItems, items.length),
                        updatedCount
                    });
                }

                // Update progress every 500 items identified
                if (processedItems % 500 === 0) {
                    await productRepository.updateSyncTask(task.id, { processedItems: Math.min(processedItems, items.length) });
                }
            }

            // Flush remaining batches
            if (toCreate.length > 0) {
                await productRepository.createManyProducts(toCreate);
                createdCount += toCreate.length;
                processedItems += toCreate.length;
                await productRepository.updateSyncTask(task.id, {
                    processedItems: Math.min(processedItems, items.length),
                    createdCount
                });
            }

            if (toUpdate.length > 0) {
                await Promise.all(toUpdate.map(u => productRepository.updateProduct(u.id, u.data)));
                updatedCount += toUpdate.length;
                processedItems += toUpdate.length;
                await productRepository.updateSyncTask(task.id, {
                    processedItems: Math.min(processedItems, items.length),
                    updatedCount
                });
            }

            await productRepository.updateSyncTask(task.id, {
                status: "COMPLETED",
                endTime: new Date(),
                processedItems: items.length
            });

            return { syncCount: createdCount + updatedCount, vendor: "OKECONNECT" };
        } catch (error) {
            await productRepository.updateSyncTask(task.id, {
                status: "FAILED",
                errorMessage: error.message,
                endTime: new Date()
            });
            logger.error("OkeConnect Sync Error:", error.message);
            throw error;
        }
    },

    getStatus: async (vendor) => {
        return await productRepository.getLatestSyncTask(vendor);
    }
};

export default okeconnectService;
