const debug = require('debug')('chums:lib:shopify-integration:payments');
const {fetchGETResults, genAdminApiURL} = require('./utils');
const {} = require('./config');
const {mysql2Pool} = require('chums-local-modules');
const {loadOrderImport} = require('./orders');

async function fetchPayouts({since_id = null}) {
    try {
        let all_payouts = [];
        const options = {};
        if (since_id) {
            options.since_id = since_id;
        }
        let url = genAdminApiURL(`/shopify_payments/payouts.json`, options);
        while (!!url) {
            const {results, nextLink} = await fetchGETResults(url);
            const {payouts} = results;
            url = nextLink || null;
            all_payouts = all_payouts.concat(payouts);
        }
        await savePayouts(all_payouts);
        return all_payouts;
    } catch (err) {
        debug("fetchPayouts()", err.message);
        return Promise.reject(err);
    }
}

async function savePayouts(list = []) {
    try {
        const query = `INSERT INTO shopify.payouts (id, status, date, amount, summary)
                       VALUES (:id, :status, :date, :amount, :summary)
                       ON DUPLICATE KEY UPDATE status  = :status,
                                               date    = :date,
                                               amount  = :amount,
                                               summary = :summary`;
        const connection = await mysql2Pool.getConnection();
        for (let i = 0, len = list.length; i < len; i += 1) {
            const {id, status, date, amount, summary} = list[i];
            await connection.query(query, {id, status, date, amount, summary: JSON.stringify(summary || {})});
        }
        connection.release();
    } catch (err) {
        debug("savePayouts()", err.message);
        return Promise.reject(err);
    }
}

async function updatePayoutComplete(id) {
    try {
        const query = `UPDATE shopify.payouts set completed = 1, date_completed = now() where id = :id`;
        const data = {id};
        const connection = await mysql2Pool.getConnection();
        await connection.query(query, data);
        connection.release();
    } catch(err) {
        debug("updatePayoutComplete()", err.message);
        return Promise.reject(err);
    }
}

async function fetchLastCompletedPayoutID() {
    try {
        const query = `SELECT ifnull(min(id), 1) - 1 as since_id
                       FROM shopify.payouts
                       where completed = 0`;
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query);
        connection.release();
        return rows[0].since_id;
    } catch (err) {
        debug("fetchLastCompletedPayoutID()", err.message);
        return Promise.reject(err);
    }

}

async function fetchTransactions({payout_id = 0}) {
    try {
        let allTransactions = [];
        const options = {payout_id};
        let url = genAdminApiURL(`/shopify_payments/balance/transactions.json`, options);
        while (!!url) {
            const {results, nextLink} = await fetchGETResults(url);
            const {transactions} = results;
            url = nextLink || null;
            allTransactions = allTransactions.concat(transactions);
        }
        const idList = allTransactions.map(tx => tx.source_order_id);
        const orders = await loadOrderImport(idList);
        return allTransactions.map(tx => {
            const [order = {}] = orders.filter(so => so.id === tx.source_order_id);
            return {
                ...tx,
                order,
            }
        });
    } catch(err) {
        debug("fetchTransactions()", err.message);
        return Promise.reject(err);
    }

}


async function loadOpenPaypalInvoices() {
    try {
        const query = `SELECT id,
                              import_result,
                              sage_Company,
                              sage_SalesOrderNo,
                              import_status,
                              shopify_order,
                              soh.ARDivisionNo,
                              soh.CustomerNo,
                              soh.BillToName,
                              soh.OrderStatus,
                              ih.InvoiceNo,
                              oi.Balance
                       FROM shopify.orders o
                                LEFT JOIN c2.SO_SalesOrderHistoryHeader soh
                                          ON soh.Company = o.sage_Company AND soh.SalesOrderNo = o.sage_SalesOrderNo
                                LEFT JOIN c2.ar_invoicehistoryheader ih
                                          ON ih.Company = soh.Company AND ih.SalesOrderNo = soh.SalesOrderNo
                                LEFT JOIN c2.AR_OpenInvoice oi
                                          ON oi.Company = ih.Company AND oi.InvoiceNo = ih.InvoiceNo
                       WHERE ifnull(oi.Balance, 0) <> 0`;
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query);
        connection.release();
        return rows
            .map(row => {
                const shopify_order = JSON.parse(row.shopify_order);
                delete row.shopify_order;
                return {...row, ...shopify_order};
            })
            .filter(row => {
                return row.gateway === 'paypal';
            });
    } catch(err) {
        debug("loadOpenPaypalInvoices()", err.message);
        return Promise.reject(err);
    }
}


exports.getPayouts = async (req, res) => {
    try {
        const since_id = await fetchLastCompletedPayoutID();
        const payouts = await fetchPayouts({since_id});
        res.json({payouts});
    } catch (err) {
        debug("getPayouts()", err.message);
        res.json({error: err.message});
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await fetchTransactions(req.params);
        res.json({transactions});
    } catch(err) {
        debug("getTransactions()", err.message);
        res.json({error: err.message});
    }
};

exports.postUpdateComplete = async (req, res) => {
    try {
        await updatePayoutComplete(req.params.payout_id);
        res.json({success: true});
    } catch(err) {
        debug("postUpdateComplete()", err.message);
        res.json({error: err.message});
    }
};


exports.getOpenPayPalInvoices = async (req, res) => {
    try {
        const orders = await loadOpenPaypalInvoices();
        res.json({orders});
    } catch(err) {
        debug("getOpenPayPalInvoices()", err.message);
        res.json({error: err.message});
    }
};
