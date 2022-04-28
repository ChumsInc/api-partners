"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseXML = exports.getSignature = exports.getStringToSign = exports.contentMD5 = exports.getSHA256 = exports.getQueryString = exports.encode = exports.toISO8601 = exports.INTRANET_API_PASSWORD = exports.INTRANET_API_USERNAME = exports.AMAZON_SC_SignatureVersion = exports.AMAZON_SC_SignatureMethod = exports.AMAZON_SC_SecretKey = exports.AMAZON_SC_MWSAuthToken = exports.AMAZON_SC_SellerId = exports.AMAZON_SC_MarketplaceId = exports.AMAZON_SC_AWSAccessKeyId = exports.AMAZON_SC_DOMAIN = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('chums:lib:amazon-seller:config');
const date_fns_1 = require("date-fns");
const crypto_1 = require("crypto");
const xml2js_1 = require("xml2js");
exports.AMAZON_SC_DOMAIN = 'mws.amazonservices.com';
exports.AMAZON_SC_AWSAccessKeyId = process.env.AMAZON_SC_ACCESS_KEY_ID || '';
exports.AMAZON_SC_MarketplaceId = process.env.AMAZON_SC_MARKETPLACE_ID || '';
exports.AMAZON_SC_SellerId = process.env.AMAZON_SC_SELLER_ID || '';
exports.AMAZON_SC_MWSAuthToken = process.env.AMAZON_SC_AUTH_TOKEN || '';
exports.AMAZON_SC_SecretKey = process.env.AMAZON_SC_SECRET_KEY || '';
exports.AMAZON_SC_SignatureMethod = 'HmacSHA256';
exports.AMAZON_SC_SignatureVersion = '2';
exports.INTRANET_API_USERNAME = process.env.INTRANET_API_KEY || '';
exports.INTRANET_API_PASSWORD = process.env.INTRANET_API_PWD || '';
const toISO8601 = (time) => {
    if (time instanceof Date) {
        return (0, date_fns_1.formatISO)(time);
    }
    if (!time || Number(time) < 1514764800000) {
        time = new Date().valueOf();
    }
    return (0, date_fns_1.formatISO)(new Date(time));
};
exports.toISO8601 = toISO8601;
const encode = (val) => {
    return encodeURIComponent(val).replace('+', '%20').replace('*', '%2A').replace('%7E', '~');
};
exports.encode = encode;
const getQueryString = (query) => {
    return Object.keys(query)
        .map(key => {
        if (query[key] === null || query[key] === undefined) {
            return key;
        }
        return `${key}=${(0, exports.encode)(query[key] || '')}`;
    })
        .join('&');
};
exports.getQueryString = getQueryString;
const getSHA256 = (str) => {
    const hash = (0, crypto_1.createHmac)('sha256', exports.AMAZON_SC_SecretKey);
    hash.update(str);
    return hash.digest('base64');
};
exports.getSHA256 = getSHA256;
const contentMD5 = (str) => {
    return (0, crypto_1.createHash)('md5').update(str).digest('base64');
};
exports.contentMD5 = contentMD5;
const getStringToSign = (uri, query) => {
    const queryStr = (0, exports.getQueryString)(query);
    return "POST\n" +
        exports.AMAZON_SC_DOMAIN + "\n" +
        uri + "\n" +
        queryStr;
};
exports.getStringToSign = getStringToSign;
const getSignature = (uri, query) => {
    try {
        return (0, exports.getSHA256)((0, exports.getStringToSign)(uri, query));
    }
    catch (err) {
        if (err instanceof Error) {
            debug('getSignature()', err.message);
        }
        return '';
    }
};
exports.getSignature = getSignature;
const parseXML = async (xml) => {
    try {
        return await (0, xml2js_1.parseStringPromise)(xml);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("parseXML()", err.message);
            return Promise.reject(err);
        }
        debug("parseXML()", err);
        return Promise.reject(new Error('Error in parseXML()'));
    }
};
exports.parseXML = parseXML;
// export const parseAZObject = (azObject:object = {}):object => {
//     const object = {};
//     Object.keys(azObject)
//         .map(key => {
//             const [val] = azObject[key];
//             object[key] = val;
//         });
//
//     return object;
// };
// export const buildXML = async (obj):Promise<string> => {
//     try {
//         const builder = new Builder();
//         return builder.buildObject(obj);
//     } catch(err) {
//         debug("'buildXML'()", err.message);
//         return Promise.reject(err);
//     }
// }
