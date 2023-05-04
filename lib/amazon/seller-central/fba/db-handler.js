import { mysql2Pool } from 'chums-local-modules';
import Debug from 'debug';
import Decimal from "decimal.js";
const debug = Debug('chums:lib:amazon:seller-central:fba:db-handler');
/**
 *
 * @param {SettlementImportResult} result
 * @param {Number} userId
 * @return {Promise<never>}
 */
export async function logSettlementImport(result, userId) {
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
        await mysql2Pool.query(sql, data);
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
/**
 * Loads items set up in the AMZ Warehouse for a list of items codes.
 * @param {string[]} items
 * @return {Promise<FBAItemMap>}
 */
export async function loadAMZItemMap(items) {
    try {
        if (!items.length) {
            return {};
        }
        // debug('loadAMZItemMap()', items);
        const sql = `SELECT iw.ItemCode      AS sku,
                            iw.company,
                            iw.ItemCode      AS itemCode,
                            iw.WarehouseCode AS warehouseCode,
                            i.ItemCodeDesc as itemCodeDesc,
                            (i.InactiveItem <> 'Y' AND i.ProductType <> 'D') as active
                     FROM c2.ci_item i
                          INNER JOIN c2.im_itemwarehouse iw
                                     USING (company, ItemCode)
                     WHERE iw.company = 'chums'
                       AND iw.WarehouseCode = 'AMZ'
                       AND i.InactiveItem <> 'Y'
                       AND i.ProductType <> 'D'
                       AND i.ItemCode IN (:items)`;
        const [rows] = await mysql2Pool.query(sql, { items });
        const map = {};
        rows.forEach(row => {
            map[row.sku] = { ...row, active: !!row.active };
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
/**
 * Loads a list of already mapped items saved
 * @return {Promise<FBAItemMap>}
 */
export async function loadFBAItemMap() {
    try {
        const sql = `SELECT SellerSKU     AS sku,
                            Company       AS company,
                            ItemCode      AS itemCode,
                            WarehouseCode AS warehouseCode,
                            i.ItemCodeDesc as itemCodeDesc,
                            (i.InactiveItem <> 'Y' AND i.ProductType <> 'D') as active
                     FROM partners.AmazonSCFBA_Items im 
                     LEFT JOIN c2.ci_item i using (Company, ItemCode)`;
        const [rows] = await mysql2Pool.query(sql);
        const map = {};
        rows.forEach(row => {
            map[row.sku] = { ...row, active: !!row.active };
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
/**
 *
 * @param {FBAItem} item
 * @return {Promise<FBAItemMap>}
 */
export async function addFBAItem(item) {
    try {
        const { sku, company, itemCode, warehouseCode } = item;
        const sql = `INSERT INTO partners.AmazonSCFBA_Items (SellerSKU, Company, ItemCode, WarehouseCode)
                     VALUES (:sku, :company, :itemCode, :warehouseCode)
                     ON DUPLICATE KEY UPDATE Company       = :company,
                                             ItemCode      = :itemCode,
                                             WarehouseCode = :warehouseCode`;
        await mysql2Pool.query(sql, { sku, company, itemCode, warehouseCode });
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
export async function removeFBAItem(sku) {
    try {
        const sql = `DELETE FROM partners.AmazonSCFBA_Items WHERE SellerSKU = :sku`;
        await mysql2Pool.query(sql, { sku });
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
export async function loadFBMOrders(poList) {
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
        const [rows] = await mysql2Pool.query(sql, { poList });
        rows.forEach(row => {
            row.OrderTotal = new Decimal(row.OrderTotal).toString();
            row.settlementTotal = new Decimal(row.settlementTotal).toString();
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
export async function loadGLMap() {
    try {
        const sql = `SELECT m.keyValue, m.glAccount, gl.AccountDesc
                     FROM partners.AmazonSCFBA_GLMap m
                          LEFT JOIN c2.gl_account gl
                                    ON gl.Account = m.glAccount AND gl.Company = 'chums'`;
        const [rows] = await mysql2Pool.query(sql);
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
export async function addGLAccount(gl) {
    try {
        const sql = `INSERT IGNORE INTO partners.AmazonSCFBA_GLMap (keyValue, glAccount)
                     VALUES (:keyValue, :glAccount)
                     ON DUPLICATE KEY UPDATE glAccount = :glAccount`;
        await mysql2Pool.query(sql, gl);
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
