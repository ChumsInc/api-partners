"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSettlement = exports.parseTextFile = void 0;
const debug_1 = __importDefault(require("debug"));
const camelcase_1 = __importDefault(require("camelcase"));
const db_handler_1 = require("./db-handler");
const debug = (0, debug_1.default)('chums:lib:amazon:seller-central:fba:parser');
function parseTextFile(content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [header, ...rest] = content.trim().split('\n');
            const fields = header.split('\t').map(str => (0, camelcase_1.default)(str.trim()));
            return rest.map(line => {
                const row = {};
                line.split('\t').map((value, index) => {
                    const field = fields[index];
                    if (field === 'amount' || field === 'quantityPurchased' || field === 'totalAmount') {
                        row[field] = Number(value);
                    }
                    else {
                        row[field] = value;
                    }
                });
                return row;
            });
        }
        catch (err) {
            if (err instanceof Error) {
                debug("parseTextFile()", err === null || err === void 0 ? void 0 : err.message);
                return Promise.reject(err);
            }
            debug("parseTextFile()", err);
            return Promise.reject(err);
        }
    });
}
exports.parseTextFile = parseTextFile;
function parseSettlement(rows) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const itemMap = yield (0, db_handler_1.loadFBAItemMap)();
            const [header] = rows;
            const startDate = (header === null || header === void 0 ? void 0 : header.settlementStartDate) || 'N/A';
            const endDate = (header === null || header === void 0 ? void 0 : header.settlementEndDate) || 'N/A';
            const totalAmount = Number(header === null || header === void 0 ? void 0 : header.totalAmount) || 0;
            const defaultRow = {
                orderId: '',
                postedDateTime: '',
                itemCode: '',
                warehouseCode: '',
                extendedUnitPrice: 0,
                quantityPurchased: 0,
                unitPrice: 0,
            };
            const defaultCharge = {
                salesOrderNo: '',
                amountType: '',
                amountDescription: '',
                amount: 0,
            };
            const order = {};
            const charges = {};
            const fbmPOList = [];
            rows.filter(row => row.fulfillmentId === 'MFN' && !!row.orderId)
                .forEach(row => {
                if (!!row.orderId && !fbmPOList.includes(row.orderId)) {
                    fbmPOList.push(row.orderId);
                }
            });
            const fbmTotal = rows.filter(row => row.fulfillmentId === 'MFN' && !!row.orderId)
                .filter(row => row.amountType === 'ItemPrice')
                .reduce((pv, row) => pv + (row.amount || 0), 0);
            const fbmOrders = yield (0, db_handler_1.loadFBMOrders)(fbmPOList);
            rows.filter(row => row.fulfillmentId === 'AFN')
                .forEach(row => {
                if (!row.orderItemCode || !row.orderId || !row.sku) {
                    return;
                }
                if (!itemMap[row.sku]) {
                    return Promise.reject(new Error(`Unable to map item ${row.sku}`));
                }
                const item = itemMap[row.sku];
                if (!order[row.orderItemCode]) {
                    order[row.orderItemCode] = Object.assign(Object.assign({}, defaultRow), { orderId: row.orderId, postedDateTime: row.postedDateTime || '', itemCode: item.itemCode, warehouseCode: item.warehouseCode });
                }
                if (row.amountType === 'ItemPrice' && row.amountDescription === 'Principal') {
                    order[row.orderItemCode].quantityPurchased = row.quantityPurchased || 0;
                }
                order[row.orderItemCode].extendedUnitPrice = Number((order[row.orderItemCode].extendedUnitPrice + (row.amount || 0)).toFixed(2));
                order[row.orderItemCode].unitPrice = order[row.orderItemCode].quantityPurchased === 0
                    ? 0
                    : Number((order[row.orderItemCode].extendedUnitPrice / order[row.orderItemCode].quantityPurchased).toFixed(4));
            });
            rows.filter(row => (row.merchantOrderId === '' || row.fulfillmentId === 'MFN') && row.orderId !== '')
                .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `Fulfilled by Chums:${row.amountType}:${row.amountDescription}`;
                if (!charges[key]) {
                    charges[key] = Object.assign(Object.assign({}, defaultCharge), { salesOrderNo: 'Fulfilled by Chums', amountType: row.amountType, amountDescription: row.amountDescription });
                }
                charges[key].amount += Number(row.amount);
            });
            rows.filter(row => row.fulfillmentId === 'AFN')
                .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `Fulfilled by Amazon:${row.amountType}:${row.amountDescription}`;
                if (!charges[key]) {
                    charges[key] = Object.assign(Object.assign({}, defaultCharge), { salesOrderNo: 'Fulfilled by Amazon', amountType: row.amountType, amountDescription: row.amountDescription });
                }
                charges[key].amount += Number(row.amount);
            });
            rows.filter(row => row.fulfillmentId === '' && row.orderId === '')
                .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `${row.orderId || 'Settlement Total'}:${row.amountType}:${row.amountDescription}`;
                if (!charges[key]) {
                    charges[key] = Object.assign(Object.assign({}, defaultCharge), { salesOrderNo: row.orderId || 'Settlement Total', amountType: row.amountType, amountDescription: row.amountDescription });
                }
                charges[key].amount += Number(row.amount);
            });
            const lines = Object.values(order);
            return { startDate, endDate, totalAmount, charges: Object.values(charges), lines, fbmOrders };
        }
        catch (error) {
            if (error instanceof Error) {
                console.log("parseOrder()", error.message);
                return Promise.reject(error);
            }
            console.error("parseOrder()", error);
            return Promise.reject(new Error(`Error in parseOrder(): ${error}`));
        }
    });
}
exports.parseSettlement = parseSettlement;
