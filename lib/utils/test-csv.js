import { readCSVToJSON } from "./csv-to-json.js";
import _debug from "debug";
import { handleUpload } from "chums-local-modules";
const debug = _debug("chums:lib:utils:test-csv");
export async function testCSV(req, res) {
    try {
        const uploadPath = process.env.TEMP;
        const path = await handleUpload(req, { uploadPath });
        const parsed = await readCSVToJSON(path.filepath, { mapHeaders: (arg) => arg.header });
        res.json(parsed);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("testCSV()", err.message);
            res.status(500).json({ error: err.message, name: err.name });
            return;
        }
        res.status(500).json({ error: 'unknown error in testCSV' });
    }
}
