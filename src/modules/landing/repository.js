import pool from "../../config/db.js";

const landingRepository = {
    // Helper to build configMap and formatUrl
    _buildConfigHelpers: (configs) => {
        const configMap = configs.reduce((acc, row) => {
            acc[row.name] = row.value;
            return acc;
        }, {});

        const baseUrl = (process.env.PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
        const formatUrl = (url) => {
            if (!url) return "";
            if (url.startsWith("http")) return url;
            return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
        };

        return { configMap, formatUrl };
    },

    // Public Landing Data (clean format without internal fields)
    getPublicLandingData: async () => {
        const [configs] = await pool.query("SELECT name, value FROM web_configs WHERE name LIKE 'hero_%' OR name LIKE 'site_%' OR name LIKE 'contact_%' OR name LIKE 'footer_%' OR name LIKE 'content_%'");
        const [features] = await pool.query("SELECT * FROM landing_features ORDER BY displayOrder ASC, createdAt ASC");
        const [metrics] = await pool.query("SELECT * FROM landing_metrics ORDER BY displayOrder ASC, createdAt ASC");
        const [faqs] = await pool.query("SELECT * FROM landing_faqs ORDER BY displayOrder ASC, createdAt ASC");

        const { configMap, formatUrl } = landingRepository._buildConfigHelpers(configs);

        return {
            site: {
                name: configMap.site_name || "NEOPAY",
                tagline: configMap.site_tagline || "",
                description: configMap.site_description || "",
                logo: formatUrl(configMap.site_logo),
                favicon: formatUrl(configMap.site_favicon),
                url: configMap.site_url || "",
                address: configMap.site_address || "",
                maintenance: {
                    mode: configMap.site_maintenance_mode === "1",
                    message: configMap.site_maintenance_message || ""
                }
            },
            contact: {
                email: configMap.contact_email || "",
                whatsapp: configMap.contact_whatsapp || "",
                telegram: configMap.contact_telegram || ""
            },
            hero: {
                title: configMap.hero_title || "",
                subtitle: configMap.hero_subtitle || "",
                bg_image: formatUrl(configMap.hero_bg_image),
                cta_primary: configMap.hero_cta_primary_text || "",
                cta_secondary: configMap.hero_cta_secondary_text || ""
            },
            metrics: metrics.map(m => ({ label: m.label, value: m.value })),
            features: features.map(f => ({ title: f.title, description: f.description, icon: f.icon })),
            content: {
                about_us: configMap.content_about_us || "",
                tos: configMap.content_tos || "",
                privacy: configMap.content_privacy || ""
            },
            footer: {
                copyright: configMap.footer_copyright || "",
                description: configMap.footer_description || ""
            },
            faqs: faqs.map(q => ({ id: q.id, question: q.question, answer: q.answer }))
        };
    },

    // Admin Landing Data (full format with all internal fields)
    getLandingData: async () => {
        const [configs] = await pool.query("SELECT name, value FROM web_configs WHERE name LIKE 'hero_%' OR name LIKE 'ecosystem_%' OR name LIKE 'site_%' OR name LIKE 'seo_%' OR name LIKE 'contact_%' OR name LIKE 'footer_%' OR name LIKE 'content_%'");
        const [features] = await pool.query("SELECT * FROM landing_features ORDER BY displayOrder ASC, createdAt ASC");
        const [metrics] = await pool.query("SELECT * FROM landing_metrics ORDER BY displayOrder ASC, createdAt ASC");
        const [faqs] = await pool.query("SELECT * FROM landing_faqs ORDER BY displayOrder ASC, createdAt ASC");

        const { configMap, formatUrl } = landingRepository._buildConfigHelpers(configs);

        return {
            site: {
                name: configMap.site_name || "NEOPAY",
                tagline: configMap.site_tagline || "",
                description: configMap.site_description || "",
                logo: formatUrl(configMap.site_logo),
                favicon: formatUrl(configMap.site_favicon),
                url: configMap.site_url || "",
                address: configMap.site_address || "",
                maintenance: {
                    mode: configMap.site_maintenance_mode === "1",
                    message: configMap.site_maintenance_message || ""
                }
            },
            contact: {
                email: configMap.contact_email || "",
                whatsapp: configMap.contact_whatsapp || "",
                telegram: configMap.contact_telegram || ""
            },
            hero: {
                title: configMap.hero_title || "",
                subtitle: configMap.hero_subtitle || "",
                bg_image: formatUrl(configMap.hero_bg_image),
                cta_primary_text: configMap.hero_cta_primary_text || "",
                cta_secondary_text: configMap.hero_cta_secondary_text || ""
            },
            footer: {
                description: configMap.footer_description || "",
                copyright: configMap.footer_copyright || ""
            },
            content: {
                about_us: configMap.content_about_us || "",
                tos: configMap.content_tos || "",
                privacy: configMap.content_privacy || ""
            },
            metrics: metrics.map(m => ({ id: m.id, value: m.value, label: m.label, displayOrder: m.displayOrder })),
            features: features.map(f => ({ id: f.id, icon: f.icon, title: f.title, description: f.description, displayOrder: f.displayOrder })),
            faqs: faqs.map(q => ({ id: q.id, question: q.question, answer: q.answer, displayOrder: q.displayOrder })),
            ecosystem: {
                title: configMap.ecosystem_title || "",
                description: configMap.ecosystem_description || ""
            },
            seo: {
                titleTemplate: configMap.seo_title_template || "",
                defaultTitle: configMap.seo_default_title || "",
                defaultDescription: configMap.seo_default_description || "",
                keyword: configMap.seo_keyword || "",
                image: formatUrl(configMap.seo_image),
                twitterCard: configMap.seo_twitter_card || "",
                twitterSite: configMap.seo_twitter_site || "",
                robots: configMap.seo_robots || "",
                canonicalUrl: configMap.seo_canonical_url || "",
                structuredData: configMap.seo_structured_data || ""
            }
        };
    },

    // Features CRUD
    getFeatures: async () => {
        const [rows] = await pool.query("SELECT * FROM landing_features ORDER BY displayOrder ASC, createdAt ASC");
        return rows;
    },
    createFeature: async (data) => {
        const { icon, title, description, displayOrder } = data;
        const [result] = await pool.query(
            "INSERT INTO landing_features (icon, title, description, displayOrder) VALUES (?, ?, ?, ?)",
            [icon, title, description, displayOrder || 0]
        );
        return result.insertId;
    },
    updateFeature: async (id, data) => {
        const { icon, title, description, displayOrder } = data;
        await pool.query(
            "UPDATE landing_features SET icon = ?, title = ?, description = ?, displayOrder = ? WHERE id = ?",
            [icon, title, description, displayOrder || 0, id]
        );
    },
    deleteFeature: async (id) => {
        await pool.query("DELETE FROM landing_features WHERE id = ?", [id]);
    },

    // Metrics CRUD
    getMetrics: async () => {
        const [rows] = await pool.query("SELECT * FROM landing_metrics ORDER BY displayOrder ASC, createdAt ASC");
        return rows;
    },
    createMetric: async (data) => {
        const { label, value, displayOrder } = data;
        const [result] = await pool.query(
            "INSERT INTO landing_metrics (label, value, displayOrder) VALUES (?, ?, ?)",
            [label, value, displayOrder || 0]
        );
        return result.insertId;
    },
    updateMetric: async (id, data) => {
        const { label, value, displayOrder } = data;
        await pool.query(
            "UPDATE landing_metrics SET label = ?, value = ?, displayOrder = ? WHERE id = ?",
            [label, value, displayOrder || 0, id]
        );
    },
    deleteMetric: async (id) => {
        await pool.query("DELETE FROM landing_metrics WHERE id = ?", [id]);
    },

    // FAQs CRUD
    getFaqs: async () => {
        const [rows] = await pool.query("SELECT * FROM landing_faqs ORDER BY displayOrder ASC, createdAt ASC");
        return rows;
    },
    createFaq: async (data) => {
        const { question, answer, displayOrder } = data;
        const [result] = await pool.query(
            "INSERT INTO landing_faqs (question, answer, displayOrder) VALUES (?, ?, ?)",
            [question, answer, displayOrder || 0]
        );
        return result.insertId;
    },
    updateFaq: async (id, data) => {
        const { question, answer, displayOrder } = data;
        await pool.query(
            "UPDATE landing_faqs SET question = ?, answer = ?, displayOrder = ? WHERE id = ?",
            [question, answer, displayOrder || 0, id]
        );
    },
    deleteFaq: async (id) => {
        await pool.query("DELETE FROM landing_faqs WHERE id = ?", [id]);
    }
};

export default landingRepository;
