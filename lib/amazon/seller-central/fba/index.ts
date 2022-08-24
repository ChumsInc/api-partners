import Debug from 'debug';
import {Request, Response} from 'express';
import {parseSettlement, parseTextFile} from "./parser";
import {expressUploadFile} from 'chums-local-modules';
import {addFBAItem, addGLAccount} from "./db-handler";

const debug = Debug('chums:lib:amazon:seller-central:fba:invoice-import');

export const postFBAInvoice = async (req: Request, res: Response) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlement(data);
        res.json({settlement});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("test()", err.message);
            return res.json({error: err.message})
        }
        debug("test()", err);
        res.json({error: err})

    }
};

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
