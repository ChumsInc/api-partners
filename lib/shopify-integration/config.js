exports.LOCAL_API_KEY = process.env.INTRANET_API_KEY;
exports.LOCAL_API_PWD = process.env.INTRANET_API_PWD;

const STORES = {
    chums: 'chums',
    chumssafety: 'chumssafety',
    'chums-safety': 'chumssafety',
};
exports.STORES = STORES;

const STORE_URLS = {
    chums: process.env.SHOPIFY_STORE_URL,
    chumsinc: process.env.SHOPIFY_STORE_URL,
    chumssafety: process.env.SHOPIFY_CHUMSSAFETY_STORE_URL,
    'chums-safety': process.env.SHOPIFY_CHUMSSAFETY_STORE_URL,
};
exports.STORE_URLS = STORE_URLS;

const CONFIG = {
    chums: {
        API_VERSION: process.env.SHOPIFY_API_VERSION,
        API_KEY: process.env.SHOPIFY_USERNAME,
        API_PWD: process.env.SHOPIFY_PASSWORD,
        LOCATION_IDS: process.env.SHOPIFY_LOCATION_IDS.split(','),
        STORE_URL: process.env.SHOPIFY_STORE_URL,
    },
    chumssafety: {
        API_VERSION: process.env.SHOPIFY_CHUMSSAFETY_API_KEY,
        API_KEY: process.env.SHOPIFY_CHUMSSAFETY_API_KEY,
        API_PWD: process.env.SHOPIFY_CHUMSSAFETY_PASSWORD,
        LOCATION_IDS: process.env.SHOPIFY_CHUMSSAFETY_LOCATION_IDS.split(','),
        STORE_URL: process.env.SHOPIFY_CHUMSSAFETY_STORE_URL,
    }
};
CONFIG.chumsinc = CONFIG.chums;
CONFIG['chums-safety'] = CONFIG.chumssafety;

exports.CONFIG = CONFIG;
