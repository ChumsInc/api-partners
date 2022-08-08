"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postUpload = void 0;
const debug_1 = __importDefault(require("debug"));
const csvtojson_1 = __importDefault(require("csvtojson"));
const promises_1 = require("fs/promises");
const chums_local_modules_1 = require("chums-local-modules");
const decimal_js_1 = __importDefault(require("decimal.js"));
__exportStar(require("chums-local-modules/dist/express-auth"), exports);
const columnHeaders = {
    "Period Start Date": 'periodStartDate',
    "Period End Date": 'periodEndDate',
    "Total Payable": 'totalPayable',
    "Currency": 'currency',
    "Transaction Key": 'transactionKey',
    "Transaction Posted Timestamp": 'transactionPostedTimestamp',
    "Transaction Type": 'transactionType',
    "Transaction Description": 'transactionDescription',
    "Customer Order #": 'customerOrderNo',
    "Customer Order line #": 'customerOrderLineNo',
    "Purchase Order #": 'purchaseOrderNo',
    "Purchase Order line #": 'purchaseOrderLineNo',
    "Amount": 'amount',
    "Amount Type": 'amountType',
    "Ship Qty": 'shipQty',
    "Commission Rate": 'commissionRate',
    "Transaction Reason Description": 'transactionReasonDescription',
    "Partner Item Id": 'partnerItemId',
    "Partner GTIN": 'partnerGTIN',
    "Partner Item Name": 'partnerItemName',
    "Product Tax Code": 'productTaxCode',
    "Ship to State": 'shipToState',
    "Ship to City": 'shipToCity',
    "Ship to Zipcode": 'shipToZipcode',
    "Contract Category": 'contractCategory',
    "Product Type": 'productType',
    "Commission Rule": 'commissionRule',
    "Shipping Method": 'shippingMethod',
    "Fulfillment Type": 'fulfillmentType',
};
const debug = (0, debug_1.default)('chums:lib:urban-outfitters:csv-import');
async function parseUpload(req, userId) {
    try {
        const path = await (0, chums_local_modules_1.handleUpload)(req);
        const parsed = await (0, csvtojson_1.default)({ headers: Object.values(columnHeaders), noheader: false })
            .fromFile(path.filepath);
        await (0, promises_1.unlink)(path.filepath);
        const items = {};
        let totalPayable = new decimal_js_1.default(0);
        parsed
            .filter(row => !!row.transactionType)
            .forEach(row => {
            const itemKey = row.partnerItemId;
            if (!!itemKey && !items[itemKey]) {
                items[itemKey] = {
                    amount: new decimal_js_1.default("0"),
                    shipQty: new decimal_js_1.default("0"),
                    partnerItemId: itemKey,
                    commission: new decimal_js_1.default(0),
                };
            }
            // debug('parseUpload()', row.transactionType);
            switch (row.transactionType) {
                case 'PaymentSummary':
                    totalPayable = new decimal_js_1.default(totalPayable).add(row.totalPayable || '0');
                    // debug('totalPayable()', totalPayable);
                    break;
                case 'Refund':
                    if (row.amountType === 'Product Price') {
                        items[itemKey].shipQty = new decimal_js_1.default(items[itemKey].shipQty).sub(row.shipQty || '0');
                    }
                    if (row.amountType === 'Commission on Product') {
                        items[itemKey].commission = new decimal_js_1.default(items[itemKey].commission).add(row.amount || '0');
                    }
                    else {
                        items[itemKey].amount = new decimal_js_1.default(items[itemKey].amount).add(row.amount || '0');
                    }
                    break;
                default:
                    if (row.amountType === 'Product Price') {
                        items[itemKey].shipQty = new decimal_js_1.default(items[itemKey].shipQty).add(row.shipQty || '0');
                    }
                    if (row.amountType === 'Commission on Product') {
                        items[itemKey].commission = new decimal_js_1.default(items[itemKey].commission).add(row.amount || '0');
                    }
                    else {
                        items[itemKey].amount = new decimal_js_1.default(items[itemKey].amount).add(row.amount || '0');
                    }
            }
        });
        return { items, totalPayable, parsed };
    }
    catch (err) {
        if (err instanceof Error) {
            debug("parseUpload()", err.message);
        }
        debug("parseUpload()", err);
        return Promise.reject(err);
    }
}
const postUpload = async (req, res) => {
    try {
        const data = await parseUpload(req, req.userAuth.profile.user.id);
        res.json(data);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("testUpload()", err.message);
            return res.json({ error: err.message });
        }
        return res.json({ error: err });
    }
};
exports.postUpload = postUpload;
