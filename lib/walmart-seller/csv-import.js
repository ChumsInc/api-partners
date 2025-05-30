import Debug from 'debug';
import csvParser from 'csvtojson';
import { unlink } from 'node:fs/promises';
import { handleUpload, apiFetch } from 'chums-local-modules';
import Decimal from "decimal.js";
const columnHeaders = {
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
async function loadWMItems() {
    try {
        const res = await apiFetch('/api/operations/barcodes/items/164');
        if (!res.ok) {
            return Promise.reject(new Error(`Error fetching WM barcode items: ${res.status}; ${res.statusText}`));
        }
        const items = {};
        const { result } = await res.json();
        result.forEach(item => {
            items[`00${item.UPC}`] = item;
        });
        return items;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("loadWMItems()", err.message);
            return Promise.reject(err);
        }
        debug("loadWMItems()", err);
        return Promise.reject(new Error('Error in loadWMItems()'));
    }
}
async function parseUpload(req) {
    try {
        const path = await handleUpload(req);
        const parsed = await csvParser({ headers: Object.values(columnHeaders), noheader: false })
            .fromFile(path.filepath);
        await unlink(path.filepath);
        const wmItems = await loadWMItems();
        const items = {};
        let totalPayable = new Decimal(0);
        parsed
            .filter(row => !!row.transactionType)
            .forEach(row => {
            const itemKey = wmItems[row.partnerGTIN]?.ItemCode || `${row.partnerGTIN}:${row.transactionDescription}`;
            if (!!itemKey && !items[itemKey]) {
                items[itemKey] = {
                    amount: new Decimal("0"),
                    shipQty: new Decimal("0"),
                    partnerItemId: itemKey,
                    description: wmItems[row.partnerGTIN]?.ItemDescription || row.transactionDescription,
                    commission: new Decimal(0),
                };
            }
            // debug('parseUpload()', row.transactionType);
            try {
                switch (row.transactionType) {
                    case 'PaymentSummary':
                        totalPayable = new Decimal(totalPayable).add(row.totalPayable || '0');
                        // debug('totalPayable()', totalPayable);
                        break;
                    case 'Refund':
                        if (row.amountType === 'Product Price') {
                            items[itemKey].shipQty = new Decimal(items[itemKey].shipQty).sub(row.shipQty || '0');
                            items[itemKey].amount = new Decimal(items[itemKey].amount).add(row.amount || '0');
                        }
                        else {
                            items[itemKey].commission = new Decimal(items[itemKey].commission).add(row.amount || '0');
                        }
                        // if (row.amountType === 'Commission on Product') {
                        //     items[itemKey].commission = new Decimal(items[itemKey].commission).add(row.amount || '0');
                        // } else {
                        //     items[itemKey].amount = new Decimal(items[itemKey].amount).add(row.amount || '0');
                        // }
                        break;
                    default:
                        if (row.amountType === 'Product Price') {
                            items[itemKey].shipQty = new Decimal(items[itemKey].shipQty).add(row.shipQty || '0');
                            items[itemKey].amount = new Decimal(items[itemKey].amount).add(row.amount || '0');
                        }
                        else {
                            items[itemKey].commission = new Decimal(items[itemKey].commission).add(row.amount || '0');
                        }
                    // if (row.amountType === 'Commission on Product') {
                    //     items[itemKey].commission = new Decimal(items[itemKey].commission).add(row.amount || '0');
                    // } else {
                    //     items[itemKey].amount = new Decimal(items[itemKey].amount).add(row.amount || '0');
                    // }
                }
            }
            catch (err) {
                if (err instanceof Error) {
                    debug("parseUpload()", err.message, row);
                }
            }
        });
        return { items, totalPayable, parsed, wmItems };
    }
    catch (err) {
        if (err instanceof Error) {
            debug("parseUpload()", err.message);
        }
        debug("parseUpload()", err);
        return Promise.reject(err);
    }
}
export const getWMItems = async (req, res) => {
    try {
        const items = await loadWMItems();
        res.json(items);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getWMItems()", err.message);
            res.json({ error: err.message, name: err.name });
            return;
        }
        res.json({ error: 'unknown error in getWMItems' });
    }
};
export const postUpload = async (req, res) => {
    try {
        const data = await parseUpload(req);
        res.json(data);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("testUpload()", err.message);
            return res.json({ error: err.message });
        }
        return res.json({ error: err });
    }
};
