import {mysql2Pool} from 'chums-local-modules';
import Debug from 'debug';
import {FBAItem, FBAItemMap, FBMOrder, SettlementImportResult} from "./types";

const debug = Debug('chums:lib:amazon:seller-central:fba:db-handler');

/**
 *
 * @param {SettlementImportResult} result
 * @param {Number} userId
 * @return {Promise<never>}
 */
export async function logSettlementImport(result: SettlementImportResult, userId: number) {
    try {
        const {salesOrderNo, importResult, originalFile, settlementId} = result;
        const sql = `INSERT INTO partners.AmazonSCFBA_Orders (AmazonSettlementID, Company, SalesOrderNo, DateCreated,
                                                              CreatedBy, ImportResult, OriginalFile)
                     VALUES (:settlementID, 'chums', :salesOrderNo, NOW(),
                             :userId, :importResult, :originalFile)
                     ON DUPLICATE KEY UPDATE ImportResult = :importResult,
                                             UpdatedBy    = :userId,
                                             DateUpdated  = NOW()`;
        const data = {settlementId, salesOrderNo, importResult, originalFile, userId};
        await mysql2Pool.query(sql, data)

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.log("logSettlementImport()", error.message);
            return Promise.reject(error);
        }
        console.error("logSettlementImport()", error);
        return Promise.reject(error);
    }
}

export async function loadFBAItemMap(): Promise<FBAItemMap> {
    try {
        const sql = `SELECT SellerSKU     AS sku,
                            Company       AS company,
                            ItemCode      AS itemCode,
                            WarehouseCode AS warehouseCode
                     FROM partners.AmazonSCFBA_Items`;

        const [rows] = await mysql2Pool.query(sql);

        const map: FBAItemMap = {};
        rows.forEach(row => {
            const {sku, company, itemCode, warehouseCode} = row as FBAItem;
            map[sku] = {sku, company, itemCode, warehouseCode};
        });
        return map;
    } catch (err: unknown) {
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
export async function addFBAItem(item: FBAItem): Promise<FBAItemMap> {
    try {
        const {sku, company, itemCode, warehouseCode} = item;
        const sql = `INSERT INTO partners.AmazonSCFBA_Items (SellerSKU, Company, ItemCode, WarehouseCode)
                     VALUES (:sku, :company, :itemCode, :warehouseCode)
                     ON DUPLICATE KEY UPDATE Company       = :company,
                                             ItemCode      = :itemCode,
                                             WarehouseCode = :warehouseCode`;
        await mysql2Pool.query(sql, {sku, company, itemCode, warehouseCode});
        return loadFBAItemMap();
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug('addFBAItem()', err.message);
            return Promise.reject(err);
        }
        debug("addFBAItem()", err);
        return Promise.reject(err);
    }
}


export async function removeFBAItem(sku: string): Promise<FBAItemMap> {
    try {
        const sql = `DELETE FROM partners.AmazonSCFBA_Items WHERE SellerSKU = :sku`;
        await mysql2Pool.query(sql, {sku});
        return await loadFBAItemMap();
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug('removeFBAItem()', err.message);
            return Promise.reject(err);
        }
        debug("deleteFBAItem()", err);
        return Promise.reject(err);
    }
}

export async function loadFBMOrders(poList: string[]): Promise<FBMOrder[]> {
    try {
        if (poList.length === 0) {
            return [];
        }
        const sql = `SELECT oh.SalesOrderNo,
                            oh.CustomerPONo,
                            oh.OrderDate,
                            oh.TaxableAmt + oh.NonTaxableAmt - oh.DiscountAmt AS OrderTotal,
                            group_concat(ih.InvoiceNo ORDER BY ih.InvoiceNo SEPARATOR  ', ') as InvoiceNo,
                            group_concat(ih.InvoiceDate ORDER BY ih.InvoiceNo SEPARATOR  ', ') as InvoiceDate
                     FROM c2.SO_SalesOrderHistoryHeader oh
                          LEFT JOIN c2.ar_invoicehistoryheader ih
                                    USING (Company, SalesOrderNo)
                     WHERE oh.Company = 'chums'
                       AND oh.CustomerPONo IN (:poList)
                       GROUP BY oh.SalesOrderNo, oh.CustomerPONo, oh.OrderDate, oh.TaxableAmt + oh.NonTaxableAmt - oh.DiscountAmt`;
        const [rows] = await mysql2Pool.query(sql, {poList});
        rows.forEach(row => {
            row.OrderTotal = Number(row.OrderTotal);
        })
        return rows as FBMOrder[];
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.log("loadFBMOrders()", error.message);
            return Promise.reject(error);
        }
        console.error("loadFBMOrders()", error);
        return Promise.reject(error);
    }
}
