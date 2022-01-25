import {
    FBAItem,
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
import {loadFBAItemMap, loadFBMOrders} from "./db-handler";
import {parseJSON} from 'date-fns'

const debug = Debug('chums:lib:amazon:seller-central:fba:parser');

const mfnKey = 'Fulfilled by Chums';
const afnKey = 'Fulfilled by Amazon';
const ascKey = 'Settlement Charges';

const GLAccounts = {
    'MFN:itemFees:commission': '6500-02-08',
    ':otherTransaction:subscriptionFee': '6500-02-08',
    ':otherTransaction:shippingLabelPurchase': '6500-02-08',
    ':otherTransaction:fbaInboundTransportationFee': '6500-02-08',
    ':costOfAdvertising:transactionTotalAmount': '6600-02-08',
    ':otherTransaction:currentReserveAmount': '1975-00-00',
    ':otherTransaction:previousReserveAmountBalance': '1975-00-00',
}


export async function parseTextFile(content: string): Promise<SettlementRow[]> {
    try {
        const [header, ...rest] = content.trim().split('\n');
        const fields: SettlementRowField[] = header.split('\t').map(str => camelCase(str.trim()) as SettlementRowField);

        return rest.map(line => {
            const row: SettlementRow = {};
            line.split('\t').map((value, index) => {
                const field: SettlementRowField = fields[index];
                if (field === 'amount' || field === 'quantityPurchased' || field === 'totalAmount') {
                    row[field] = Number(value);
                } else {
                    row[field] = value;
                }
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

const whseItem = ({itemCode, warehouseCode}:FBAItem):string => {
    return `${warehouseCode}:${itemCode}`;
}

export async function parseSettlement(rows: SettlementRow[]): Promise<SettlementOrder> {
    try {
        const itemMap = await loadFBAItemMap();
        const [header] = rows;
        const startDate = parseJSON(header?.settlementStartDate || '').toISOString();
        const endDate = parseJSON(header?.settlementEndDate || '').toISOString();
        const totalAmount = Number(header?.totalAmount) || 0;
        const totals:SettlementChargeTotals = {
            fba: 0,
            fbm: 0,
            charge: 0,
        }

        const defaultRow: SettlementOrderRow = {
            orderId: '',
            postedDateTime: '',
            itemCode: '',
            warehouseCode: '',
            extendedUnitPrice: 0,
            quantityPurchased: 0,
            unitPrice: 0,
        }

        const defaultCharge: SettlementCharge = {
            key: '',
            salesOrderNo: '',
            amountType: '',
            amountDescription: '',
            glAccount: '',
            amount: 0,
        }

        const order: SettlementOrderList = {};
        const charges: SettlementChargeList = {};

        const fbmPOList: string[] = [];

        // get a list of Chums Fulfilled orders
        rows.filter(row => row.fulfillmentId === 'MFN' && !!row.orderId)
            .forEach(row => {
                if (!!row.orderId && !fbmPOList.includes(row.orderId)) {
                    fbmPOList.push(row.orderId);
                }
            });

        // get Settlement order total for fulfilled by Chums
        const fbmTotal = rows.filter(row => row.fulfillmentId === 'MFN' && !!row.orderId)
            .filter(row => row.amountType === 'ItemPrice')
            .reduce((pv, row) => pv + (row.amount || 0), 0);

        // load the list of orders
        const fbmOrders = await loadFBMOrders(fbmPOList);

        // load the list of amazon fulfilled items that need to be invoices from AMZ warehouse
        rows.filter(row => row.fulfillmentId === 'AFN')
            .forEach(row => {

                if (!row.orderItemCode || !row.orderId || !row.sku) {
                    return;
                }

                if (!itemMap[row.sku]) {
                    order[row.orderItemCode] = {
                        ...defaultRow,
                        orderId: row.orderId,
                        postedDateTime: row.postedDateTime || '',
                        itemCode: `Error: unable to map ${row.sku}`,
                        warehouseCode: 'N/A',
                    };
                    return;
                }
                const item = itemMap[row.sku];

                const orderItem = whseItem(itemMap[row.sku]);

                if (!order[orderItem]) {
                    order[orderItem] = {
                        ...defaultRow,
                        itemCode: item.itemCode,
                        warehouseCode: item.warehouseCode
                    };
                }

                if (row.amountType === 'ItemPrice' && row.amountDescription === 'Principal') {
                    order[orderItem].quantityPurchased += row.quantityPurchased || 0;
                }
                order[orderItem].extendedUnitPrice += row.amount || 0;
                order[orderItem].unitPrice = order[orderItem].quantityPurchased === 0
                    ? 0
                    : (order[orderItem].extendedUnitPrice / order[orderItem].quantityPurchased)
            });

        // build the individual totals for FBA orders
        rows.filter(row => row.fulfillmentId === 'AFN')
            .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `${row.fulfillmentId}:${camelCase(row.amountType)}:${camelCase(row.amountDescription)}`;
                if (!charges[key]) {
                    charges[key] = {
                        ...defaultCharge,
                        key,
                        glAccount: GLAccounts[key] || '',
                        salesOrderNo: afnKey,
                        amountType: row.amountType,
                        amountDescription: row.amountDescription
                    }
                }
                charges[key].amount += Number(row.amount);
            })

        // get the total of FBA Items
        totals.fba = rows.filter(row => row.fulfillmentId === 'AFN')
            .filter(row => !!row.orderItemCode && !!row.orderId && !!row.sku)
            .reduce((pv, row) => pv + (row.amount || 0), 0);



        // build the totals for fulfilled by Chums orders;
        // Total of ItemPrice lines should match the total imported into Sage if all is correct
        // rest should have a GL accunt applied.
        rows.filter(row => row.fulfillmentId === 'MFN')
            .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `${row.fulfillmentId}:${camelCase(row.amountType)}:${camelCase(row.amountDescription)}`;
                if (!charges[key]) {
                    charges[key] = {
                        ...defaultCharge,
                        key,
                        glAccount: GLAccounts[key] || '',
                        salesOrderNo: mfnKey,
                        amountType: row.amountType,
                        amountDescription: row.amountDescription
                    }
                }
                charges[key].amount += Number(row.amount);
                fbmOrders.filter(so => so.CustomerPONo === row.orderId)
                    .forEach(so => {
                        so.settlementTotal += (row.amount || 0)
                    });

            });

        // build the total FBM --
        totals.fbm = rows.filter(row => row.fulfillmentId === 'MFN')
            .filter(row => !!row.amountType || !row.amountDescription)
            .reduce((pv, row) => pv + (row.amount || 0), 0);


        rows.filter(row => row.transactionType !== 'Order')
            .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `${row.fulfillmentId}:${camelCase(row.amountType)}:${camelCase(row.amountDescription)}`;
                if (!charges[key]) {
                    charges[key] = {
                        ...defaultCharge,
                        key,
                        glAccount: GLAccounts[key] || '',
                        salesOrderNo: ascKey,
                        amountType: row.amountType,
                        amountDescription: row.amountDescription
                    }
                }
                charges[key].amount += Number(row.amount);
            });

        totals.charge = rows.filter(row => row.transactionType !== 'Order')
            .reduce((pv, row) => pv + (row.amount || 0), 0);

        const lines = Object.values(order);
        return {startDate, endDate, totalAmount, charges: Object.values(charges), lines, fbmOrders, totals};
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.log("parseOrder()", error.message);
            return Promise.reject(error)
        }
        console.error("parseOrder()", error);
        return Promise.reject(new Error(`Error in parseOrder(): ${error}`));
    }
}

