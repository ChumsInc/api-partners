const debug = require('debug')('chums:lib:shopify-integration:orders');
const {fetchGETResults, genAdminApiURL, fetchPOST, parseStore} = require('./utils');
const {mysql2Pool} = require('chums-local-modules');
const {parse, startOfDay, endOfDay, format} = require('date-fns');
const {sageCountryCode} = require('./country-codes');



function parsePaymentType({payment_gateway_names = []}) {
    switch (payment_gateway_names[0]) {
    case 'shopify_payments':
        return 'WEBCC';
    default:
        return 'PAYPA';
    }
}

function parseShipping({shipping_lines = []}) {
    switch (shipping_lines[0].code) {
    case '01':
        return '1UPS_NEXT_DAY';
    case '02':
        return '1UPS_2DAY';
    case '03':
        return '1UPS_GROUND';
    case '12':
        return '1UPS_3DAY';
    case '13':
        return '1UPS_NEXT_DAY_S';
    case 'P':
        return 'SHOPIFY';
    case 'FirstClassPackageInternationalService':
        return 'APP_INTL';
    case 'FirstPackage':
    case 'Free Standard Shipping (2-6 Days)':
        return 'APP';
    case 'Free Holiday Shipping (USPS Priority - Est 2 Day Domestic)':
    case 'Priority':
        return 'USPS PRIORITY';
    case 'PriorityExpress':
        return 'APP_PRI_EXP';
    case 'PriorityMailInternational':
        return 'APP_PRI_INTL';
    default:
        return 'TO BE DECIDED';
    }
}

/**
 *
 * @param {Object} address
 * @param {String} address.name
 * @param {String} address.address1
 * @param {String} address.address2
 * @param {String} address.country_code
 * @param {String} address.zip
 * @param {String} address.city
 * @param {String} address.province_code
 */
function parseAddress({name = '', address1 = '', address2 = '', country_code = '', zip = '', city = '', province_code = ''} = {}) {
    let address3 = '';
    name = name.substring(0, 30);
    if (address1.length > 30) {
        if (!!address2) {
            address3 = address2.substring(0, 30);
        }
        const [a1, a2] = address1.match(/.{1,30}(\s|$)/g);
        address1 = a1;
        address2 = a2;
    }
    zip = (zip || '').substring(0, 10);
    city = city.substring(0, 20);
    country_code = sageCountryCode(country_code);
    return {name, address1, address2, address3, country_code, zip, city, province_code}
}

function parseOrder(order) {
    const arraySum = (acc, cv) => acc + cv;
    const sage = {};
    sage.orders_id = order.number;
    sage.SalesOrderNo = order.name;
    sage.ARDivisionNo = '08';
    sage.CustomerNo = 'RETAIL';
    sage.CustomerPONo = 'Shopify #' + String(order.id);
    sage.EmailAddress = order.email;
    sage.billing = parseAddress(order.billing_address);
    sage.delivery = parseAddress(order.shipping_address);
    sage.PaymentType = parsePaymentType(order);
    sage.ShipVia = parseShipping(order);
    sage.FreightAmt = order.shipping_lines.map(line => Number(line.price)).reduce(arraySum, 0);
    if (!!order.discount_codes) {
        order.discount_codes.forEach(dc => {
            if (dc.type === 'shipping') {
                sage.FreightAmt -= Number(dc.amount);
            }
        });
    }
    if (sage.FreightAmt < 0) {
        sage.FreightAmt = 0;
    }
    sage.SalesTaxAmt = order.tax_lines.map(line => Number(line.price)).reduce(arraySum, 0);
    if (sage.SalesTaxAmt) {
        sage.TaxSchedule = 'UT';
        sage.TaxableAmt = Number(order.subtotal_price_set.shop_money.amount);
    } else {
        sage.NonTaxableAmt = Number(order.subtotal_price_set.shop_money.amount);
    }
    sage.orderDetail = order.line_items.map(item => {
        let discount = 0;
        if (item.discount_allocations && item.discount_allocations.length) {
            item.discount_allocations.forEach(disc => {
                discount += Number(disc.amount_set.shop_money.amount);
            });
        }
        const qty = Number(item.quantity);
        const stdUnitPrice = Number(item.price_set.shop_money.amount);
        const unit_price = ((stdUnitPrice * qty) - discount) / qty;
        const line_discount = (discount / qty);
        return {
            ItemCode: item.sku,
            ItemCodeDesc: item.name,
            QuantityOrdered: item.quantity,
            UnitPrice: unit_price,
            lineDiscount: line_discount,
        };
    });
    return sage;
}

async function updateFailedImport({id, SalesOrderNo}) {
    try {
        const query = `UPDATE shopify.orders
                       SET sage_SalesOrderNo = :SalesOrderNo,
                           import_status     = 'linked'
                       WHERE id = :id`;
        const data = {id, SalesOrderNo};
        const connection = await mysql2Pool.getConnection();
        await connection.query(query, data);
        connection.release();
        const [order] = await loadOrderImport([id]);
        return order;
    } catch (err) {
        debug("updateFailedImport()", err.message);
        return Promise.reject(err);
    }
}


async function saveOrderImport({id, import_result, order}) {
    const parseCompany = ({Company}) => {
        switch (Company) {
        case 'CHI':
            return 'chums';
        case 'BCS':
            return 'bc';
        default:
            return 'chums';
        }
    };

    try {
        const query = `INSERT INTO shopify.orders (id, import_result, sage_Company, sage_SalesOrderNo,
                                                          import_status, shopify_order, created_at)
                       VALUES (:id, :import_result, :sage_Company, :sage_SalesOrderNo, :import_status, :shopify_order, now())
                       ON DUPLICATE KEY UPDATE import_result = :import_result, sage_Company = :sage_Company,
                                               sage_SalesOrderNo = :sage_SalesOrderNo, import_status = :import_status,
                                               shopify_order = :shopify_order, updated_at = now()`;
        const data = {
            id,
            import_result: JSON.stringify(import_result),
            sage_Company: parseCompany(import_result),
            sage_SalesOrderNo: import_result.SalesOrderNo,
            import_status: import_result.import_status,
            shopify_order: JSON.stringify(order),
        };
        const connection = await mysql2Pool.getConnection();
        await connection.query(query, data);
        connection.release();
        const [soImport] = await loadOrderImport([id]);
        return soImport;
    } catch (err) {
        debug("saveOrderImport()", err.message);
        return err;
    }
}

async function updateOrders(orders = []) {
    try {

        debug('updateOrders() updating:', orders.length);
        if (!orders.length) {
            return;
        }
        const idList = orders.map(order => order.id);
        const queryOrder = `SELECT id, shopify_order
                            FROM shopify.orders
                            WHERE id in (:idList)`;
        const queryUpdate = `UPDATE shopify.orders
                       SET shopify_order = :shopify_order
                       WHERE id = :id`;
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(queryOrder, {idList});
        const updates = orders
            .filter(order => {
                const [row] = rows.filter(row => row.id === order.id);
                if (!row) {
                    debug('updateOrders Promise.all() not found:', order.id);
                    return false;
                }

                try {
                    const shopify_order = JSON.parse(row.shopify_order);
                    if (new Date(shopify_order.updated_at) < new Date(order.updated_at)) {
                        return true;
                    }
                } catch(err) {
                    debug("updateOrders()", err.message);
                }
                return false;
            })
        await Promise.all(updates.map(order => {
            try {
                const [row] = rows.filter(row => row.id === order.id);
                const shopify_order = JSON.parse(row.shopify_order);
                // debug('updateOrders Promise.all() updating:', order.id, order.updated_at);
                return connection.query(queryUpdate, {id: order.id, shopify_order: JSON.stringify({...shopify_order, ...order})});
            } catch(err) {
                debug("updateOrders()", err.message);
            }
            return Promise.resolve();
        }));
        connection.release();

    } catch (err) {
        debug("updateOrders()", err.message);
        return err;
    }
}

async function loadOrderImport(id = [], store) {
    // @TODO Integrate for chums.com, chumssafety.com store
    try {
        if (id.length === 0) {
            return [];
        }
        const query = `SELECT id,
                              import_result,
                              sage_Company,
                              sage_SalesOrderNo,
                              import_status,
                              shopify_order,
                              soh.ARDivisionNo,
                              soh.CustomerNo,
                              soh.BillToName,
                              soh.OrderStatus,
                              soh.CancelReasonCode,
                              soh.ShipVia,
                              ifnull(ih.InvoiceNo, so.CurrentInvoiceNo) AS InvoiceNo,
                              oi.Balance
                       FROM shopify.orders o
                            LEFT JOIN c2.SO_SalesOrderHistoryHeader soh
                                      ON soh.Company = 'chums' AND soh.SalesOrderNo = o.sage_SalesOrderNo
                            LEFT JOIN c2.SO_SalesOrderHeader so
                                      ON so.Company = 'chums' AND so.SalesOrderNo = o.sage_SalesOrderNo
                            LEFT JOIN c2.ar_invoicehistoryheader ih
                                      ON ih.Company = soh.Company AND ih.SalesOrderNo = soh.SalesOrderNo
                            LEFT JOIN c2.AR_OpenInvoice oi
                                      ON oi.Company = ih.Company AND oi.InvoiceNo = ih.InvoiceNo
                       WHERE id IN (:id)`;
        const data = {id};
        // debug('loadOrderImport', data);
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query, data);
        connection.release();
        return rows.map(row => {
            row.import_result = JSON.parse(row.import_result || '{}');
            // debug('loadOrderImport() 1', row.id);
            let shopify_order;
            try {
                shopify_order = JSON.parse(row.shopify_order || '{}');
            } catch (err) {
                debug('Unable to parse saved shopify order: ', row.id);
                shopify_order = {error: err.message};
            }
            // debug('loadOrderImport() 2', row.id);
            delete row.shopify_order;
            return {
                ...row,
                ...shopify_order,
            }
        });
    } catch (err) {
        console.trace(err);
        debug("loadOrderImport()", err.message);
        return err;
    }
}

exports.loadOrderImport = loadOrderImport;

async function fetchOrders({status = 'open', since_id, created_at_min, created_at_max} = {}) {
    let allOrders = [];
    const attribution_app_id = 580111;
    const options = {status, attribution_app_id};
    if (since_id) {
        options.since_id = since_id;
    } else {
        options.since_id = 2061093175381;
    }
    if (created_at_min) {
        options.created_at_min = format(
            startOfDay(parse(created_at_min, 'y-MM-dd', new Date())),
            "yyyy-MM-dd'T'HH:mm:ssxxx");
    }
    if (created_at_max) {
        options.created_at_max = format(
            endOfDay(parse(created_at_max, 'y-MM-dd', new Date())),
            "yyyy-MM-dd'T'HH:mm:ssxxx");
    }
    let url = genAdminApiURL('/orders.json', options);
    debug('fetchOrders()', url);
    while (!!url) {
        const {results, nextLink} = await fetchGETResults(url);
        const {orders} = results;
        url = nextLink || null;
        allOrders = allOrders.concat(orders);
        debug('fetchOrders()', allOrders.length);
    }
    const idList = allOrders.map(order => order.id);
    const imports = await loadOrderImport(idList);
    await updateOrders(allOrders);
    return allOrders.map(order => {
        const [so] = imports.filter(row => row.id === order.id);
        if (!!so) {
            return {...so, ...order}
        }
        return order;
    });
}

exports.fetchOrders = fetchOrders;

async function loadOpenPaypalInvoices() {
    try {
        const query = `SELECT id,
                              import_result,
                              sage_Company,
                              sage_SalesOrderNo,
                              import_status,
                              shopify_order,
                              soh.ARDivisionNo,
                              soh.CustomerNo,
                              soh.BillToName,
                              soh.OrderStatus,
                              ih.InvoiceNo,
                              oi.Balance
                       FROM shopify.orders o
                            LEFT JOIN c2.SO_SalesOrderHistoryHeader soh
                                      ON soh.Company = o.sage_Company AND soh.SalesOrderNo = o.sage_SalesOrderNo
                            LEFT JOIN c2.ar_invoicehistoryheader ih
                                      ON ih.Company = soh.Company AND ih.SalesOrderNo = soh.SalesOrderNo
                            LEFT JOIN c2.AR_OpenInvoice oi
                                      ON oi.Company = ih.Company AND oi.InvoiceNo = ih.InvoiceNo
                       WHERE ifnull(oi.Balance, 0) <> 0`;
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query);
        connection.release();
        return rows
            .map(row => {
                row.shopify_order = JSON.parse(row.shopify_order);
                return row;
            });
    } catch (err) {
        debug("loadOpenPaypalInvoices()", err.message);
        return Promise.reject(err);
    }
}

async function fetchShopifyOrder(id, store) {
    try {
        let url = genAdminApiURL(`/orders/${id}.json`, {}, store);
        const {results, nextLink} = await fetchGETResults(url);
        return results.order || {};
    } catch(err) {
        debug("fetchShopifyOrder()", err.message);
        return err;
    }
}
exports.fetchShopifyOrder = fetchShopifyOrder;

async function fetchOrderRisk(id) {
    let url = genAdminApiURL(`/orders/${id}/risks.json`);
    const {results, nextLink} = await fetchGETResults(url);
    return results.risks || [];
}

async function fetchProcessOrder(id, retryImport = false) {
    try {
        const order = await fetchShopifyOrder(id);
        order.risks = await fetchOrderRisk(id);
        if (order.fulfillment_status === 'fulfilled') {
            return {order};
        }

        const [result] = await loadOrderImport([id]);
        if (retryImport !== true && !!result && !!result.sage_SalesOrderNo) {
            return {order: {...result, ...order}};
        }

        const sage = parseOrder(order);
        const import_result = await fetchPOST('https://intranet.chums.com/sage/api/shopify_import.php', sage);
        const orderImport = await saveOrderImport({id: order.id, import_result, order});
        return {order: {...orderImport, ...order}}
    } catch (err) {
        debug("getOrder()", err.message);
        return err;
    }
}

const triggerImport = async (req, res) => {
    try {
        await fetchProcessOrder(req.body.id);
        res.status(200).json({success: true})
    } catch (err) {
        debug("triggerImport()", err.message);
        res.status(500).json({error: 'import failed'});
    }
};
exports.triggerImport = triggerImport;

const fetchOrder = async (req, res) => {
    try {
        const {id} = req.params;
        const store = parseStore(req);
        const [order = {}] = await loadOrderImport([id], store);
        // if (!order || !order.id) {
        //     const result = await fetchProcessOrder(id);
        //     return res.json({order: result.order});
        // }
        res.json({order});
    } catch (err) {
        debug("fetchOrder()", err.message);
        res.json({error: err.message});
    }
};

exports.fetchOrder = fetchOrder;

const getOrder = async (req, res) => {
    try {
        const retry = req.query.retry === '1';
        const result = await fetchProcessOrder(req.params.id, retry);
        res.json(result);
    } catch (err) {
        debug("getOrder()", err.message);
        res.json({error: err.message});
    }
};
exports.getOrder = getOrder;

const getOrderRisk = async (req, res) => {
    try {
        const risks = await fetchOrderRisk(req.params.id);
        res.json({risks});
    } catch (err) {
        debug("getOrder()", err.message);
        res.json({error: err.message});
    }
};
exports.getOrderRisk = getOrderRisk;

const getOrders = async (req, res) => {
    try {
        const {status, since_id, created_at_min, created_at_max} = req.query;
        // debug('getOrders()', {status, since_id, created_at_min, created_at_max});
        const orders = await fetchOrders({status, since_id, created_at_min, created_at_max});
        res.json({orders});
    } catch (err) {
        debug("getOrder()", err.message);
        res.json({error: err.message});
    }
};
exports.getOrders = getOrders;

const postUpdateOrderNo = async (req, res) => {
    try {
        const {id, SalesOrderNo} = req.params;
        const order = await updateFailedImport({id, SalesOrderNo});
        res.json({order});
    } catch (err) {
        debug("postUpdateOrderNo()", err.message);
        return Promise.reject(err);
    }
};
exports.postUpdateOrderNo = postUpdateOrderNo;

const getOpenPayPalInvoices = async (req, res) => {
    try {
        const orders = await loadOpenPaypalInvoices();
        res.json({orders});
    } catch (err) {
        debug("getOpenPayPalInvoices()", err.message);
        res.json({error: err.message});
    }
}
exports.getOpenPayPalInvoices = getOpenPayPalInvoices;
