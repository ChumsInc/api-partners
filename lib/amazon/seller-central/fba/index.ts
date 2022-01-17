import Debug from 'debug';
import {Request, Response} from 'express';
import {parseSettlement, parseTextFile} from "./parser";
import {expressUploadFile} from 'chums-local-modules';

const debug = Debug('chums:lib:amazon:seller-central:fba:invoice-import');


export const postFBAInvoice = async (req: Request, res: Response) => {
    try {
        const content = await expressUploadFile(req);
        const data = await parseTextFile(content);
        const settlement = await parseSettlement(data);
        res.json({settlement, data});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("test()", err.message);
            return res.json({error: err.message})
        }
        debug("test()", err);
        res.json({error: err})

    }
};

