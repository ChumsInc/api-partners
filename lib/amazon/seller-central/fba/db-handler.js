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
exports.loadFBMOrders = exports.removeFBAItem = exports.addFBAItem = exports.loadFBAItemMap = exports.logSettlementImport = void 0;
const chums_local_modules_1 = require("chums-local-modules");
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('chums:lib:amazon:seller-central:fba:db-handler');
/**
 *
 * @param {SettlementImportResult} result
 * @param {Number} userId
 * @return {Promise<never>}
 */
function logSettlementImport(result, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { salesOrderNo, importResult, originalFile, settlementId } = result;
            const sql = `INSERT INTO partners.AmazonSCFBA_Orders (AmazonSettlementID, Company, SalesOrderNo, DateCreated,
                                                              CreatedBy, ImportResult, OriginalFile)
                     VALUES (:settlementID, 'chums', :salesOrderNo, NOW(),
                             :userId, :importResult, :originalFile)
                     ON DUPLICATE KEY UPDATE ImportResult = :importResult,
                                             UpdatedBy    = :userId,
                                             DateUpdated  = NOW()`;
            const data = { settlementId, salesOrderNo, importResult, originalFile, userId };
            yield chums_local_modules_1.mysql2Pool.query(sql, data);
        }
        catch (error) {
            if (error instanceof Error) {
                console.log("logSettlementImport()", error.message);
                return Promise.reject(error);
            }
            console.error("logSettlementImport()", error);
            return Promise.reject(error);
        }
    });
}
exports.logSettlementImport = logSettlementImport;
function loadFBAItemMap() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const sql = `SELECT SellerSKU     AS sku,
                            Company       AS company,
                            ItemCode      AS itemCode,
                            WarehouseCode AS warehouseCode
                     FROM partners.AmazonSCFBA_Items`;
            const [rows] = yield chums_local_modules_1.mysql2Pool.query(sql);
            const map = {};
            rows.forEach(row => {
                const { sku, company, itemCode, warehouseCode } = row;
                map[sku] = { sku, company, itemCode, warehouseCode };
            });
            return map;
        }
        catch (err) {
            if (err instanceof Error) {
                debug('loadFBAItemMap()', err.message);
                return Promise.reject(err);
            }
            debug("loadFBAItemMap()", err);
            return Promise.reject(err);
        }
    });
}
exports.loadFBAItemMap = loadFBAItemMap;
/**
 *
 * @param {FBAItem} item
 * @return {Promise<FBAItemMap>}
 */
function addFBAItem(item) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { sku, company, itemCode, warehouseCode } = item;
            const sql = `INSERT INTO partners.AmazonSCFBA_Items (SellerSKU, Company, ItemCode, WarehouseCode)
                     VALUES (:sku, :company, :itemCode, :warehouseCode)
                     ON DUPLICATE KEY UPDATE Company       = :company,
                                             ItemCode      = :itemCode,
                                             WarehouseCode = :warehouseCode`;
            yield chums_local_modules_1.mysql2Pool.query(sql, { sku, company, itemCode, warehouseCode });
            return loadFBAItemMap();
        }
        catch (err) {
            if (err instanceof Error) {
                debug('addFBAItem()', err.message);
                return Promise.reject(err);
            }
            debug("addFBAItem()", err);
            return Promise.reject(err);
        }
    });
}
exports.addFBAItem = addFBAItem;
function removeFBAItem(sku) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const sql = `DELETE FROM partners.AmazonSCFBA_Items WHERE SellerSKU = :sku`;
            yield chums_local_modules_1.mysql2Pool.query(sql, { sku });
            return yield loadFBAItemMap();
        }
        catch (err) {
            if (err instanceof Error) {
                debug('removeFBAItem()', err.message);
                return Promise.reject(err);
            }
            debug("deleteFBAItem()", err);
            return Promise.reject(err);
        }
    });
}
exports.removeFBAItem = removeFBAItem;
function loadFBMOrders(poList) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (poList.length === 0) {
                return [];
            }
            const sql = `SELECT oh.SalesOrderNo,
                            oh.CustomerPONo,
                            oh.OrderDate,
                            oh.TaxableAmt + oh.NonTaxableAmt - oh.DiscountAmt                 AS OrderTotal,
                            GROUP_CONCAT(ih.InvoiceNo ORDER BY ih.InvoiceNo SEPARATOR ', ')   AS InvoiceNo,
                            GROUP_CONCAT(ih.InvoiceDate ORDER BY ih.InvoiceNo SEPARATOR ', ') AS InvoiceDate,
                            0                                                                 AS settlementTotal
                     FROM c2.SO_SalesOrderHistoryHeader oh
                          LEFT JOIN c2.ar_invoicehistoryheader ih
                                    USING (Company, SalesOrderNo)
                     WHERE oh.Company = 'chums'
                       AND oh.CustomerPONo IN (:poList)
                     GROUP BY oh.SalesOrderNo, oh.CustomerPONo, oh.OrderDate,
                              oh.TaxableAmt + oh.NonTaxableAmt - oh.DiscountAmt`;
            const [rows] = yield chums_local_modules_1.mysql2Pool.query(sql, { poList });
            rows.forEach(row => {
                row.OrderTotal = Number(row.OrderTotal);
            });
            return rows;
        }
        catch (error) {
            if (error instanceof Error) {
                console.log("loadFBMOrders()", error.message);
                return Promise.reject(error);
            }
            console.error("loadFBMOrders()", error);
            return Promise.reject(error);
        }
    });
}
exports.loadFBMOrders = loadFBMOrders;
