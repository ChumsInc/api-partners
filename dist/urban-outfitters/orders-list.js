"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCompleteOrders = exports.getInvoiceTracking = exports.getOrders = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('chums:lib:urban-outfitters:orders-list');
const db_utils_1 = require("./db-utils");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path_1 = require("path");
const CSV_PATH = '/tmp/api-partners/';
async function getOrders(req, res) {
    try {
        const { status, minDate, maxDate, SalesOrderNo } = req.params;
        const props = {
            SalesOrderNo: SalesOrderNo,
            completed: status === 'all',
            minDate: minDate,
            maxDate: maxDate ?? new Date().toISOString(),
        };
        const orders = await (0, db_utils_1.loadSalesOrder)(props);
        res.json({ orders });
    }
    catch (err) {
        if (err instanceof Error) {
            debug('getOrder()', err.message);
            return res.json({ error: err.message });
        }
        debug('getOrder()', err);
        res.json({ error: err });
    }
}
exports.getOrders = getOrders;
function carrierCode({ StarshipShipVia, TrackingID }) {
    debug('carrierCode()', { StarshipShipVia, TrackingID });
    if (/usps/i.test(StarshipShipVia)) {
        const url = 'https://tools.usps.com/go/TrackConfirmAction.action?tLabels=TRACKINGNUMBER'
            .replace('TRACKINGNUMBER', encodeURIComponent(TrackingID));
        // const url = 'https://wwwapps.ups.com/';
        return { code: 'usps', name: 'USPS', url };
    }
    if (/ups/i.test(StarshipShipVia)) {
        const url = 'https://wwwapps.ups.com/WebTracking/processInputRequest?TypeOfInquiryNumber=T&InquiryNumber1=TRACKINGNUMBER'
            .replace('TRACKINGNUMBER', encodeURIComponent(TrackingID));
        // const url = 'https://tools.usps.com';
        return { code: 'ups', name: 'UPS', url };
    }
    if (/fedex/i.test(StarshipShipVia)) {
        // const url = 'https://www.fedex.com/fedextrack/?tracknumbers=TRACKINGNUMBER'
        //     .replace('TRACKINGNUMBER', encodeURIComponent(TrackingID));
        const url = 'https://www.fedex.com/fedextrack/';
        return { code: 'fedex', name: 'FedEx', url };
    }
    return {
        code: '',
        name: StarshipShipVia,
        url: ''
    };
}
async function ensureTempPathExists() {
    try {
        await (0, promises_1.mkdir)(CSV_PATH, { recursive: true });
        await (0, promises_1.access)(CSV_PATH, fs_1.constants.W_OK);
        return true;
    }
    catch (error) {
        return Promise.reject(new Error('Unable to create temp path'));
    }
}
async function getInvoiceTracking(req, res) {
    try {
        const soList = req.query.orders || '';
        const orders = soList.split(',').filter(so => !!so);
        if (orders.length === 0) {
            return res.json({ error: 'No orders submitted' });
        }
        const csvData = [];
        csvData.push('order-id;carrier-code;carrier-name;carrier-url;tracking-number');
        for await (const SalesOrderNo of orders) {
            const [order] = await (0, db_utils_1.loadSalesOrder)({ SalesOrderNo });
            if (order) {
                const [tracking] = await (0, db_utils_1.loadTracking)('chums', order.InvoiceNo);
                if (tracking) {
                    const carrierInfo = carrierCode(tracking);
                    csvData.push([
                        order.uo_order_number || '',
                        carrierInfo.code,
                        carrierInfo.name,
                        carrierInfo.url,
                        tracking.TrackingID
                    ].join(';'));
                }
            }
        }
        await ensureTempPathExists();
        const date = new Date();
        const filename = (0, path_1.join)(CSV_PATH, `tracking-${date.toISOString()}.csv`);
        const result = await (0, promises_1.writeFile)(filename, csvData.join('\n'));
        debug('getInvoiceTracking()', result);
        res.sendFile(filename, {}, async (err) => {
            if (err) {
                debug('getInvoiceTracking() res.sendFile', err);
            }
            await (0, promises_1.unlink)(filename);
        });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getInvoiceTracking()", err.message);
            return res.json({ error: err.message });
        }
        res.json({ error: `getInvoiceTracking() Error: ${err}` });
    }
}
exports.getInvoiceTracking = getInvoiceTracking;
async function postCompleteOrders(req, res) {
    try {
        const { salesOrders } = req.body;
        await (0, db_utils_1.markComplete)(salesOrders);
        res.json({ success: true });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postCompleteOrders()", err.message);
            res.json({ error: err.message });
        }
        debug("postCompleteOrders()", err);
        res.json({ error: err });
    }
}
exports.postCompleteOrders = postCompleteOrders;
