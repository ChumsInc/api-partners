import {readCSVToJSON} from "./csv-to-json.js";
import {Request, Response} from "express";
import _debug from "debug";
import {FormidableFile, handleUpload} from "chums-local-modules";

const debug = _debug("chums:lib:utils:test-csv");

export async function testCSV(req: Request, res: Response): Promise<void> {
    try {
        const uploadPath = process.env.TEMP;
        const path: FormidableFile = await handleUpload(req, {uploadPath});
        const parsed = await readCSVToJSON(path.filepath, {mapHeaders: (arg) => arg.header});
        res.json(parsed);
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("testCSV()", err.message);
            res.status(500).json({error: err.message, name: err.name});
            return;
        }
        res.status(500).json({error: 'unknown error in testCSV'});
    }
}
