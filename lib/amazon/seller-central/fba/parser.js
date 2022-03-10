"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSettlement = exports.parseTextFile = void 0;
const debug_1 = __importDefault(require("debug"));
const camelcase_1 = __importDefault(require("camelcase"));
const db_handler_1 = require("./db-handler");
const date_fns_1 = require("date-fns");
const decimal_js_1 = __importDefault(require("decimal.js"));
const debug = (0, debug_1.default)('chums:lib:amazon:seller-central:fba:parser');
const mfnKey = 'Fulfilled by Chums';
const afnKey = 'Fulfilled by Amazon';
const ascKey = 'Settlement Charges';
const GLAccounts = {
    "AFN:Order:itemPrice:principal": 'FBA-Items',
    "AFN:Order:itemFees:fbaPerUnitFulfillmentFee": 'FBA-Items',
    "AFN:Order:itemFees:commission": 'FBA-Items',
    'AFN:Order:itemPrice:tax': 'fba-offset',
    'AFN:Order:itemWithheldTax:marketplaceFacilitatorTaxShipping': 'fba-offset',
    'AFN:Order:itemWithheldTax:marketplaceFacilitatorTaxPrincipal': 'fba-offset',
    'AFN:Order:itemPrice:shipping': 'fba-offset',
    'AFN:Order:promotion:shipping': 'fba-offset',
    'AFN:Order:itemPrice:shippingTax': 'fba-offset',
    'AFN:Order:itemFees:shippingChargeback': 'fba-offset',
    'AFN:Refund:itemPrice:shippingTax': 'fba-refund-offset',
    'AFN:Refund:itemPrice:shipping': 'fba-refund-offset',
    'AFN:Refund:itemWithheldTax:marketplaceFacilitatorTaxShipping': 'fba-refund-offset',
    'AFN:Refund:itemFees:shippingChargeback': 'fba-refund-offset',
    'AFN:Refund:promotion:shipping': 'fba-refund-offset',
    "MFN:Order:itemPrice:principal": 'FBC-Orders',
    'MFN:Order:itemFees:commission': '6500-02-08',
    'MFN:Refund:itemPrice:tax': '4315-02-08',
    'MFN:Refund:itemPrice:principal': '4315-02-08',
    'MFN:Refund:itemWithheldTax:marketplaceFacilitatorTaxPrincipal': '4315-02-08',
    'MFN:Refund:itemFees:commission': '4315-02-08',
    'MFN:Refund:itemFees:refundCommission': '4315-02-08',
    'AFN:Refund:itemPrice:tax': '4315-02-08',
    'AFN:Refund:itemPrice:principal': '4315-02-08',
    'AFN:Refund:itemWithheldTax:marketplaceFacilitatorTaxPrincipal': '4315-02-08',
    'AFN:Refund:itemFees:commission': '4315-02-08',
    'AFN:Refund:itemFees:refundCommission': '4315-02-08',
    ':otherTransaction:subscriptionFee': '6500-02-08',
    ':otherTransaction:shippingLabelPurchase': '6500-02-08',
    ':otherTransaction:fbaInboundTransportationFee': '6500-02-08',
    ':otherTransaction:storageFee': '6500-02-08',
    ':costOfAdvertising:transactionTotalAmount': '6600-02-08',
    ':otherTransaction:currentReserveAmount': '1975-00-00',
    ':otherTransaction:previousReserveAmountBalance': '1975-00-00',
    ":otherTransaction:shippingLabelPurchaseForReturn": '6500-02-08',
};
async function parseTextFile(content) {
    try {
        const [header, ...rest] = content.trim().split('\n');
        const fields = header.split('\t').map(str => (0, camelcase_1.default)(str.trim()));
        return rest.map(line => {
            const row = {};
            line.split('\t').map((value, index) => {
                const field = fields[index];
                row[field] = value;
                // if (field === 'amount' || field === 'quantityPurchased' || field === 'totalAmount') {
                //     row[field] = Number(value);
                // } else {
                //     row[field] = value;
                // }
            });
            return row;
        });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("parseTextFile()", err?.message);
            return Promise.reject(err);
        }
        debug("parseTextFile()", err);
        return Promise.reject(err);
    }
}
exports.parseTextFile = parseTextFile;
const whseItem = ({ itemCode, warehouseCode }) => {
    return `${warehouseCode}:${itemCode}`;
};
async function parseSettlement(rows) {
    try {
        const itemMap = await (0, db_handler_1.loadFBAItemMap)();
        const [header] = rows;
        const startDate = (0, date_fns_1.parseJSON)(header?.settlementStartDate || '').toISOString();
        const endDate = (0, date_fns_1.parseJSON)(header?.settlementEndDate || '').toISOString();
        const totalAmount = Number(header?.totalAmount) || 0;
        const totals = {
            fba: new decimal_js_1.default(0),
            fbaRefund: new decimal_js_1.default(0),
            fbm: new decimal_js_1.default(0),
            fbmRefund: new decimal_js_1.default(0),
            charge: new decimal_js_1.default(0),
            otherCharges: new decimal_js_1.default(0),
        };
        const defaultRow = {
            orderId: '',
            postedDateTime: '',
            itemCode: '',
            warehouseCode: '',
            extendedUnitPrice: new decimal_js_1.default(0),
            quantityPurchased: new decimal_js_1.default(0),
            unitPrice: new decimal_js_1.default(0),
        };
        const defaultCharge = {
            key: '',
            salesOrderNo: '',
            transactionType: '',
            amountType: '',
            amountDescription: '',
            glAccount: '',
            amount: new decimal_js_1.default(0),
        };
        const order = {};
        const charges = {};
        const fbmPOList = [];
        // get a list of Chums Fulfilled orders
        rows.filter(row => row.fulfillmentId === 'MFN' && row.transactionType === 'Order' && !!row.orderId)
            .forEach(row => {
            if (!!row.orderId && !fbmPOList.includes(row.orderId)) {
                fbmPOList.push(row.orderId);
            }
        });
        // get Settlement order total for fulfilled by Chums
        const fbmTotal = rows.filter(row => row.fulfillmentId === 'MFN' && row.transactionType === 'Order' && !!row.orderId)
            .filter(row => row.amountType === 'ItemPrice')
            .reduce((pv, row) => pv.add(row.amount || 0), new decimal_js_1.default(0));
        // load the list of orders
        const fbmOrders = await (0, db_handler_1.loadFBMOrders)(fbmPOList);
        // load the list of amazon fulfilled items that need to be invoices from AMZ warehouse
        rows.filter(row => row.fulfillmentId === 'AFN' && row.transactionType === 'Order')
            .forEach(row => {
            if (!row.orderItemCode || !row.orderId || !row.sku) {
                return;
            }
            if (!itemMap[row.sku]) {
                order[row.orderItemCode] = {
                    ...defaultRow,
                    orderId: row.orderId,
                    postedDateTime: row.postedDateTime || '',
                    itemCode: `Error: unable to map ${row.sku}`,
                    warehouseCode: 'N/A',
                };
                return;
            }
            const item = itemMap[row.sku];
            const orderItem = whseItem(itemMap[row.sku]);
            if (!order[orderItem]) {
                order[orderItem] = {
                    ...defaultRow,
                    itemCode: item.itemCode,
                    warehouseCode: item.warehouseCode
                };
            }
            if (row.amountType === 'ItemPrice' && row.amountDescription === 'Principal') {
                order[orderItem].quantityPurchased = order[orderItem].quantityPurchased.add(row.quantityPurchased || 0);
            }
            order[orderItem].extendedUnitPrice = order[orderItem].extendedUnitPrice.add(row.amount || 0);
            order[orderItem].unitPrice = order[orderItem].quantityPurchased.equals(0)
                ? new decimal_js_1.default(0)
                : order[orderItem].extendedUnitPrice.dividedBy(order[orderItem].quantityPurchased);
        });
        // build the individual totals for FBA orders
        rows.filter(row => row.fulfillmentId === 'AFN')
            .forEach(row => {
            if (!row.amountType || !row.amountDescription) {
                return;
            }
            const key = `${row.fulfillmentId}:${row.transactionType || ''}:${(0, camelcase_1.default)(row.amountType)}:${(0, camelcase_1.default)(row.amountDescription)}`;
            if (!charges[key]) {
                charges[key] = {
                    ...defaultCharge,
                    key,
                    glAccount: GLAccounts[key] || '',
                    salesOrderNo: afnKey,
                    transactionType: row.transactionType || '',
                    amountType: row.amountType,
                    amountDescription: row.amountDescription
                };
            }
            charges[key].amount = charges[key].amount.add(row.amount || 0);
        });
        // get the total of FBA Orders
        totals.fba = rows.filter(row => row.fulfillmentId === 'AFN' && row.transactionType === 'Order')
            .reduce((pv, row) => pv.add(row.amount || 0), new decimal_js_1.default(0));
        // total of FBA Refunds
        totals.fbaRefund = rows.filter(row => row.fulfillmentId === 'AFN' && row.transactionType !== 'Order')
            .reduce((pv, row) => pv.add(row.amount || 0), new decimal_js_1.default(0));
        // build the totals for fulfilled by Chums orders;
        // Total of ItemPrice lines should match the total imported into Sage if all is correct
        // rest should have a GL accunt applied.
        rows.filter(row => row.fulfillmentId === 'MFN')
            .forEach(row => {
            if (!row.amountType || !row.amountDescription) {
                return;
            }
            const key = `${row.fulfillmentId}:${row.transactionType || ''}:${(0, camelcase_1.default)(row.amountType)}:${(0, camelcase_1.default)(row.amountDescription)}`;
            if (!charges[key]) {
                charges[key] = {
                    ...defaultCharge,
                    key,
                    glAccount: GLAccounts[key] || '',
                    salesOrderNo: mfnKey,
                    transactionType: row.transactionType || '',
                    amountType: row.amountType,
                    amountDescription: row.amountDescription
                };
            }
            charges[key].amount = charges[key].amount.add(row.amount || 0);
            fbmOrders.filter(so => so.CustomerPONo === row.orderId)
                .forEach(so => {
                so.settlementTotal = so.settlementTotal.add(row.amount || 0);
            });
        });
        // build the total FBM --
        totals.fbm = rows.filter(row => row.fulfillmentId === 'MFN' && row.transactionType === 'Order')
            .reduce((pv, row) => pv.add(row.amount || 0), new decimal_js_1.default(0));
        totals.fbmRefund = rows.filter(row => row.fulfillmentId === 'MFN' && row.transactionType !== 'Order')
            .reduce((pv, row) => pv.add(row.amount || 0), new decimal_js_1.default(0));
        rows.filter(row => row.transactionType !== 'Order' && row.transactionType !== 'Refund')
            .forEach(row => {
            if (!row.amountType || !row.amountDescription) {
                return;
            }
            const key = `${row.fulfillmentId}:${(0, camelcase_1.default)(row.amountType)}:${(0, camelcase_1.default)(row.amountDescription)}`;
            if (!charges[key]) {
                charges[key] = {
                    ...defaultCharge,
                    key,
                    glAccount: GLAccounts[key] || '',
                    salesOrderNo: ascKey,
                    amountType: row.amountType,
                    amountDescription: row.amountDescription
                };
            }
            charges[key].amount = charges[key].amount.add(row.amount || 0);
        });
        totals.charge = rows.filter(row => row.transactionType !== 'Order')
            .reduce((pv, row) => pv.add(row.amount || 0), new decimal_js_1.default(0));
        totals.otherCharges = rows.filter(row => row.fulfillmentId !== 'AFN' && row.fulfillmentId !== 'MFN')
            .reduce((pv, row) => pv.add(row.amount || 0), new decimal_js_1.default(0));
        const lines = Object.values(order);
        return { startDate, endDate, totalAmount, charges: Object.values(charges), lines, fbmOrders, totals };
    }
    catch (error) {
        if (error instanceof Error) {
            console.log("parseOrder()", error.message);
            return Promise.reject(error);
        }
        console.error("parseOrder()", error);
        return Promise.reject(new Error(`Error in parseOrder(): ${error}`));
    }
}
exports.parseSettlement = parseSettlement;
