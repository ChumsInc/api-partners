export interface SettlementRow {
    settlementId?: string;
    settlementStartDate?: string;
    settlementEndDate?: string;
    depositDate?: string;
    totalAmount?: string;
    transactionType?: 'Order' | 'Refund' | 'other-transaction' | 'Vine Enrollment Fee' | 'ServiceFee' | string;
    orderId?: string;
    merchantOrderId?: string;
    adjustmentId?: string;
    shipmentId?: string;
    marketplaceName?: string;
    amountType?: string;
    amountDescription?: 'Principal' | string;
    amount?: string;
    fulfillmentId?: string;
    postedDate?: string;
    postedDateTime?: string;
    orderItemCode?: string;
    merchantOrderItemId?: string;
    merchantAdjustmentItemId?: string;
    sku?: string;
    quantityPurchased?: string;
}
export type SettlementRowField = keyof SettlementRow;
export interface SettlementOrderRow {
    orderId: string;
    postedDateTime: string;
    itemCode: string;
    sku?: string;
    warehouseCode: string;
    itemCodeDesc: string | null;
    key?: string;
    orderType: string | null;
    extendedUnitPrice: string;
    quantityPurchased: string;
    unitPrice: string;
    settlementRow: Partial<SettlementRow>[];
}
export interface SettlementOrderList {
    [key: string]: SettlementOrderRow;
}
export interface SettlementChargeTotals {
    fba: string;
    fbaRefund: string;
    fbaCharges: string;
    fbm: string;
    fbmRefund: string;
    fbmCharges: string;
    charge: string;
    otherCharges: string;
}
export interface SettlementCharge {
    key: string;
    salesOrderNo: string;
    transactionType: string;
    amountType: string;
    amountDescription: string;
    glAccount: string;
    amount: string;
    settlementRow: Partial<SettlementRow>[];
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
    itemMap: FBAItemMap;
    glAccounts: AccountList;
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
    itemCodeDesc: string | null;
    active: boolean;
}
export interface FBAItemMap {
    [sku: string]: FBAItem;
}
export interface FBMOrder {
    SalesOrderNo: string;
    CustomerPONo: string;
    OrderDate: string;
    OrderTotal: string;
    InvoiceNo: string | null;
    InvoiceDate: string | null;
    settlementTotal: string;
}
export interface GLMapRecord {
    keyValue: string;
    glAccount: string;
    AccountDesc?: string;
}
export interface AccountList {
    [key: string]: GLMapRecord;
}
