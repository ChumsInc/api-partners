import Debug from 'debug';
import {mysql2Pool} from "chums-local-modules";
import {TrackingInfo, UOSalesOrder, UOSalesOrderProps} from "./uo-types";

const debug = Debug('chums:lib:urban-outfitters:db-utils');


export async function addSalesOrder({
                                        uoOrderNo,
                                        SalesOrderNo,
                                        userId,
                                        import_result,
                                        original_csv,
                                    }: UOSalesOrderProps): Promise<UOSalesOrder[]> {
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
            original_csv
        };
        await mysql2Pool.query(sql, params);
        return await loadSalesOrder({uoOrderNo});
    } catch (err) {
        debug("addSalesOrder()", err.message);
        return Promise.reject(err);
    }
}

export interface LoadSalesOrderProps {
    uoOrderNo?: string,
    SalesOrderNo?: string,
    completed?: boolean,
    minDate?: string,
    maxDate?: string,
}

export async function loadSalesOrder({
                                         uoOrderNo,
                                         SalesOrderNo,
                                         completed,
                                         minDate,
                                         maxDate
                                     }: LoadSalesOrderProps): Promise<UOSalesOrder[]> {
    try {
        const sql = `SELECT uo.uo_order_number,
                            uo.Company,
                            ifnull(ohh.SalesOrderNo, oh.SalesOrderNo) as SalesOrderNo,
                            uo.import_result,
                            ifnull(ohh.OrderDate, oh.OrderDate) as OrderDate,
                            ohh.OrderStatus,
                            ifnull(ohh.BillToName, oh.BillToName) as BillToName,
                            oh.ShipExpireDate,
                            uo.completed,
                            u.name                                AS username,
                            IFNULL(ihh.InvoiceNo, soih.InvoiceNo) AS InvoiceNo,
                            IF(ISNULL(ihh.InvoiceNo),
                               (
                               SELECT GROUP_CONCAT(DISTINCT TrackingID)
                               FROM c2.SO_InvoiceTracking
                               WHERE InvoiceNo = soih.InvoiceNo),
                               (
                               SELECT GROUP_CONCAT(DISTINCT TrackingID)
                               FROM c2.AR_InvoiceHistoryTracking
                               WHERE InvoiceNo = ihh.InvoiceNo)
                                )                                 AS Tracking
                     FROM partners.UrbanOutfitters_Orders uo
                          LEFT JOIN c2.SO_SalesOrderHistoryHeader ohh
                                    USING (Company, SalesOrderNo)
                          LEFT JOIN c2.SO_SalesOrderHeader oh
                                    USING (Company, SalesOrderNo)
                          LEFT JOIN c2.ar_invoicehistoryheader ihh
                                    USING (Company, SalesOrderNo)
                          LEFT JOIN c2.SO_InvoiceHeader soih
                                    USING (Company, SalesOrderNo)
                          LEFT JOIN users.users u
                                    ON u.id = uo.created_by
                     WHERE (IFNULL(:uoOrderNo, '') = '' OR uo_order_number = :uoOrderNo)
                       AND (IFNULL(:SalesOrderNo, '') = '' OR SalesOrderNo = :SalesOrderNo)
                       AND (IFNULL(:completed, '') = '' OR completed = :completed)
                       AND (IFNULL(:minDate, '') = '' OR ohh.OrderDate BETWEEN :minDate AND :maxDate)
                     ORDER BY SalesOrderNo`;
        const params = {uoOrderNo, SalesOrderNo, completed, minDate, maxDate};
        const [rows] = await mysql2Pool.query(sql, params);
        return rows.map(row => {
            return {
                ...row,
                import_result: JSON.parse(row.import_result),
                completed: !!row.completed
            } as UOSalesOrder;
        });
    } catch (err) {
        debug("loadSalesOrder()", err.message);
        return Promise.reject(err);
    }
}

export async function loadTracking(company: string, invoices: string | string[]): Promise<TrackingInfo[]> {
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
        const params = {company, invoices}
        const [rows] = await mysql2Pool.query(sql, params);
        return rows;
    } catch (err) {
        debug("loadTracking()", err.message);
        return Promise.reject(err);
    }
}

export async function markComplete(salesOrders: string | string[]) {
    try {
        if (!Array.isArray(salesOrders)) {
            salesOrders = [salesOrders];
        }
        const sql = `UPDATE partners.UrbanOutfitters_Orders
                     SET completed = 1
                     WHERE company = 'chums' and SalesOrderNo IN (:salesOrders)`;
        const params = {salesOrders};
        await mysql2Pool.query(sql, params);
    } catch (err) {
        debug("markComplete()", err.message);
        return Promise.reject(err);
    }
}
