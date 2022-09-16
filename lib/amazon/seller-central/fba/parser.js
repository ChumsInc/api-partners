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
const whseItem = ({ warehouseCode, itemCode }) => {
    return `${warehouseCode}:${itemCode}`;
};
async function parseSettlement(rows) {
    try {
        const glAccounts = await (0, db_handler_1.loadGLMap)();
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
            itemCodeDesc: null,
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
        // load the list of amazon fulfilled items that need to be invoiced from AMZ warehouse
        const mappedItems = await (0, db_handler_1.loadFBAItemMap)();
        const lookupItems = [];
        rows.filter(row => row.fulfillmentId === 'AFN' && (row.transactionType === 'Order' || row.transactionType === 'Refund'))
            .filter(row => !!row.sku && !mappedItems[row.sku])
            .filter(row => {
            if (!!row.sku && !lookupItems.includes(row.sku)) {
                lookupItems.push(row.sku);
            }
        });
        const unmapped = await (0, db_handler_1.loadAMZItemMap)(lookupItems);
        const itemMap = { ...mappedItems, ...unmapped };
        const order = {};
        rows.filter(row => row.fulfillmentId === 'AFN' && ['Order', 'Refund'].includes(row.transactionType || ''))
            .forEach(row => {
            if (!row.orderItemCode || !row.orderId || !row.sku) {
                return;
            }
            const { sku } = row;
            const item = itemMap[sku] || null;
            if (!order[sku]) {
                if (!!item) {
                    const orderItem = whseItem(item);
                    order[sku] = {
                        ...defaultRow,
                        sku: row.sku,
                        itemCode: item.itemCode,
                        warehouseCode: item.warehouseCode,
                        itemCodeDesc: item.itemCodeDesc,
                        key: orderItem,
                    };
                }
                else {
                    order[sku] = {
                        ...defaultRow,
                        orderId: row.orderId,
                        itemCode: sku,
                        itemCodeDesc: `Error: unable to map ${sku}`,
                        sku: sku,
                        key: row.orderItemCode
                    };
                }
            }
            if (row.amountType === 'ItemPrice' && row.amountDescription === 'Principal') {
                order[sku].quantityPurchased = order[sku].quantityPurchased
                    .add(row.transactionType === 'Refund' ? -1 : row.quantityPurchased || 0);
            }
            order[sku].extendedUnitPrice = order[sku].extendedUnitPrice.add(row.amount || 0);
            order[sku].unitPrice = order[sku].quantityPurchased.equals(0)
                ? new decimal_js_1.default(0)
                : order[sku].extendedUnitPrice.dividedBy(order[sku].quantityPurchased);
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
                    glAccount: glAccounts[key]?.glAccount || '',
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
                    glAccount: glAccounts[key]?.glAccount || '',
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
                    glAccount: glAccounts[key]?.glAccount || '',
                    salesOrderNo: ascKey,
                    amountType: row.amountType,
                    amountDescription: row.amountDescription
                };
            }
            charges[key].amount = charges[key].amount.add(row.amount || 0);
        });
        totals.charge = rows.filter(row => row.transactionType !== 'Order' && row.transactionType !== 'Refund')
            .reduce((pv, row) => pv.add(row.amount || 0), new decimal_js_1.default(0));
        totals.otherCharges = rows
            .filter(row => row.fulfillmentId !== 'AFN' && row.fulfillmentId !== 'MFN')
            .reduce((pv, row) => pv.add(row.amount || 0), new decimal_js_1.default(0));
        const lines = Object.values(order);
        // .filter(line => !(new Decimal(line.quantityPurchased).isZero() && new Decimal(line.extendedUnitPrice).isZero()));
        return { startDate, endDate, totalAmount, charges: Object.values(charges), lines, fbmOrders, totals, itemMap, glAccounts };
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
