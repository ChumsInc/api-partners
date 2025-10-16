import Debug from 'debug';
import {Request, Response} from 'express';
import {open, unlink} from 'node:fs/promises';
import {fetchGETResults, fetchPOST} from "../fetch-utils.js";
import {addSalesOrder, loadItem} from "./db-utils.js";
import type {ImportResponse, ParsedCSV, SageOrder, SalesOrderDetail, TestImportResponse} from "./uo-types.d.ts";
import {handleUpload, type ValidatedUser} from 'chums-local-modules';
import Decimal from "decimal.js";
import csv from 'csv-parser';
import type {File as FormidableFile} from "formidable";

const debug = Debug('chums:lib:urban-outfitters:csv-import');
const URBAN_ACCOUNT = process.env.URBAN_OUTFITTERS_SAGE_ACCOUNT || '01-TEST';


const dmyRegex = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4}) - ([0-9:]+)$/i;        //example: 21/07/2021 - 09:37:10
const mdyRegex = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4}) ([0-9:]+) (AM|PM)$/i;  //example: 04/29/2021 03:46:10 PM

export interface SageOrderList {
    [key: string]: SageOrder,
}

function parseOrderDate(value: string): string {
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
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("parseDate()", {value}, err.message);
        }
    }
    debug('parseOrderDate() Invalid date value', {value});
    return value;
}

function parseOrderHeader(row: ParsedCSV): SageOrder {
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

            SalesTaxAmt: new Decimal(0), //Number(row['Total order taxes'] || 0) + Number(row['Total shipping taxes'] || 0),
            FreightAmt: new Decimal(row['Shipping total amount']),
            TaxableAmt: new Decimal(0),
            OrderTotal: new Decimal(0),
            NonTaxableAmt: new Decimal(0),
            CommissionAmt: new Decimal(0),
            detail: [],
            // csv: []
        }
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("parseOrderHeader()", err.message);
            throw err;
        }
        throw new Error('Error parsing order header');
    }
}

async function parseOrderDetail(row: ParsedCSV): Promise<SalesOrderDetail> {
    try {
        const errors: string[] = [];
        const item = await loadItem(row['Seller SKU']);
        if (!item) {
            return Promise.reject(new Error(`Item not found: ${row['Seller SKU']}`));
        }
        if (item?.ProductType === 'D' || item?.InactiveItem === 'Y') {
            errors.push(`${row['Order number']} / ${row['Seller SKU']}: Item is inactive or discontinued (${item.ItemCode}`);
        }
        if (item?.ItemStatus?.startsWith('D') && new Decimal(item?.QuantityAvailable ?? 0).lt(row['Quantity'])) {
            errors.push(`${row['Order number']} / ${row['Seller SKU']}: Item has Product Status ${item?.ItemStatus} and only ${item?.QuantityAvailable} are available (${item?.ItemCode})`);
        }

        return {
            ItemType: '1',
            ItemCode: item?.ItemCode,
            UnitPrice: new Decimal(row['Unit price']),
            QuantityOrdered: new Decimal(row['Quantity']),
            CommentText: row['Details'],
            errors,
        }
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("parseOrderDetail()", err.message);
            return Promise.reject(err);
        }
        return Promise.reject(err);
    }
}

async function parseOrders(rows: ParsedCSV[]): Promise<SageOrder[]> {
    try {
        const orders: SageOrderList = {};

        for await (const row of rows) {
            const key = row['Order number'];

            if (!orders[key]) {
                orders[key] = parseOrderHeader(row);
            }
            const line = await parseOrderDetail(row);
            orders[key].detail.push(line);

            orders[key].FreightAmt = orders[key].FreightAmt.sub(new Decimal(row['Total shipping taxes'] || 0));
            orders[key].TaxableAmt = orders[key].TaxableAmt.add(line.UnitPrice.mul(line.QuantityOrdered));
            orders[key].OrderTotal = orders[key].TaxableAmt.add(orders[key].SalesTaxAmt).add(orders[key].FreightAmt);
            orders[key].CommissionAmt = orders[key].CommissionAmt.sub(new Decimal(row['Commission (excluding taxes)'] || 0));
            // orders[key].csv?.push(row);
        }
        return Object.values(orders);
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("parseOrders()", err.message);
            throw err;
        }
        throw new Error(`Error parsing orders: ${err}`);
    }
}


async function handleUploadCSV(orders: SageOrder[], userId: number, original_csv: ParsedCSV[]): Promise<Omit<ImportResponse, 'parsed'>> {
    try {
        /*
         * @TODO: open a socket connection so that the user can see how the process is going.
         */
        const importResults: unknown[] = [];
        for await (const order of orders) {
            debug(`testingPO: ${order.CustomerPONo}`);
            const url = `https://intranet.chums.com/node-sage/api/CHI/salesorder/${URBAN_ACCOUNT}/po/:CustomerPONo`
                .replace(':CustomerPONo', encodeURIComponent(order.CustomerPONo));
            const {results} = await fetchGETResults(url)
            // debug('form.parse()', results);
            if (results.SalesOrder?.SalesOrderNo) {
                importResults.push({
                    error: 'Order exists',
                    import_result: 'order already exists', ...results.SalesOrder
                });
            } else {
                debug('upload Sales order to https://intranet.chums.com/sage/api/urban-outfitters/order-import.php');
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


        return {
            orders,
            importResults,
        };
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("handleUpload()", err.message);
            return Promise.reject(err);
        }
        debug("handleUpload()", err);
        return Promise.reject(err);
    }
}

async function parseCSV(path: FormidableFile): Promise<ParsedCSV[]> {
    return new Promise(async (resolve, reject) => {
        const fd = await open(path.filepath);
        const parsed2: ParsedCSV[] = [];
        fd.createReadStream()
            .pipe(csv())
            .on('data', (row: ParsedCSV) => {
                parsed2.push(row);
            })
            .on('end', () => {
                resolve(parsed2);
            })
            .on('error', (err: unknown) => {
                reject(err);
            })
    })
}

async function handleCsvUpload(req: Request): Promise<ParsedCSV[]> {
    try {
        const path: FormidableFile = await handleUpload(req);
        const parsed = await parseCSV(path);
        await unlink(path.filepath);
        return parsed;
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.debug("parseUploadHandler()", err.message);
            return Promise.reject(err);
        }
        console.debug("parseUploadHandler()", err);
        return Promise.reject(new Error('Error in parseUploadHandler()'));
    }
}


function buildTestResponse(orders: SageOrder[]): TestImportResponse {
    const response: TestImportResponse = {
        orders: orders.length,
        success: true,
        errors: [],
    }
    orders.forEach(order => {
        order.detail.forEach(line => {
            if (line.errors.length > 0) {
                response.errors.push(...line.errors)
            }
        })
    })
    response.success = response.errors.length === 0;
    return response;
}

export const onUpload = async (req: Request, res: Response<unknown, ValidatedUser>): Promise<void> => {
    try {
        const parsed = await handleCsvUpload(req);
        const orders = await parseOrders(parsed);
        debug('onUpload()', 'orders', orders.length);
        const response = buildTestResponse(orders);
        // debug('onUpload()', 'response', response);
        if (!response.success) {
            res.json({
                error: 'Some orders failed to parse correctly. Please review the errors and try again.',
                ...response,
            });
            return;
        }
        const status = await handleUploadCSV(orders, res.locals.auth?.profile?.user.id ?? 0, parsed);
        res.json({
            ...status,
            parsed,
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("onUpload()", err.message);
            res.json({error: err.message});
            return
        }
        debug("onUpload()", err);
        res.json({error: err});
    }
}


export const testUpload = async (req: Request, res: Response<unknown, ValidatedUser>): Promise<void> => {
    try {
        const parsed = await handleCsvUpload(req);
        const orders = await parseOrders(parsed);
        const response = buildTestResponse(orders);
        if (req.query.verbose === '1') {
            response.parsed = parsed;
            response.data = orders;
        }
        res.json(response);
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("testUpload()", err.message);
            res.json({error: err.message});
            return
        }
        res.json({error: err});
    }
}
