"use strict";
const debug = require('debug')('chums:lib:shopify-integration:fulfillment');
const { fetchGETResults, genAdminApiURL, fetchPOST } = require('./utils');
const { fetchOrders, fetchShopifyOrder, loadOrderImport } = require('./orders');
const { CONFIG } = require('./config');
const { mysql2Pool } = require('chums-local-modules');
async function fetchTracking({ id, sage_SalesOrderNo }) {
    try {
        const url = `https://intranet.chums.com/node-sage/api/CHI/shopify/tracking/${sage_SalesOrderNo}`;
        const { results } = await fetchGETResults(url);
        return { id, ...results };
    }
    catch (err) {
        debug("fetchTracking()", err.message);
        return Promise.reject(err);
    }
}
function parseTrackingCompany(StarshipShipVia = '') {
    if (/usps/.test((StarshipShipVia).toLowerCase())) {
        return 'USPS';
    }
    if (/ups/.test(StarshipShipVia.toLowerCase())) {
        return 'UPS';
    }
    if (/fedex/.test(StarshipShipVia.toLowerCase())) {
        return 'FedEx';
    }
    return StarshipShipVia;
}
function buildFulfillmentBody({ id, tracking }) {
    if (tracking.length > 1) {
        return {
            id,
            fulfillment: {
                location_id: CONFIG.chums.LOCATION_IDS[0],
                tracking_numbers: tracking.map(t => t.TrackingId),
                notify_customer: true
            }
        };
    }
    const { TrackingId, StarshipShipVia } = tracking[0];
    return {
        id,
        fulfillment: {
            location_id: CONFIG.chums.LOCATION_IDS[0],
            tracking_number: TrackingId,
            tracking_company: parseTrackingCompany(StarshipShipVia || ''),
            notify_customer: true
        }
    };
}
async function saveFulfillment({ fulfillment }) {
    try {
        const query = `INSERT IGNORE INTO shopify.fulfillment (id, order_id, status, response)
                       VALUES (:id, :order_id, :status, :response)`;
        const { id, order_id, status } = fulfillment;
        const data = { id, order_id, status, response: JSON.stringify(fulfillment) };
        const connection = await mysql2Pool.getConnection();
        await connection.query(query, data);
        connection.release();
        return fulfillment;
    }
    catch (err) {
        debug("saveFulfillment()", err.message);
        return Promise.reject(err);
    }
}
async function fulfillOrder({ id, fulfillment }) {
    try {
        const url = genAdminApiURL(`/orders/${id}/fulfillments.json`);
        const response = await fetchPOST(url, { fulfillment });
        // debug('fulfillOrder()', {response});
        if (response.fulfillment === undefined) {
            debug('fulfillOrder() unable to save', id, response);
        }
        else {
            await saveFulfillment(response);
        }
        return response;
    }
    catch (err) {
        debug("fulfillOrder()", id, fulfillment, err.message);
        return err;
    }
}
async function fulfillOrders() {
    try {
        let orders = await fetchOrders({ status: 'open' });
        // const fulfillment = await eachOfLimit(orders, 10, fetchTracking);
        let fulfillment = [];
        while (orders.length > 0) {
            debug('fulfillOrders() orders.length', orders.length);
            const _orders = orders.length > 50 ? orders.slice(0, 50) : [...orders];
            const _fulfillment = await Promise.all(_orders.map(order => fetchTracking(order)));
            fulfillment.push(..._fulfillment);
            if (_orders.length === 50) {
                orders = orders.slice(50);
            }
            else {
                orders = [];
            }
            debug('fulfillOrders() order to mark fulfilled', fulfillment.length);
        }
        const list = fulfillment
            .filter(f => f.tracking.length > 0)
            .map(f => buildFulfillmentBody(f));
        debug(list);
        debug('fulfillOrders() fulfilling orders: ', list.length);
        const fulfilled = [];
        // for (let i = 0, iLen = list.length; i < iLen; i += 1 ) {
        //     const ff = await fulfillOrder(list[i]);
        //     debug('fulfillOrders()', `${i} of ${list.length}`);
        //     fulfilled.push(ff);
        //
        // }
        // const fulfilled = list.map(async ff => {
        //     return await fulfillOrder(ff);
        // });
        // const fulfilled = await Promise.all(list.map(ff => fulfillOrder(ff)));
        return {
            fulfilled,
            unfulfilled: fulfillment.filter(f => f.tracking.length === 0),
        };
    }
    catch (err) {
        debug("fulfillOrders()", err.message);
        return Promise.reject(err);
    }
}
const getFulfillTracking = async (req, res) => {
    try {
        const { fulfilled, unfulfilled } = await fulfillOrders();
        return res.json({ fulfilled, unfulfilled });
    }
    catch (err) {
        debug("getFulfillTracking()", err.message);
        res.json({ error: err.message });
    }
};
exports.getFulfillTracking = getFulfillTracking;
// async function fulfillOrder(id) {
//     try {
//         const order = await fetchShopifyOrder(id);
//         return order;
//     } catch(err) {
//         debug("fulfillOrder()", err.message);
//         return err;
//     }
// }
async function getFulfillOrder(req, res) {
    try {
        const { id } = req.params;
        const order = await fetchShopifyOrder(id);
        if (!!order.closed_at) {
            res.json({ status: 'closed', message: 'Order is already closed.', order });
            return;
        }
        if (order.fulfillment_status === 'fulfilled') {
            res.json({ status: 'fulfilled', message: 'already fulfilled, may require manual archiving.', order });
            return;
        }
        if (order.financial_status === 'refunded') {
            res.json({ status: 'refunded', message: 'order is refunded, may require manual archiving.', order });
            return;
        }
        const [{ sage_SalesOrderNo }] = await loadOrderImport(id);
        const { tracking } = await fetchTracking({ id, sage_SalesOrderNo });
        if (!tracking || tracking.length === 0) {
            res.json({ status: 'error', message: 'tracking not found, unable to mark fulfilled', sage_SalesOrderNo });
            return;
        }
        const fulfillment = buildFulfillmentBody({ id, tracking });
        // debug('getFulfillOrder()', fulfillment);
        const ffResponse = await fulfillOrder(fulfillment);
        res.json({ status: ffResponse.fulfillment.status });
    }
    catch (err) {
        debug("getFulfillOrder()", err.message);
        return err;
    }
}
exports.getFulfillOrder = getFulfillOrder;
