/**
 * Created by steve on 3/3/2017.
 */
import { getSageCompany, mysql2Pool } from 'chums-local-modules';
import Debug from "debug";
const debug = Debug('chums:lib:amazon-seller:log-salesorder');
export const logSalesOrder = async (params) => {
    // debug('logSalesOrder()', params);
    const query = `INSERT INTO c2.AZ_SalesOrderLog (Company,
                                                    dbCompany,
                                                    SalesOrderNo,
                                                    AmazonOrderId,
                                                    OrderStatus,
                                                    Notes,
                                                    UserID,
                                                    action)
                   VALUES (:Company,
                           b2b.dbCompany(:Company),
                           :SalesOrderNo,
                           :AmazonOrderId,
                           :OrderStatus,
                           :Notes,
                           :UserID,
                           :action)
                   ON DUPLICATE KEY UPDATE OrderStatus = :OrderStatus,
                                           Notes       = :Notes,
                                           UserID      = :UserID,
                                           action      = :action`;
    const data = {
        Company: getSageCompany(params.Company),
        SalesOrderNo: params.SalesOrderNo,
        AmazonOrderId: params.AmazonOrderId,
        OrderStatus: params.OrderStatus,
        Notes: params.Notes || null,
        UserID: params.UserID,
        action: JSON.stringify(params.action)
    };
    try {
        await mysql2Pool.query(query, data);
        return { success: true };
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("logSalesOrder()", err.message);
            return Promise.reject(err);
        }
        console.debug("logSalesOrder()", err);
        return Promise.reject(new Error('Error in logSalesOrder()'));
    }
};
export const loadSalesOrder = async ({ AmazonOrderId }) => {
    try {
        const query = `SELECT az.Company, az.SalesOrderNo, az.OrderStatus, u.name
                               FROM c2.AZ_SalesOrderLog az
                                        LEFT JOIN users.users u ON u.id = az.UserID
                               WHERE AmazonOrderId = :AmazonOrderId`;
        const data = { AmazonOrderId };
        const [rows] = await mysql2Pool.query(query, data);
        return rows;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("loadSalesOrder()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadSalesOrder()", err);
        return Promise.reject(new Error('Error in loadSalesOrder()'));
    }
};
/**
 *
 * @param {string[]} AmazonOrderId
 * @return {Promise<AmazonOrderInvoice[]>}
 */
export const loadInvoiceData = async (AmazonOrderId = []) => {
    try {
        const query = `
            SELECT az.AmazonOrderId,
                   az.Company,
                   az.SalesOrderNo,
                   az.OrderStatus,
                   u.name,
                   h.OrderStatus,
                   ifnull(ih.InvoiceNo, sh.CurrentInvoiceNo) as InvoiceNo,
                   it.TrackingID
            FROM c2.AZ_SalesOrderLog az
                     LEFT JOIN users.users u ON u.id = az.UserID
                     LEFT JOIN c2.SO_SalesOrderHistoryHeader h
                               on h.Company = az.dbCompany and h.SalesOrderNo = az.SalesOrderNo
                     LEFT JOIN c2.ar_invoicehistoryheader ih
                               on ih.Company = az.dbCompany and ih.SalesOrderNo = az.SalesOrderNo
                     LEFT JOIN c2.SO_SalesOrderHeader sh
                               on sh.Company = az.dbCompany and sh.SalesOrderNo = az.SalesOrderNo
                     LEFT JOIN c2.AR_InvoiceHistoryTracking it
                               on it.Company = ih.Company and it.InvoiceNo = ih.InvoiceNo
            WHERE AmazonOrderId IN (:AmazonOrderId)`;
        const data = { AmazonOrderId };
        const [rows] = await mysql2Pool.query(query, data);
        return rows;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("loadInvoiceData()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadInvoiceData()", err);
        return Promise.reject(new Error('Error in loadInvoiceData()'));
    }
};
export const postAction = async (req, res) => {
    try {
        if (!req.body) {
            res.json({ error: 'Missing body content' });
            return;
        }
        req.body.action = req.params.action;
        const params = {
            Company: req.params.Company,
            SalesOrderNo: req.params.SalesOrderNo,
            UserID: res.locals.auth.profile.user.id,
            action: req.body,
            OrderStatus: '',
            AmazonOrderId: '-',
        };
        const action = req.params.action;
        switch (action.toLowerCase()) {
            case 'create':
                params.OrderStatus = 'Q';
                break;
            case 'promote':
                params.OrderStatus = 'N';
                break;
            case 'print':
                params.OrderStatus = 'P';
                break;
        }
        const result = await logSalesOrder(params);
        res.json({ result });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postAction()", err.message);
            res.json({ error: err.message, name: err.name });
            return;
        }
        res.json({ error: 'unknown error in postAction' });
    }
};
