import Debug from 'debug';
import dayjs from "dayjs";
import {createHash, createHmac} from 'crypto';
import {parseStringPromise} from 'xml2js'
import type {AWSRequest} from "./types.d.ts";

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


export const toISO8601 = (time?: number | string | Date) => {
    if (time instanceof Date) {
        return dayjs(time).toISOString();
    }
    if (!time || Number(time) < 1514764800000) {
        time = new Date().valueOf();
    }
    return dayjs(new Date(time)).toISOString();
};

export const encode = (val: string): string => {
    return encodeURIComponent(val)
        .replaceAll('+', '%20')
        .replaceAll('*', '%2A')
        .replaceAll('%7E', '~');
};


export const getQueryString = (query: AWSRequest) => {
    return Object.keys(query)
        .map(key => {
            if (query[key] === null || query[key] === undefined) {
                return key;
            }
            return `${key}=${encode(query[key] || '')}`;
        })
        .join('&');
};

export const getSHA256 = (str: string): string => {
    const hash = createHmac('sha256', AMAZON_SC_SecretKey);
    hash.update(str);
    return hash.digest('base64');
};

export const contentMD5 = (str: string): string => {
    return createHash('md5').update(str).digest('base64');
};

export const getStringToSign = (uri: string, query: AWSRequest): string => {
    const queryStr = getQueryString(query);
    return "POST\n" +
        AMAZON_SC_DOMAIN + "\n" +
        uri + "\n" +
        queryStr;
};

export const getSignature = (uri: string, query: AWSRequest): string => {
    try {
        return getSHA256(getStringToSign(uri, query));
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug('getSignature()', err.message);
        }
        return '';
    }
};

export async function parseXML<T = unknown>(xml: string): Promise<T> {
    try {
        return await parseStringPromise(xml);
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("parseXML()", err.message);
            return Promise.reject(err);
        }
        debug("parseXML()", err);
        return Promise.reject(new Error('Error in parseXML()'));
    }
}

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
