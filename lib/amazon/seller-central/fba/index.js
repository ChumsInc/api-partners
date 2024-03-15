import Debug from 'debug';
import { parseSettlement, parseSettlementBaseData, parseSettlementCharges, parseSettlementSalesOrder, parseTextFile } from "./parser.js";
import { expressUploadFile } from 'chums-local-modules';
import { addFBAItem, addGLAccount, loadFBAItemMap, removeFBAItem } from "./db-handler.js";
const debug = Debug('chums:lib:amazon:seller-central:fba:index');
export const postFBAInvoice = async (req, res) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlement(data);
        res.json({ settlement });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postFBAInvoice()", err.message);
            debug("postFBAInvoice()", err.stack);
            return res.json({ error: err.message, stack: err.stack });
        }
        debug("postFBAInvoice()", err);
        res.json({ error: err });
    }
};
export const postFBASettlement = async (req, res) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const baseData = await parseSettlementBaseData(data);
        const charges = await parseSettlementCharges(data);
        const salesOrder = await parseSettlementSalesOrder(data);
        res.json({ baseData, charges, salesOrder });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postFBASettlement()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in postFBASettlement' });
    }
};
export const postFBAInvoiceBaseData = async (req, res) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlementBaseData(data);
        res.json({ settlement });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postFBAInvoiceBaseData()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in postFBAInvoiceBaseData' });
    }
};
export const postFBAInvoiceSalesOrder = async (req, res) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlementSalesOrder(data);
        res.json({ settlement });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postFBAInvoiceSalesOrder()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in postFBAInvoiceSalesOrder' });
    }
};
export const postFBAInvoiceCharges = async (req, res) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlementCharges(data);
        res.json({ settlement });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postFBAInvoiceCharges()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in postFBAInvoiceCharges' });
    }
};
export const postGLAccount = async (req, res) => {
    try {
        if (!req.body.glAccount || !req.body.keyValue) {
            debug('postGLAccount()', 'invalid body', req.body);
            return res.status(406).json({ error: 'Missing keyValue or glAccount values' });
        }
        const glAccounts = await addGLAccount(req.body);
        res.json({ glAccounts });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postGLAccount()", err.message);
            return res.json({ error: err.message });
        }
        debug("postGLAccount()", err);
        return res.json({ error: err });
    }
};
export const getItemMap = async (req, res) => {
    try {
        const itemMap = await loadFBAItemMap();
        res.json({ itemMap });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getItemMap()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in getItemMap' });
    }
};
export const postItemMap = async (req, res) => {
    try {
        const itemMap = await addFBAItem(req.body);
        res.json({ itemMap });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postItemMap()", err.message);
            return res.json({ error: err.message });
        }
        debug("postItemMap()", err);
        return res.json({ error: err });
    }
};
export const deleteItemMap = async (req, res) => {
    try {
        const itemMap = await removeFBAItem(req.params.sku);
        res.json({ itemMap });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("deleteItemMap()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in deleteItemMap' });
    }
};
