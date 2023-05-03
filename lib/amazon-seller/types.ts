import {RowDataPacket} from "mysql2";
import {toISO8601} from "./config";


export interface AWSRequest {
    [key:string]: string|undefined|null,
    AWSAccessKeyId: string,
    Action: string,
    FeedSubmissionId?: string
    MWSAuthToken: string,
    Merchant?: string,
    SignatureMethod: string,
    SignatureVersion: string,
    Timestamp: string,
    Version: string,
    // AmazonOrderId?: string[],
}

export interface AWSValueParameters {
    [key:string]: string,
}

export interface LoggedEntry {
    idamws_response: number,
    action:string,
    status:string|number|null,
    request: AWSRequest|null,
    post: string|null,
    response: string,
    is_error_response: boolean,
    timestamp: string
}

export interface LogEntryRow extends Omit<LoggedEntry, 'request'|'is_error_response'>, RowDataPacket {
    request: string,
    is_error_response: 1|0,
}

export interface QuantityAvailableRecord {
    ItemCode: string,
    QuantityAvailable: number,
}

export interface SageInvoiceTrackingRecord {
    TrackingID: string,
    StarshipShipVia: string,
}
export interface SageInvoiceDetail {
    ItemCode: string,
    QuantityShipped: number,
}
export interface SageInvoice {
    InvoiceNo: string,
    InvoiceDate: string,
    Tracking: SageInvoiceTrackingRecord[],
    Detail: SageInvoiceDetail[],
}

export interface AmazonOrderProps {
    AmazonOrderId:string
}

export interface SalesOrderDetail {
    ItemCode: string,
    AmazonOrderItemCode: string,
    ItemCodeDesc?: string,
    QuantityOrdered: number,
    CancelReason?: string,
    UnitPrice: number,
}
export interface AmazonSalesOrder {
    ShipExpireDate: string,
    CancelDate: string,
    AmazonOrderId: string|number,
    EmailAddress: string,
    ShippingAddress: any,
    Comment: string,
    ShipMethod: string,
    SalesOrderDetail: SalesOrderDetail[],
    LineComments: string[],
    FreightAmt: number,
    MerchantOrderID?: string,
    InvoiceData?: AmazonOrderInvoice,
}
export interface BuiltOrder {
    salesOrder: AmazonSalesOrder,
    az: any,
}

export interface AmazonFulfillItem {
    AmazonOrderItemCode: string;
    Quantity: number
}
export interface AmazonFulfill {
    AmazonOrderId: string,
    MerchantFulfillmentID: string,
    FulfillmentDate: string
    CarrierCode: string
    ShippingMethod: string
    ShipperTrackingNumber: string
    Item: AmazonFulfillItem[]
}

export interface AmazonOrderInvoice {
    AmazonOrderId: string,
    Company: string,
    SalesOrderNo: string,
    OrderStatus: string,
    name: string|null,
    InvoiceNo: string|null,
    TrackingID: string|null
}

export interface Amount {
    Amount: string|number,
    CurrencyCode: string,
}
export interface AmazonAddress {
    City: string,
    PostalCode: string,
    isAddressSharingConfidential: boolean,
    StateOrRegion: string,
    CountryCode: string,
}

export interface AmazonOrder {
    AmazonOrderId: string,
    OrderType: string,
    BuyerEmail: string,
    LastUpdateDate: string,
    NumberOfItemsShipped: number,
    ShipServiceLevel: string,
    SalesChannel: string,
    OrderItems: AmazonOrderItem[],
    EarliestDeliveryDate: string,
    LatestDeliveryDate: string,
    EarliestShipDate: string,
    LatestShipDate: string,
    ShippingAddress: AmazonAddress,
    IsPrime: boolean,
    ShipmentServiceLevelCategory: string,
    isGift: boolean,
}

export interface AmazonOrderItem {
    OrderItemId: string,
    SellerSKU: string,
    ItemCode?: string,
    ShippingPrice: Amount,
    Title: string,
    QuantityOrdered: number,
    ItemPrice: Amount
}

export interface ChumsAzProduct {
    id: number;
    Company:string;
    ItemCode: string;
    WarehouseCode: string;
    active: boolean;
}
