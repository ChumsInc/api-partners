"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.parseSettlement = exports.parseTextFile = void 0;
var debug_1 = require("debug");
var camelCase = require("camelcase");
var db_handler_1 = require("./db-handler");
var date_fns_1 = require("date-fns");
var decimal_js_1 = require("decimal.js");
var debug = (0, debug_1["default"])('chums:lib:amazon:seller-central:fba:parser');
var mfnKey = 'Fulfilled by Chums';
var afnKey = 'Fulfilled by Amazon';
var ascKey = 'Settlement Charges';
function parseTextFile(content) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, header, rest, fields_1;
        return __generator(this, function (_b) {
            try {
                _a = content.trim().split('\n'), header = _a[0], rest = _a.slice(1);
                fields_1 = header.split('\t').map(function (str) { return camelCase(str.trim()); });
                return [2 /*return*/, rest.map(function (line) {
                        var row = {};
                        line.split('\t').map(function (value, index) {
                            var field = fields_1[index];
                            row[field] = value;
                            // if (field === 'amount' || field === 'quantityPurchased' || field === 'totalAmount') {
                            //     row[field] = Number(value);
                            // } else {
                            //     row[field] = value;
                            // }
                        });
                        return row;
                    })];
            }
            catch (err) {
                if (err instanceof Error) {
                    debug("parseTextFile()", err === null || err === void 0 ? void 0 : err.message);
                    return [2 /*return*/, Promise.reject(err)];
                }
                debug("parseTextFile()", err);
                return [2 /*return*/, Promise.reject(err)];
            }
            return [2 /*return*/];
        });
    });
}
exports.parseTextFile = parseTextFile;
var whseItem = function (_a) {
    var warehouseCode = _a.warehouseCode, itemCode = _a.itemCode;
    return "".concat(warehouseCode, ":").concat(itemCode);
};
function parseSettlement(rows) {
    return __awaiter(this, void 0, void 0, function () {
        var itemMap_1, glAccounts_1, header, startDate, endDate, totalAmount, totals, defaultRow_1, defaultCharge_1, order_1, charges_1, fbmPOList_1, fbmTotal, fbmOrders_1, lookupItems_1, unmapped, lines, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, (0, db_handler_1.loadFBAItemMap)()];
                case 1:
                    itemMap_1 = _a.sent();
                    return [4 /*yield*/, (0, db_handler_1.loadGLMap)()];
                case 2:
                    glAccounts_1 = _a.sent();
                    header = rows[0];
                    startDate = (0, date_fns_1.parseJSON)((header === null || header === void 0 ? void 0 : header.settlementStartDate) || '').toISOString();
                    endDate = (0, date_fns_1.parseJSON)((header === null || header === void 0 ? void 0 : header.settlementEndDate) || '').toISOString();
                    totalAmount = Number(header === null || header === void 0 ? void 0 : header.totalAmount) || 0;
                    totals = {
                        fba: new decimal_js_1["default"](0),
                        fbaRefund: new decimal_js_1["default"](0),
                        fbm: new decimal_js_1["default"](0),
                        fbmRefund: new decimal_js_1["default"](0),
                        charge: new decimal_js_1["default"](0),
                        otherCharges: new decimal_js_1["default"](0)
                    };
                    defaultRow_1 = {
                        orderId: '',
                        postedDateTime: '',
                        itemCode: '',
                        warehouseCode: '',
                        extendedUnitPrice: new decimal_js_1["default"](0),
                        quantityPurchased: new decimal_js_1["default"](0),
                        unitPrice: new decimal_js_1["default"](0)
                    };
                    defaultCharge_1 = {
                        key: '',
                        salesOrderNo: '',
                        transactionType: '',
                        amountType: '',
                        amountDescription: '',
                        glAccount: '',
                        amount: new decimal_js_1["default"](0)
                    };
                    order_1 = {};
                    charges_1 = {};
                    fbmPOList_1 = [];
                    // get a list of Chums Fulfilled orders
                    rows.filter(function (row) { return row.fulfillmentId === 'MFN' && row.transactionType === 'Order' && !!row.orderId; })
                        .forEach(function (row) {
                        if (!!row.orderId && !fbmPOList_1.includes(row.orderId)) {
                            fbmPOList_1.push(row.orderId);
                        }
                    });
                    fbmTotal = rows.filter(function (row) { return row.fulfillmentId === 'MFN' && row.transactionType === 'Order' && !!row.orderId; })
                        .filter(function (row) { return row.amountType === 'ItemPrice'; })
                        .reduce(function (pv, row) { return pv.add(row.amount || 0); }, new decimal_js_1["default"](0));
                    return [4 /*yield*/, (0, db_handler_1.loadFBMOrders)(fbmPOList_1)];
                case 3:
                    fbmOrders_1 = _a.sent();
                    lookupItems_1 = [];
                    rows.filter(function (row) { return row.fulfillmentId === 'AFN' && row.transactionType === 'Order'; })
                        .filter(function (row) { return !!row.sku && !itemMap_1[row.sku]; })
                        .filter(function (row) {
                        if (!!row.sku && !lookupItems_1.includes(row.sku)) {
                            lookupItems_1.push(row.sku);
                        }
                    });
                    return [4 /*yield*/, (0, db_handler_1.loadAMZItemMap)(lookupItems_1)];
                case 4:
                    unmapped = _a.sent();
                    itemMap_1 = __assign(__assign({}, itemMap_1), unmapped);
                    // load the list of amazon fulfilled items that need to be invoices from AMZ warehouse
                    rows.filter(function (row) { return row.fulfillmentId === 'AFN' && row.transactionType === 'Order'; })
                        .forEach(function (row) {
                        if (!row.orderItemCode || !row.orderId || !row.sku) {
                            return;
                        }
                        if (!itemMap_1[row.sku]) {
                            order_1[row.orderItemCode] = __assign(__assign({}, defaultRow_1), { orderId: row.orderId, postedDateTime: row.postedDateTime || '', itemCode: "Error: unable to map ".concat(row.sku, " (orderItemCode = ").concat(row.orderItemCode, ")"), warehouseCode: 'N/A', key: row.orderItemCode });
                            return;
                        }
                        var item = itemMap_1[row.sku];
                        if (!item.itemCode) {
                            // debug('parseSettlement() item missing?', row.sku, item);
                        }
                        var orderItem = whseItem(item);
                        if (!order_1[orderItem]) {
                            order_1[orderItem] = __assign(__assign({}, defaultRow_1), { itemCode: item.itemCode, warehouseCode: item.warehouseCode, key: orderItem });
                        }
                        if (row.amountType === 'ItemPrice' && row.amountDescription === 'Principal') {
                            order_1[orderItem].quantityPurchased = order_1[orderItem].quantityPurchased.add(row.quantityPurchased || 0);
                        }
                        order_1[orderItem].extendedUnitPrice = order_1[orderItem].extendedUnitPrice.add(row.amount || 0);
                        order_1[orderItem].unitPrice = order_1[orderItem].quantityPurchased.equals(0)
                            ? new decimal_js_1["default"](0)
                            : order_1[orderItem].extendedUnitPrice.dividedBy(order_1[orderItem].quantityPurchased);
                    });
                    // build the individual totals for FBA orders
                    rows.filter(function (row) { return row.fulfillmentId === 'AFN'; })
                        .forEach(function (row) {
                        var _a;
                        if (!row.amountType || !row.amountDescription) {
                            return;
                        }
                        var key = "".concat(row.fulfillmentId, ":").concat(row.transactionType || '', ":").concat(camelCase(row.amountType), ":").concat(camelCase(row.amountDescription));
                        if (!charges_1[key]) {
                            charges_1[key] = __assign(__assign({}, defaultCharge_1), { key: key, glAccount: ((_a = glAccounts_1[key]) === null || _a === void 0 ? void 0 : _a.glAccount) || '', salesOrderNo: afnKey, transactionType: row.transactionType || '', amountType: row.amountType, amountDescription: row.amountDescription });
                        }
                        charges_1[key].amount = charges_1[key].amount.add(row.amount || 0);
                    });
                    // get the total of FBA Orders
                    totals.fba = rows.filter(function (row) { return row.fulfillmentId === 'AFN' && row.transactionType === 'Order'; })
                        .reduce(function (pv, row) { return pv.add(row.amount || 0); }, new decimal_js_1["default"](0));
                    // total of FBA Refunds
                    totals.fbaRefund = rows.filter(function (row) { return row.fulfillmentId === 'AFN' && row.transactionType !== 'Order'; })
                        .reduce(function (pv, row) { return pv.add(row.amount || 0); }, new decimal_js_1["default"](0));
                    // build the totals for fulfilled by Chums orders;
                    // Total of ItemPrice lines should match the total imported into Sage if all is correct
                    // rest should have a GL accunt applied.
                    rows.filter(function (row) { return row.fulfillmentId === 'MFN'; })
                        .forEach(function (row) {
                        var _a;
                        if (!row.amountType || !row.amountDescription) {
                            return;
                        }
                        var key = "".concat(row.fulfillmentId, ":").concat(row.transactionType || '', ":").concat(camelCase(row.amountType), ":").concat(camelCase(row.amountDescription));
                        if (!charges_1[key]) {
                            charges_1[key] = __assign(__assign({}, defaultCharge_1), { key: key, glAccount: ((_a = glAccounts_1[key]) === null || _a === void 0 ? void 0 : _a.glAccount) || '', salesOrderNo: mfnKey, transactionType: row.transactionType || '', amountType: row.amountType, amountDescription: row.amountDescription });
                        }
                        charges_1[key].amount = charges_1[key].amount.add(row.amount || 0);
                        fbmOrders_1.filter(function (so) { return so.CustomerPONo === row.orderId; })
                            .forEach(function (so) {
                            so.settlementTotal = so.settlementTotal.add(row.amount || 0);
                        });
                    });
                    // build the total FBM --
                    totals.fbm = rows.filter(function (row) { return row.fulfillmentId === 'MFN' && row.transactionType === 'Order'; })
                        .reduce(function (pv, row) { return pv.add(row.amount || 0); }, new decimal_js_1["default"](0));
                    totals.fbmRefund = rows.filter(function (row) { return row.fulfillmentId === 'MFN' && row.transactionType !== 'Order'; })
                        .reduce(function (pv, row) { return pv.add(row.amount || 0); }, new decimal_js_1["default"](0));
                    rows.filter(function (row) { return row.transactionType !== 'Order' && row.transactionType !== 'Refund'; })
                        .forEach(function (row) {
                        var _a;
                        if (!row.amountType || !row.amountDescription) {
                            return;
                        }
                        var key = "".concat(row.fulfillmentId, ":").concat(camelCase(row.amountType), ":").concat(camelCase(row.amountDescription));
                        if (!charges_1[key]) {
                            charges_1[key] = __assign(__assign({}, defaultCharge_1), { key: key, glAccount: ((_a = glAccounts_1[key]) === null || _a === void 0 ? void 0 : _a.glAccount) || '', salesOrderNo: ascKey, amountType: row.amountType, amountDescription: row.amountDescription });
                        }
                        charges_1[key].amount = charges_1[key].amount.add(row.amount || 0);
                    });
                    totals.charge = rows.filter(function (row) { return row.transactionType !== 'Order'; })
                        .reduce(function (pv, row) { return pv.add(row.amount || 0); }, new decimal_js_1["default"](0));
                    totals.otherCharges = rows.filter(function (row) { return row.fulfillmentId !== 'AFN' && row.fulfillmentId !== 'MFN'; })
                        .reduce(function (pv, row) { return pv.add(row.amount || 0); }, new decimal_js_1["default"](0));
                    lines = Object.values(order_1);
                    return [2 /*return*/, { startDate: startDate, endDate: endDate, totalAmount: totalAmount, charges: Object.values(charges_1), lines: lines, fbmOrders: fbmOrders_1, totals: totals, itemMap: itemMap_1, glAccounts: glAccounts_1 }];
                case 5:
                    error_1 = _a.sent();
                    if (error_1 instanceof Error) {
                        console.log("parseOrder()", error_1.message);
                        return [2 /*return*/, Promise.reject(error_1)];
                    }
                    console.error("parseOrder()", error_1);
                    return [2 /*return*/, Promise.reject(new Error("Error in parseOrder(): ".concat(error_1)))];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.parseSettlement = parseSettlement;
