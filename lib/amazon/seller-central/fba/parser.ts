import {
    SettlementCharge,
    SettlementChargeList,
    SettlementOrder,
    SettlementOrderList,
    SettlementOrderRow,
    SettlementRow,
    SettlementRowField
} from "./types";
import Debug from 'debug';
import camelCase from 'camelcase';
import {loadFBAItemMap, loadFBMOrders} from "./db-handler";

const debug = Debug('chums:lib:amazon:seller-central:fba:parser');


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

export async function parseSettlement(rows: SettlementRow[]): Promise<SettlementOrder> {
    try {
        const itemMap = await loadFBAItemMap();
        const [header] = rows;
        const startDate = header?.settlementStartDate || 'N/A';
        const endDate = header?.settlementEndDate || 'N/A';
        const totalAmount = Number(header?.totalAmount) || 0;

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
            salesOrderNo: '',
            amountType: '',
            amountDescription: '',
            amount: 0,
        }

        const order: SettlementOrderList = {};
        const charges: SettlementChargeList = {};

        const fbmPOList: string[] = [];

        rows.filter(row => row.fulfillmentId === 'MFN' && !!row.orderId)
            .forEach(row => {
                if (!!row.orderId && !fbmPOList.includes(row.orderId)) {
                    fbmPOList.push(row.orderId);
                }
            });

        const fbmTotal = rows.filter(row => row.fulfillmentId === 'MFN' && !!row.orderId)
            .filter(row => row.amountType === 'ItemPrice')
            .reduce((pv, row) => pv + (row.amount || 0), 0);

        const fbmOrders = await loadFBMOrders(fbmPOList);

        rows.filter(row => row.fulfillmentId === 'AFN')
            .forEach(row => {
                if (!row.orderItemCode || !row.orderId || !row.sku) {
                    return;
                }
                if (!itemMap[row.sku]) {
                    return Promise.reject(new Error(`Unable to map item ${row.sku}`));
                }
                const item = itemMap[row.sku];

                if (!order[row.orderItemCode]) {
                    order[row.orderItemCode] = {
                        ...defaultRow,
                        orderId: row.orderId,
                        postedDateTime: row.postedDateTime || '',
                        itemCode: item.itemCode,
                        warehouseCode: item.warehouseCode
                    };
                }
                if (row.amountType === 'ItemPrice' && row.amountDescription === 'Principal') {
                    order[row.orderItemCode].quantityPurchased = row.quantityPurchased || 0;
                }
                order[row.orderItemCode].extendedUnitPrice = Number((order[row.orderItemCode].extendedUnitPrice + (row.amount || 0)).toFixed(2));
                order[row.orderItemCode].unitPrice = order[row.orderItemCode].quantityPurchased === 0
                    ? 0
                    : Number((order[row.orderItemCode].extendedUnitPrice / order[row.orderItemCode].quantityPurchased).toFixed(4));
            });

        rows.filter(row => (row.merchantOrderId === '' || row.fulfillmentId === 'MFN') && row.orderId !== '')
            .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `Fulfilled by Chums:${row.amountType}:${row.amountDescription}`;
                if (!charges[key]) {
                    charges[key] = {
                        ...defaultCharge,
                        salesOrderNo: 'Fulfilled by Chums',
                        amountType: row.amountType,
                        amountDescription: row.amountDescription
                    }
                }
                charges[key].amount += Number(row.amount);
            })

        rows.filter(row => row.fulfillmentId === 'AFN')
            .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `Fulfilled by Amazon:${row.amountType}:${row.amountDescription}`;
                if (!charges[key]) {
                    charges[key] = {
                        ...defaultCharge,
                        salesOrderNo: 'Fulfilled by Amazon',
                        amountType: row.amountType,
                        amountDescription: row.amountDescription
                    }
                }
                charges[key].amount += Number(row.amount);
            })

        rows.filter(row => row.fulfillmentId === '' && row.orderId === '')
            .forEach(row => {
                if (!row.amountType || !row.amountDescription) {
                    return;
                }
                const key = `${row.orderId || 'Settlement Total'}:${row.amountType}:${row.amountDescription}`;
                if (!charges[key]) {
                    charges[key] = {
                        ...defaultCharge,
                        salesOrderNo: row.orderId || 'Settlement Total',
                        amountType: row.amountType,
                        amountDescription: row.amountDescription
                    }
                }
                charges[key].amount += Number(row.amount);
            })

        const lines = Object.values(order);
        return {startDate, endDate, totalAmount, charges: Object.values(charges), lines, fbmOrders};
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.log("parseOrder()", error.message);
            return Promise.reject(error)
        }
        console.error("parseOrder()", error);
        return Promise.reject(new Error(`Error in parseOrder(): ${error}`));
    }
}

