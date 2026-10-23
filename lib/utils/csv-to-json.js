import { open } from "node:fs/promises";
import csv from "csv-parser";
import _debug from "debug";
import camelCase from "camelcase";
const debug = _debug('chums:lib:utils:csv-to-json');
export async function readCSVToJSON(path, options) {
    try {
        const fd = await open(path);
        return new Promise((resolve, reject) => {
            const parsed2 = [];
            fd.createReadStream()
                .pipe(csv({
                mapHeaders: (arg) => {
                    if (options?.camelCase) {
                        return camelCase(arg.header);
                    }
                    if (options?.mapHeaders) {
                        return options.mapHeaders(arg);
                    }
                    const header = arg.header;
                    if (options?.columnHeaders && options?.columnHeaders[header]) {
                        return options.columnHeaders[header];
                    }
                    return null;
                },
            }))
                .on('data', (row) => {
                parsed2.push(row);
            })
                .on('end', () => {
                resolve(parsed2);
            })
                .on('error', (err) => {
                reject(err);
            });
        });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("readCSVToJSON()", err.message);
            return Promise.reject(err);
        }
        debug("readCSVToJSON()", err);
        return Promise.reject(new Error('Error in readCSVToJSON()'));
    }
}
