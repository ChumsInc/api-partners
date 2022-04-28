import Debug from 'debug';
const debug = Debug('chums:lib:amazon-seller:orders');
import fetch from 'node-fetch';
import {getLogEntries, logResponse} from './log';
import {getSageCompany, mysql2Pool} from 'chums-local-modules';
import {
    AMAZON_SC_AWSAccessKeyId,
    AMAZON_SC_DOMAIN,
    AMAZON_SC_MarketplaceId,
    AMAZON_SC_MWSAuthToken,
    AMAZON_SC_SellerId,
    AMAZON_SC_SignatureMethod,
    AMAZON_SC_SignatureVersion,
    contentMD5,
    encode,
    getQueryString,
    getSignature,
    INTRANET_API_PASSWORD,
    INTRANET_API_USERNAME,
    parseXML,
    toISO8601,
} from './config';


const MWS_ORDERS_API_VERSION = '2013-09-01';
const {loadQuantityAvailable} = require('./product-feed');
import  {
    loadXML, XML_ENVELOPE, XML_MESSAGE, XML_ORDER_ACK, XML_ORDER_ACK_ITEM, XML_CANCEL_REASON,
    XML_ORDER_FULFILLMENT, XML_ORDER_FULFILLMENT_ITEM
} from './templates';
import {
    AmazonFulfill, AmazonOrder, AmazonOrderInvoice, AmazonOrderItem,
    AmazonOrderProps, AmazonSalesOrder,
    AWSRequest,
    AWSValueParameters,
    BuiltOrder, LoggedEntry,
    QuantityAvailableRecord,
    SageInvoice
} from "./types";
import {RowDataPacket} from "mysql2";
import {Request, Response} from "express";
const {logSalesOrder, loadSalesOrder, loadInvoiceData} = require('./log-salesorder');


interface CreatedBeforeRow extends RowDataPacket {
    CreatedBefore: string,
}
export async function loadLastCreatedBeforeDate() {
    try {
        const query = `SELECT EXTRACTVALUE(response,
                                           '/ListOrdersResponse/ListOrdersResult/CreatedBefore') AS CreatedBefore
                       FROM c2.amws_response
                       WHERE action = 'ListOrders'
                         AND is_error_response = 0
                       ORDER BY idamws_response DESC
                       LIMIT 1`;

        const [rows] = await mysql2Pool.query<CreatedBeforeRow[]>(query);
        let createdBefore = new Date('2018-02-15T07:00:00');
        rows.forEach(row => {
            createdBefore = new Date(row.CreatedBefore);
        });
        return createdBefore;
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("loadLastCreatedBeforeDate()", err.message);
            return Promise.reject(err);
        }
        debug("loadLastCreatedBeforeDate()", err);
        return Promise.reject(new Error('Error in loadLastCreatedBeforeDate()'));
    }
}

export interface ListOrdersProps {
    CreatedAfter?: string|Date,
    OrderStatus?: string|string[],
}
export async function ListOrders(parameters:ListOrdersProps = {}):Promise<string> {
    try {
        if (!parameters.CreatedAfter) {
            parameters.CreatedAfter = toISO8601(await loadLastCreatedBeforeDate());
        }
        if (parameters.CreatedAfter instanceof Date) {
            parameters.CreatedAfter = toISO8601(parameters.CreatedAfter);
        }
        const CreatedAfter = parameters.CreatedAfter;
        delete parameters.CreatedAfter;
        const OSParameters:AWSValueParameters = {};
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
        const Timestamp = toISO8601();
        const request:AWSRequest = {
            AWSAccessKeyId: AMAZON_SC_AWSAccessKeyId,
            Action: 'ListOrders',
            CreatedAfter,
            'FulfillmentChannel.Channel.1': 'MFN',
            MWSAuthToken: AMAZON_SC_MWSAuthToken,
            'MarketplaceId.Id.1': AMAZON_SC_MarketplaceId,
            ...OSParameters,
            SellerId: AMAZON_SC_SellerId,
            SignatureMethod: AMAZON_SC_SignatureMethod,
            SignatureVersion: AMAZON_SC_SignatureVersion,
            Timestamp,
            Version: MWS_ORDERS_API_VERSION,
        };

        const signature = encode(getSignature(url, request));
        const queryStr = getQueryString(request);
        const response = await fetch(`https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST'
        });
        const status = response.status;
        const xmlResponse = await response.text();
        await logResponse({status, request, xmlResponse});

        return xmlResponse;
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("ListOrders()", err.message);
            return Promise.reject(err);
        }
        debug("ListOrders()", err);
        return Promise.reject(new Error('Error in ListOrders()'));
    }
}
export interface GetOrderProps {
    AmazonOrderId: string|string[],
}
const GetOrder = async (parameters:GetOrderProps) => {
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
        const formatted:AWSValueParameters = {};
        const {AmazonOrderId} = parameters;
        AmazonOrderId.map((id, index) => {
            formatted[`AmazonOrderId.Id.${index + 1}`] = id;
        });

        const url = `/Orders/${MWS_ORDERS_API_VERSION}`;
        const Timestamp = toISO8601();
        // const LastUpdatedAfter
        const request = {
            AWSAccessKeyId: AMAZON_SC_AWSAccessKeyId,
            Action: 'GetOrder',
            ...formatted,
            MWSAuthToken: AMAZON_SC_MWSAuthToken,
            SellerId: AMAZON_SC_SellerId,
            SignatureMethod: AMAZON_SC_SignatureMethod,
            SignatureVersion: AMAZON_SC_SignatureVersion,
            // LastUpdatedAfter,
            Timestamp,
            Version: MWS_ORDERS_API_VERSION,
        };
        const signature = encode(getSignature(url, request));
        const queryStr = getQueryString(request);
        const response = await fetch(`https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST'
        });
        const status = response.status;
        const xmlResponse = await response.text();
        await logResponse({status, request, xmlResponse});

        return xmlResponse;

    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("GetOrder()", err.message);
            return Promise.reject(err);
        }
        debug("GetOrder()", err);
        return Promise.reject(new Error('Error in GetOrder()'));
    }
}

const ListOrderItems = async (parameters:any = {}) => {
    try {
        if (!parameters.AmazonOrderId) {
            return Promise.reject(new Error('AmazonOrderId is required'));
        }
        const url = `/Orders/${MWS_ORDERS_API_VERSION}`;
        const Timestamp = toISO8601();
        // const LastUpdatedAfter
        const request = {
            AWSAccessKeyId: AMAZON_SC_AWSAccessKeyId,
            Action: 'ListOrderItems',
            ...parameters,
            MWSAuthToken: AMAZON_SC_MWSAuthToken,
            SellerId: AMAZON_SC_SellerId,
            SignatureMethod: AMAZON_SC_SignatureMethod,
            SignatureVersion: AMAZON_SC_SignatureVersion,
            // LastUpdatedAfter,
            Timestamp,
            Version: MWS_ORDERS_API_VERSION,
        };
        const signature = encode(getSignature(url, request));
        const queryStr = getQueryString(request);
        // return request;
        const response = await fetch(`https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST'
        });
        const status = response.status;
        const xmlResponse = await response.text();
        await logResponse({status, request, xmlResponse});

        return xmlResponse;
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("ListOrderItems()", err.message);
            return Promise.reject(err);
        }
        debug("ListOrderItems()", err);
        return Promise.reject(new Error('Error in ListOrderItems()'));
    }
};

const loadOrderItemsFromDB = async (AmazonOrderId:string) => {
    try {
        const action = 'ListOrderItems';
        const searchResponse = {
            xpath: '//AmazonOrderId',
            value: AmazonOrderId
        };
        return await getLogEntries({action: 'ListOrderItems', searchResponse});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("loadOrderItemsFromDB()", err.message);
            return Promise.reject(err);
        }
        debug("loadOrderItemsFromDB()", err);
        return Promise.reject(new Error('Error in loadOrderItemsFromDB()'));
    }
}

const loadOrderFromDB = async (AmazonOrderId:string) => {
    try {
        const action = ['ListOrders', 'GetOrder'];
        const searchResponse = {xpath: '//AmazonOrderId', value: AmazonOrderId};
        return await getLogEntries({action, searchResponse});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("loadOrderFromDB()", err.message);
            return Promise.reject(err);
        }
        debug("loadOrderFromDB()", err);
        return Promise.reject(new Error('Error in loadOrderFromDB()'));
    }
};
export interface FetchSageInvoice {
    Company: string,
    SalesOrderNo: string,
}
const fetchSageInvoice = async ({Company, SalesOrderNo}:FetchSageInvoice):Promise<{result:SageInvoice}> => {
    try {
        // debug('fetchSageInvoice', {Company, SalesOrderNo});

        const auth = Buffer.from(`${INTRANET_API_USERNAME}:${INTRANET_API_PASSWORD}`).toString('base64');
        const sageCompany = getSageCompany(Company);
        const url = 'https://intranet.chums.com/node-sage/api/:Company/invoice/so/:SalesOrderNo'
            .replace(':Company', encodeURIComponent(sageCompany))
            .replace(':SalesOrderNo', encodeURIComponent(SalesOrderNo));
        // debug('fetchSageInvoice()', url);
        const res = await fetch(url, {
            headers: {'Content-Type': 'application/json', 'Authorization': `Basic ${auth}`,}
        });
        // debug('fetchSageInvoice() status:', url, res.status);
        return await res.json();
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("fetchSageInvoice()", err.message);
            return Promise.reject(err);
        }
        debug("fetchSageInvoice()", err);
        return Promise.reject(new Error('Error in fetchSageInvoice()'));
    }
};

const SubmitFeed_OrderAcknowledgement = async ({AmazonOrderId}:AmazonOrderProps) => {
    if (!AmazonOrderId) {
        throw new Error('AmazonOrderId is required');
    }
    try {
        const {salesOrder} = await buildOrder({AmazonOrderId});
        const items = salesOrder.SalesOrderDetail.map(item => item.ItemCode);
        const available:QuantityAvailableRecord[] = await loadQuantityAvailable({items});
        let isOutOfStock = false;
        salesOrder.SalesOrderDetail.forEach(item => {
            const [onHand] = available.filter(i => i.ItemCode === item.ItemCode);
            if (!onHand || onHand.QuantityAvailable < item.QuantityOrdered) {
                isOutOfStock = true;
            }
        });
        const ack:any = {
            AmazonOrderId,
            CancelReason: null,
            StatusCode: 'Success',
        };
        if (!salesOrder.ShippingAddress.AddressLine1) {
            ack.CancelReason = 'ShippingAddressUndeliverable';
            ack.StatusCode = 'Failure';
        } else if (isOutOfStock) {
            ack.CancelReason = 'NoInventory';
            ack.StatusCode = 'Failure';
        }

        const t_envelopeXML = await loadXML(XML_ENVELOPE);
        const t_messageXML = await loadXML(XML_MESSAGE);
        const t_orderAckXML = await loadXML(XML_ORDER_ACK);
        const t_orderAckItemXML = await loadXML(XML_ORDER_ACK_ITEM);
        const t_cancelReason = await loadXML(XML_CANCEL_REASON);

        const [logged] = await loadSalesOrder({AmazonOrderId});
        if (!logged) {
            const importResult = await submitOrder(salesOrder);
            salesOrder.MerchantOrderID = importResult.SalesOrderNo;
        } else {
            salesOrder.MerchantOrderID = logged.SalesOrderNo;
        }

        ack.Item = salesOrder.SalesOrderDetail.map(item => {
            const {AmazonOrderItemCode} = item;
            const [onHand] = available.filter(i => i.ItemCode === item.ItemCode);
            if (!onHand || onHand.QuantityAvailable < item.QuantityOrdered) {
                return {AmazonOrderItemCode, CancelReason: 'NoInventory'};
            }
            return {AmazonOrderItemCode}
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
            .replace(/{SELLER_ID}/g, AMAZON_SC_SellerId)
            .replace(/{MessageType}/g, 'OrderAcknowledgement')
            .replace(/{MessagesXML}/g, MessagesXML.join(''))
            .replace(/>\s+</g, '><')
            .replace(/\s+/g, ' ');

        // return body;


        const url = '/';
        const Timestamp = toISO8601();
        // const Timestamp = '2018-04-02T17:22:26Z';

        const Action = 'SubmitFeed';
        // const body = await buildProduct(item);
        const FeedType = '_POST_ORDER_ACKNOWLEDGEMENT_DATA_';
        const ContentMD5Value = contentMD5(body);
        const Version = '2009-01-01';
        // return body;
        const request = {
            AWSAccessKeyId: AMAZON_SC_AWSAccessKeyId,
            Action,
            ContentMD5Value,
            FeedType,
            MWSAuthToken: AMAZON_SC_MWSAuthToken,
            'MarketplaceIdList.Id.1': AMAZON_SC_MarketplaceId,
            Merchant: AMAZON_SC_SellerId,
            PurgeAndReplace: 'false',
            SignatureMethod: AMAZON_SC_SignatureMethod,
            SignatureVersion: AMAZON_SC_SignatureVersion,
            Timestamp,
            Version,
        };
        // debug('postNewItem', body);
        // return config.getStringToSign(url, request);
        const signature = encode(getSignature(url, request));
        // return signature;
        const queryStr = getQueryString(request);
        // return `https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`;
        const response = await fetch(`https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST',
            body,
            headers: {'Content-Type': 'text/xml'}
        });
        const status = response.status;
        // debug('postInventoryUpdate', status);
        // return await response.text();
        const xmlResponse = await response.text();
        await logResponse({status, request, xmlResponse, post: body});
        return xmlResponse;
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("SubmitFeed_OrderAcknowledgement()", err.message);
            return Promise.reject(err);
        }
        debug("SubmitFeed_OrderAcknowledgement()", err);
        return Promise.reject(new Error('Error in SubmitFeed_OrderAcknowledgement()'));
    }
};

interface ParseShipProps {
    StarshipShipVia: string
}
const parseShipVia = ({StarshipShipVia}:ParseShipProps):string => {
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

const parseShipMethod = ({StarshipShipVia}:ParseShipProps):string => {
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

const SubmitFeed_OrderFulfillment = async ({AmazonOrderId}:AmazonOrderProps) => {
    if (!AmazonOrderId) {
        throw new Error('AmazonOrderId is required');
    }

    try {
        const {salesOrder} = await buildOrder({AmazonOrderId});
        const [{SalesOrderNo}] = await loadSalesOrder({AmazonOrderId});
        const {result} = await fetchSageInvoice({Company: 'CHI', SalesOrderNo});


        // debug(result.Tracking);
        const fulfill:AmazonFulfill = {
            AmazonOrderId,
            MerchantFulfillmentID: result.InvoiceNo,
            FulfillmentDate: toISO8601(new Date(result.InvoiceDate)),
            CarrierCode: parseShipVia(result.Tracking[0]),
            ShippingMethod: parseShipMethod(result.Tracking[0]),
            ShipperTrackingNumber: result.Tracking[0].TrackingID,
            Item: [],
        };


        const t_envelopeXML = await loadXML(XML_ENVELOPE);
        const t_orderFulfillXML = await loadXML(XML_ORDER_FULFILLMENT);
        const t_orderFulfillItemXML = await loadXML(XML_ORDER_FULFILLMENT_ITEM);


        fulfill.Item = salesOrder.SalesOrderDetail.map(item => {
            const {AmazonOrderItemCode} = item;
            const [{QuantityShipped}] = result.Detail.filter(i => i.ItemCode === item.ItemCode);
            return {AmazonOrderItemCode, Quantity: QuantityShipped}
        });

        const MessagesXML = [fulfill].map((invoice, index) => {
            const ItemXML = invoice.Item
                .map(item => {
                    return t_orderFulfillItemXML
                        .replace(/{AmazonOrderItemCode}/g, item.AmazonOrderItemCode)
                        .replace(/{Quantity}/g, String(item.Quantity))
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
            .replace(/{SELLER_ID}/g, AMAZON_SC_SellerId)
            .replace(/{MessageType}/g, 'OrderFulfillment')
            .replace(/{MessagesXML}/g, MessagesXML.join(''))
            .replace(/>\s+</g, '><')
            .replace(/\s+/g, ' ');

        // return body;


        const url = '/';
        const Timestamp = toISO8601();
        // const Timestamp = '2018-04-02T17:22:26Z';

        const Action = 'SubmitFeed';
        // const body = await buildProduct(item);
        const FeedType = '_POST_ORDER_FULFILLMENT_DATA_';
        const ContentMD5Value = contentMD5(body);
        const Version = '2009-01-01';
        // return body;
        const request = {
            AWSAccessKeyId: AMAZON_SC_AWSAccessKeyId,
            Action,
            ContentMD5Value,
            FeedType,
            MWSAuthToken: AMAZON_SC_MWSAuthToken,
            'MarketplaceIdList.Id.1': AMAZON_SC_MarketplaceId,
            Merchant: AMAZON_SC_SellerId,
            PurgeAndReplace: 'false',
            SignatureMethod: AMAZON_SC_SignatureMethod,
            SignatureVersion: AMAZON_SC_SignatureVersion,
            Timestamp,
            Version,
        };
        // debug('postNewItem', body);
        // return config.getStringToSign(url, request);
        const signature = encode(getSignature(url, request));
        // return signature;
        const queryStr = getQueryString(request);
        // return `https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`;
        const response = await fetch(`https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST',
            body,
            headers: {'Content-Type': 'text/xml'}
        });
        const status = response.status;
        // debug('SubmitFeed_OrderFulfillment', status);
        // return await response.text();
        const xmlResponse = await response.text();
        await logResponse({status, request, xmlResponse, post: body});
        return xmlResponse;
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("SubmitFeed_OrderFulfillment()", err.message);
            return Promise.reject(err);
        }
        debug("SubmitFeed_OrderFulfillment()", err);
        return Promise.reject(new Error('Error in SubmitFeed_OrderFulfillment()'));
    }
};

const oneStepOrder = async ({AmazonOrderId}:AmazonOrderProps) => {
    try {

        const orderXML = await GetOrder({AmazonOrderId});
        const itemXML = await ListOrderItems({AmazonOrderId});
        const order = await buildOrder({AmazonOrderId});
        // debug('oneStepOrder()', {order});
        // return order.salesOrder;
        const result = await submitOrder(order.salesOrder);
        return result;
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("oneStepOrder()", err.message);
            return Promise.reject(err);
        }
        debug("oneStepOrder()", err);
        return Promise.reject(new Error('Error in oneStepOrder()'));
    }
};

export const doListOrders = async (req:Request, res:Response) => {
    const {format = 'xml'} = req.params;
    const {sage = false} = req.query;

    const parameters:any = {
        OrderStatus: [
            'Unshipped',
            'PartiallyShipped',
            ...req.params.OrderStatus
        ]
    };

    try {
        // debug('doListOrders()', req.params, new Date(Number(req.params.CreatedAfter)));
        if (req.params.CreatedAfter) {
            parameters.CreatedAfter = toISO8601(new Date(Number(req.params.CreatedAfter)));
        }
        const xml:string = await ListOrders(parameters);
        if (format.toLocaleLowerCase() === 'xml') {
            res.set('Content-Type', 'text/xml');
            res.send(xml);
            return;
        }
        const json:any = await parseXML(xml);
        if (!json.ListOrdersResponse.ListOrdersResult[0].Orders[0].Order) {
            res.json({salesOrders: []});
            return;
        }

        const salesOrders:AmazonSalesOrder[] = json.ListOrdersResponse.ListOrdersResult[0].Orders[0].Order.map((azso:AmazonObject) => {
            return parseAmazonOrder(azso);
        });
        if (sage) {
            const AmazonOrderIds = salesOrders.map(so => so.AmazonOrderId);
            const invoices:AmazonOrderInvoice[] = await loadInvoiceData(AmazonOrderIds);
            salesOrders.map(so => {
                const [invoice] = invoices.filter(inv => inv.AmazonOrderId === so.AmazonOrderId);
                so.InvoiceData = invoice;
            });
            res.json({salesOrders});
        } else {
            res.json({salesOrders});
        }
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("doListOrders()", err.message);
            return Promise.reject(err);
        }
        debug("doListOrders()", err);
        return Promise.reject(new Error('Error in doListOrders()'));
    }
};

export const doLoadOrderFromDB = async (req:Request, res:Response) => {
    try {
        const params = {
            action: 'ListOrders',
            id: req.params.ID,
        };
        const [entry] = await getLogEntries(params);
        if (req.params.format && req.params.format.toLowerCase() === 'xml') {
            res.set('Content-Type', 'text/xml');
            res.send(entry.response || '<?xml version="1.0"?><Error>Order Not Found</Error>');
            return;
        }
        try {
            const json = await parseXML(entry.response || '<?xml version="1.0"?><Error>No Results from Amazon.</Error>');
            const salesOrders = json?.ListOrdersRepsonse?.ListOrdersResult[0]?.Orders[0]?.Order.map((azso:AmazonObject) => parseAmazonOrder(azso));
            if (!salesOrders || !salesOrders.length) {
                res.json({error: 'Order not found', json});
                return;
            }
            res.json({salesOrders});
        } catch(err:unknown) {
            if (err instanceof Error) {
                debug("doLoadOrderFromDB()", err.message);
                return res.json({error: err.message, name: err.name});
            }
            res.json({error: 'unknown error in doLoadOrderFromDB'});
        }
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("doLoadOrderFromDB()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in doLoadOrderFromDB'});
    }
};

export const doGetOrder = async (req:Request, res:Response) => {
    try {
        const {AmazonOrderId} = req.params;
        const xml = GetOrder({AmazonOrderId});
        res.set('Content-Type', 'text/xml');
        res.send(xml);
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("doGetOrder()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in doGetOrder'});
    }
};

export const doListOrderItems = async (req:Request, res:Response) => {
    try {
        const {AmazonOrderId} = req.params;
        const xml = await ListOrderItems({AmazonOrderId});
        res.set('Content-Type', 'text/xml');
        res.send(xml);
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("doListOrderItems()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in doListOrderItems'});
    }
};

interface AmazonObject {
    [key:string]: any,
}
function parseObject(azObject:AmazonObject = {}):AmazonObject {
    const object:AmazonObject = {};
    Object.keys(azObject)
        .map(key => {
            const [val] = azObject[key];
            object[key] = val;
        });

    return object;
}

const parseAmazonOrder = (azso:AmazonObject):AmazonSalesOrder => {
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
    return order as AmazonSalesOrder;
};

const parseItem = (azItem:AmazonObject):any => {
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

interface ParseXMLOrderProps {
    response: string;
}
async function parseXMLOrder({response}:ParseXMLOrderProps):Promise<AmazonOrder> {
    try {
        const json:any = await parseXML(response);
        let salesOrder;
        if (json.ListOrdersResponse) {
            // @ts-ignore
            [salesOrder] = json.ListOrdersResponse.ListOrdersResult[0].Orders.map(el => {
                const [azso] = el.Order;
                return parseAmazonOrder(azso);
            });
        } else if (json.GetOrderResponse) {
            // @ts-ignore
            [salesOrder] = json.GetOrderResponse.GetOrderResult[0].Orders.map(el => {
                const [azso] = el.Order;
                return parseAmazonOrder(azso);
            });
        } else {
            return Promise.reject(new Error('Unable to parse Order Response'));
        }
        return salesOrder;
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("parseXMLOrder()", err.message);
            return Promise.reject(err);
        }
        debug("parseXMLOrder()", err);
        return Promise.reject(new Error('Error in parseXMLOrder()'));
    }
}

interface SellerCentralItem extends RowDataPacket {
    ItemCode: string,
}
const mapToItemCode = async (item:AmazonOrderItem) => {
    try {
        const query = `SELECT ItemCode FROM c2.AZ_SellerCentralItems WHERE SellerSKU = :SKU`;
        const data = {SKU: item.SellerSKU};
        const [[row = {}]] = await mysql2Pool.query<SellerCentralItem[]>(query, data);
        return {...row, ...item};
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("mapToItemCode()", err.message);
            return Promise.reject(err);
        }
        debug("mapToItemCode()", err);
        return Promise.reject(new Error('Error in mapToItemCode()'));
    }
};

const parseXMLItems = async ({response}:LoggedEntry) => {
    try {
        const jsonItems:any = await parseXML(response);
        const {OrderItems} = jsonItems.ListOrderItemsResponse.ListOrderItemsResult[0];
        // const [orderItems] = OrderItems;
        //@ts-ignore
        const items = OrderItems[0].OrderItem.map(el => parseItem(el)) as AmazonOrderItem[];
        return await Promise.all(items.map(item => mapToItemCode(item)));
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("parseXMLItems()", err.message);
            return Promise.reject(err);
        }
        debug("parseXMLItems()", err);
        return Promise.reject(new Error('Error in parseXMLItems()'));
    }
};

const parseAmazonShipMethod = ({ShipmentServiceLevelCategory}:{ShipmentServiceLevelCategory: string}) => {
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

const parseAmazonShipComment = ({IsPrime, ShipmentServiceLevelCategory}: {IsPrime: boolean, ShipmentServiceLevelCategory: string}) => {
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

const buildOrder = async ({AmazonOrderId}:AmazonOrderProps):Promise<BuiltOrder> => {
    try {
        const [xmlOrder] = await loadOrderFromDB(AmazonOrderId);
        const salesOrder = await parseXMLOrder(xmlOrder);

        const [xmlItems] = await loadOrderItemsFromDB(AmazonOrderId);
        salesOrder.OrderItems = await parseXMLItems(xmlItems) as AmazonOrderItem[];
        const LineComments:string[] = [
            `Deliver by ${new Date(salesOrder.EarliestDeliveryDate).toLocaleDateString()} to ${new Date(salesOrder.LatestDeliveryDate).toLocaleDateString()}`,
        ];
        const FreightAmt:number = salesOrder.OrderItems
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
                    'SWR']
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
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("buildOrder()", err.message);
            return Promise.reject(err);
        }
        debug("buildOrder()", err);
        return Promise.reject(new Error('Error in buildOrder()'));
    }

};

const submitOrder = async (salesOrder:AmazonSalesOrder) => {
    const auth = Buffer.from(`${INTRANET_API_USERNAME}:${INTRANET_API_PASSWORD}`).toString('base64');
    const res = await fetch('https://intranet.chums.com/sage/amazon/salesorder_import.php', {
        method: 'POST',
        body: JSON.stringify({...salesOrder, action: 'import'}),
        headers: {'Content-Type': 'application/json', 'Authorization': `Basic ${auth}`,}
    });
    // debug('submitOrder() status:', res.status);
    const json = await res.json();
    const {AmazonOrderId} = salesOrder;
    const {SalesOrderNo} = json;
    await logSalesOrder({Company: 'chums', SalesOrderNo, AmazonOrderId, OrderStatus: 'N', UserID: 1, Action: 'import'});
    return json;
};




export const createOrder = async (req:Request, res:Response) => {
    try {
        const {AmazonOrderId} = req.params;
        const order = await buildOrder({AmazonOrderId});
        const result = await submitOrder(order.salesOrder);
        res.json({result});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("createOrder()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in createOrder'});
    }
};

export const parseOrder = async (req:Request, res:Response) => {
    try {
        const {AmazonOrderId} = req.params;
        const order = await buildOrder({AmazonOrderId});
        res.json({result: order})
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("parseOrder()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in parseOrder'});
    }
};

export const doSubmitFeed_OrderAcknowledgement = async (req:Request, res:Response) => {
    try {
        const {AmazonOrderId} = req.params;
        const xml = await SubmitFeed_OrderAcknowledgement({AmazonOrderId});
        res.set('Content-Type', 'text/xml');
        res.send(xml);
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("doSubmitFeed_OrderAcknowledgement()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in doSubmitFeed_OrderAcknowledgement'});
    }
};

export const doSubmitFeed_OrderFulfillment = async (req:Request, res:Response) => {
    try {
        const {AmazonOrderId} = req.params;
        const result = await SubmitFeed_OrderFulfillment({AmazonOrderId});
        res.set('Content-Type', 'text/xml');
        res.send(result);
        return;
        // if (typeof result === 'string') {
        // }
        // res.json({result});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("doSubmitFeed_OrderFulfillment()", err.message);
            return Promise.reject(err);
        }
        debug("doSubmitFeed_OrderFulfillment()", err);
        return Promise.reject(new Error('Error in doSubmitFeed_OrderFulfillment()'));
    }
};


export const getOneStepOrder = async (req:Request, res:Response) => {
    try {
        const {AmazonOrderId} = req.params;
        const result = await oneStepOrder({AmazonOrderId});
        res.json({result})
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("getOneStepOrder()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in getOneStepOrder'});
    }
};
