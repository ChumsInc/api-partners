import * as Formidable from "formidable";
export * from 'chums-local-modules/dist/express-auth';
import csvParser from 'csvtojson';
import {IncomingForm} from 'formidable';
import {Request, Response} from 'express';
import {readFile, access, mkdir, unlink} from 'fs/promises';
import {constants} from 'fs';
import {fetchGETResults, fetchPOST} from "../fetch-utils";
import {addSalesOrder} from "./db-utils";
import {ParsedCSV, SageOrder, SalesOrderDetail} from "./uo-types";
import Debug from 'debug';
const debug = Debug('chums:lib:urban-outfitters:csv-import');

const URBAN_ACCOUNT = process.env.URBAN_OUTFITTERS_SAGE_ACCOUNT || '01-TEST';
const UPLOAD_PATH = '/tmp/api-partners/';

const dmyRegex = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4}) - ([0-9:]+)$/i;        //example: 21/07/2021 - 09:37:10
const mdyRegex = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4}) ([0-9:]+) (AM|PM)$/i;                     //example: 04/29/2021 03:46:10 PM

export interface SageOrderList {
    [key:string]: SageOrder,
}

async function ensureUploadPathExists() {
    try {
        await access(UPLOAD_PATH, constants.R_OK | constants.W_OK);
        return true;
    } catch(err) {
        try {
            await mkdir(UPLOAD_PATH);
            return true;
        } catch(err) {
            debug("ensureUploadPathExists()", err.message);
            return Promise.reject(err);
        }
    }
}

function parseOrderDate(value:string):string {
    try {
        if (dmyRegex.test(value)) {
            const parsed = dmyRegex.exec(value);
            if (parsed) {
                const [str, day, month, year] = parsed;
                return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
            }
        } else if (mdyRegex.test(value)) {
            const parsed = mdyRegex.exec(value);
            if (parsed) {
                const [str, month, day, year] = parsed;
                return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
            }
        }
    } catch(err) {
        debug("parseDate()", {value}, err.message);
    }
    debug('parseOrderDate() Invalid date value', {value});
    return value;
}

function parseOrderHeader(row:ParsedCSV):SageOrder {
    try {
        return {
            CustomerPONo: row['Order number'],
            ShipExpireDate: parseOrderDate(row['Shipping deadline']),
            commentText: [
                `Date Created: ${row['Date created']}`,
                `Shipping Method: ${row['Shipping method']}`,
                `Shipping Deadline: ${row['Shipping deadline']}`,
            ],

            BillToName: [row['Billing address civility'], row['Billing address first name'], row['Billing address last name']].join(' ').trim(),
            BillToAddress1: row['Billing address street 1'] || '',
            BillToAddress2: row['Billing address street 2'] || '',
            BillToAddress3: row['Billing address complementary'] || '',
            BillToCity: row['Billing address city'] || '',
            BillToState: row['Billing address state'] || '',
            BillToZipCode: row['Billing address zip'] || '',
            BillToCountryCode: row['Billing address country'] || '',

            ShipToName: [row['Shipping address civility'], row['Shipping address first name'], row['Shipping address last name']].join(' ').trim(),
            ShipToAddress1: row['Shipping address street 1'] || '',
            ShipToAddress2: row['Shipping address street 2'] || '',
            ShipToAddress3: row['Shipping address complementary'] || '',
            ShipToCity: row['Shipping address city'] || '',
            ShipToState: row['Shipping address state'] || '',
            ShipToZipCode: row['Shipping address zip'] || '',
            ShipToCountryCode: row['Shipping address country'] || '',

            SalesTaxAmt: 0, //Number(row['Total order taxes'] || 0) + Number(row['Total shipping taxes'] || 0),
            FreightAmt: Number(row['Shipping total amount']) - Number(row['Total shipping taxes'] || 0),
            TaxableAmt: 0,
            OrderTotal: 0,
            NonTaxableAmt: 0,
            CommissionAmt: 0,
            detail: []
        }
    } catch(err) {
        debug("parseOrderHeader()", err.message);
        throw new Error(err);
    }
}

function parseOrderDetail(row:ParsedCSV):SalesOrderDetail {
    return {
        ItemType: '1',
        ItemCode: row['Seller SKU'] || '',
        UnitPrice: Number(row['Unit price']),
        QuantityOrdered: Number(row['Quantity']),
        CommentText: row['Details'],
    }
}
function parseOrders(rows: ParsedCSV[]):SageOrder[] {
    try {
        const orders:SageOrderList = {};

        rows.forEach((row) => {
            const key = row['Order number'];

            if (!orders[key]) {
                orders[key] = parseOrderHeader(row);
            }
            const line = parseOrderDetail(row);
            orders[key].detail.push(line);

            orders[key].TaxableAmt += line.UnitPrice * line.QuantityOrdered;
            orders[key].OrderTotal = orders[key].TaxableAmt + orders[key].SalesTaxAmt + orders[key].FreightAmt;
            orders[key].CommissionAmt += -1 * Number(row['Commission (excluding taxes)'] || 0)
        });
        return Object.values(orders);
    } catch(err) {
        debug("parseOrders()", err.message);
        throw new Error(err);
    }
}


async function handleUpload(req:Request, userId: number):Promise<any> {
    try {
        return new Promise(async (resolve, reject) => {
            await ensureUploadPathExists();

            const form = new IncomingForm({
                uploadDir: UPLOAD_PATH,
                keepExtensions: true,
            });

            form.on('error', (err:any) => {
                debug('handleUpload.onError()', err.message);
                reject(err)
            });
            form.parse(req, async (err, fields, files) => {
                if (err) {
                    return reject(new Error(err));
                }
                const [file] = Object.values(files);
                if (!file || Array.isArray(file)) {
                    debug('file was not found?', file);
                    return reject(new Error('Uploaded file was not found'));
                }

                const parsed:ParsedCSV[] = await csvParser().fromFile(file.path);

                const original_csv_buffer = await readFile(file.path);
                const original_csv = original_csv_buffer.toString();

                let orders;
                try {
                    orders = parseOrders(parsed);
                } catch(err) {
                    debug("()", err.message);
                    return reject(err);
                }
                // debug('handleUpload()', parsed.length, orders.length);
                const importResults:any[] = [];
                for await (const order of orders) {
                    const url = `https://intranet.chums.com/node-sage/api/CHI/salesorder/${URBAN_ACCOUNT}/po/:CustomerPONo`
                        .replace(':CustomerPONo', encodeURIComponent(order.CustomerPONo));
                    const {results} = await fetchGETResults(url)
                    // debug('form.parse()', results);
                    if (results.SalesOrder?.SalesOrderNo) {
                        importResults.push({error: 'Order exists', import_result: 'order already exists', ...results.SalesOrder});
                    } else {
                        const {results} = await fetchPOST('https://intranet.chums.com/sage/api/urban-outfitters/order-import.php', order);
                        await addSalesOrder({
                            uoOrderNo: order.CustomerPONo,
                            SalesOrderNo: results.SalesOrderNo,
                            userId: userId,
                            import_result: results,
                            original_csv,
                        });
                        importResults.push(results);
                    }
                }

                await unlink(file.path);
                return resolve({
                    orders,
                    parsed,
                    importResults,
                });
            })
        })
    } catch(err) {
        debug("handleUpload()", err.message);
        return Promise.reject(err);
    }
}

async function parseUpload(req:Request, userId: number):Promise<SageOrder[]> {
    try {
        return new Promise(async (resolve, reject) => {
            await ensureUploadPathExists();

            const form = new IncomingForm({
                uploadDir: UPLOAD_PATH,
                keepExtensions: true,
            });

            form.on('error', (err:any) => {
                debug('handleUpload.onError()', err.message);
                reject(err)
            });
            form.parse(req, async (err, fields, files:Formidable.Files) => {
                if (err) {
                    return reject(new Error(err));
                }
                const [file] = Object.values(files);
                if (!file || Array.isArray(file)) {
                    debug('file was not found?', file);
                    return reject(new Error('Uploaded file was not found'));
                }

                const parsed:ParsedCSV[] = await csvParser().fromFile(file.path);

                const original_csv_buffer = await readFile(file.path);
                const original_csv = original_csv_buffer.toString();

                let orders:SageOrder[];
                try {
                    orders = parseOrders(parsed);
                } catch(err) {
                    debug("()", err.message);
                    return reject(err);
                }
                return resolve(orders);
            })
        })
    } catch(err) {
        debug("handleUpload()", err.message);
        return Promise.reject(err);
    }
}

export const test = async (req: Request, res:Response) => {
    try {
        const status = await ensureUploadPathExists();
        res.json({status});
    } catch(err) {
        debug("test()", err.message);
        res.json({error: err.message, code: err.code});
    }
}

export const onUpload = async (req:Request, res: Response) => {
    try {
        const status = await handleUpload(req, req.userAuth.profile.user.id);
        res.json(status);
    } catch(err) {
        debug("onUpload()", err.message);
        res.json({error: err.message});
    }
}

export const testUpload = async (req:Request, res:Response) => {
    try {
        const orders = await parseUpload(req, req.userAuth.profile.user.id);
        res.json({orders});
    } catch(err) {
        debug("testUpload()", err.message);
        return Promise.reject(err);
    }
}