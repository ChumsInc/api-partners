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
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("addSalesOrder()", err.message);
        }
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
                               (
                               SELECT GROUP_CONCAT(DISTINCT TrackingID)
                               FROM c2.SO_InvoiceTracking
                               WHERE Company = soih.Company
                                 AND InvoiceNo = soih.InvoiceNo),
                               (
                               SELECT GROUP_CONCAT(DISTINCT TrackingID)
                               FROM c2.AR_InvoiceHistoryTracking
                               WHERE Company = soih.Company
                                 AND InvoiceNo = ihh.InvoiceNo)
                                )                                     AS Tracking
                     FROM partners.UrbanOutfitters_Orders uo
                          LEFT JOIN c2.SO_SalesOrderHistoryHeader ohh
                                    ON uo.Company = ohh.Company AND uo.SalesOrderNo = ohh.SalesOrderNo
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
                       AND (IFNULL(:completed, '') = '' OR uo.completed = :completed)
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
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("loadSalesOrder()", err.message);
        }
        return Promise.reject(err);
    }
}

export async function loadItem(company:string, itemCode:string):Promise<string> {
    try {
        const sql = `SELECT ci.ItemCode
                      FROM c2.ci_item ci
                           LEFT JOIN partners.UrbanOutfitters_Items uoi
                                     ON uoi.Company = ci.company AND uoi.ItemCode = ci.ItemCode
                                     WHERE ci.company = :company AND 
                                     (ci.ItemCode = :itemCode or uoi.SellerSKU = :itemCode)`;
        const [rows] = await mysql2Pool.query(sql, {company, itemCode});
        if (!rows.length) {
            return Promise.reject(new Error(`Item ${itemCode} not found`));
        }
        return rows[0].ItemCode || 'Item not found';
    } catch (error: unknown) {
        if (error instanceof Error) {
            debug("loadItem()", error.message);
        }
        return Promise.reject(error);
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
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("loadTracking()", err.message);
        }
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
                     WHERE company = 'chums'
                       AND SalesOrderNo IN (:salesOrders)`;
        const params = {salesOrders};
        await mysql2Pool.query(sql, params);
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("markComplete()", err.message);
        }
        return Promise.reject(err);
    }
}
