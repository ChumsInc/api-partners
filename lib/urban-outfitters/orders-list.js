import Debug from 'debug';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { deleteFailedSalesOrder, loadSalesOrder, loadTracking, markComplete } from "./db-utils.js";
const debug = Debug('chums:lib:urban-outfitters:orders-list');
const CSV_PATH = '/tmp/api-partners/';
export async function getOrders(req, res) {
    try {
        const status = req.params.status;
        const minDate = req.params.minDate;
        const maxDate = req.params.maxDate;
        const SalesOrderNo = req.params.SalesOrderNo;
        const props = {
            SalesOrderNo: SalesOrderNo,
            completed: status === 'all' || (!!minDate && !!maxDate),
            minDate: minDate,
            maxDate: maxDate ?? new Date().toISOString(),
        };
        const orders = await loadSalesOrder(props);
        res.json({ orders });
    }
    catch (err) {
        if (err instanceof Error) {
            debug('getOrder()', err.message);
            res.json({ error: err.message });
            return;
        }
        debug('getOrder()', err);
        res.json({ error: err });
    }
}
export async function getOrdersV2(req, res) {
    try {
        const salesOrderNo = (req.query.salesOrderNo ?? null);
        const status = req.query.status;
        const minDate = req.query.minDate;
        const maxDate = req.query.maxDate;
        if (status !== 'open' && !minDate) {
            res.json({ error: `When loading all orders, a minimum date is required` });
            return;
        }
        const props = {
            SalesOrderNo: salesOrderNo,
            completed: status !== 'open',
            minDate,
            maxDate,
        };
        const orders = await loadSalesOrder(props);
        res.json({ orders });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getOrdersV2()", err.message);
            res.json({ error: err.message, name: err.name });
            return;
        }
        res.json({ error: 'unknown error in getOrdersV2' });
    }
}
function carrierCode({ StarshipShipVia, TrackingID }) {
    if (/usps/i.test(StarshipShipVia)) {
        const url = 'https://tools.usps.com/go/TrackConfirmAction.action?tLabels=TRACKINGNUMBER'
            .replace('TRACKINGNUMBER', encodeURIComponent(TrackingID));
        return { code: 'usps', name: 'USPS', url };
    }
    if (/ups/i.test(StarshipShipVia)) {
        const url = 'https://wwwapps.ups.com/WebTracking/processInputRequest?TypeOfInquiryNumber=T&InquiryNumber1=TRACKINGNUMBER'
            .replace('TRACKINGNUMBER', encodeURIComponent(TrackingID));
        return { code: 'ups', name: 'UPS', url };
    }
    if (/fedex/i.test(StarshipShipVia)) {
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
        await mkdir(CSV_PATH, { recursive: true });
        await access(CSV_PATH, constants.W_OK);
        return true;
    }
    catch (_error) {
        return Promise.reject(new Error('Unable to create temp path'));
    }
}
export async function getInvoiceTracking(req, res) {
    try {
        const soList = req.query.orders || '';
        const orders = soList.split(',').filter(so => !!so);
        if (orders.length === 0) {
            res.json({ error: 'No orders submitted' });
            return;
        }
        const csvData = [];
        csvData.push('order-id;carrier-code;carrier-name;carrier-url;tracking-number');
        for await (const SalesOrderNo of orders) {
            const [order] = await loadSalesOrder({ SalesOrderNo });
            if (order) {
                const [tracking] = await loadTracking('chums', order.InvoiceNo);
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
        const filename = join(CSV_PATH, `tracking-${date.toISOString()}.csv`);
        await writeFile(filename, csvData.join('\n'));
        res.sendFile(filename, {}, async (err) => {
            if (err) {
                debug('getInvoiceTracking() res.sendFile', err);
            }
            await unlink(filename);
        });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getInvoiceTracking()", err.message);
            res.json({ error: err.message });
            return;
        }
        res.json({ error: `getInvoiceTracking() Error: ${err}` });
    }
}
export async function postCompleteOrders(req, res) {
    try {
        if (!req.body || !req.body.salesOrders) {
            res.json({ error: 'No orders submitted' });
            return;
        }
        const { salesOrders } = req.body;
        await markComplete(salesOrders);
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
export async function removeFailedOrder(req, res) {
    try {
        const rows = await deleteFailedSalesOrder(req.params.uoOrderNo);
        res.json({ success: rows === 1 });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("removeFailedOrder()", err.message);
            res.json({ error: err.message, name: err.name });
            return;
        }
        res.json({ error: 'unknown error in removeFailedOrder' });
    }
}
