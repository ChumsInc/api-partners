"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addGLAccount = exports.loadGLMap = exports.loadFBMOrders = exports.removeFBAItem = exports.addFBAItem = exports.loadFBAItemMap = exports.loadAMZItemMap = exports.logSettlementImport = void 0;
const chums_local_modules_1 = require("chums-local-modules");
const debug_1 = __importDefault(require("debug"));
const decimal_js_1 = __importDefault(require("decimal.js"));
const debug = (0, debug_1.default)('chums:lib:amazon:seller-central:fba:db-handler');
/**
 *
 * @param {SettlementImportResult} result
 * @param {Number} userId
 * @return {Promise<never>}
 */
async function logSettlementImport(result, userId) {
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
        await chums_local_modules_1.mysql2Pool.query(sql, data);
    }
    catch (error) {
        if (error instanceof Error) {
            console.log("logSettlementImport()", error.message);
            return Promise.reject(error);
        }
        console.error("logSettlementImport()", error);
        return Promise.reject(error);
    }
}
exports.logSettlementImport = logSettlementImport;
async function loadAMZItemMap(items) {
    try {
        if (!items.length) {
            return {};
        }
        debug('loadAMZItemMap()', items);
        const sql = `SELECT iw.ItemCode AS sku, iw.company, iw.ItemCode as itemCode, iw.WarehouseCode AS warehouseCode
                     FROM c2.ci_item i
                          INNER JOIN c2.im_itemwarehouse iw
                                     USING (company, ItemCode)
                     WHERE iw.company = 'chums'
                       AND iw.WarehouseCode = 'AMZ'
                       AND i.InactiveItem <> 'Y'
                       AND i.ProductType <> 'D'
                       AND i.ItemCode IN (:items)`;
        const [rows] = await chums_local_modules_1.mysql2Pool.query(sql, { items });
        const map = {};
        rows.forEach(row => {
            map[row.sku] = row;
        });
        return map;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("loadAMZItemMap()", err.message);
            return Promise.reject(err);
        }
        debug("loadAMZItemMap()", err);
        return Promise.reject(err);
    }
}
exports.loadAMZItemMap = loadAMZItemMap;
async function loadFBAItemMap() {
    try {
        const sql = `SELECT SellerSKU     AS sku,
                            Company       AS company,
                            ItemCode      AS itemCode,
                            WarehouseCode AS warehouseCode
                     FROM partners.AmazonSCFBA_Items`;
        const [rows] = await chums_local_modules_1.mysql2Pool.query(sql);
        const map = {};
        rows.forEach(row => {
            map[row.sku] = row;
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
}
exports.loadFBAItemMap = loadFBAItemMap;
/**
 *
 * @param {FBAItem} item
 * @return {Promise<FBAItemMap>}
 */
async function addFBAItem(item) {
    try {
        const { sku, company, itemCode, warehouseCode } = item;
        const sql = `INSERT INTO partners.AmazonSCFBA_Items (SellerSKU, Company, ItemCode, WarehouseCode)
                     VALUES (:sku, :company, :itemCode, :warehouseCode)
                     ON DUPLICATE KEY UPDATE Company       = :company,
                                             ItemCode      = :itemCode,
                                             WarehouseCode = :warehouseCode`;
        await chums_local_modules_1.mysql2Pool.query(sql, { sku, company, itemCode, warehouseCode });
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
}
exports.addFBAItem = addFBAItem;
async function removeFBAItem(sku) {
    try {
        const sql = `DELETE FROM partners.AmazonSCFBA_Items WHERE SellerSKU = :sku`;
        await chums_local_modules_1.mysql2Pool.query(sql, { sku });
        return await loadFBAItemMap();
    }
    catch (err) {
        if (err instanceof Error) {
            debug('removeFBAItem()', err.message);
            return Promise.reject(err);
        }
        debug("deleteFBAItem()", err);
        return Promise.reject(err);
    }
}
exports.removeFBAItem = removeFBAItem;
async function loadFBMOrders(poList) {
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
        const [rows] = await chums_local_modules_1.mysql2Pool.query(sql, { poList });
        rows.forEach(row => {
            row.OrderTotal = new decimal_js_1.default(row.OrderTotal);
            row.settlementTotal = new decimal_js_1.default(row.settlementTotal);
        });
        return rows;
    }
    catch (error) {
        if (error instanceof Error) {
            debug("loadFBMOrders()", error.message);
            return Promise.reject(error);
        }
        debug("loadFBMOrders()", error);
        return Promise.reject(error);
    }
}
exports.loadFBMOrders = loadFBMOrders;
async function loadGLMap() {
    try {
        const sql = `SELECT m.keyValue, m.glAccount, gl.AccountDesc
                     FROM partners.AmazonSCFBA_GLMap m
                     LEFT JOIN c2.gl_account gl on gl.Account = m.glAccount and gl.Company = 'chums'`;
        const [rows] = await chums_local_modules_1.mysql2Pool.query(sql);
        const accounts = {};
        rows.forEach(row => {
            accounts[row.keyValue] = row;
        });
        return accounts;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("loadGLMap()", err.message);
            return Promise.reject(err);
        }
        debug("loadGLMap()", err);
        return Promise.reject(err);
    }
}
exports.loadGLMap = loadGLMap;
async function addGLAccount(gl) {
    try {
        const sql = `INSERT IGNORE INTO partners.AmazonSCFBA_GLMap (keyValue, glAccount)
                     VALUES (:keyValue, :glAccount)
                     ON DUPLICATE KEY UPDATE glAccount = :glAccount`;
        await chums_local_modules_1.mysql2Pool.query(sql, gl);
        return await loadGLMap();
    }
    catch (err) {
        if (err instanceof Error) {
            debug("addGLAccount()", err.message);
            return Promise.reject(err);
        }
        debug("addGLAccount()", err);
        return Promise.reject(err);
    }
}
exports.addGLAccount = addGLAccount;
