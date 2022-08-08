import {WalmartCSVRow, WalmartCSVTitles, WMItemTotalList} from "./wm-types";
import Debug from 'debug';
import csvParser from 'csvtojson';
import {Request, Response} from 'express';
import {unlink} from 'fs/promises';
import {FormidableFile, handleUpload} from 'chums-local-modules';
import Decimal from "decimal.js";

export * from 'chums-local-modules/dist/express-auth';

const columnHeaders: WalmartCSVTitles = {
    "Period Start Date": 'periodStartDate',
    "Period End Date": 'periodEndDate',
    "Total Payable": 'totalPayable',
    "Currency": 'currency',
    "Transaction Key": 'transactionKey',
    "Transaction Posted Timestamp": 'transactionPostedTimestamp',
    "Transaction Type": 'transactionType',
    "Transaction Description": 'transactionDescription',
    "Customer Order #": 'customerOrderNo',
    "Customer Order line #": 'customerOrderLineNo',
    "Purchase Order #": 'purchaseOrderNo',
    "Purchase Order line #": 'purchaseOrderLineNo',
    "Amount": 'amount',
    "Amount Type": 'amountType',
    "Ship Qty": 'shipQty',
    "Commission Rate": 'commissionRate',
    "Transaction Reason Description": 'transactionReasonDescription',
    "Partner Item Id": 'partnerItemId',
    "Partner GTIN": 'partnerGTIN',
    "Partner Item Name": 'partnerItemName',
    "Product Tax Code": 'productTaxCode',
    "Ship to State": 'shipToState',
    "Ship to City": 'shipToCity',
    "Ship to Zipcode": 'shipToZipcode',
    "Contract Category": 'contractCategory',
    "Product Type": 'productType',
    "Commission Rule": 'commissionRule',
    "Shipping Method": 'shippingMethod',
    "Fulfillment Type": 'fulfillmentType',
};

const debug = Debug('chums:lib:urban-outfitters:csv-import');

async function parseUpload(req: Request, userId: number): Promise<{ parsed: WalmartCSVRow[], items: WMItemTotalList, totalPayable: Decimal.Value }> {
    try {
        const path: FormidableFile = await handleUpload(req);
        const parsed: WalmartCSVRow[] = await csvParser({headers: Object.values(columnHeaders), noheader: false})
            .fromFile(path.filepath);
        await unlink(path.filepath);

        const items: WMItemTotalList = {};
        let totalPayable: Decimal.Value = new Decimal(0);
        parsed
            .filter(row => !!row.transactionType)
            .forEach(row => {
                const itemKey = row.partnerItemId;
                if (!!itemKey && !items[itemKey]) {
                    items[itemKey] = {
                        amount: new Decimal("0"),
                        shipQty: new Decimal("0"),
                        partnerItemId: itemKey,
                        commission: new Decimal(0),
                    };
                }
                // debug('parseUpload()', row.transactionType);
                switch (row.transactionType) {
                case 'PaymentSummary':
                    totalPayable = new Decimal(totalPayable).add(row.totalPayable || '0');
                    // debug('totalPayable()', totalPayable);
                    break;
                case 'Refund':
                    if (row.amountType === 'Product Price') {
                        items[itemKey].shipQty = new Decimal(items[itemKey].shipQty).sub(row.shipQty || '0');
                    }
                    if (row.amountType === 'Commission on Product') {
                        items[itemKey].commission = new Decimal(items[itemKey].commission).add(row.amount || '0');
                    } else {
                        items[itemKey].amount = new Decimal(items[itemKey].amount).add(row.amount || '0');
                    }
                    break;
                default:
                    if (row.amountType === 'Product Price') {
                        items[itemKey].shipQty = new Decimal(items[itemKey].shipQty).add(row.shipQty || '0');
                    }
                    if (row.amountType === 'Commission on Product') {
                        items[itemKey].commission = new Decimal(items[itemKey].commission).add(row.amount || '0');
                    } else {
                        items[itemKey].amount = new Decimal(items[itemKey].amount).add(row.amount || '0');
                    }
                }
            })
        return {items, totalPayable, parsed};
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("parseUpload()", err.message);
        }
        debug("parseUpload()", err);
        return Promise.reject(err);
    }
}

export const postUpload = async (req: Request, res: Response) => {
    try {
        const data = await parseUpload(req, req.userAuth.profile.user.id);
        res.json(data);
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("testUpload()", err.message);
            return res.json({error: err.message});
        }
        return res.json({error: err});
    }
}
