"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOneStepOrder = exports.doSubmitFeed_OrderFulfillment = exports.doSubmitFeed_OrderAcknowledgement = exports.parseOrder = exports.createOrder = exports.doListOrderItems = exports.doGetOrder = exports.doLoadOrderFromDB = exports.doListOrders = exports.ListOrders = exports.loadLastCreatedBeforeDate = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('chums:lib:amazon-seller:orders');
const node_fetch_1 = __importDefault(require("node-fetch"));
const log_1 = require("./log");
const chums_local_modules_1 = require("chums-local-modules");
const config_1 = require("./config");
const MWS_ORDERS_API_VERSION = '2013-09-01';
const { loadQuantityAvailable } = require('./product-feed');
const templates_1 = require("./templates");
const { logSalesOrder, loadSalesOrder, loadInvoiceData } = require('./log-salesorder');
async function loadLastCreatedBeforeDate() {
    try {
        const query = `SELECT EXTRACTVALUE(response,
                                           '/ListOrdersResponse/ListOrdersResult/CreatedBefore') AS CreatedBefore
                       FROM c2.amws_response
                       WHERE action = 'ListOrders'
                         AND is_error_response = 0
                       ORDER BY idamws_response DESC
                       LIMIT 1`;
        const [rows] = await chums_local_modules_1.mysql2Pool.query(query);
        let createdBefore = new Date('2018-02-15T07:00:00');
        rows.forEach(row => {
            createdBefore = new Date(row.CreatedBefore);
        });
        return createdBefore;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("loadLastCreatedBeforeDate()", err.message);
            return Promise.reject(err);
        }
        debug("loadLastCreatedBeforeDate()", err);
        return Promise.reject(new Error('Error in loadLastCreatedBeforeDate()'));
    }
}
exports.loadLastCreatedBeforeDate = loadLastCreatedBeforeDate;
async function ListOrders(parameters = {}) {
    try {
        if (!parameters.CreatedAfter) {
            parameters.CreatedAfter = (0, config_1.toISO8601)(await loadLastCreatedBeforeDate());
        }
        if (parameters.CreatedAfter instanceof Date) {
            parameters.CreatedAfter = (0, config_1.toISO8601)(parameters.CreatedAfter);
        }
        const CreatedAfter = parameters.CreatedAfter;
        delete parameters.CreatedAfter;
        const OSParameters = {};
        if (parameters.OrderStatus) {
            if (!Array.isArray(parameters.OrderStatus)) {
                parameters.OrderStatus = [parameters.OrderStatus];
            }
            parameters.OrderStatus
                .map((status, index) => {
                const key = `OrderStatus.Status.${index + 1}`;
                OSParameters[key] = status;
            });
            delete parameters.OrderStatus;
        }
        const url = `/Orders/${MWS_ORDERS_API_VERSION}`;
        const Timestamp = (0, config_1.toISO8601)();
        const request = {
            AWSAccessKeyId: config_1.AMAZON_SC_AWSAccessKeyId,
            Action: 'ListOrders',
            CreatedAfter,
            'FulfillmentChannel.Channel.1': 'MFN',
            MWSAuthToken: config_1.AMAZON_SC_MWSAuthToken,
            'MarketplaceId.Id.1': config_1.AMAZON_SC_MarketplaceId,
            ...OSParameters,
            SellerId: config_1.AMAZON_SC_SellerId,
            SignatureMethod: config_1.AMAZON_SC_SignatureMethod,
            SignatureVersion: config_1.AMAZON_SC_SignatureVersion,
            Timestamp,
            Version: MWS_ORDERS_API_VERSION,
        };
        const signature = (0, config_1.encode)((0, config_1.getSignature)(url, request));
        const queryStr = (0, config_1.getQueryString)(request);
        const response = await (0, node_fetch_1.default)(`https://${config_1.AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST'
        });
        const status = response.status;
        const xmlResponse = await response.text();
        await (0, log_1.logResponse)({ status, request, xmlResponse });
        return xmlResponse;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("ListOrders()", err.message);
            return Promise.reject(err);
        }
        debug("ListOrders()", err);
        return Promise.reject(new Error('Error in ListOrders()'));
    }
}
exports.ListOrders = ListOrders;
const GetOrder = async (parameters) => {
    try {
        if (!parameters.AmazonOrderId) {
            return Promise.reject(new Error(`AmazonOrderId is required`));
        }
        if (!Array.isArray(parameters.AmazonOrderId)) {
            parameters.AmazonOrderId = [parameters.AmazonOrderId];
        }
        if (parameters.AmazonOrderId.length === 0 || parameters.AmazonOrderId.length > 50) {
            return Promise.reject(new Error(`Please request between 1 and 50 orders. Requested: ${parameters.AmazonOrderId.length}`));
        }
        const formatted = {};
        const { AmazonOrderId } = parameters;
        AmazonOrderId.map((id, index) => {
            formatted[`AmazonOrderId.Id.${index + 1}`] = id;
        });
        const url = `/Orders/${MWS_ORDERS_API_VERSION}`;
        const Timestamp = (0, config_1.toISO8601)();
        // const LastUpdatedAfter
        const request = {
            AWSAccessKeyId: config_1.AMAZON_SC_AWSAccessKeyId,
            Action: 'GetOrder',
            ...formatted,
            MWSAuthToken: config_1.AMAZON_SC_MWSAuthToken,
            SellerId: config_1.AMAZON_SC_SellerId,
            SignatureMethod: config_1.AMAZON_SC_SignatureMethod,
            SignatureVersion: config_1.AMAZON_SC_SignatureVersion,
            // LastUpdatedAfter,
            Timestamp,
            Version: MWS_ORDERS_API_VERSION,
        };
        const signature = (0, config_1.encode)((0, config_1.getSignature)(url, request));
        const queryStr = (0, config_1.getQueryString)(request);
        const response = await (0, node_fetch_1.default)(`https://${config_1.AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST'
        });
        const status = response.status;
        const xmlResponse = await response.text();
        await (0, log_1.logResponse)({ status, request, xmlResponse });
        return xmlResponse;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("GetOrder()", err.message);
            return Promise.reject(err);
        }
        debug("GetOrder()", err);
        return Promise.reject(new Error('Error in GetOrder()'));
    }
};
const ListOrderItems = async (parameters = {}) => {
    try {
        if (!parameters.AmazonOrderId) {
            return Promise.reject(new Error('AmazonOrderId is required'));
        }
        const url = `/Orders/${MWS_ORDERS_API_VERSION}`;
        const Timestamp = (0, config_1.toISO8601)();
        // const LastUpdatedAfter
        const request = {
            AWSAccessKeyId: config_1.AMAZON_SC_AWSAccessKeyId,
            Action: 'ListOrderItems',
            ...parameters,
            MWSAuthToken: config_1.AMAZON_SC_MWSAuthToken,
            SellerId: config_1.AMAZON_SC_SellerId,
            SignatureMethod: config_1.AMAZON_SC_SignatureMethod,
            SignatureVersion: config_1.AMAZON_SC_SignatureVersion,
            // LastUpdatedAfter,
            Timestamp,
            Version: MWS_ORDERS_API_VERSION,
        };
        const signature = (0, config_1.encode)((0, config_1.getSignature)(url, request));
        const queryStr = (0, config_1.getQueryString)(request);
        // return request;
        const response = await (0, node_fetch_1.default)(`https://${config_1.AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST'
        });
        const status = response.status;
        const xmlResponse = await response.text();
        await (0, log_1.logResponse)({ status, request, xmlResponse });
        return xmlResponse;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("ListOrderItems()", err.message);
            return Promise.reject(err);
        }
        debug("ListOrderItems()", err);
        return Promise.reject(new Error('Error in ListOrderItems()'));
    }
};
const loadOrderItemsFromDB = async (AmazonOrderId) => {
    try {
        const action = 'ListOrderItems';
        const searchResponse = {
            xpath: '//AmazonOrderId',
            value: AmazonOrderId
        };
        return await (0, log_1.getLogEntries)({ action: 'ListOrderItems', searchResponse });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("loadOrderItemsFromDB()", err.message);
            return Promise.reject(err);
        }
        debug("loadOrderItemsFromDB()", err);
        return Promise.reject(new Error('Error in loadOrderItemsFromDB()'));
    }
};
const loadOrderFromDB = async (AmazonOrderId) => {
    try {
        const action = ['ListOrders', 'GetOrder'];
        const searchResponse = { xpath: '//AmazonOrderId', value: AmazonOrderId };
        return await (0, log_1.getLogEntries)({ action, searchResponse });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("loadOrderFromDB()", err.message);
            return Promise.reject(err);
        }
        debug("loadOrderFromDB()", err);
        return Promise.reject(new Error('Error in loadOrderFromDB()'));
    }
};
const fetchSageInvoice = async ({ Company, SalesOrderNo }) => {
    try {
        // debug('fetchSageInvoice', {Company, SalesOrderNo});
        const auth = Buffer.from(`${config_1.INTRANET_API_USERNAME}:${config_1.INTRANET_API_PASSWORD}`).toString('base64');
        const sageCompany = (0, chums_local_modules_1.getSageCompany)(Company);
        const url = 'https://intranet.chums.com/node-sage/api/:Company/invoice/so/:SalesOrderNo'
            .replace(':Company', encodeURIComponent(sageCompany))
            .replace(':SalesOrderNo', encodeURIComponent(SalesOrderNo));
        // debug('fetchSageInvoice()', url);
        const res = await (0, node_fetch_1.default)(url, {
            headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}`, }
        });
        // debug('fetchSageInvoice() status:', url, res.status);
        return await res.json();
    }
    catch (err) {
        if (err instanceof Error) {
            debug("fetchSageInvoice()", err.message);
            return Promise.reject(err);
        }
        debug("fetchSageInvoice()", err);
        return Promise.reject(new Error('Error in fetchSageInvoice()'));
    }
};
const SubmitFeed_OrderAcknowledgement = async ({ AmazonOrderId }) => {
    if (!AmazonOrderId) {
        throw new Error('AmazonOrderId is required');
    }
    try {
        const { salesOrder } = await buildOrder({ AmazonOrderId });
        const items = salesOrder.SalesOrderDetail.map(item => item.ItemCode);
        const available = await loadQuantityAvailable({ items });
        let isOutOfStock = false;
        salesOrder.SalesOrderDetail.forEach(item => {
            const [onHand] = available.filter(i => i.ItemCode === item.ItemCode);
            if (!onHand || onHand.QuantityAvailable < item.QuantityOrdered) {
                isOutOfStock = true;
            }
        });
        const ack = {
            AmazonOrderId,
            CancelReason: null,
            StatusCode: 'Success',
        };
        if (!salesOrder.ShippingAddress.AddressLine1) {
            ack.CancelReason = 'ShippingAddressUndeliverable';
            ack.StatusCode = 'Failure';
        }
        else if (isOutOfStock) {
            ack.CancelReason = 'NoInventory';
            ack.StatusCode = 'Failure';
        }
        const t_envelopeXML = await (0, templates_1.loadXML)(templates_1.XML_ENVELOPE);
        const t_messageXML = await (0, templates_1.loadXML)(templates_1.XML_MESSAGE);
        const t_orderAckXML = await (0, templates_1.loadXML)(templates_1.XML_ORDER_ACK);
        const t_orderAckItemXML = await (0, templates_1.loadXML)(templates_1.XML_ORDER_ACK_ITEM);
        const t_cancelReason = await (0, templates_1.loadXML)(templates_1.XML_CANCEL_REASON);
        const [logged] = await loadSalesOrder({ AmazonOrderId });
        if (!logged) {
            const importResult = await submitOrder(salesOrder);
            salesOrder.MerchantOrderID = importResult.SalesOrderNo;
        }
        else {
            salesOrder.MerchantOrderID = logged.SalesOrderNo;
        }
        ack.Item = salesOrder.SalesOrderDetail.map(item => {
            const { AmazonOrderItemCode } = item;
            const [onHand] = available.filter(i => i.ItemCode === item.ItemCode);
            if (!onHand || onHand.QuantityAvailable < item.QuantityOrdered) {
                return { AmazonOrderItemCode, CancelReason: 'NoInventory' };
            }
            return { AmazonOrderItemCode };
        });
        const MessagesXML = [salesOrder].map((so, index) => {
            const ItemXML = so.SalesOrderDetail
                .map((item, index) => {
                return t_orderAckItemXML
                    .replace(/{AmazonOrderItemCode}/g, item.AmazonOrderItemCode)
                    .replace(/{CancelReason}/g, item.CancelReason
                    ? t_cancelReason.replace(/{CancelReason}/g, item.CancelReason)
                    : '');
            });
            return t_orderAckXML
                .replace(/{MessageID}/g, String(index + 1))
                .replace(/{AmazonOrderID}/g, String(so.AmazonOrderId))
                .replace(/{MerchantOrderID}/g, String(so.MerchantOrderID))
                .replace(/{StatusCode}/g, ack.StatusCode)
                .replace(/{OrderItem}/g, ItemXML.join(''));
        });
        const body = t_envelopeXML
            .replace(/{SELLER_ID}/g, config_1.AMAZON_SC_SellerId)
            .replace(/{MessageType}/g, 'OrderAcknowledgement')
            .replace(/{MessagesXML}/g, MessagesXML.join(''))
            .replace(/>\s+</g, '><')
            .replace(/\s+/g, ' ');
        // return body;
        const url = '/';
        const Timestamp = (0, config_1.toISO8601)();
        // const Timestamp = '2018-04-02T17:22:26Z';
        const Action = 'SubmitFeed';
        // const body = await buildProduct(item);
        const FeedType = '_POST_ORDER_ACKNOWLEDGEMENT_DATA_';
        const ContentMD5Value = (0, config_1.contentMD5)(body);
        const Version = '2009-01-01';
        // return body;
        const request = {
            AWSAccessKeyId: config_1.AMAZON_SC_AWSAccessKeyId,
            Action,
            ContentMD5Value,
            FeedType,
            MWSAuthToken: config_1.AMAZON_SC_MWSAuthToken,
            'MarketplaceIdList.Id.1': config_1.AMAZON_SC_MarketplaceId,
            Merchant: config_1.AMAZON_SC_SellerId,
            PurgeAndReplace: 'false',
            SignatureMethod: config_1.AMAZON_SC_SignatureMethod,
            SignatureVersion: config_1.AMAZON_SC_SignatureVersion,
            Timestamp,
            Version,
        };
        // debug('postNewItem', body);
        // return config.getStringToSign(url, request);
        const signature = (0, config_1.encode)((0, config_1.getSignature)(url, request));
        // return signature;
        const queryStr = (0, config_1.getQueryString)(request);
        // return `https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`;
        const response = await (0, node_fetch_1.default)(`https://${config_1.AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'text/xml' }
        });
        const status = response.status;
        // debug('postInventoryUpdate', status);
        // return await response.text();
        const xmlResponse = await response.text();
        await (0, log_1.logResponse)({ status, request, xmlResponse, post: body });
        return xmlResponse;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("SubmitFeed_OrderAcknowledgement()", err.message);
            return Promise.reject(err);
        }
        debug("SubmitFeed_OrderAcknowledgement()", err);
        return Promise.reject(new Error('Error in SubmitFeed_OrderAcknowledgement()'));
    }
};
const parseShipVia = ({ StarshipShipVia }) => {
    switch (StarshipShipVia) {
        case 'FedEx 2Day':
        case 'FedEx 2Day A.M.':
        case 'FedEx Express S':
        case 'FedEx First Ove':
        case 'FedEx Ground':
        case 'FedEx Home Deli':
        case 'FedEx Priority':
        case 'FedEx Standard':
            return 'FedEx';
        case 'UPS 2nd Day Air':
        case 'UPS 3 Day Selec':
        case 'UPS Ground':
        case 'UPS Next Day Ai':
        case 'UPS Standard to':
        case 'UPS Worldwide E':
        case 'UPS Worldwide S':
            return 'UPS';
        case 'USPS First-Clas':
        case 'USPS Parcel Sel':
        case 'USPS Priority M':
            return 'USPS';
        default:
            return `Other: ${StarshipShipVia}`;
    }
};
const parseShipMethod = ({ StarshipShipVia }) => {
    switch (StarshipShipVia) {
        case 'FedEx 2Day':
        case 'FedEx 2Day A.M.':
        case 'FedEx Ground':
        case 'FedEx Priority':
        case 'FedEx Standard':
        case 'UPS 2nd Day Air':
        case 'UPS Ground':
        case 'FedEx Express S':
        case 'FedEx First Ove':
        case 'FedEx Home Deli':
            return StarshipShipVia;
        case 'UPS 3 Day Selec':
            return 'UPS 3 Day Select';
        case 'UPS Next Day Ai':
            return 'UPS Next Day Air';
        case 'UPS Standard to':
            return 'UPS Standard to';
        case 'UPS Worldwide E':
            return 'UPS Worldwide Express';
        case 'UPS Worldwide S':
            return 'UPS Worldwide Saver';
        case 'USPS First-Clas':
            return 'USPS First-Class';
        case 'USPS Parcel Sel':
            return 'USPS Parcel Select';
        case 'USPS Priority M':
            return 'USPS Priority Mail';
        default:
            return `Other: ${StarshipShipVia}`;
    }
};
const SubmitFeed_OrderFulfillment = async ({ AmazonOrderId }) => {
    if (!AmazonOrderId) {
        throw new Error('AmazonOrderId is required');
    }
    try {
        const { salesOrder } = await buildOrder({ AmazonOrderId });
        const [{ SalesOrderNo }] = await loadSalesOrder({ AmazonOrderId });
        const { result } = await fetchSageInvoice({ Company: 'CHI', SalesOrderNo });
        // debug(result.Tracking);
        const fulfill = {
            AmazonOrderId,
            MerchantFulfillmentID: result.InvoiceNo,
            FulfillmentDate: (0, config_1.toISO8601)(new Date(result.InvoiceDate)),
            CarrierCode: parseShipVia(result.Tracking[0]),
            ShippingMethod: parseShipMethod(result.Tracking[0]),
            ShipperTrackingNumber: result.Tracking[0].TrackingID,
            Item: [],
        };
        const t_envelopeXML = await (0, templates_1.loadXML)(templates_1.XML_ENVELOPE);
        const t_orderFulfillXML = await (0, templates_1.loadXML)(templates_1.XML_ORDER_FULFILLMENT);
        const t_orderFulfillItemXML = await (0, templates_1.loadXML)(templates_1.XML_ORDER_FULFILLMENT_ITEM);
        fulfill.Item = salesOrder.SalesOrderDetail.map(item => {
            const { AmazonOrderItemCode } = item;
            const [{ QuantityShipped }] = result.Detail.filter(i => i.ItemCode === item.ItemCode);
            return { AmazonOrderItemCode, Quantity: QuantityShipped };
        });
        const MessagesXML = [fulfill].map((invoice, index) => {
            const ItemXML = invoice.Item
                .map(item => {
                return t_orderFulfillItemXML
                    .replace(/{AmazonOrderItemCode}/g, item.AmazonOrderItemCode)
                    .replace(/{Quantity}/g, String(item.Quantity));
            });
            return t_orderFulfillXML
                .replace(/{MessageID}/g, String(index + 1))
                .replace(/{AmazonOrderID}/g, invoice.AmazonOrderId)
                .replace(/{MerchantFulfillmentID}/g, invoice.MerchantFulfillmentID)
                .replace(/{FulfillmentDate}/g, invoice.FulfillmentDate)
                .replace(/{CarrierCode}/g, invoice.CarrierCode)
                .replace(/{ShippingMethod}/g, invoice.ShippingMethod)
                .replace(/{ShipperTrackingNumber}/g, invoice.ShipperTrackingNumber)
                .replace(/{Item}/g, ItemXML.join(''));
        });
        const body = t_envelopeXML
            .replace(/{SELLER_ID}/g, config_1.AMAZON_SC_SellerId)
            .replace(/{MessageType}/g, 'OrderFulfillment')
            .replace(/{MessagesXML}/g, MessagesXML.join(''))
            .replace(/>\s+</g, '><')
            .replace(/\s+/g, ' ');
        // return body;
        const url = '/';
        const Timestamp = (0, config_1.toISO8601)();
        // const Timestamp = '2018-04-02T17:22:26Z';
        const Action = 'SubmitFeed';
        // const body = await buildProduct(item);
        const FeedType = '_POST_ORDER_FULFILLMENT_DATA_';
        const ContentMD5Value = (0, config_1.contentMD5)(body);
        const Version = '2009-01-01';
        // return body;
        const request = {
            AWSAccessKeyId: config_1.AMAZON_SC_AWSAccessKeyId,
            Action,
            ContentMD5Value,
            FeedType,
            MWSAuthToken: config_1.AMAZON_SC_MWSAuthToken,
            'MarketplaceIdList.Id.1': config_1.AMAZON_SC_MarketplaceId,
            Merchant: config_1.AMAZON_SC_SellerId,
            PurgeAndReplace: 'false',
            SignatureMethod: config_1.AMAZON_SC_SignatureMethod,
            SignatureVersion: config_1.AMAZON_SC_SignatureVersion,
            Timestamp,
            Version,
        };
        // debug('postNewItem', body);
        // return config.getStringToSign(url, request);
        const signature = (0, config_1.encode)((0, config_1.getSignature)(url, request));
        // return signature;
        const queryStr = (0, config_1.getQueryString)(request);
        // return `https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`;
        const response = await (0, node_fetch_1.default)(`https://${config_1.AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'text/xml' }
        });
        const status = response.status;
        // debug('SubmitFeed_OrderFulfillment', status);
        // return await response.text();
        const xmlResponse = await response.text();
        await (0, log_1.logResponse)({ status, request, xmlResponse, post: body });
        return xmlResponse;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("SubmitFeed_OrderFulfillment()", err.message);
            return Promise.reject(err);
        }
        debug("SubmitFeed_OrderFulfillment()", err);
        return Promise.reject(new Error('Error in SubmitFeed_OrderFulfillment()'));
    }
};
const oneStepOrder = async ({ AmazonOrderId }) => {
    try {
        const orderXML = await GetOrder({ AmazonOrderId });
        const itemXML = await ListOrderItems({ AmazonOrderId });
        const order = await buildOrder({ AmazonOrderId });
        // debug('oneStepOrder()', {order});
        // return order.salesOrder;
        const result = await submitOrder(order.salesOrder);
        return result;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("oneStepOrder()", err.message);
            return Promise.reject(err);
        }
        debug("oneStepOrder()", err);
        return Promise.reject(new Error('Error in oneStepOrder()'));
    }
};
const doListOrders = async (req, res) => {
    const { format = 'xml' } = req.params;
    const { sage = false } = req.query;
    const parameters = {
        OrderStatus: [
            'Unshipped',
            'PartiallyShipped',
            ...req.params.OrderStatus
        ]
    };
    try {
        // debug('doListOrders()', req.params, new Date(Number(req.params.CreatedAfter)));
        if (req.params.CreatedAfter) {
            parameters.CreatedAfter = (0, config_1.toISO8601)(new Date(Number(req.params.CreatedAfter)));
        }
        const xml = await ListOrders(parameters);
        if (format.toLocaleLowerCase() === 'xml') {
            res.set('Content-Type', 'text/xml');
            res.send(xml);
            return;
        }
        const json = await (0, config_1.parseXML)(xml);
        if (!json.ListOrdersResponse.ListOrdersResult[0].Orders[0].Order) {
            res.json({ salesOrders: [] });
            return;
        }
        const salesOrders = json.ListOrdersResponse.ListOrdersResult[0].Orders[0].Order.map((azso) => {
            return parseAmazonOrder(azso);
        });
        if (sage) {
            const AmazonOrderIds = salesOrders.map(so => so.AmazonOrderId);
            const invoices = await loadInvoiceData(AmazonOrderIds);
            salesOrders.map(so => {
                const [invoice] = invoices.filter(inv => inv.AmazonOrderId === so.AmazonOrderId);
                so.InvoiceData = invoice;
            });
            res.json({ salesOrders });
        }
        else {
            res.json({ salesOrders });
        }
    }
    catch (err) {
        if (err instanceof Error) {
            debug("doListOrders()", err.message);
            return Promise.reject(err);
        }
        debug("doListOrders()", err);
        return Promise.reject(new Error('Error in doListOrders()'));
    }
};
exports.doListOrders = doListOrders;
const doLoadOrderFromDB = async (req, res) => {
    try {
        const params = {
            action: 'ListOrders',
            id: req.params.ID,
        };
        const [entry] = await (0, log_1.getLogEntries)(params);
        if (req.params.format && req.params.format.toLowerCase() === 'xml') {
            res.set('Content-Type', 'text/xml');
            res.send(entry.response || '<?xml version="1.0"?><Error>Order Not Found</Error>');
            return;
        }
        try {
            const json = await (0, config_1.parseXML)(entry.response || '<?xml version="1.0"?><Error>No Results from Amazon.</Error>');
            const salesOrders = json?.ListOrdersRepsonse?.ListOrdersResult[0]?.Orders[0]?.Order.map((azso) => parseAmazonOrder(azso));
            if (!salesOrders || !salesOrders.length) {
                res.json({ error: 'Order not found', json });
                return;
            }
            res.json({ salesOrders });
        }
        catch (err) {
            if (err instanceof Error) {
                debug("doLoadOrderFromDB()", err.message);
                return res.json({ error: err.message, name: err.name });
            }
            res.json({ error: 'unknown error in doLoadOrderFromDB' });
        }
    }
    catch (err) {
        if (err instanceof Error) {
            debug("doLoadOrderFromDB()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in doLoadOrderFromDB' });
    }
};
exports.doLoadOrderFromDB = doLoadOrderFromDB;
const doGetOrder = async (req, res) => {
    try {
        const { AmazonOrderId } = req.params;
        const xml = GetOrder({ AmazonOrderId });
        res.set('Content-Type', 'text/xml');
        res.send(xml);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("doGetOrder()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in doGetOrder' });
    }
};
exports.doGetOrder = doGetOrder;
const doListOrderItems = async (req, res) => {
    try {
        const { AmazonOrderId } = req.params;
        const xml = await ListOrderItems({ AmazonOrderId });
        res.set('Content-Type', 'text/xml');
        res.send(xml);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("doListOrderItems()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in doListOrderItems' });
    }
};
exports.doListOrderItems = doListOrderItems;
function parseObject(azObject = {}) {
    const object = {};
    Object.keys(azObject)
        .map(key => {
        const [val] = azObject[key];
        object[key] = val;
    });
    return object;
}
const parseAmazonOrder = (azso) => {
    const order = parseObject(azso);
    order.OrderTotal = parseObject(order.OrderTotal);
    order.ShippingAddress = {
        AddressType: '',
        Name: '',
        AddressLine1: '',
        AddressLine2: '',
        AddressLine3: '',
        City: '',
        PostalCode: '',
        StateOrRegion: '',
        Phone: '',
        CountryCode: '',
        ...parseObject(order.ShippingAddress)
    };
    order.IsPrime = order.IsPrime === 'true';
    order.IsGift = order.IsGift === 'true';
    return order;
};
const parseItem = (azItem) => {
    const item = parseObject(azItem);
    item.ShippingTax = parseObject(item.ShippingTax);
    item.PromotionDiscount = parseObject(item.PromotionDiscount);
    item.GiftWrapTax = parseObject(item.GiftWrapTax);
    item.ShippingPrice = parseObject(item.ShippingPrice);
    item.GiftWrapPrice = parseObject(item.GiftWrapPrice);
    item.ItemPrice = parseObject(item.ItemPrice);
    item.ItemTax = parseObject(item.ItemTax);
    item.ShippingDiscount = parseObject(item.ShippingDiscount);
    return item;
};
async function parseXMLOrder({ response }) {
    try {
        const json = await (0, config_1.parseXML)(response);
        let salesOrder;
        if (json.ListOrdersResponse) {
            // @ts-ignore
            [salesOrder] = json.ListOrdersResponse.ListOrdersResult[0].Orders.map(el => {
                const [azso] = el.Order;
                return parseAmazonOrder(azso);
            });
        }
        else if (json.GetOrderResponse) {
            // @ts-ignore
            [salesOrder] = json.GetOrderResponse.GetOrderResult[0].Orders.map(el => {
                const [azso] = el.Order;
                return parseAmazonOrder(azso);
            });
        }
        else {
            return Promise.reject(new Error('Unable to parse Order Response'));
        }
        return salesOrder;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("parseXMLOrder()", err.message);
            return Promise.reject(err);
        }
        debug("parseXMLOrder()", err);
        return Promise.reject(new Error('Error in parseXMLOrder()'));
    }
}
const mapToItemCode = async (item) => {
    try {
        const query = `SELECT ItemCode FROM c2.AZ_SellerCentralItems WHERE SellerSKU = :SKU`;
        const data = { SKU: item.SellerSKU };
        const [[row = {}]] = await chums_local_modules_1.mysql2Pool.query(query, data);
        return { ...row, ...item };
    }
    catch (err) {
        if (err instanceof Error) {
            debug("mapToItemCode()", err.message);
            return Promise.reject(err);
        }
        debug("mapToItemCode()", err);
        return Promise.reject(new Error('Error in mapToItemCode()'));
    }
};
const parseXMLItems = async ({ response }) => {
    try {
        const jsonItems = await (0, config_1.parseXML)(response);
        const { OrderItems } = jsonItems.ListOrderItemsResponse.ListOrderItemsResult[0];
        // const [orderItems] = OrderItems;
        //@ts-ignore
        const items = OrderItems[0].OrderItem.map(el => parseItem(el));
        return await Promise.all(items.map(item => mapToItemCode(item)));
    }
    catch (err) {
        if (err instanceof Error) {
            debug("parseXMLItems()", err.message);
            return Promise.reject(err);
        }
        debug("parseXMLItems()", err);
        return Promise.reject(new Error('Error in parseXMLItems()'));
    }
};
const parseAmazonShipMethod = ({ ShipmentServiceLevelCategory }) => {
    switch (ShipmentServiceLevelCategory) {
        case 'FreeEconomy':
        case 'Standard':
            return 'APP';
        case 'SecondDay':
            return '1FEX_ECN_2DAY';
        default:
            return ShipmentServiceLevelCategory;
    }
};
const parseAmazonShipComment = ({ IsPrime, ShipmentServiceLevelCategory }) => {
    if (IsPrime) {
        return 'PRIME';
    }
    switch (ShipmentServiceLevelCategory) {
        case 'FreeEconomy':
            return 'AZ-FREE';
        case 'Standard':
            return 'AZ-STD';
        case 'SecondDay':
            return 'AZ-2DAY';
        default:
            return '???';
    }
};
const buildOrder = async ({ AmazonOrderId }) => {
    try {
        const [xmlOrder] = await loadOrderFromDB(AmazonOrderId);
        const salesOrder = await parseXMLOrder(xmlOrder);
        const [xmlItems] = await loadOrderItemsFromDB(AmazonOrderId);
        salesOrder.OrderItems = await parseXMLItems(xmlItems);
        const LineComments = [
            `Deliver by ${new Date(salesOrder.EarliestDeliveryDate).toLocaleDateString()} to ${new Date(salesOrder.LatestDeliveryDate).toLocaleDateString()}`,
        ];
        const FreightAmt = salesOrder.OrderItems
            .map(item => Number(item.ShippingPrice.Amount || 0))
            .reduce((pv, cv) => pv + cv, 0);
        LineComments.push(`Shipping Method: ${salesOrder.ShipServiceLevel}`);
        LineComments.push(`Shipping Freight Amt: $ ${Number(FreightAmt).toFixed(2)}`);
        return {
            salesOrder: {
                ShipExpireDate: salesOrder.EarliestShipDate,
                CancelDate: salesOrder.LatestShipDate,
                AmazonOrderId: salesOrder.AmazonOrderId,
                EmailAddress: salesOrder.BuyerEmail,
                ShippingAddress: salesOrder.ShippingAddress,
                Comment: [
                    parseAmazonShipComment(salesOrder),
                    salesOrder.isGift ? 'GIFT' : '',
                    'SWR'
                ]
                    .filter(c => c !== '')
                    .join('/'),
                ShipMethod: parseAmazonShipMethod(salesOrder),
                SalesOrderDetail: salesOrder.OrderItems.map(item => ({
                    AmazonOrderItemCode: item.OrderItemId,
                    ItemCode: item.ItemCode || item.SellerSKU,
                    ItemCodeDesc: item.Title,
                    QuantityOrdered: item.QuantityOrdered,
                    UnitPrice: Number(item.ItemPrice.Amount),
                })),
                LineComments,
                FreightAmt,
            },
            az: salesOrder,
        };
    }
    catch (err) {
        if (err instanceof Error) {
            debug("buildOrder()", err.message);
            return Promise.reject(err);
        }
        debug("buildOrder()", err);
        return Promise.reject(new Error('Error in buildOrder()'));
    }
};
const submitOrder = async (salesOrder) => {
    const auth = Buffer.from(`${config_1.INTRANET_API_USERNAME}:${config_1.INTRANET_API_PASSWORD}`).toString('base64');
    const res = await (0, node_fetch_1.default)('https://intranet.chums.com/sage/amazon/salesorder_import.php', {
        method: 'POST',
        body: JSON.stringify({ ...salesOrder, action: 'import' }),
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}`, }
    });
    // debug('submitOrder() status:', res.status);
    const json = await res.json();
    const { AmazonOrderId } = salesOrder;
    const { SalesOrderNo } = json;
    await logSalesOrder({ Company: 'chums', SalesOrderNo, AmazonOrderId, OrderStatus: 'N', UserID: 1, Action: 'import' });
    return json;
};
const createOrder = async (req, res) => {
    try {
        const { AmazonOrderId } = req.params;
        const order = await buildOrder({ AmazonOrderId });
        const result = await submitOrder(order.salesOrder);
        res.json({ result });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("createOrder()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in createOrder' });
    }
};
exports.createOrder = createOrder;
const parseOrder = async (req, res) => {
    try {
        const { AmazonOrderId } = req.params;
        const order = await buildOrder({ AmazonOrderId });
        res.json({ result: order });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("parseOrder()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in parseOrder' });
    }
};
exports.parseOrder = parseOrder;
const doSubmitFeed_OrderAcknowledgement = async (req, res) => {
    try {
        const { AmazonOrderId } = req.params;
        const xml = await SubmitFeed_OrderAcknowledgement({ AmazonOrderId });
        res.set('Content-Type', 'text/xml');
        res.send(xml);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("doSubmitFeed_OrderAcknowledgement()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in doSubmitFeed_OrderAcknowledgement' });
    }
};
exports.doSubmitFeed_OrderAcknowledgement = doSubmitFeed_OrderAcknowledgement;
const doSubmitFeed_OrderFulfillment = async (req, res) => {
    try {
        const { AmazonOrderId } = req.params;
        const result = await SubmitFeed_OrderFulfillment({ AmazonOrderId });
        res.set('Content-Type', 'text/xml');
        res.send(result);
        return;
        // if (typeof result === 'string') {
        // }
        // res.json({result});
    }
    catch (err) {
        if (err instanceof Error) {
            debug("doSubmitFeed_OrderFulfillment()", err.message);
            return Promise.reject(err);
        }
        debug("doSubmitFeed_OrderFulfillment()", err);
        return Promise.reject(new Error('Error in doSubmitFeed_OrderFulfillment()'));
    }
};
exports.doSubmitFeed_OrderFulfillment = doSubmitFeed_OrderFulfillment;
const getOneStepOrder = async (req, res) => {
    try {
        const { AmazonOrderId } = req.params;
        const result = await oneStepOrder({ AmazonOrderId });
        res.json({ result });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getOneStepOrder()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in getOneStepOrder' });
    }
};
exports.getOneStepOrder = getOneStepOrder;
