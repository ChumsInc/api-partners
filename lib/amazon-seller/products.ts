import Debug from 'debug';
import * as config from './config.js';
import {Request, Response} from "express";
import {ItemAvailability} from "./types";
import {RowDataPacket} from "mysql2";
import {mysql2Pool} from "chums-local-modules";
import {execRequest} from "./common.js";


const debug = Debug('chums:lib:amazon-seller:orders');
const {toISO8601, encode, getQueryString, getSignature, parseXML} = config;


const fetchProduct = async ({ASIN}: { ASIN: string }) => {
    const {
        AMAZON_SC_DOMAIN,
        AMAZON_SC_AWSAccessKeyId,
        AMAZON_SC_MWSAuthToken,
        AMAZON_SC_MarketplaceId,
        AMAZON_SC_SellerId,
        AMAZON_SC_SignatureMethod,
        AMAZON_SC_SignatureVersion
    } = config;
    try {
        const url = '/Products/2011-10-01';
        const Timestamp = toISO8601();
        const request = {
            'ASINList.ASIN.1': ASIN,
            AWSAccessKeyId: AMAZON_SC_AWSAccessKeyId,
            Action: 'GetMatchingProduct',
            // ...parameters,
            MWSAuthToken: AMAZON_SC_MWSAuthToken,
            MarketplaceId: AMAZON_SC_MarketplaceId,
            SellerId: AMAZON_SC_SellerId,
            SignatureMethod: AMAZON_SC_SignatureMethod,
            SignatureVersion: AMAZON_SC_SignatureVersion,
            Timestamp,
            Version: '2011-10-01',
        };
        return await execRequest(url, request);
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.debug("fetchProduct()", err.message);
            return Promise.reject(err);
        }
        console.debug("fetchProduct()", err);
        return Promise.reject(new Error('Error in fetchProduct()'));
    }
};

const getCompetitivePricingForSKU = async (SKU: string = '') => {
    try {
        const {
            AMAZON_SC_DOMAIN,
            AMAZON_SC_AWSAccessKeyId,
            AMAZON_SC_MWSAuthToken,
            AMAZON_SC_MarketplaceId,
            AMAZON_SC_SellerId,
            AMAZON_SC_SignatureMethod,
            AMAZON_SC_SignatureVersion
        } = config;
        const url = '/Products/2011-10-01';
        const Timestamp = toISO8601();
        const request = {
            AWSAccessKeyId: AMAZON_SC_AWSAccessKeyId,
            Action: 'GetCompetitivePricingForSKU',
            MWSAuthToken: AMAZON_SC_MWSAuthToken,
            MarketplaceId: AMAZON_SC_MarketplaceId,
            SellerId: AMAZON_SC_SellerId,
            'SellerSKUList.SellerSKU.1': SKU,
            SignatureMethod: AMAZON_SC_SignatureMethod,
            SignatureVersion: AMAZON_SC_SignatureVersion,
            Timestamp,
            // Timestamp: '2018-08-07T21:05:47Z',
            Version: '2011-10-01',
        };
        const xmlResponse = await execRequest(url, request);
        const json = await parseXML(xmlResponse);
        const {Product} = json.GetCompetitivePricingForSKUResponse.GetCompetitivePricingForSKUResult[0];
        return parseObject(Product[0]);
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.debug("getCompetitivePricingForSKU()", err.message);
            return Promise.reject(err);
        }
        console.debug("getCompetitivePricingForSKU()", err);
        return Promise.reject(new Error('Error in getCompetitivePricingForSKU()'));
    }
};


const parseObject = (azObject: any = {}): any => {
    const object: any = {};
    debug('parseObject()', Object.keys(azObject));
    Object.keys(azObject)
        .map(key => {
            if (key === '$') {
                return;
            }
            const [val] = azObject[key];
            debug('parseObject', key, val, Array.isArray(val));
            object[key] = val;
        });

    return object;
};

export const loadQuantityAvailable = async ({testMode = false, items = []}: {
    testMode?: boolean;
    items: string[];
}): Promise<ItemAvailability[]> => {
    try {
        const itemFilter = items.length
            ? `AND az.ItemCode in (${mysql2Pool.escape(items)})`
            : '';
        const query = `SELECT az.id,
                              az.Company,
                              az.ItemCode,
                              greatest(QuantityAvailable, 0) as QuantityAvailable,
                              i.SuggestedRetailPrice,
                              av.ItemCodeDesc,
                              av.WarehouseCode,
                              av.ProductType,
                              av.buffer,
                              av.QuantityOnHand,
                              av.QuantityOrdered,
                              av.QuantityOnIT,
                              av.QtyRequiredForWO,
                              az.active,
                              az.SellerSKU
                       FROM c2.AZ_SellerCentralItems az
                                inner join c2.v_web_available av
                                           ON av.Company = az.Company
                                               AND av.ItemCode = az.ItemCode
                                               AND av.WarehouseCode = az.WarehouseCode
                                inner join c2.ci_item i on i.Company = av.Company and i.ItemCode = av.ItemCode
                       WHERE az.active in (0, 1) ${itemFilter}`;
        const [rows] = await mysql2Pool.query<(ItemAvailability & RowDataPacket)[]>(query);
        return rows.map(row => {
            const active = row.active === 1 && row.ProductTYpe !== 'D';
            return {
                ...row,
                active,
                QuantityAvailable: active ? +row.QuantityAvailable : 0,
                QuantityOnHand: +row.QuantityOnHand,
                QuantityOrdered: +row.QuantityOrdered,
                QuantityOnIT: +row.QuantityOnIT,
                QuantityRequiredForWO: +row.QuantityRequiredForWO,
            }
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.debug("loadQuantityAvailable()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadQuantityAvailable()", err);
        return Promise.reject(new Error('Error in loadQuantityAvailable()'));
    }
};


const addProduct = async ({id = 0, Company, ItemCode, WarehouseCode, active = true}: {
    id: number;
    Company: string;
    ItemCode: string;
    WarehouseCode: string;
    active: boolean;
}) => {
    try {
        if (!Company || !ItemCode || !WarehouseCode) {
            return Promise.reject(new Error('Invalid Post'));
        }
        let query = `INSERT INTO c2.AZ_SellerCentralItems
                         (Company, ItemCode, WarehouseCode, active)
                     VALUES (:Company, :ItemCode, :WarehouseCode, :active)
                     ON DUPLICATE KEY UPDATE active = :active`;
        if (id) {
            query = `UPDATE c2.AZ_SellerCentralItems
                     SET Company       = :Company,
                         ItemCode      = :ItemCode,
                         WarehouseCode = :WarehouseCode,
                         active        = :active
                     WHERE id = :id`;
        }
        const data = {Company, ItemCode, WarehouseCode, active, id};
        await mysql2Pool.query(query, data);
        return loadQuantityAvailable({items: [ItemCode]});
        // return result;
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.debug("addProduct()", err.message);
            return Promise.reject(err);
        }
        console.debug("addProduct()", err);
        return Promise.reject(new Error('Error in addProduct()'));
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const {ASIN} = req.params;
        const parameters = {ASIN};
        const result = await fetchProduct(parameters)
        res.set('Content-Type', 'text/xml');
        res.send(result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("getProduct()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in getProduct'});
    }
};

export const getProductCompetitivePricing = async (req: Request, res: Response) => {
    try {
        const result = getCompetitivePricingForSKU(req.params.SKU);
        res.json({result});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("getProductCompetitivePricing()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in getProductCompetitivePricing'});
    }
};

export const postProduct = async (req: Request, res: Response) => {
    try {
        const {id, Company, ItemCode, WarehouseCode, active} = req.body;
        const params = {id, Company, ItemCode, WarehouseCode, active: !!active};
        const result = await addProduct(params);
        res.json({result});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("postProduct()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in postProduct'});
    }
};


export const getAvailable = async (req: Request, res: Response) => {
    try {
        const items = req.query.items as string[];
        const result = await loadQuantityAvailable({items});
        res.json({result})
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("getAvailable()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in getAvailable'});
    }
};
