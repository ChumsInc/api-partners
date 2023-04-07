import Debug from 'debug';
import {Request, Response} from 'express';
import {
    parseSettlement,
    parseSettlementBaseData,
    parseSettlementCharges,
    parseSettlementSalesOrder,
    parseTextFile
} from "./parser";
import {expressUploadFile} from 'chums-local-modules';
import {addFBAItem, addGLAccount, loadFBAItemMap, removeFBAItem} from "./db-handler";

const debug = Debug('chums:lib:amazon:seller-central:fba:index');

export const postFBAInvoice = async (req: Request, res: Response) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlement(data);
        res.json({settlement});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("postFBAInvoice()", err.message);
            debug("postFBAInvoice()", err.stack);
            return res.json({error: err.message, stack: err.stack})
        }
        debug("postFBAInvoice()", err);
        res.json({error: err})
    }
};

export const postFBAInvoiceBaseData = async (req:Request, res:Response) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlementBaseData(data);
        res.json({settlement});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("postFBAInvoiceBaseData()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in postFBAInvoiceBaseData'});
    }
}

export const postFBAInvoiceSalesOrder = async (req:Request, res:Response) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlementSalesOrder(data);
        res.json({settlement});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("postFBAInvoiceSalesOrder()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in postFBAInvoiceSalesOrder'});
    }
}

export const postFBAInvoiceCharges = async (req:Request, res:Response) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlementCharges(data);
        res.json({settlement});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("postFBAInvoiceCharges()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in postFBAInvoiceCharges'});
    }
}

export const postGLAccount = async (req: Request, res: Response) => {
    try {
        if (!req.body.glAccount || !req.body.keyValue) {
            debug('postGLAccount()', 'invalid body', req.body);
            return res.status(406).json({error: 'Missing keyValue or glAccount values'});
        }
        const glAccounts = await addGLAccount(req.body);
        res.json({glAccounts});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("postGLAccount()", err.message);
            return res.json({error: err.message});
        }
        debug("postGLAccount()", err);
        return res.json({error: err});
    }
}

export const getItemMap = async (req:Request, res:Response) => {
    try {
        const itemMap = await loadFBAItemMap();
        res.json({itemMap});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("getItemMap()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in getItemMap'});
    }
}

export const postItemMap = async (req: Request, res: Response) => {
    try {
        const itemMap = await addFBAItem(req.body);
        res.json({itemMap});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("postItemMap()", err.message);
            return res.json({error: err.message});
        }
        debug("postItemMap()", err);
        return res.json({error: err});
    }
}

export const deleteItemMap = async (req:Request, res:Response) => {
    try {
        const itemMap = await removeFBAItem(req.params.sku);
        res.json({itemMap});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("deleteItemMap()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in deleteItemMap'});
    }
}
