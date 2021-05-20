/**
 * Created by steve on 3/3/2017.
 */

const {mysql2Pool, getSageCompany} = require('chums-base');
const debug = require('debug')('chums:lib:amazon-seller:log-salesorder');

/**
 *
 * @param {Object} params
 * @param {String} params.Company
 * @param {String} params.SalesOrderNo
 * @param {String} params.AmazonOrderId
 * @param {String} params.OrderStatus
 * @param {String} [params.Notes]
 * @param {number} params.UserID
 * @param {String} params.action
 */
const logSalesOrder = async (params) => {
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
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query, data);
        connection.release();
        return {success: true};
    } catch (err) {
        debug('logSalesOrder', err.message);
        return Promise.reject(err);
    }
};

const loadSalesOrder = async ({AmazonOrderId}) => {
    try {
        const query = `SELECT az.Company, az.SalesOrderNo, az.OrderStatus, u.name
                       FROM c2.AZ_SalesOrderLog az
                                LEFT JOIN users.users u ON u.id = az.UserID
                       WHERE AmazonOrderId = :AmazonOrderId`;
        const data = {AmazonOrderId};
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query, data);
        connection.release();
        return rows;
    } catch (err) {
        debug('loadSalesOrder', err.message);
        return Promise.reject(err);
    }
};

const loadInvoiceData = async (AmazonOrderId = []) => {
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
        const data = {AmazonOrderId};
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query, data);
        connection.release();
        return rows;
    } catch (err) {
        debug("loadInvoiceData", err.message);
        return Promise.reject(err);
    }

};


exports.logSalesOrder = logSalesOrder;
exports.loadSalesOrder = loadSalesOrder;
exports.loadInvoiceData = loadInvoiceData;

exports.postAction = (req, res) => {
    req.body.action = req.params.action;
    let params = {
        Company: req.params.Company,
        SalesOrderNo: req.params.SalesOrderNo,
        UserID: res.locals.user.id,
        action: req.body,
    };
    switch (req.params.action.toLowerCase()) {
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
    logSalesOrder(params)
        .then(result => {
            res.jsonp({result});
        })
        .catch(err => {
            debug('postCreate()', params, err);
            res.jsonp({error: err.message});
        });
};
