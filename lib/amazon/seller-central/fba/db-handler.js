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
exports.addGLAccount = exports.loadGLMap = exports.loadFBMOrders = exports.removeFBAItem = exports.addFBAItem = exports.loadFBAItemMap = exports.loadAMZItemMap = exports.logSettlementImport = void 0;
var chums_local_modules_1 = require("chums-local-modules");
var debug_1 = require("debug");
var decimal_js_1 = require("decimal.js");
var debug = (0, debug_1["default"])('chums:lib:amazon:seller-central:fba:db-handler');
/**
 *
 * @param {SettlementImportResult} result
 * @param {Number} userId
 * @return {Promise<never>}
 */
function logSettlementImport(result, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var salesOrderNo, importResult, originalFile, settlementId, sql, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    salesOrderNo = result.salesOrderNo, importResult = result.importResult, originalFile = result.originalFile, settlementId = result.settlementId;
                    sql = "INSERT INTO partners.AmazonSCFBA_Orders (AmazonSettlementID, Company, SalesOrderNo, DateCreated,\n                                                              CreatedBy, ImportResult, OriginalFile)\n                     VALUES (:settlementID, 'chums', :salesOrderNo, NOW(),\n                             :userId, :importResult, :originalFile)\n                     ON DUPLICATE KEY UPDATE ImportResult = :importResult,\n                                             UpdatedBy    = :userId,\n                                             DateUpdated  = NOW()";
                    data = { settlementId: settlementId, salesOrderNo: salesOrderNo, importResult: importResult, originalFile: originalFile, userId: userId };
                    return [4 /*yield*/, chums_local_modules_1.mysql2Pool.query(sql, data)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    if (error_1 instanceof Error) {
                        console.log("logSettlementImport()", error_1.message);
                        return [2 /*return*/, Promise.reject(error_1)];
                    }
                    console.error("logSettlementImport()", error_1);
                    return [2 /*return*/, Promise.reject(error_1)];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.logSettlementImport = logSettlementImport;
function loadAMZItemMap(items) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, rows, map_1, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    if (!items.length) {
                        return [2 /*return*/, {}];
                    }
                    debug('loadAMZItemMap()', items);
                    sql = "SELECT iw.ItemCode AS sku, iw.company, iw.ItemCode as itemCode, iw.WarehouseCode AS warehouseCode\n                     FROM c2.ci_item i\n                          INNER JOIN c2.im_itemwarehouse iw\n                                     USING (company, ItemCode)\n                     WHERE iw.company = 'chums'\n                       AND iw.WarehouseCode = 'AMZ'\n                       AND i.InactiveItem <> 'Y'\n                       AND i.ProductType <> 'D'\n                       AND i.ItemCode IN (:items)";
                    return [4 /*yield*/, chums_local_modules_1.mysql2Pool.query(sql, { items: items })];
                case 1:
                    rows = (_a.sent())[0];
                    map_1 = {};
                    rows.forEach(function (row) {
                        map_1[row.sku] = row;
                    });
                    return [2 /*return*/, map_1];
                case 2:
                    err_1 = _a.sent();
                    if (err_1 instanceof Error) {
                        debug("loadAMZItemMap()", err_1.message);
                        return [2 /*return*/, Promise.reject(err_1)];
                    }
                    debug("loadAMZItemMap()", err_1);
                    return [2 /*return*/, Promise.reject(err_1)];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.loadAMZItemMap = loadAMZItemMap;
function loadFBAItemMap() {
    return __awaiter(this, void 0, void 0, function () {
        var sql, rows, map_2, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    sql = "SELECT SellerSKU     AS sku,\n                            Company       AS company,\n                            ItemCode      AS itemCode,\n                            WarehouseCode AS warehouseCode\n                     FROM partners.AmazonSCFBA_Items";
                    return [4 /*yield*/, chums_local_modules_1.mysql2Pool.query(sql)];
                case 1:
                    rows = (_a.sent())[0];
                    map_2 = {};
                    rows.forEach(function (row) {
                        map_2[row.sku] = row;
                    });
                    return [2 /*return*/, map_2];
                case 2:
                    err_2 = _a.sent();
                    if (err_2 instanceof Error) {
                        debug('loadFBAItemMap()', err_2.message);
                        return [2 /*return*/, Promise.reject(err_2)];
                    }
                    debug("loadFBAItemMap()", err_2);
                    return [2 /*return*/, Promise.reject(err_2)];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.loadFBAItemMap = loadFBAItemMap;
/**
 *
 * @param {FBAItem} item
 * @return {Promise<FBAItemMap>}
 */
function addFBAItem(item) {
    return __awaiter(this, void 0, void 0, function () {
        var sku, company, itemCode, warehouseCode, sql, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    sku = item.sku, company = item.company, itemCode = item.itemCode, warehouseCode = item.warehouseCode;
                    sql = "INSERT INTO partners.AmazonSCFBA_Items (SellerSKU, Company, ItemCode, WarehouseCode)\n                     VALUES (:sku, :company, :itemCode, :warehouseCode)\n                     ON DUPLICATE KEY UPDATE Company       = :company,\n                                             ItemCode      = :itemCode,\n                                             WarehouseCode = :warehouseCode";
                    return [4 /*yield*/, chums_local_modules_1.mysql2Pool.query(sql, { sku: sku, company: company, itemCode: itemCode, warehouseCode: warehouseCode })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, loadFBAItemMap()];
                case 2:
                    err_3 = _a.sent();
                    if (err_3 instanceof Error) {
                        debug('addFBAItem()', err_3.message);
                        return [2 /*return*/, Promise.reject(err_3)];
                    }
                    debug("addFBAItem()", err_3);
                    return [2 /*return*/, Promise.reject(err_3)];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.addFBAItem = addFBAItem;
function removeFBAItem(sku) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    sql = "DELETE FROM partners.AmazonSCFBA_Items WHERE SellerSKU = :sku";
                    return [4 /*yield*/, chums_local_modules_1.mysql2Pool.query(sql, { sku: sku })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, loadFBAItemMap()];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    err_4 = _a.sent();
                    if (err_4 instanceof Error) {
                        debug('removeFBAItem()', err_4.message);
                        return [2 /*return*/, Promise.reject(err_4)];
                    }
                    debug("deleteFBAItem()", err_4);
                    return [2 /*return*/, Promise.reject(err_4)];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.removeFBAItem = removeFBAItem;
function loadFBMOrders(poList) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, rows, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    if (poList.length === 0) {
                        return [2 /*return*/, []];
                    }
                    sql = "SELECT oh.SalesOrderNo,\n                            oh.CustomerPONo,\n                            oh.OrderDate,\n                            oh.TaxableAmt + oh.NonTaxableAmt - oh.DiscountAmt                 AS OrderTotal,\n                            GROUP_CONCAT(ih.InvoiceNo ORDER BY ih.InvoiceNo SEPARATOR ', ')   AS InvoiceNo,\n                            GROUP_CONCAT(ih.InvoiceDate ORDER BY ih.InvoiceNo SEPARATOR ', ') AS InvoiceDate,\n                            0                                                                 AS settlementTotal\n                     FROM c2.SO_SalesOrderHistoryHeader oh\n                          LEFT JOIN c2.ar_invoicehistoryheader ih\n                                    USING (Company, SalesOrderNo)\n                     WHERE oh.Company = 'chums'\n                       AND oh.CustomerPONo IN (:poList)\n                     GROUP BY oh.SalesOrderNo, oh.CustomerPONo, oh.OrderDate,\n                              oh.TaxableAmt + oh.NonTaxableAmt - oh.DiscountAmt";
                    return [4 /*yield*/, chums_local_modules_1.mysql2Pool.query(sql, { poList: poList })];
                case 1:
                    rows = (_a.sent())[0];
                    rows.forEach(function (row) {
                        row.OrderTotal = new decimal_js_1["default"](row.OrderTotal);
                        row.settlementTotal = new decimal_js_1["default"](row.settlementTotal);
                    });
                    return [2 /*return*/, rows];
                case 2:
                    error_2 = _a.sent();
                    if (error_2 instanceof Error) {
                        debug("loadFBMOrders()", error_2.message);
                        return [2 /*return*/, Promise.reject(error_2)];
                    }
                    debug("loadFBMOrders()", error_2);
                    return [2 /*return*/, Promise.reject(error_2)];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.loadFBMOrders = loadFBMOrders;
function loadGLMap() {
    return __awaiter(this, void 0, void 0, function () {
        var sql, rows, accounts_1, err_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    sql = "SELECT m.keyValue, m.glAccount, gl.AccountDesc\n                     FROM partners.AmazonSCFBA_GLMap m\n                     LEFT JOIN c2.gl_account gl on gl.Account = m.glAccount and gl.Company = 'chums'";
                    return [4 /*yield*/, chums_local_modules_1.mysql2Pool.query(sql)];
                case 1:
                    rows = (_a.sent())[0];
                    accounts_1 = {};
                    rows.forEach(function (row) {
                        accounts_1[row.keyValue] = row;
                    });
                    return [2 /*return*/, accounts_1];
                case 2:
                    err_5 = _a.sent();
                    if (err_5 instanceof Error) {
                        debug("loadGLMap()", err_5.message);
                        return [2 /*return*/, Promise.reject(err_5)];
                    }
                    debug("loadGLMap()", err_5);
                    return [2 /*return*/, Promise.reject(err_5)];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.loadGLMap = loadGLMap;
function addGLAccount(gl) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, err_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    sql = "INSERT IGNORE INTO partners.AmazonSCFBA_GLMap (keyValue, glAccount)\n                     VALUES (:keyValue, :glAccount)\n                     ON DUPLICATE KEY UPDATE glAccount = :glAccount";
                    return [4 /*yield*/, chums_local_modules_1.mysql2Pool.query(sql, gl)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, loadGLMap()];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    err_6 = _a.sent();
                    if (err_6 instanceof Error) {
                        debug("addGLAccount()", err_6.message);
                        return [2 /*return*/, Promise.reject(err_6)];
                    }
                    debug("addGLAccount()", err_6);
                    return [2 /*return*/, Promise.reject(err_6)];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.addGLAccount = addGLAccount;
