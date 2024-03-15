import Debug from 'debug';
import camelCase from 'camelcase';
import { loadAMZItemMap, loadFBAItemMap, loadFBMOrders, loadGLMap } from "./db-handler.js";
import { parseJSON } from 'date-fns';
import Decimal from "decimal.js";
const debug = Debug('chums:lib:amazon:seller-central:fba:parser');
const mfnKey = 'Fulfilled by Chums';
const afnKey = 'Fulfilled by Amazon';
const ascKey = 'Settlement Charges';
const defaultOrderRow = {
    orderId: '',
    postedDateTime: '',
    itemCode: '',
    warehouseCode: '',
    itemCodeDesc: null,
    extendedUnitPrice: new Decimal(0).toString(),
    quantityPurchased: new Decimal(0).toString(),
    unitPrice: new Decimal(0).toString(),
    orderType: null,
    settlementRow: [],
};
const defaultChargeRow = {
    key: '',
    salesOrderNo: '',
    transactionType: '',
    amountType: '',
    amountDescription: '',
    glAccount: '',
    amount: new Decimal(0).toString(),
    settlementRow: [],
};
export async function parseTextFile(content) {
    try {
        const [header, ...rest] = content.trim().split('\n');
        const fields = header.split('\t').map(str => camelCase(str.trim()));
        return rest.map(line => {
            const row = {};
            line.split('\t').map((value, index) => {
                const field = fields[index];
                row[field] = value;
                // if (field === 'amount' || field === 'quantityPurchased' || field === 'totalAmount') {
                //     row[field] = Number(value);
                // } else {
                //     row[field] = value;
                // }
            });
            return row;
        });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("parseTextFile()", err?.message);
            return Promise.reject(err);
        }
        debug("parseTextFile()", err);
        return Promise.reject(err);
    }
}
const whseItem = ({ warehouseCode, itemCode }) => {
    return `${warehouseCode}:${itemCode}`;
};
async function buildPOList(rows) {
    try {
        const fbmPOList = [];
        // get a list of Chums Fulfilled orders
        rows.filter(row => row.fulfillmentId === 'MFN' && row.transactionType === 'Order' && !!row.orderId)
            .forEach(row => {
            if (!!row.orderId && !fbmPOList.includes(row.orderId)) {
                fbmPOList.push(row.orderId);
            }
        });
        return fbmPOList;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("buildPOList()", err.message);
            return Promise.reject(err);
        }
        console.debug("buildPOList()", err);
        return Promise.reject(new Error('Error in buildPOList()'));
    }
}
async function buildItemMap(rows) {
    try {
        const mappedItems = await loadFBAItemMap();
        const lookupItems = rows
            .filter(row => row.fulfillmentId === 'AFN' && (row.transactionType === 'Order' || row.transactionType === 'Refund'))
            .filter(row => !!row.sku && !mappedItems[row.sku])
            .reduce((pv, row) => {
            if (!!row.sku && !pv.includes(row.sku)) {
                return [...pv, row.sku].sort();
            }
            return pv;
        }, []);
        const unmappedItems = await loadAMZItemMap(lookupItems);
        return { ...mappedItems, ...unmappedItems };
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("buildItemMap()", err.message);
            return Promise.reject(err);
        }
        console.debug("buildItemMap()", err);
        return Promise.reject(new Error('Error in buildItemMap()'));
    }
}
function simpleRow(row) {
    const { orderId, sku, quantityPurchased, amount, totalAmount } = row;
    return { orderId, sku, quantityPurchased, amount, totalAmount };
}
async function buildCharges(rows, glAccounts) {
    try {
        const charges = {};
        const chargeKey = (row) => {
            return `${row.fulfillmentId}:${row.transactionType || ''}:${camelCase(row.amountType ?? '')}:${camelCase(row.amountDescription ?? '')}`;
        };
        const altChargeKey = (row) => {
            return `${row.fulfillmentId}:${camelCase(row.amountType ?? '')}:${camelCase(row.amountDescription ?? '')}`;
        };
        const afnRows = rows.filter(row => row.fulfillmentId === 'AFN')
            .filter(row => !(!row.amountType || !row.amountDescription));
        // build the individual totals for FBA orders
        afnRows.forEach(row => {
            if (!row.amountType || !row.amountDescription) {
                return;
            }
            const key = chargeKey(row);
            if (!charges[key]) {
                charges[key] = {
                    ...defaultChargeRow,
                    key,
                    glAccount: glAccounts[key]?.glAccount || '',
                    salesOrderNo: afnKey,
                    transactionType: row.transactionType || '',
                    amountType: row.amountType,
                    amountDescription: row.amountDescription
                };
            }
            charges[key].amount = new Decimal(charges[key].amount).add(row.amount || 0).toString();
            // charges[key].settlementRow = [...charges[key].settlementRow, row];
        });
        debug('buildCharges() afnRows', afnRows.length, Object.keys(charges).length);
        // build the totals for fulfilled by Chums orders;
        // Total of ItemPrice lines should match the total imported into Sage if all is correct
        // rest should have a GL account applied.
        const mfnRows = rows.filter(row => row.fulfillmentId === 'MFN')
            .filter(row => !(!row.amountType || !row.amountDescription));
        mfnRows.forEach(row => {
            if (!row.amountType || !row.amountDescription) {
                return;
            }
            const key = chargeKey(row);
            if (!charges[key]) {
                charges[key] = {
                    ...defaultChargeRow,
                    key,
                    glAccount: glAccounts[key]?.glAccount || '',
                    salesOrderNo: mfnKey,
                    transactionType: row.transactionType || '',
                    amountType: row.amountType,
                    amountDescription: row.amountDescription
                };
            }
            charges[key].amount = new Decimal(charges[key].amount).add(row.amount || 0).toString();
            // charges[key].settlementRow = [...charges[key].settlementRow, row];
        });
        debug('buildCharges() mfnRows', mfnRows.length, Object.keys(charges).length);
        const otherRows = rows.filter(row => row.transactionType !== 'Order' && row.transactionType !== 'Refund')
            .filter(row => !(!row.amountType || !row.amountDescription));
        otherRows.forEach(row => {
            if (!row.amountType || !row.amountDescription) {
                return;
            }
            const key = altChargeKey(row);
            if (!charges[key]) {
                charges[key] = {
                    ...defaultChargeRow,
                    key,
                    glAccount: glAccounts[key]?.glAccount || '',
                    salesOrderNo: ascKey,
                    amountType: row.amountType,
                    amountDescription: row.amountDescription
                };
            }
            charges[key].amount = new Decimal(charges[key].amount).add(row.amount || 0).toString();
            // charges[key].settlementRow = [...charges[key].settlementRow, row];
        });
        debug('buildCharges() otherRows', otherRows.length, Object.keys(charges).length);
        return charges;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("buildCharges()", err.message);
            return Promise.reject(err);
        }
        console.debug("buildCharges()", err);
        return Promise.reject(new Error('Error in buildCharges()'));
    }
}
export async function updateFBMOrders(rows) {
    try {
        const fbmPOList = await buildPOList(rows);
        const fbmOrders = await loadFBMOrders(fbmPOList);
        rows.filter(row => row.fulfillmentId === 'MFN')
            .forEach(row => {
            if (!row.amountType || !row.amountDescription) {
                return;
            }
            fbmOrders
                .filter(so => so.CustomerPONo === row.orderId)
                .forEach(so => {
                so.settlementTotal = new Decimal(so.settlementTotal).add(row.amount || 0).toString();
            });
        });
        return fbmOrders;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("updateFBMOrders()", err.message);
            return Promise.reject(err);
        }
        console.debug("updateFBMOrders()", err);
        return Promise.reject(new Error('Error in updateFBMOrders()'));
    }
}
export async function buildTotals(rows) {
    try {
        const totals = {
            fba: '0',
            fbaRefund: '0',
            fbaCharges: '0',
            fbm: '0',
            fbmRefund: '0',
            fbmCharges: '0',
            charge: '0',
            otherCharges: '0',
        };
        // get the total of FBA Orders
        totals.fba = rows.filter(row => row.fulfillmentId === 'AFN')
            .filter(row => row.transactionType === 'Order' || row.transactionType === 'Refund')
            .filter(row => row.amountDescription === 'Principal' && row.amountType === 'ItemPrice')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0)).toString();
        totals.fbaCharges = rows.filter(row => row.fulfillmentId === 'AFN')
            .filter(row => row.transactionType === 'Order' || row.transactionType === 'Refund')
            .filter(row => !(row.amountDescription === 'Principal' && row.amountType === 'ItemPrice'))
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0)).toString();
        //
        // // total of FBA Refunds
        // totals.fbaRefund = rows.filter(row => row.fulfillmentId === 'AFN' && row.transactionType === 'Refund' && row.amountDescription === 'Principal')
        //     .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0)).toString();
        // build the total FBM --
        totals.fbm = rows.filter(row => row.fulfillmentId === 'MFN')
            .filter(row => row.transactionType === 'Order' || row.transactionType === 'Refund')
            .filter(row => row.amountDescription === 'Principal' && row.amountType === 'ItemPrice')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0)).toString();
        totals.fbmCharges = rows.filter(row => row.fulfillmentId === 'MFN')
            .filter(row => row.transactionType === 'Order' || row.transactionType === 'Refund')
            .filter(row => !(row.amountDescription === 'Principal' && row.amountType === 'ItemPrice'))
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0)).toString();
        totals.charge = rows.filter(row => row.transactionType !== 'Order' && row.transactionType !== 'Refund')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0)).toString();
        totals.otherCharges = rows
            .filter(row => row.fulfillmentId !== 'AFN' && row.fulfillmentId !== 'MFN')
            .reduce((pv, row) => pv.add(row.amount || 0), new Decimal(0)).toString();
        debug('buildTotals()', totals);
        return totals;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("buildTotals()", err.message);
            return Promise.reject(err);
        }
        console.debug("buildTotals()", err);
        return Promise.reject(new Error('Error in buildTotals()'));
    }
}
export async function buildOrderLines(rows, itemMap) {
    try {
        const order = {};
        rows
            .filter(row => {
            return row.fulfillmentId === 'AFN'
                && ['Order', 'Refund'].includes(row.transactionType || '')
                && row.amountType === 'ItemPrice'
                && row.amountDescription?.toLowerCase() === 'principal';
        })
            .forEach(row => {
            if (!row.orderItemCode || !row.orderId || !row.sku) {
                return;
            }
            const { sku } = row;
            const item = itemMap[sku] || null;
            const orderKey = sku;
            if (!order[orderKey]) {
                if (!!item) {
                    const orderItem = whseItem(item);
                    order[orderKey] = {
                        ...defaultOrderRow,
                        sku: row.sku,
                        itemCode: item.itemCode,
                        warehouseCode: item.warehouseCode,
                        itemCodeDesc: item.itemCodeDesc,
                        key: orderKey,
                    };
                }
                else {
                    order[orderKey] = {
                        ...defaultOrderRow,
                        orderId: row.orderId,
                        itemCode: sku,
                        itemCodeDesc: `Error: unable to map ${sku}`,
                        sku: sku,
                        key: row.orderItemCode,
                    };
                }
            }
            order[orderKey].settlementRow = [...order[orderKey].settlementRow, row];
            if (['ItemPrice'].includes(row.amountType ?? '') && row.amountDescription === 'Principal') {
                order[orderKey].quantityPurchased = new Decimal(order[orderKey].quantityPurchased)
                    .add(row.transactionType === 'Refund' ? -1 : (row.quantityPurchased || 0))
                    .toString();
            }
            order[orderKey].extendedUnitPrice = new Decimal(order[orderKey].extendedUnitPrice).add(row.amount || 0).toString();
            order[orderKey].unitPrice = new Decimal(order[orderKey].quantityPurchased).equals(0)
                ? new Decimal(0).toString()
                : new Decimal(order[orderKey].extendedUnitPrice).dividedBy(order[orderKey].quantityPurchased).toString();
        });
        return order;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("buildOrderLines()", err.message);
            return Promise.reject(err);
        }
        console.debug("buildOrderLines()", err);
        return Promise.reject(new Error('Error in buildOrderLines()'));
    }
}
export async function parseSettlement(rows) {
    try {
        const glAccounts = await loadGLMap();
        const [header] = rows;
        const startDate = parseJSON(header?.settlementStartDate || '').toISOString();
        const endDate = parseJSON(header?.settlementEndDate || '').toISOString();
        const totalAmount = Number(header?.totalAmount) || 0;
        // load the list of FBM orders
        const fbmOrders = await updateFBMOrders(rows);
        const charges = await buildCharges(rows, glAccounts);
        // load the list of amazon fulfilled items that need to be invoiced from AMZ warehouse
        const itemMap = await buildItemMap(rows);
        const order = await buildOrderLines(rows, itemMap);
        const totals = await buildTotals(rows);
        return {
            startDate,
            endDate,
            totalAmount,
            charges: Object.values(charges),
            lines: Object.values(order),
            fbmOrders,
            totals,
            itemMap,
            glAccounts
        };
    }
    catch (error) {
        if (error instanceof Error) {
            console.log("parseOrder()", error.message);
            return Promise.reject(error);
        }
        console.error("parseOrder()", error);
        return Promise.reject(new Error(`Error in parseOrder(): ${error}`));
    }
}
export async function parseSettlementBaseData(rows) {
    try {
        const glAccounts = await loadGLMap();
        const [header] = rows;
        const startDate = parseJSON(header?.settlementStartDate || '').toISOString();
        const endDate = parseJSON(header?.settlementEndDate || '').toISOString();
        const totalAmount = Number(header?.totalAmount) || 0;
        // load the list of FBM orders
        const fbmOrders = await updateFBMOrders(rows);
        // load the list of amazon fulfilled items that need to be invoiced from AMZ warehouse
        const itemMap = await buildItemMap(rows);
        const totals = await buildTotals(rows);
        return {
            startDate,
            endDate,
            totalAmount,
            fbmOrders,
            totals,
            itemMap,
            glAccounts
        };
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("parseSettlementBaseData()", err.message);
            return Promise.reject(err);
        }
        console.debug("parseSettlementBaseData()", err);
        return Promise.reject(new Error('Error in parseSettlementBaseData()'));
    }
}
export async function parseSettlementCharges(rows) {
    try {
        const glAccounts = await loadGLMap();
        const charges = await buildCharges(rows, glAccounts);
        return {
            glAccounts,
            charges: Object.values(charges),
        };
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("parseSettlementCharges()", err.message);
            return Promise.reject(err);
        }
        console.debug("parseSettlementCharges()", err);
        return Promise.reject(new Error('Error in parseSettlementCharges()'));
    }
}
export async function parseSettlementSalesOrder(rows) {
    try {
        const itemMap = await buildItemMap(rows);
        const lines = await buildOrderLines(rows, itemMap);
        return {
            itemMap,
            lines: Object.values(lines)
        };
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("parseSettlementCharges()", err.message);
            return Promise.reject(err);
        }
        console.debug("parseSettlementCharges()", err);
        return Promise.reject(new Error('Error in parseSettlementCharges()'));
    }
}
