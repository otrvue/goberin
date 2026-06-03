import landingRepository from "./repository.js";
import configRepository from "../admin/configs/repository.js";

const landingService = {
    getPublicLanding: async () => {
        return await landingRepository.getPublicLandingData();
    },

    getAdminLanding: async () => {
        // Returns basic data plus raw lists for admin overview
        const base = await landingRepository.getLandingData();
        const features = await landingRepository.getFeatures();
        const metrics = await landingRepository.getMetrics();
        const faqs = await landingRepository.getFaqs();
        return { ...base, features, metrics, faqs };
    },

    updateLandingConfigs: async (data) => {
        const configs = {};

        // Helper to flatten nested objects into prefixed keys
        const flattenSite = (site) => {
            if (site.name) configs.site_name = site.name;
            if (site.tagline) configs.site_tagline = site.tagline;
            if (site.description) configs.site_description = site.description;
            if (site.logo) configs.site_logo = site.logo;
            if (site.favicon) configs.site_favicon = site.favicon;
            if (site.url) configs.site_url = site.url;
            if (site.address) configs.site_address = site.address;
            if (site.maintenance) {
                if (site.maintenance.mode !== undefined) configs.site_maintenance_mode = site.maintenance.mode ? "1" : "0";
                if (site.maintenance.message) configs.site_maintenance_message = site.maintenance.message;
            }
        };

        const flattenHero = (hero) => {
            if (hero.title) configs.hero_title = hero.title;
            if (hero.subtitle) configs.hero_subtitle = hero.subtitle;
            if (hero.bg_image) configs.hero_bg_image = hero.bg_image;
            // Accept both naming conventions
            if (hero.cta_primary_text) configs.hero_cta_primary_text = hero.cta_primary_text;
            if (hero.cta_primary) configs.hero_cta_primary_text = hero.cta_primary;
            if (hero.cta_secondary_text) configs.hero_cta_secondary_text = hero.cta_secondary_text;
            if (hero.cta_secondary) configs.hero_cta_secondary_text = hero.cta_secondary;
        };

        const flattenSeo = (seo) => {
            if (seo.titleTemplate) configs.seo_title_template = seo.titleTemplate;
            if (seo.defaultTitle) configs.seo_default_title = seo.defaultTitle;
            if (seo.defaultDescription) configs.seo_default_description = seo.defaultDescription;
            if (seo.keyword) configs.seo_keyword = seo.keyword;
            if (seo.image) configs.seo_image = seo.image;
            if (seo.twitterCard) configs.seo_twitter_card = seo.twitterCard;
            if (seo.twitterSite) configs.seo_twitter_site = seo.twitterSite;
            if (seo.robots) configs.seo_robots = seo.robots;
            if (seo.canonicalUrl) configs.seo_canonical_url = seo.canonicalUrl;
            if (seo.structuredData) configs.seo_structured_data = seo.structuredData;
        };

        const flattenContact = (contact) => {
            if (contact.email) configs.contact_email = contact.email;
            if (contact.whatsapp) configs.contact_whatsapp = contact.whatsapp;
            if (contact.telegram) configs.contact_telegram = contact.telegram;
        };

        const flattenFooter = (footer) => {
            if (footer.description) configs.footer_description = footer.description;
            if (footer.copyright) configs.footer_copyright = footer.copyright;
        };

        const flattenContent = (content) => {
            if (content.about_us) configs.content_about_us = content.about_us;
            if (content.tos) configs.content_tos = content.tos;
            if (content.privacy) configs.content_privacy = content.privacy;
        };

        const flattenEcosystem = (ecosystem) => {
            if (ecosystem.title) configs.ecosystem_title = ecosystem.title;
            if (ecosystem.description) configs.ecosystem_description = ecosystem.description;
        };

        // Support both nested and flat input for backward compatibility
        if (data.site) flattenSite(data.site);
        if (data.hero) flattenHero(data.hero);
        if (data.seo) flattenSeo(data.seo);
        if (data.contact) flattenContact(data.contact);
        if (data.footer) flattenFooter(data.footer);
        if (data.content) flattenContent(data.content);
        if (data.ecosystem) flattenEcosystem(data.ecosystem);

        // Individual field updates (legacy/fallback)
        const fields = [
            'hero_title', 'hero_subtitle', 'hero_bg_image', 'hero_cta_primary_text', 'hero_cta_secondary_text',
            'ecosystem_title', 'ecosystem_description',
            'site_name', 'site_tagline', 'site_description', 'site_logo', 'site_favicon', 'site_url', 'site_maintenance_mode', 'site_maintenance_message', 'site_address',
            'contact_email', 'contact_whatsapp', 'contact_telegram',
            'footer_description', 'footer_copyright',
            'content_about_us', 'content_tos', 'content_privacy',
            'seo_title_template', 'seo_default_title', 'seo_default_description', 'seo_keyword', 'seo_image', 'seo_twitter_card', 'seo_twitter_site', 'seo_robots', 'seo_canonical_url', 'seo_structured_data'
        ];

        fields.forEach(field => {
            if (data[field] !== undefined) configs[field] = data[field];
        });

        if (Object.keys(configs).length > 0) {
            await configRepository.updateConfigs(configs);
        }
    },

    // Features
    addFeature: async (data) => {
        return await landingRepository.createFeature(data);
    },
    updateFeature: async (id, data) => {
        await landingRepository.updateFeature(id, data);
    },
    deleteFeature: async (id) => {
        await landingRepository.deleteFeature(id);
    },

    // Metrics
    addMetric: async (data) => {
        return await landingRepository.createMetric(data);
    },
    updateMetric: async (id, data) => {
        await landingRepository.updateMetric(id, data);
    },
    deleteMetric: async (id) => {
        await landingRepository.deleteMetric(id);
    },

    // FAQs
    addFaq: async (data) => {
        return await landingRepository.createFaq(data);
    },
    updateFaq: async (id, data) => {
        await landingRepository.updateFaq(id, data);
    },
    deleteFaq: async (id) => {
        await landingRepository.deleteFaq(id);
    }
};

export default landingService;
