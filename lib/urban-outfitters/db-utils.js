import Debug from 'debug';
import { mysql2Pool, } from "chums-local-modules";
const debug = Debug('chums:lib:urban-outfitters:db-utils');
export async function addSalesOrder({ uoOrderNo, SalesOrderNo, userId, import_result, original_csv, }) {
    try {
        const sql = `INSERT INTO partners.UrbanOutfitters_Orders
                     (uo_order_number,
                      SalesOrderNo,
                      date_created,
                      created_by,
                      import_result,
                      original_csv)
                     VALUES (:uoOrderNo, :SalesOrderNo, NOW(), :userId, :import_result, :original_csv)
                     ON DUPLICATE KEY UPDATE SalesOrderNo  = :SalesOrderNo,
                                             created_by    = :userId,
                                             import_result = :import_result,
                                             original_csv  = :original_csv`;
        const params = {
            uoOrderNo,
            SalesOrderNo,
            userId,
            import_result: JSON.stringify(import_result || null),
            original_csv: ''
        };
        await mysql2Pool.query(sql, params);
        return await loadSalesOrder({ uoOrderNo });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("addSalesOrder()", err.message);
        }
        return Promise.reject(err);
    }
}
export async function deleteFailedSalesOrder(uoOrderNo) {
    try {
        const sql = `DELETE FROM partners.UrbanOutfitters_Orders where uo_order_number = :uoOrderNo`;
        const params = { uoOrderNo };
        const [result] = await mysql2Pool.query(sql, params);
        return result.affectedRows;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("deleteSalesOrder()", err.message);
            return Promise.reject(err);
        }
        console.debug("deleteSalesOrder()", err);
        return Promise.reject(new Error('Error in deleteSalesOrder()'));
    }
}
export async function loadSalesOrder({ uoOrderNo, SalesOrderNo, completed, minDate, maxDate }) {
    try {
        const sql = `SELECT uo.uo_order_number,
                            uo.Company,
                            IFNULL(ohh.SalesOrderNo, oh.SalesOrderNo) AS SalesOrderNo,
                            uo.import_result,
                            IFNULL(ohh.OrderDate, oh.OrderDate)       AS OrderDate,
                            ohh.OrderStatus,
                            IFNULL(ohh.BillToName, oh.BillToName)     AS BillToName,
                            oh.ShipExpireDate,
                            uo.completed,
                            u.name                                    AS username,
                            IFNULL(ihh.InvoiceNo, soih.InvoiceNo)     AS InvoiceNo,
                            IF(ISNULL(ihh.InvoiceNo),
                               (SELECT GROUP_CONCAT(DISTINCT TrackingID)
                                FROM c2.SO_InvoiceTracking
                                WHERE Company = soih.Company
                                  AND InvoiceNo = soih.InvoiceNo),
                               (SELECT GROUP_CONCAT(DISTINCT TrackingID)
                                FROM c2.AR_InvoiceHistoryTracking
                                WHERE Company = soih.Company
                                  AND InvoiceNo = ihh.InvoiceNo)
                            )                                         AS Tracking
                     FROM partners.UrbanOutfitters_Orders uo
                              LEFT JOIN c2.SO_SalesOrderHistoryHeader ohh
                                        ON uo.Company = ohh.Company AND uo.SalesOrderNo = ohh.SalesOrderNo AND
                                           uo.SalesOrderNo <> ''
                              LEFT JOIN c2.SO_SalesOrderHeader oh
                                        ON oh.Company = ohh.Company AND oh.SalesOrderNo = ohh.SalesOrderNo
                              LEFT JOIN c2.ar_invoicehistoryheader ihh
                                        ON ihh.Company = ohh.Company AND ihh.SalesOrderNo = ohh.SalesOrderNo
                              LEFT JOIN c2.SO_InvoiceHeader soih
                                        ON soih.Company = ohh.Company AND soih.SalesOrderNo = ohh.SalesOrderNo
                              LEFT JOIN users.users u
                                        ON u.id = uo.created_by
                     WHERE (IFNULL(:uoOrderNo, '') = '' OR uo.uo_order_number = :uoOrderNo)
                       AND (IFNULL(:SalesOrderNo, '') = '' OR uo.SalesOrderNo = :SalesOrderNo)
                       AND (IF(IFNULL(:completed, '') = '1', TRUE, uo.completed = 0))
                       AND (IFNULL(:minDate, '') = '' OR ohh.OrderDate BETWEEN :minDate AND :maxDate)
                     ORDER BY SalesOrderNo`;
        const params = { uoOrderNo, SalesOrderNo, completed, minDate, maxDate };
        const [rows] = await mysql2Pool.query(sql, params);
        return rows.map(row => {
            let import_result = null;
            try {
                import_result = JSON.parse(row.import_result);
            }
            catch (err) {
            }
            return {
                ...row,
                import_result,
                completed: !!row.completed
            };
        });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("loadSalesOrder()", err.message);
        }
        return Promise.reject(err);
    }
}
export async function loadItem(company, itemCode) {
    try {
        const sql = `SELECT ci.ItemCode
                     FROM c2.ci_item ci
                          LEFT JOIN partners.UrbanOutfitters_Items uoi
                                    ON uoi.Company = ci.company AND uoi.ItemCode = ci.ItemCode
                     WHERE ci.company = :company
                       AND (ci.ItemCode = :itemCode OR uoi.SellerSKU = :itemCode)`;
        const [rows] = await mysql2Pool.query(sql, { company, itemCode });
        if (!rows.length) {
            return Promise.reject(new Error(`Item ${itemCode} not found`));
        }
        return rows[0].ItemCode || 'Item not found';
    }
    catch (error) {
        if (error instanceof Error) {
            debug("loadItem()", error.message);
        }
        return Promise.reject(error);
    }
}
export async function loadTracking(company, invoices) {
    try {
        if (!Array.isArray(invoices)) {
            invoices = invoices.split(',').map(inv => inv.trim());
        }
        const sql = `SELECT t.InvoiceNo, h.SalesOrderNo, t.TrackingID, t.StarshipShipVia
                     FROM c2.AR_InvoiceHistoryTracking t
                          INNER JOIN c2.ar_invoicehistoryheader h
                                     USING (Company, InvoiceNo, HeaderSeqNo)
                     WHERE t.Company = :company
                       AND t.InvoiceNo IN (:invoices)

                     UNION

                     SELECT t.InvoiceNo, h.SalesOrderNo, t.TrackingID, t.StarshipShipVia
                     FROM c2.SO_InvoiceTracking t
                          INNER JOIN c2.SO_InvoiceHeader h
                                     USING (Company, InvoiceNo)
                     WHERE t.Company = :company
                       AND t.InvoiceNo IN (:invoices)`;
        const params = { company, invoices };
        const [rows] = await mysql2Pool.query(sql, params);
        return rows;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("loadTracking()", err.message);
        }
        return Promise.reject(err);
    }
}
export async function markComplete(salesOrders) {
    try {
        if (!Array.isArray(salesOrders)) {
            salesOrders = [salesOrders];
        }
        const sql = `UPDATE partners.UrbanOutfitters_Orders
                     SET completed = 1
                     WHERE company = 'chums'
                       AND SalesOrderNo IN (:salesOrders)`;
        const params = { salesOrders };
        await mysql2Pool.query(sql, params);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("markComplete()", err.message);
        }
        return Promise.reject(err);
    }
}
