import {
    FBAItem, FBAItemMap,
    SettlementCharge,
    SettlementChargeList, SettlementChargeTotals,
    SettlementOrder,
    SettlementOrderList,
    SettlementOrderRow,
    SettlementRow,
    SettlementRowField
} from "./types";
import Debug from 'debug';
import camelCase from 'camelcase';
import {loadAMZItemMap, loadFBAItemMap, loadFBMOrders, loadGLMap} from "./db-handler";
import {parseJSON} from 'date-fns'
import Decimal from "decimal.js";

const debug = Debug('chums:lib:amazon:seller-central:fba:parser');

const mfnKey = 'Fulfilled by Chums';
const afnKey = 'Fulfilled by Amazon';
const ascKey = 'Settlement Charges';


export async function parseTextFile(content: string): Promise<SettlementRow[]> {
    try {
        const [header, ...rest] = content.trim().split('\n');
        const fields: SettlementRowField[] = header.split('\t').map(str => camelCase(str.trim()) as SettlementRowField);

        return rest.map(line => {
            const row: SettlementRow = {};
            line.split('\t').map((value, index) => {
                const field: SettlementRowField = fields[index];
                row[field] = value;
                // if (field === 'amount' || field === 'quantityPurchased' || field === 'totalAmount') {
                //     row[field] = Number(value);
                // } else {
                //     row[field] = value;
                // }
            });
            return row;
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("parseTextFile()", err?.message);
            return Promise.reject(err);
        }
        debug("parseTextFile()", err);
        return Promise.reject(err);
    }
}

const whseItem = ({warehouseCode, itemCode}:FBAItem):string => {
    return `${warehouseCode}:${itemCode}`;
}

export async function parseSettlement(rows: SettlementRow[]): Promise<SettlementOrder> {
    try {
        let itemMap:FBAItemMap = await loadFBAItemMap();
        const glAccounts = await loadGLMap();
        const [header] = rows;
        const startDate = parseJSON(header?.settlementStartDate || '').toISOString();
        const endDate = parseJSON(header?.settlementEndDate || '').toISOString();
        const totalAmount = Number(header?.totalAmount) || 0;
        const totals:SettlementChargeTotals = {
            fba: new Decimal(0),
            fbaRefund: new Decimal(0),
            fbm: new Decimal(0),
            fbmRefund: new Decimal(0),
            charge: new Decimal(0),
            otherCharges: new Decimal(0),
        }

        const defaultRow: SettlementOrderRow = {
            orderId: '',
            postedDateTime: '',
            itemCode: '',
            warehouseCode: '',
            extendedUnitPrice: new Decimal(0),
            quantityPurchased: new Decimal(0),
            unitPrice: new Decimal(0),
        }

        const defaultCharge: SettlementCharge = {
            key: '',
            salesOrderNo: '',
            transactionType: '',
            amountType: '',
            amountDescription: '',
            glAccount: '',
            amount: new Decimal(0),
        }

        const order: SettlementOrderList = {};
        const charges: SettlementChargeList = {};

        const fbmPOList: string[] = [];

        // get a list of Chums Fulfilled orders
        rows.filter(row => row.fulfillmentId === 'MFN' && row.transactionType === 'Order' && !!row.orderId)
            .forEach(row => {
                if (!!row.orderId && !fbmPOList.includes(row.orderId)) {
                    fbmPOList.push(row.orderId);
                }
            });

        // get Settlement order total for fulfilled by Chums
        const fbmTotal = rows.filter(row => row.fulfillmentId === 'MFN' && row.transactionType === 'Order' && !!row.orderId)
            .filter(row => row.amountType === 'ItemPrice')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0));

        // load the list of orders
        const fbmOrders = await loadFBMOrders(fbmPOList);

        const lookupItems:string[] = [];
        rows.filter(row => row.fulfillmentId === 'AFN' && row.transactionType === 'Order')
            .filter(row => !!row.sku && !itemMap[row.sku])
            .filter(row => {
                if (!!row.sku && !lookupItems.includes(row.sku)) {
                    lookupItems.push(row.sku);
                }
            });

        const unmapped = await loadAMZItemMap(lookupItems);
        itemMap = {...itemMap, ...unmapped};


        // load the list of amazon fulfilled items that need to be invoices from AMZ warehouse
        rows.filter(row => row.fulfillmentId === 'AFN' && row.transactionType === 'Order')
            .forEach(row => {

                if (!row.orderItemCode || !row.orderId || !row.sku) {
                    return;
                }

                if (!itemMap[row.sku]) {
                    order[row.orderItemCode] = {
                        ...defaultRow,
                        orderId: row.orderId,
                        postedDateTime: row.postedDateTime || '',
                        itemCode: `Error: unable to map ${row.sku} (orderItemCode = ${row.orderItemCode})`,
                        warehouseCode: 'N/A',
                        key: row.orderItemCode
                    };
                    return;
                }
                const item = itemMap[row.sku];
                if (!item.itemCode) {
                    // debug('parseSettlement() item missing?', row.sku, item);
                }

                const orderItem = whseItem(item);

                if (!order[orderItem]) {
                    order[orderItem] = {
                        ...defaultRow,
                        itemCode: item.itemCode,
                        warehouseCode: item.warehouseCode,
                        key: orderItem,
                    };
                }

                if (row.amountType === 'ItemPrice' && row.amountDescription === 'Principal') {
                    order[orderItem].quantityPurchased = order[orderItem].quantityPurchased.add(row.quantityPurchased || 0);
                }
                order[orderItem].extendedUnitPrice = order[orderItem].extendedUnitPrice.add(row.amount || 0);
                order[orderItem].unitPrice = order[orderItem].quantityPurchased.equals(0)
                    ? new Decimal(0)
                    : order[orderItem].extendedUnitPrice.dividedBy(order[orderItem].quantityPurchased)
            });

        // build the individual totals for FBA orders
        rows.filter(row => row.fulfillmentId === 'AFN')
            .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `${row.fulfillmentId}:${row.transactionType || ''}:${camelCase(row.amountType)}:${camelCase(row.amountDescription)}`;
                if (!charges[key]) {
                    charges[key] = {
                        ...defaultCharge,
                        key,
                        glAccount: glAccounts[key]?.glAccount || '',
                        salesOrderNo: afnKey,
                        transactionType: row.transactionType || '',
                        amountType: row.amountType,
                        amountDescription: row.amountDescription
                    }
                }
                charges[key].amount = charges[key].amount.add(row.amount || 0);
            })

        // get the total of FBA Orders
        totals.fba = rows.filter(row => row.fulfillmentId === 'AFN' && row.transactionType === 'Order')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0));

        // total of FBA Refunds
        totals.fbaRefund = rows.filter(row => row.fulfillmentId === 'AFN' && row.transactionType !== 'Order')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0));



        // build the totals for fulfilled by Chums orders;
        // Total of ItemPrice lines should match the total imported into Sage if all is correct
        // rest should have a GL accunt applied.
        rows.filter(row => row.fulfillmentId === 'MFN')
            .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `${row.fulfillmentId}:${row.transactionType || ''}:${camelCase(row.amountType)}:${camelCase(row.amountDescription)}`;
                if (!charges[key]) {
                    charges[key] = {
                        ...defaultCharge,
                        key,
                        glAccount: glAccounts[key]?.glAccount || '',
                        salesOrderNo: mfnKey,
                        transactionType: row.transactionType || '',
                        amountType: row.amountType,
                        amountDescription: row.amountDescription
                    }
                }
                charges[key].amount = charges[key].amount.add(row.amount || 0);
                fbmOrders.filter(so => so.CustomerPONo === row.orderId)
                    .forEach(so => {
                        so.settlementTotal = so.settlementTotal.add(row.amount || 0)
                    });

            });

        // build the total FBM --
        totals.fbm = rows.filter(row => row.fulfillmentId === 'MFN' && row.transactionType === 'Order')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0));

        totals.fbmRefund = rows.filter(row => row.fulfillmentId === 'MFN' && row.transactionType !== 'Order')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0));


        rows.filter(row => row.transactionType !== 'Order' && row.transactionType !== 'Refund')
            .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `${row.fulfillmentId}:${camelCase(row.amountType)}:${camelCase(row.amountDescription)}`;
                if (!charges[key]) {
                    charges[key] = {
                        ...defaultCharge,
                        key,
                        glAccount: glAccounts[key]?.glAccount || '',
                        salesOrderNo: ascKey,
                        amountType: row.amountType,
                        amountDescription: row.amountDescription
                    }
                }
                charges[key].amount = charges[key].amount.add(row.amount || 0);
            });

        totals.charge = rows.filter(row => row.transactionType !== 'Order')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0));

        totals.otherCharges = rows.filter(row => row.fulfillmentId !== 'AFN' && row.fulfillmentId !== 'MFN')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0));

        const lines = Object.values(order);
        return {startDate, endDate, totalAmount, charges: Object.values(charges), lines, fbmOrders, totals, itemMap, glAccounts};
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.log("parseOrder()", error.message);
            return Promise.reject(error)
        }
        console.error("parseOrder()", error);
        return Promise.reject(new Error(`Error in parseOrder(): ${error}`));
    }
}

