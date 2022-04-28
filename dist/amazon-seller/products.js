"use strict";
const fetch = require('node-fetch');
const debug = require('debug')('chums:lib:amazon-seller:orders');
const log = require('./log');
const config = require('./config');
const { toISO8601, encode, getQueryString, getSignature, parseXML } = config;
const { mysql2Pool } = require('chums-local-modules');
const fetchProduct = async (parameters = {}) => {
    const { AMAZON_SC_DOMAIN, AMAZON_SC_AWSAccessKeyId, AMAZON_SC_MWSAuthToken, AMAZON_SC_MarketplaceId, AMAZON_SC_SellerId, AMAZON_SC_SignatureMethod, AMAZON_SC_SignatureVersion } = config;
    const { ASIN } = parameters;
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
        const signature = encode(getSignature(url, request));
        const queryStr = getQueryString(request);
        const response = await fetch(`https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST'
        });
        const status = response.status;
        const xmlResponse = await response.text();
        await log.logResponse({ status, request, xmlResponse });
        return xmlResponse;
        return await parseXML(xmlResponse);
    }
    catch (err) {
        debug('fetchOrders', err.message);
        return Promise.reject(err);
    }
};
const getCompetitivePricingForSKU = async (SKU = '') => {
    try {
        const { AMAZON_SC_DOMAIN, AMAZON_SC_AWSAccessKeyId, AMAZON_SC_MWSAuthToken, AMAZON_SC_MarketplaceId, AMAZON_SC_SellerId, AMAZON_SC_SignatureMethod, AMAZON_SC_SignatureVersion } = config;
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
        const signature = encode(getSignature(url, request));
        const queryStr = getQueryString(request);
        const response = await fetch(`https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST'
        });
        const status = response.status;
        const xmlResponse = await response.text();
        await log.logResponse({ status, request, xmlResponse });
        // return xmlResponse;
        const json = await parseXML(xmlResponse);
        const { Product } = json.GetCompetitivePricingForSKUResponse.GetCompetitivePricingForSKUResult[0];
        return parseObject(Product[0]);
    }
    catch (err) {
        debug("getCompetitivePricingForSKU()", err.message);
        return Promise.reject(err);
    }
};
const parseObject = (azObject = {}) => {
    const object = {};
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
const loadQuantityAvailable = async ({ testMode = false, items = [] }) => {
    try {
        // debug('loadQuantityAvailable', {testMode, items});
        const connection = await mysql2Pool.getConnection();
        const itemFilter = items.length
            ? `AND az.ItemCode in (${connection.escape(items)})`
            : '';
        const query = `SELECT az.id, az.Company, az.ItemCode, 
                              greatest(QuantityAvailable, 0) as QuantityAvailable, 
                              i.SuggestedRetailPrice,
                              av.ItemCodeDesc, av.WarehouseCode, av.ProductType,
                              av.buffer, av.QuantityOnHand, av.QuantityOrdered, av.QuantityOnIT, 
                              av.QtyRequiredForWO,
                              az.active, az.SellerSKU
        FROM c2.AZ_SellerCentralItems az
        inner join c2.v_web_available av 
            ON av.Company = az.Company 
            AND av.ItemCode = az.ItemCode 
            AND av.WarehouseCode = az.WarehouseCode
        inner join c2.ci_item i on i.Company = av.Company and i.ItemCode = av.ItemCode
        WHERE az.active in (0, 1) ${itemFilter}`;
        // debug('loadQuantityAvailable', query);
        const [rows] = await connection.query(query);
        connection.release();
        return rows.map(row => {
            row.active = row.active === 1 && row.ProductType !== 'D';
            row.QuantityAvailable = row.active === false ? 0 : Number(row.QuantityAvailable);
            row.QuantityOnHand = Number(row.QuantityOnHand);
            row.QuantityOrdered = Number(row.QuantityOrdered);
            row.QuantityOnIT = Number(row.QuantityOnIT);
            row.QtyRequiredForWO = Number(row.QtyRequiredForWO);
            // row.QuantityPending = Number(row.QuantityPending);
            return row;
        });
        // rows.map(r => {
        //     r.QuantityAvailable = testMode ? 0 : Number(r.QuantityAvailable);
        // });
        // return rows;
    }
    catch (err) {
        debug('loadQuantityAvailable()', err.message);
        return Promise.reject(err);
    }
};
exports.loadQuantityAvailable = loadQuantityAvailable;
const addProduct = async ({ id = 0, Company, ItemCode, WarehouseCode, active = true }) => {
    try {
        if (!Company || !ItemCode || !WarehouseCode) {
            throw new Error('Invalid Post');
        }
        let query = `INSERT INTO c2.AZ_SellerCentralItems 
        (Company, ItemCode, WarehouseCode, active)
        VALUES (:Company, :ItemCode, :WarehouseCode, :active)
        ON DUPLICATE KEY UPDATE active = :active`;
        if (id) {
            query = `UPDATE c2.AZ_SellerCentralItems 
            SET Company = :Company, 
                ItemCode = :ItemCode, 
                WarehouseCode = :WarehouseCode,
                active = :active
            WHERE id = :id`;
        }
        const data = { Company, ItemCode, WarehouseCode, active, id };
        const connection = await mysql2Pool.getConnection();
        const [result] = await connection.query(query, data);
        connection.release();
        return loadQuantityAvailable({ items: [ItemCode] });
        // return result;
    }
    catch (err) {
        debug('addProduct', err.message);
        return Promise.reject(err);
    }
};
exports.getProduct = (req, res) => {
    const { ASIN } = req.params;
    const parameters = { ASIN };
    fetchProduct(parameters)
        .then(result => {
        res.set('Content-Type', 'text/xml');
        res.send(result);
    })
        .catch(err => {
        debug('getProduct', err.message, err);
        res.json({ error: err.message });
    });
};
exports.getProductCompetitivePricing = (req, res) => {
    getCompetitivePricingForSKU(req.params.SKU)
        .then(result => {
        res.json({ result });
    })
        // .then(result => {
        //     res.set('Content-Type', 'text/xml');
        //     res.send(result);
        // })
        .catch(err => {
        res.json({ error: err.message });
    });
};
exports.postProduct = (req, res) => {
    const { id, Company, ItemCode, WarehouseCode, active } = req.body;
    const params = { id, Company, ItemCode, WarehouseCode, active: !!active };
    addProduct(params)
        .then(result => {
        res.json({ result });
    })
        .catch(err => {
        debug('postProduct', err.message, err);
        res.json({ error: err.message });
    });
};
exports.getAvailable = (req, res) => {
    const items = req.query.items;
    loadQuantityAvailable({ items })
        .then(result => {
        res.json({ result });
    })
        .catch(err => {
        res.json({ error: err.message });
    });
};
