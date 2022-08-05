"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testUpload = void 0;
__exportStar(require("chums-local-modules/dist/express-auth"), exports);
const debug_1 = __importDefault(require("debug"));
const csvtojson_1 = __importDefault(require("csvtojson"));
const promises_1 = require("fs/promises");
// import {addSalesOrder, loadItem} from "./db-utils";
// import {ParsedCSV, SageOrder, SalesOrderDetail} from "./uo-types";
const chums_local_modules_1 = require("chums-local-modules");
const debug = (0, debug_1.default)('chums:lib:urban-outfitters:csv-import');
// const URBAN_ACCOUNT = process.env.URBAN_OUTFITTERS_SAGE_ACCOUNT || '01-TEST';
//
//
// const dmyRegex = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4}) - ([0-9:]+)$/i;        //example: 21/07/2021 - 09:37:10
// const mdyRegex = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4}) ([0-9:]+) (AM|PM)$/i;  //example: 04/29/2021 03:46:10 PM
//
// export interface SageOrderList {
//     [key: string]: SageOrder,
// }
//
// function parseOrderDate(value: string): string {
//     try {
//         if (dmyRegex.test(value)) {
//             const parsed = dmyRegex.exec(value);
//             if (parsed) {
//                 const [str, day, month, year] = parsed;
//                 return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
//             }
//         } else if (mdyRegex.test(value)) {
//             const parsed = mdyRegex.exec(value);
//             if (parsed) {
//                 const [str, month, day, year] = parsed;
//                 return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
//             }
//         }
//     } catch (err: unknown) {
//         if (err instanceof Error) {
//             debug("parseDate()", {value}, err.message);
//         }
//     }
//     debug('parseOrderDate() Invalid date value', {value});
//     return value;
// }
//
// function parseOrderHeader(row: ParsedCSV): SageOrder {
//     try {
//         return {
//             CustomerPONo: row['Order number'],
//             ShipExpireDate: parseOrderDate(row['Shipping deadline']),
//             commentText: [
//                 `Date Created: ${row['Date created']}`,
//                 `Shipping Method: ${row['Shipping method']}`,
//                 `Shipping Deadline: ${row['Shipping deadline']}`,
//             ],
//
//             BillToName: [row['Billing address civility'], row['Billing address first name'], row['Billing address last name']].join(' ').trim(),
//             BillToAddress1: row['Billing address street 1'] || '',
//             BillToAddress2: row['Billing address street 2'] || '',
//             BillToAddress3: row['Billing address complementary'] || '',
//             BillToCity: row['Billing address city'] || '',
//             BillToState: row['Billing address state'] || '',
//             BillToZipCode: row['Billing address zip'] || '',
//             BillToCountryCode: row['Billing address country'] || '',
//
//             ShipToName: [row['Shipping address civility'], row['Shipping address first name'], row['Shipping address last name']].join(' ').trim(),
//             ShipToAddress1: row['Shipping address street 1'] || '',
//             ShipToAddress2: row['Shipping address street 2'] || '',
//             ShipToAddress3: row['Shipping address complementary'] || '',
//             ShipToCity: row['Shipping address city'] || '',
//             ShipToState: row['Shipping address state'] || '',
//             ShipToZipCode: row['Shipping address zip'] || '',
//             ShipToCountryCode: row['Shipping address country'] || '',
//
//             SalesTaxAmt: new Decimal(0), //Number(row['Total order taxes'] || 0) + Number(row['Total shipping taxes'] || 0),
//             FreightAmt: new Decimal(row['Shipping total amount']),
//             TaxableAmt: new Decimal(0),
//             OrderTotal: new Decimal(0),
//             NonTaxableAmt: new Decimal(0),
//             CommissionAmt: new Decimal(0),
//             detail: [],
//             // csv: []
//         }
//     } catch (err: unknown) {
//         if (err instanceof Error) {
//             debug("parseOrderHeader()", err.message);
//             throw err;
//         }
//         throw new Error('Error parsing order header');
//     }
// }
//
// async function parseOrderDetail(row: ParsedCSV): Promise<SalesOrderDetail> {
//     try {
//         const itemCode = await loadItem('chums', row['Seller SKU']);
//
//         return {
//             ItemType: '1',
//             ItemCode: itemCode,
//             UnitPrice: new Decimal(row['Unit price']),
//             QuantityOrdered: new Decimal(row['Quantity']),
//             CommentText: row['Details'],
//         }
//     } catch(err:unknown) {
//         if (err instanceof Error) {
//             debug("parseOrderDetail()", err.message);
//             return Promise.reject(err);
//         }
//         return Promise.reject(err);
//     }
// }
//
// async function parseOrders(rows: ParsedCSV[]): Promise<SageOrder[]> {
//     try {
//         const orders: SageOrderList = {};
//
//         for await (const row of rows) {
//             const key = row['Order number'];
//
//             if (!orders[key]) {
//                 orders[key] = parseOrderHeader(row);
//             }
//             const line = await parseOrderDetail(row);
//             orders[key].detail.push(line);
//
//             orders[key].FreightAmt = orders[key].FreightAmt.sub(new Decimal(row['Total shipping taxes'] || 0));
//             orders[key].TaxableAmt = orders[key].TaxableAmt.add(line.UnitPrice.mul(line.QuantityOrdered));
//             orders[key].OrderTotal = orders[key].TaxableAmt.add(orders[key].SalesTaxAmt).add(orders[key].FreightAmt);
//             orders[key].CommissionAmt = orders[key].CommissionAmt.sub(new Decimal(row['Commission (excluding taxes)'] || 0));
//             // orders[key].csv?.push(row);
//         }
//         return Object.values(orders);
//     } catch (err: unknown) {
//         if (err instanceof Error) {
//             debug("parseOrders()", err.message);
//             throw err;
//         }
//         throw new Error(`Error parsing orders: ${err}`);
//     }
// }
//
//
// async function handleUploadCSV(req: Request, userId: number): Promise<any> {
//     try {
//         const path: FormidableFile = await handleUpload(req);
//         debug('handleUploadCSV()', path);
//
//         const parsed: ParsedCSV[] = await csvParser().fromFile(path.filepath);
//         const original_csv_buffer = await readFile(path.filepath);
//         const original_csv = original_csv_buffer.toString();
//
//         await unlink(path.filepath);
//
//         let orders;
//         try {
//             orders = await parseOrders(parsed);
//         } catch (err: unknown) {
//             if (err instanceof Error) {
//                 debug('handleUpload() form.parse', err.message);
//                 return Promise.reject(err);
//             }
//             debug("handleUpload() form.parse", err);
//             return Promise.reject(err);
//         }
//         // debug('handleUpload()', parsed.length, orders.length);
//         const importResults: any[] = [];
//         for await (const order of orders) {
//             const url = `https://intranet.chums.com/node-sage/api/CHI/salesorder/${URBAN_ACCOUNT}/po/:CustomerPONo`
//                 .replace(':CustomerPONo', encodeURIComponent(order.CustomerPONo));
//             const {results} = await fetchGETResults(url)
//             // debug('form.parse()', results);
//             if (results.SalesOrder?.SalesOrderNo) {
//                 importResults.push({
//                     error: 'Order exists',
//                     import_result: 'order already exists', ...results.SalesOrder
//                 });
//             } else {
//                 const {results} = await fetchPOST('https://intranet.chums.com/sage/api/urban-outfitters/order-import.php', order);
//                 await addSalesOrder({
//                     uoOrderNo: order.CustomerPONo,
//                     SalesOrderNo: results.SalesOrderNo,
//                     userId: userId,
//                     import_result: results,
//                     original_csv,
//                 });
//                 importResults.push(results);
//             }
//         }
//
//
//         return {
//             orders,
//             parsed,
//             importResults,
//         };
//     } catch (err: unknown) {
//         if (err instanceof Error) {
//             debug("handleUpload()", err.message);
//             return Promise.reject(err);
//         }
//         debug("handleUpload()", err);
//         return Promise.reject(err);
//     }
// }
async function parseUpload(req, userId) {
    try {
        const path = await (0, chums_local_modules_1.handleUpload)(req);
        debug('parseUpload()', path.filepath);
        const parsed = await (0, csvtojson_1.default)().fromFile(path.filepath);
        await (0, promises_1.unlink)(path.filepath);
        return parsed;
        // let orders: SageOrder[];
        // try {
        //     orders = await parseOrders(parsed);
        // } catch (err: unknown) {
        //     if (err instanceof Error) {
        //         debug("()", err.message);
        //     }
        //     debug("()", err);
        //     return Promise.reject(err);
        // }
        // return orders;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("handleUpload()", err.message);
        }
        debug("handleUpload()", err);
        return Promise.reject(err);
    }
}
// export const onUpload = async (req: Request, res: Response) => {
//     try {
//         const status = await handleUploadCSV(req, req.userAuth.profile.user.id);
//         res.json(status);
//     } catch (err: unknown) {
//         if (err instanceof Error) {
//             debug("onUpload()", err.message);
//             return res.json({error: err.message});
//         }
//         debug("onUpload()", err);
//         res.json({error: err});
//     }
// }
//
const testUpload = async (req, res) => {
    try {
        const orders = await parseUpload(req, req.userAuth.profile.user.id);
        res.json({ orders });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("testUpload()", err.message);
            return res.json({ error: err.message });
        }
        return res.json({ error: err });
    }
};
exports.testUpload = testUpload;
