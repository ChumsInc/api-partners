import type {RowDataPacket} from "mysql2";
import type {CustomerAddress} from "chums-types/b2b";


export interface AWSRequest {
    AWSAccessKeyId: string,
    Action: string,
    FeedSubmissionId?: string
    MWSAuthToken: string,
    Merchant?: string,
    SignatureMethod: string,
    SignatureVersion: string,
    Timestamp: string,
    Version: string,

    [key: string]: string | undefined | null,

    // AmazonOrderId?: string[],
}

export interface AWSValueParameters {
    [key: string]: string,
}

export interface LoggedEntry {
    idamws_response: number,
    action: string,
    status: string | number | null,
    request: AWSRequest | null,
    post: string | null,
    response: string,
    is_error_response: boolean,
    timestamp: string
}

export interface LogEntryRow extends Omit<LoggedEntry, 'request' | 'is_error_response'>, RowDataPacket {
    request: string,
    is_error_response: 1 | 0,
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
    AmazonOrderId: string
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
    AmazonOrderId: string,
    EmailAddress: string,
    ShippingAddress: CustomerAddress,
    Comment: string,
    ShipMethod: string,
    SalesOrderDetail: SalesOrderDetail[],
    LineComments: string[],
    FreightAmt: number,
    MerchantOrderID?: string,
    InvoiceData?: AmazonOrderInvoice,
    OrderItems?: AmazonOrderItem[],
}

export interface BuiltOrder {
    salesOrder: AmazonSalesOrder,
    az: AmazonOrder,
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
    name: string | null,
    InvoiceNo: string | null,
    TrackingID: string | null
}

export interface Amount {
    Amount: string | number,
    CurrencyCode: string,
}

export interface AmazonAddress extends CustomerAddress {
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

export interface AmazonOrderItem extends AmazonObject {
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
    Company: string;
    ItemCode: string;
    WarehouseCode: string;
    active: boolean;
}

export interface ItemAvailability {
    id: number;
    Company: string;
    ItemCode: string;
    QuantityAvailable: number;
    SuggestedRetailPrice: string;
    ItemCodeDesc: string | null;
    WarehouseCode: string;
    ProductTYpe: string;
    buffer: number | null;
    QuantityOnHand: number;
    QuantityOrdered: number;
    QuantityOnIT: number;
    QuantityRequiredForWO: number;
    active: number | boolean;
    SellerSKU: string;
}

export interface LoggedSalesOrder {
    Company: string;
    SalesOrderNo: string;
    OrderStatus: string;
    name: string;
}

export interface ImportedOrderResponse {
    SalesOrderNo: string;
    response: unknown;
    success: boolean;
}

export interface AmazonOrderItemStatus {
    AmazonOrderItemCode: string,
    CancelReason?: string | null,
}

export interface AmazonOrderAcknowledgement {
    AmazonOrderId: string;
    CancelReason: string | null;
    StatusCode: string;
    Item?: AmazonOrderItemStatus[];
}

export interface AmazonListOrdersParams {
    OrderStatus?: string[],
    CreatedAfter?: string,
}

export interface AmazonObject {
    [key: string]: unknown,
}

export interface ListOrdersXMLResponse {
    ListOrdersResponse: {
        ListOrdersResult: {
            Orders: {
                Order: AmazonObject[]
            }[]
        }[]
    }
}

export interface GetOrdersXMLResponse {
    GetOrderResponse: {
        GetOrderResult: {
            Orders: {
                Order: AmazonObject[]
            }[]
        }[]
    }
}

export interface AmazonErrorResponse {
    Error: string
}


export interface AmazonItem extends AmazonOrderItem {
    ShippingTax: AmazonObject;
    PromotionDiscount: AmazonObject;
    GiftWrapTax: AmazonObject;
    ShippingPrice: AmazonObject;
    GiftWrapPrice: AmazonObject;
    ItemPrice: AmazonObject;
    ItemTax: AmazonObject;
    ShippingDiscount: AmazonObject;
}

export interface ListOrderItemsXMLResponse {
    ListOrderItemsResponse: {
        ListOrderItemsResult: {
            OrderItems: {
                OrderItem: AmazonOrderItem[]
            }[]
        }[]
    }
}

export interface AmazonOrderWithInvoice extends AmazonOrder {
    InvoiceData?: AmazonOrderInvoice;
}

export interface GetCompetitivePricingForSKUXMLResponse {
    GetCompetitivePricingForSKUResponse: {
        GetCompetitivePricingForSKUResult: {
            Product: {
                Item: AmazonItem[]
            }[]
        }[]
    }
}
