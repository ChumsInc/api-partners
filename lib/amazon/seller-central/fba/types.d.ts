import Decimal from "decimal.js";
export interface SettlementRow {
    settlementId?: string;
    settlementStartDate?: string;
    settlementEndDate?: string;
    depositDate?: string;
    totalAmount?: number;
    transactionType?: string;
    orderId?: string;
    merchantOrderId?: string;
    adjustmentId?: string;
    shipmentId?: string;
    marketplaceName?: string;
    amountType?: string;
    amountDescription?: string;
    amount?: number;
    fulfillmentId?: string;
    postedDate?: string;
    postedDateTime?: string;
    orderItemCode?: string;
    merchantOrderItemId?: string;
    merchantAdjustmentItemId?: string;
    sku?: string;
    quantityPurchased?: number;
}
export declare type SettlementRowField = keyof SettlementRow;
export interface SettlementOrderRow {
    orderId: string;
    postedDateTime: string;
    itemCode: string;
    warehouseCode: string;
    extendedUnitPrice: number;
    quantityPurchased: number;
    unitPrice: number;
}
export interface SettlementOrderList {
    [key: string]: SettlementOrderRow;
}
export interface SettlementChargeTotals {
    fba: Decimal;
    fbaRefund: Decimal;
    fbm: Decimal;
    fbmRefund: Decimal;
    charge: Decimal;
    otherCharges: Decimal;
}
export interface SettlementCharge {
    key: string;
    salesOrderNo: string;
    transactionType: string;
    amountType: string;
    amountDescription: string;
    glAccount: string;
    amount: number;
}
export interface SettlementChargeList {
    [key: string]: SettlementCharge;
}
export interface SettlementOrder {
    startDate: string;
    endDate: string;
    totalAmount: number;
    lines: SettlementOrderRow[];
    charges: SettlementCharge[];
    fbmOrders: FBMOrder[];
    totals: SettlementChargeTotals;
}
export interface SettlementImportResult {
    settlementId: string;
    company: 'chums';
    salesOrderNo: string;
    dateCreated: string;
    createdBy: number;
    dateUpdated: string;
    updatedBy: number;
    importResult: string;
    originalFile: string;
}
export interface FBAItem {
    sku: string;
    company: string;
    itemCode: string;
    warehouseCode: string;
}
export interface FBAItemMap {
    [sku: string]: FBAItem;
}
export interface FBMOrder {
    SalesOrderNo: string;
    CustomerPONo: string;
    OrderDate: string;
    OrderTotal: Decimal;
    InvoiceNo: string | null;
    InvoiceDate: string | null;
    settlementTotal: Decimal;
}
