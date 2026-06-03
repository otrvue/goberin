import logger from "../../../config/logger.js";
import productRepository from "./repository.js";
import h2h from "../../../integrations/h2h/index.js";
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
    const badPrefixes = ['pre', 'post', 'pst', 'pln', 'pro', 'ok', 'df'];
    if (badPrefixes.some(p => lower.startsWith(p))) return false;
    // Reject if purely numeric and long
    if (/^\d{8,}$/.test(sku)) return false;
    // Reject if too short
    if (sku.length < 3) return false;

    return true;
};

const generateSkuFromName = (name, providerName) => {
    if (!name) return "PROD";
    let prefix = "";
    const providerUpper = (providerName || "H2H").toUpperCase();
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

const h2hService = {
    syncProducts: async () => {
        const activeTask = await productRepository.getActiveSyncTask("H2H");
        if (activeTask) {
            // Stuck detection: if not updated for more than 10 minutes, consider it dead
            const lastUpdate = new Date(activeTask.updatedAt);
            const now = new Date();
            const diffMinutes = (now - lastUpdate) / (1000 * 60);

            if (diffMinutes < 2) {
                throw { status: 400, message: "Proses sinkronisasi H2H.id sedang berjalan", errorCode: "SYNC_ALREADY_RUNNING" };
            }

            // Clean up stuck task
            await productRepository.updateSyncTask(activeTask.id, {
                status: "FAILED",
                errorMessage: "Task stuck/timeout (automatic cleanup)",
                endTime: new Date()
            });
            logger.warn(`Stuck H2H sync task (${activeTask.id}) has been cleaned up.`);
        }

        let task = await productRepository.createSyncTask("H2H", 0);

        try {
            const creds = await vendorConfigService.getCredentials("H2H");
            const allItems = await h2h.syncProducts(creds?.memberId, creds?.pin, creds?.password);
            await productRepository.updateSyncTask(task.id, { totalItems: allItems.length });

            // 1. Fetch & Cache Existing
            const [categories, providers, allInternalSkus] = await Promise.all([
                productRepository.getAllCategories(),
                productRepository.getAllProviders(),
                productRepository.getAllInternalSkus()
            ]);

            const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
            const providerMap = new Map(providers.map(p => [p.name.toLowerCase(), p.id]));
            const skuSet = new Set(allInternalSkus);
            const existingProducts = await productRepository.getExistingProductsByVendor("H2H");
            const existingMap = new Map(existingProducts.map(p => [p.vendorSku, p]));

            const toCreate = [];
            const toUpdate = [];
            let createdCount = 0;
            let updatedCount = 0;
            let processedItems = 0;

            for (const item of allItems) {
                // Map new H2H.id fields
                const name = item.keterangan || item.name;
                const vendorSku = item.kode || item.code;
                const providerName = item.produk || item.operator || "Lainnya";
                // Use produk as fallback if kategori/type is empty
                const categoryName = item.kategori || item.type || item.produk || "Lainnya";
                const price = Number(item.harga || item.price || 0);

                if (!name || !vendorSku) {
                    logger.warn("H2H.id Sync: Skipping invalid item (missing keterangan/kode)", item);
                    processedItems++;
                    continue;
                }

                const categoryNormalized = categoryName.toLowerCase();
                const providerNormalized = providerName.toLowerCase();

                let categoryId = categoryMap.get(categoryNormalized);
                if (!categoryId) {
                    const cat = await productRepository.upsertCategory(categoryName, categoryNormalized.replace(/\s+/g, "-"));
                    categoryId = cat.id;
                    categoryMap.set(categoryNormalized, categoryId);
                }

                let providerId = providerMap.get(providerNormalized);
                if (!providerId) {
                    const prov = await productRepository.upsertProvider(providerName, providerNormalized.replace(/\s+/g, "-"));
                    providerId = prov.id;
                    providerMap.set(providerNormalized, providerId);
                }

                const isActive = item.status === "1" || item.status === "OPEN" || item.status === 1;
                const basePrice = price;
                const existing = existingMap.get(vendorSku);

                let internalSku;
                if (existing) {
                    internalSku = existing.sku;
                } else {
                    let baseSku;
                    if (isSkuClear(vendorSku)) {
                        baseSku = vendorSku.toUpperCase();
                    } else {
                        baseSku = generateSkuFromName(name, providerName);
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

                // Determine internal type
                let type = "PREPAID";
                const lowerCat = categoryNormalized;
                const lowerProv = providerNormalized;
                const lowerSku = vendorSku.toLowerCase();

                // PPOB/Tagihan detection: Check category name, provider name, or SKU prefix 'c' (cek)
                if (lowerCat.includes("pasca") || lowerCat.includes("tagihan") ||
                    lowerProv.includes("pasca") || lowerProv.includes("tagihan") ||
                    lowerSku.startsWith("c")) {
                    type = "POSTPAID";
                } else if (lowerCat.includes("bebas") || lowerCat.includes("open")) {
                    type = "OPEN_DENOM";
                }

                const productData = {
                    sku: internalSku, vendorSku, vendor: "H2H",
                    type, name: name, description: item.keterangan || item.description || "",
                    basePrice, isActive, categoryId, providerId,
                };

                if (!existing) {
                    toCreate.push(productData);
                } else if (existing.basePrice !== basePrice || existing.isActive !== isActive) {
                    toUpdate.push({ id: existing.id, data: productData });
                } else {
                    processedItems++;
                }

                // Push batches inside loop
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

            return { syncCount: createdCount + updatedCount, vendor: "H2H" };
        } catch (error) {
            await productRepository.updateSyncTask(task.id, {
                status: "FAILED",
                errorMessage: error.message,
                endTime: new Date()
            });
            logger.error("H2H.id Sync Error:", error.message);
            throw error;
        }
    },

    getStatus: async (vendor) => {
        return await productRepository.getLatestSyncTask(vendor);
    }
};

export default h2hService;
