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


export interface AmazonSalesOrder {
    ShipExpireDate: string,
    CancelDate: string,
    AmazonOrderId: string|number,
    EmailAddress: string,
    ShippingAddress: any,
    Comment: string,
    ShipMethod: string,
    SalesOrderDetail: any[],
    LineComments: string[],
    FreightAmt: number,
    MerchantOrderID?: string,
}
export interface BuiltOrder {
    salesOrder: AmazonSalesOrder,
    az: any,
}

const MWS_ORDERS_API_VERSION = '2013-09-01';
const {loadQuantityAvailable} = require('./product-feed');
import  {
    loadXML, XML_ENVELOPE, XML_MESSAGE, XML_ORDER_ACK, XML_ORDER_ACK_ITEM, XML_CANCEL_REASON,
    XML_ORDER_FULFILLMENT, XML_ORDER_FULFILLMENT_ITEM
} from './templates';
const {logSalesOrder, loadSalesOrder, loadInvoiceData} = require('./log-salesorder');



export async function loadLastCreatedBeforeDate() {
    try {
        const query = `SELECT EXTRACTVALUE(response,
                                           '/ListOrdersResponse/ListOrdersResult/CreatedBefore') AS CreatedBefore
                       FROM c2.amws_response
                       WHERE action = 'ListOrders'
                         AND is_error_response = 0
                       ORDER BY idamws_response DESC
                       LIMIT 1`;

        const [rows] = await mysql2Pool.query(query);
        let createdBefore = new Date('2018-02-15T07:00:00');
        rows.forEach(row => {
            createdBefore = new Date(row.CreatedBefore);
        });
        return createdBefore;
    } catch (err) {
        debug('loadLastResponseTime()', err.message);
        return Promise.reject(err);
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
        const Timestamp = toISO8601();
        const request = {
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
    } catch (err) {
        debug('ListOrders', err.message);
        return Promise.reject(err);
    }
}

const GetOrder = async (parameters:any) => {
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
        const {AmazonOrderId, ...formatted} = parameters;
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

    } catch (err) {
        debug("GetOrder()", err.message);
        return Promise.reject(err);
    }
};

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
    } catch (err) {
        debug("ListOrderItems()", err.message);
        return Promise.reject(err);
    }

};

const loadOrderItemsFromDB = async ({AmazonOrderId}) => {
    try {
        const action = 'ListOrderItems';
        const searchResponse = {
            xpath: '//AmazonOrderId',
            value: AmazonOrderId
        };
        return await getLogEntries({action: 'ListOrderItems', searchResponse});
    } catch (err) {
        debug('loadOrderItemsFromDB()', err.message);
        return Promise.reject(err);
    }
};

const loadOrderFromDB = async ({AmazonOrderId}) => {
    try {
        const action = ['ListOrders', 'GetOrder'];
        const searchResponse = {xpath: '//AmazonOrderId', value: AmazonOrderId};
        return await getLogEntries({action, searchResponse});
    } catch (err) {
        debug('loadOrderFromDB()', err.message);
        return Promise.reject(err);
    }
};

const fetchSageInvoice = async ({Company, SalesOrderNo}) => {
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
    } catch (err) {
        debug('fetchSageInvoice', err.message);
        return Promise.reject(err);
    }
};

const SubmitFeed_OrderAcknowledgement = async ({AmazonOrderId}) => {
    if (!AmazonOrderId) {
        throw new Error('AmazonOrderId is required');
    }
    try {
        const {salesOrder} = await buildOrder({AmazonOrderId});
        const items = salesOrder.SalesOrderDetail.map(item => item.ItemCode);
        const available = await loadQuantityAvailable({items});
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
    } catch (err) {
        debug('postInventoryUpdate', err.message);
        return Promise.reject(err);
    }
};

const parseShipVia = ({StarshipShipVia}) => {
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

const parseShipMethod = ({StarshipShipVia}) => {
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

const SubmitFeed_OrderFulfillment = async ({AmazonOrderId}) => {
    if (!AmazonOrderId) {
        throw new Error('AmazonOrderId is required');
    }

    try {
        const {salesOrder} = await buildOrder({AmazonOrderId});
        const [{SalesOrderNo}] = await loadSalesOrder({AmazonOrderId});
        const {result} = await fetchSageInvoice({Company: 'CHI', SalesOrderNo});

        // debug(result.Tracking);
        const fulfill:any = {
            AmazonOrderId,
            MerchantFulfillmentID: result.InvoiceNo,
            FulfillmentDate: toISO8601(new Date(result.InvoiceDate)),
            CarrierCode: parseShipVia(result.Tracking[0]),
            ShippingMethod: parseShipMethod(result.Tracking[0]),
            ShipperTrackingNumber: result.Tracking[0].TrackingID,
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
                .map((item, index) => {
                    return t_orderFulfillItemXML
                        .replace(/{AmazonOrderItemCode}/g, item.AmazonOrderItemCode)
                        .replace(/{Quantity}/g, item.Quantity)
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
    } catch (err) {
        debug('SubmitFeed_OrderFulfillment', err.message);
        return Promise.reject(err);
    }
};

const oneStepOrder = async (parameters) => {
    try {
        const orderXML = await GetOrder(parameters);
        const itemXML = await ListOrderItems(parameters);
        const order = await buildOrder(parameters);
        // debug('oneStepOrder()', {order});
        // return order.salesOrder;
        const result = await submitOrder(order.salesOrder);
        return result;
    } catch (err) {
        debug("oneStepOrder", err.message);
        return Promise.reject(err);
    }
};

export const doListOrders = async (req, res) => {
    const {format = 'xml'} = req.params;
    const {OrderStatus = [], sage = false} = req.query;

    const parameters:any = {
        OrderStatus: [
            'Unshipped',
            'PartiallyShipped',
            ...OrderStatus,
        ]
    };

    try {
        if (req.params.CreatedAfter) {
            parameters.CreatedAfter = toISO8601(req.params.CreatedAfter);
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

        const salesOrders = json.ListOrdersResponse.ListOrdersResult[0].Orders[0].Order.map(azso => {
            return parseAmazonOrder(azso);
        });
        if (sage) {
            const AmazonOrderIds = salesOrders.map(so => so.AmazonOrderId);
            const invoices = await loadInvoiceData(AmazonOrderIds);
            salesOrders.map(so => {
                const [invoice = {}] = invoices.filter(inv => inv.AmazonOrderId === so.AmazonOrderId);
                so.InvoiceData = invoice;
            });
            res.json({salesOrders});
        } else {
            res.json({salesOrders});
        }
    } catch(err) {
        debug("doListOrders()", err.message, err);
        return Promise.reject(err);
    }
};

export const doLoadOrderFromDB = (req, res) => {
    const params = {
        action: 'ListOrders',
        id: req.params.ID,
    };
    // debug('loadOrderFromDB', params);
    getLogEntries(params)
        .then(([row = {}]) => {
            if (req.params.format.toLowerCase() === 'xml') {
                res.set('Content-Type', 'text/xml');
                res.send(row.response || '<?xml version="1.0"?><Error>Order Not Found</Error>');
            } else {
                parseXML(row.response || '<?xml version="1.0"?><Error>No Results from Amazon.</Error>')
                    .then((json:any) => {
                        const salesOrders = json.ListOrdersResponse.ListOrdersResult[0].Orders[0].Order.map(azso => {
                            return parseAmazonOrder(azso);
                        });
                        const AmazonOrderIds = salesOrders.map(so => so.AmazonOrderId);
                        res.json({salesOrders});
                    })
                    .catch(err => {
                        res.json({error: err.message});
                    })

            }
        })
        .catch(err => {
            res.json({error: err.message});
        })
};

export const doGetOrder = (req, res) => {
    const parameters:any = {};

    if (req.params.AmazonOrderId) {
        parameters.AmazonOrderId = req.params.AmazonOrderId;
    }

    GetOrder(parameters)
        // .then(query => {
        //     res.json(query);
        // })
        .then(xml => {
            res.set('Content-Type', 'text/xml');
            res.send(xml);
        })
        .catch(err => {
            console.log(err.message, err);
            res.json({error: err.message});
        })
};

export const doListOrderItems = (req, res) => {
    const parameters:any = {};

    if (req.params.AmazonOrderId) {
        parameters.AmazonOrderId = req.params.AmazonOrderId;
    }

    ListOrderItems(parameters)
        // .then(query => {
        //     res.json(query);
        // })
        .then(xml => {
            res.set('Content-Type', 'text/xml');
            res.send(xml);
        })
        .catch(err => {
            console.log(err.message, err);
            res.json({error: err.message});
        })

};

interface AmazonObject {
    [key:string]: any,
}
function parseObject(azObject:AmazonObject = {}):any {
    const object = {};
    Object.keys(azObject)
        .map(key => {
            const [val] = azObject[key];
            object[key] = val;
        });

    return object;
}

const parseAmazonOrder = (azso:AmazonObject):any => {
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
async function parseXMLOrder({response}) {
    try {
        const json:any = await parseXML(response);
        let salesOrder;
        if (json.ListOrdersResponse) {
            [salesOrder] = json.ListOrdersResponse.ListOrdersResult[0].Orders.map(el => {
                const [azso] = el.Order;
                return parseAmazonOrder(azso);
            });
        } else if (json.GetOrderResponse) {
            [salesOrder] = json.GetOrderResponse.GetOrderResult[0].Orders.map(el => {
                const [azso] = el.Order;
                return parseAmazonOrder(azso);
            });
        } else {
            return Promise.reject(new Error('Unable to parse Order Response'));
        }
        return salesOrder;
    } catch (err) {
        debug('parseXMLOrder', err.message);
        return Promise.reject(err);
    }
}

const mapToItemCode = async ({item}) => {
    try {
        const query = `SELECT ItemCode FROM c2.AZ_SellerCentralItems WHERE SellerSKU = :SKU`;
        const data = {SKU: item.SellerSKU};
        const [[row = {}]] = await mysql2Pool.query(query, data);
        return {...row, ...item};
    } catch (err) {
        debug("mapToItemCode()", err.message);
        return Promise.reject(err);
    }
};

const parseXMLItems = async ({response}) => {
    try {
        const jsonItems:any = await parseXML(response);
        const {OrderItems} = jsonItems.ListOrderItemsResponse.ListOrderItemsResult[0];
        // const [orderItems] = OrderItems;
        const items = OrderItems[0].OrderItem.map(el => parseItem(el));
        return await Promise.all(items.map(item => mapToItemCode({item})));
    } catch (err) {
        debug('parseXMLItems()', err.message);
        return Promise.reject(err);

    }
};

const parseAmazonShipMethod = ({ShipmentServiceLevelCategory}) => {
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

const parseAmazonShipComment = ({IsPrime, ShipmentServiceLevelCategory}) => {
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

const buildOrder = async ({AmazonOrderId}):Promise<BuiltOrder> => {
    try {
        const [xmlOrder] = await loadOrderFromDB({AmazonOrderId});
        const salesOrder = await parseXMLOrder(xmlOrder);

        const [xmlItems] = await loadOrderItemsFromDB({AmazonOrderId});
        salesOrder.OrderItems = await parseXMLItems(xmlItems);
        const LineComments:string[] = [
            `Deliver by ${new Date(salesOrder.EarliestDeliveryDate).toLocaleDateString()} to ${new Date(salesOrder.LatestDeliveryDate).toLocaleDateString()}`,
        ];
        const FreightAmt:number = salesOrder.OrderItems
            .map(item => item.ShippingPrice.Amount || 0)
            .reduce((acc, current) => acc + Number(current), 0);
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
            az: salesOrder
        };
    } catch (err) {
        debug("createOrder()", err.message);
        return Promise.reject(err);
    }

};

const submitOrder = async (salesOrder) => {
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




export const createOrder = (req, res) => {
    buildOrder(req.params)
        .then(result => {
            return submitOrder(result.salesOrder);
        })
        .then(result => {
            res.json({result});
        })
        // .then(xml => {
        //     res.set('Content-Type', 'text/xml');
        //     res.send(xml);
        // })
        .catch(err => {
            console.log(err.message, err);
            res.json({error: err.message});
        })
};

export const parseOrder = (req, res) => {
    buildOrder(req.params)
        .then(result => {
            res.json({result});
        })
        .catch(err => {
            console.log(err.message, err);
            res.json({error: err.message});
        })
};

export const doSubmitFeed_OrderAcknowledgement = (req, res) => {
    SubmitFeed_OrderAcknowledgement(req.params)
        // .then(result => {
        //     res.json({result});
        // })
        .then(xml => {
            res.set('Content-Type', 'text/xml');
            res.send(xml);
        })
        .catch(err => {
            res.json({error: err.message});
        })
};

export const doSubmitFeed_OrderFulfillment = (req, res) => {
    SubmitFeed_OrderFulfillment(req.params)
        .then(result => {
            if (typeof result === 'string') {
                res.set('Content-Type', 'text/xml');
                res.send(result);
                return;
            }
            res.json({result});
        })
        .catch(err => {
            res.json({error: err.message});
        })
};


export const getOneStepOrder = (req, res) => {
    const parameters:any = {};

    if (req.params.AmazonOrderId) {
        parameters.AmazonOrderId = req.params.AmazonOrderId;
    }

    oneStepOrder(parameters)
        .then(result => {
            res.json({result})
        })
        .catch(err => {
            res.json({error: err.message});
        })
};
