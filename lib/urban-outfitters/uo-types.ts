import Decimal from "decimal.js";

export interface TrackingInfo {
    InvoiceNo: string,
    SalesOrderNo: string,
    StarshipShipVia:string,
    TrackingID: string,
}
export interface CarrierInfo {
    code: string,
    name: string,
    url:string,
}

export interface ParsedCSV {
    [key:string]: string,
}
export interface SalesOrderDetail {
    ItemType: string,
    ItemCode: string,
    QuantityOrdered: Decimal,
    UnitPrice: Decimal,
    CommentText: string,
}

export interface SageOrder {
    CustomerPONo: string,
    ShipExpireDate: string,
    BillToName: string,
    BillToAddress1: string,
    BillToAddress2: string,
    BillToAddress3: string,
    BillToCity:string,
    BillToState: string,
    BillToZipCode: string,
    BillToCountryCode: string,
    ShipToName: string,
    ShipToAddress1: string,
    ShipToAddress2: string,
    ShipToAddress3: string,
    ShipToCity:string,
    ShipToState: string,
    ShipToZipCode: string,
    ShipToCountryCode: string,
    TaxableAmt: Decimal,
    NonTaxableAmt: Decimal,
    SalesTaxAmt: Decimal,
    FreightAmt: Decimal,
    OrderTotal: Decimal,
    CommissionAmt: Decimal,
    detail: SalesOrderDetail[],
    commentText: string[]
    csv?: ParsedCSV[],
}

export interface UOSalesOrderProps {
    userId?: number,
    uoOrderNo?: string,
    SalesOrderNo?: string,
    import_result?: any,
    completed?: boolean,
    original_csv?: string,
}

export interface UOSalesOrder {
    uo_order_number: string,
    Company: string,
    SalesOrderNo: string,
    import_result: any,
    OrderDate: string,
    OrderStatus: string,
    BillToName: string,
    ShipExpireDate?: string | null,
    completed: boolean,
    InvoiceNo: string,
}
