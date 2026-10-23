import {open} from "node:fs/promises";
import csv from "csv-parser";
import _debug from "debug";
import camelCase from "camelcase";

const debug = _debug('chums:lib:utils:csv-to-json');
export interface MapHeaderArgs {
    header: string;
    index: number;
}
export interface CSVToJSONOptions<T = unknown> {
    mapHeaders?: (arg: MapHeaderArgs) => keyof T | string | null;
    columnHeaders?: Record<string, keyof T>;
    camelCase?: boolean;
}

export async function readCSVToJSON<T = unknown>(path: string, options: CSVToJSONOptions): Promise<T[]> {
    try {
        const fd = await open(path);
        return new Promise((resolve, reject) => {
            const parsed2: T[] = [];
            fd.createReadStream()
                .pipe(csv({
                    mapHeaders: (arg) => {
                        if (options?.camelCase) {
                            return camelCase(arg.header);
                        }
                        if (options?.mapHeaders) {
                            return options.mapHeaders(arg);
                        }
                        const header: string = arg.header;
                        if (options?.columnHeaders && options?.columnHeaders[header]) {
                            return options.columnHeaders[header] as string;
                        }
                        return null;
                    },
                }))
                .on('data', (row: T) => {
                    parsed2.push(row);
                })
                .on('end', () => {
                    resolve(parsed2);
                })
                .on('error', (err: unknown) => {
                    reject(err);
                })
        })
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("readCSVToJSON()", err.message);
            return Promise.reject(err);
        }
        debug("readCSVToJSON()", err);
        return Promise.reject(new Error('Error in readCSVToJSON()'));
    }
}
