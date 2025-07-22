import Debug from 'debug';
import {Request, Response} from 'express';
import {
    parseSettlement,
    parseSettlementBaseData,
    parseSettlementCharges,
    parseSettlementSalesOrder,
    parseTextFile
} from "./parser.js";
import {expressUploadFile} from 'chums-local-modules';
import {addFBAItem, addGLAccount, loadFBAItemMap, loadFBAItems, removeFBAItem} from "./db-handler.js";
import {itemListToMap} from "./itemListToMap.js";

const debug = Debug('chums:lib:amazon:seller-central:fba:index');

export const postFBAInvoice = async (req: Request, res: Response):Promise<void> => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlement(data);
        res.json({settlement});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("postFBAInvoice()", err.message);
            debug("postFBAInvoice()", err.stack);
            res.json({error: err.message, stack: err.stack})
            return
        }
        debug("postFBAInvoice()", err);
        res.json({error: err})
    }
};

export const postFBASettlement = async (req:Request, res:Response):Promise<void> => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const baseData = await parseSettlementBaseData(data);
        const charges = await parseSettlementCharges(data);
        const salesOrder = await parseSettlementSalesOrder(data);
        res.json({baseData, charges, salesOrder});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("postFBASettlement()", err.message);
            res.json({error: err.message, name: err.name});
            return;
        }
        res.json({error: 'unknown error in postFBASettlement'});
    }
}

export const postFBAInvoiceBaseData = async (req:Request, res:Response):Promise<void> => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlementBaseData(data);
        res.json({settlement});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("postFBAInvoiceBaseData()", err.message);
            res.json({error: err.message, name: err.name});
            return;
        }
        res.json({error: 'unknown error in postFBAInvoiceBaseData'});
    }
}

export const postFBAInvoiceSalesOrder = async (req:Request, res:Response):Promise<void> => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlementSalesOrder(data);
        res.json({settlement});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("postFBAInvoiceSalesOrder()", err.message);
            res.json({error: err.message, name: err.name});
            return;
        }
        res.json({error: 'unknown error in postFBAInvoiceSalesOrder'});
    }
}

export const postFBAInvoiceCharges = async (req:Request, res:Response):Promise<void> => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlementCharges(data);
        res.json({settlement});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("postFBAInvoiceCharges()", err.message);
            res.json({error: err.message, name: err.name});
            return;
        }
        res.json({error: 'unknown error in postFBAInvoiceCharges'});
    }
}

export const postGLAccount = async (req: Request, res: Response):Promise<void> => {
    try {
        if (!req.body || !req.body.glAccount || !req.body.keyValue) {
            debug('postGLAccount()', 'invalid body', req.body);
            res.status(406).json({error: 'Missing keyValue or glAccount values'});
            return
        }
        const glAccounts = await addGLAccount(req.body);
        res.json({glAccounts});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("postGLAccount()", err.message);
            res.json({error: err.message});
            return ;
        }
        debug("postGLAccount()", err);
        res.json({error: err});
    }
}

export const getItemMap = async (req:Request, res:Response):Promise<void> => {
    try {
        const itemMap = await loadFBAItemMap();
        res.json({itemMap});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("getItemMap()", err.message);
            res.json({error: err.message, name: err.name});
            return
        }
        res.json({error: 'unknown error in getItemMap'});
    }
}

export const getFBAItems = async (req:Request, res:Response):Promise<void> => {
    try {
        const items = await loadFBAItems();
        res.json({items});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("getFBAItems()", err.message);
            res.json({error: err.message, name: err.name});
            return
        }
        res.json({error: 'unknown error in getFBAItems'});
    }
}

export const postItemMap = async (req: Request, res: Response):Promise<void> => {
    try {
        if (!req.body) {
            res.json({error: 'Missing body'});
            return;
        }
        const items = await addFBAItem(req.body);
        const itemMap = itemListToMap(items);
        res.json({itemMap});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("postItemMap()", err.message);
            res.json({error: err.message});
            return
        }
        debug("postItemMap()", err);
        res.json({error: err});
    }
}

export const postFBAItem = async (req: Request, res: Response):Promise<void> => {
    try {
        if (!req.body) {
            res.json({error: 'Missing body'});
            return;
        }
        const items = await addFBAItem(req.body);
        res.json({items});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("postItemMap()", err.message);
            res.json({error: err.message});
            return
        }
        debug("postItemMap()", err);
        res.json({error: err});
    }
}

export const deleteItemMap = async (req:Request, res:Response):Promise<void> => {
    try {
        const items = await removeFBAItem(req.params.sku);
        res.json({itemMap: itemListToMap(items)});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("deleteItemMap()", err.message);
            res.json({error: err.message, name: err.name});
            return
        }
        res.json({error: 'unknown error in deleteItemMap'});
    }
}

export const deleteFBAItem = async (req:Request, res:Response):Promise<void> => {
    try {
        const items = await removeFBAItem(req.params.sku);
        res.json({items});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("deleteItemMap()", err.message);
            res.json({error: err.message, name: err.name});
            return
        }
        res.json({error: 'unknown error in deleteItemMap'});
    }
}
