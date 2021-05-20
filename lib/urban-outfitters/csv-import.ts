import Debug from 'debug';
const debug = Debug('chums:lib:urban-outfitters:csv-import');

import csvParser from 'csvtojson';
import {IncomingForm} from 'formidable';
import {Request, Response} from 'express';
import {readFile, access, mkdir, rename, unlink} from 'fs/promises';
import {constants} from 'fs';
import path from 'path';
import {fetchGETResults, fetchPOST} from "../fetch-utils";
import {addSalesOrder} from "./db-utils";
import {ParsedCSV, SageOrder, SalesOrderDetail} from "./uo-types";
const URBAN_ACCOUNT = process.env.URBAN_OUTFITTERS_SAGE_ACCOUNT || '01-TEST';

const UPLOAD_PATH = '/tmp/api-partners/';

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



function parseOrderHeader(row:ParsedCSV):SageOrder {
    return {
        CustomerPONo: row['Order number'],
        ShipExpireDate: new Date(row['Shipping deadline']).toISOString(),
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

        SalesTaxAmt: Number(row['Total order taxes'] || 0) + Number(row['Total shipping taxes'] || 0),
        FreightAmt: Number(row['Shipping total amount']),
        TaxableAmt: 0,
        OrderTotal: 0,
        NonTaxableAmt: 0,
        detail: []
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
    const orders = {};

    rows.forEach((row, index) => {
        const key = row['Order number'];

        if (!orders[key]) {
            orders[key] = parseOrderHeader(row);
        }
        const line = parseOrderDetail(row);
        orders[key].detail.push(line);

        orders[key].TaxableAmt += line.UnitPrice * line.QuantityOrdered;
        orders[key].OrderTotal = orders[key].TaxableAmt + orders[key].SalesTaxAmt + orders[key].FreightAmt;
    });
    return Object.values(orders);
}


async function handleUpload(req:Request, userId: number):Promise<any> {
    try {
        return new Promise(async (resolve, reject) => {
            await ensureUploadPathExists();


            let status = false;
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

                const orders = parseOrders(parsed);
                // debug('handleUpload()', parsed.length, orders.length);
                const importResults:any[] = [];
                for await (const order of orders) {
                    const url = `https://intranet.chums.com/node-sage/api/CHI/salesorder/${URBAN_ACCOUNT}/po/:CustomerPONo`
                        .replace(':CustomerPONo', encodeURIComponent(order.CustomerPONo));
                    const {results} = await fetchGETResults(url)
                    debug('form.parse()', results);
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
