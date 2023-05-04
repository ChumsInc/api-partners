import Debug from 'debug';
import { formatISO } from 'date-fns';
import { createHash, createHmac } from 'crypto';
import { parseStringPromise } from 'xml2js';
const debug = Debug('chums:lib:amazon-seller:config');
export const AMAZON_SC_DOMAIN = 'mws.amazonservices.com';
export const AMAZON_SC_AWSAccessKeyId = process.env.AMAZON_SC_ACCESS_KEY_ID || '';
export const AMAZON_SC_MarketplaceId = process.env.AMAZON_SC_MARKETPLACE_ID || '';
export const AMAZON_SC_SellerId = process.env.AMAZON_SC_SELLER_ID || '';
export const AMAZON_SC_MWSAuthToken = process.env.AMAZON_SC_AUTH_TOKEN || '';
export const AMAZON_SC_SecretKey = process.env.AMAZON_SC_SECRET_KEY || '';
export const AMAZON_SC_SignatureMethod = 'HmacSHA256';
export const AMAZON_SC_SignatureVersion = '2';
export const INTRANET_API_USERNAME = process.env.INTRANET_API_KEY || '';
export const INTRANET_API_PASSWORD = process.env.INTRANET_API_PWD || '';
export const toISO8601 = (time) => {
    if (time instanceof Date) {
        return formatISO(time);
    }
    if (!time || Number(time) < 1514764800000) {
        time = new Date().valueOf();
    }
    return formatISO(new Date(time));
};
export const encode = (val) => {
    return encodeURIComponent(val).replace('+', '%20').replace('*', '%2A').replace('%7E', '~');
};
export const getQueryString = (query) => {
    return Object.keys(query)
        .map(key => {
        if (query[key] === null || query[key] === undefined) {
            return key;
        }
        return `${key}=${encode(query[key] || '')}`;
    })
        .join('&');
};
export const getSHA256 = (str) => {
    const hash = createHmac('sha256', AMAZON_SC_SecretKey);
    hash.update(str);
    return hash.digest('base64');
};
export const contentMD5 = (str) => {
    return createHash('md5').update(str).digest('base64');
};
export const getStringToSign = (uri, query) => {
    const queryStr = getQueryString(query);
    return "POST\n" +
        AMAZON_SC_DOMAIN + "\n" +
        uri + "\n" +
        queryStr;
};
export const getSignature = (uri, query) => {
    try {
        return getSHA256(getStringToSign(uri, query));
    }
    catch (err) {
        if (err instanceof Error) {
            debug('getSignature()', err.message);
        }
        return '';
    }
};
export const parseXML = async (xml) => {
    try {
        return await parseStringPromise(xml);
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
