import Decimal from "decimal.js";

export interface ParsedCSV {
    [key:string]: string,
}

export interface WalmartRawCSVRow {
    "Period Start Date": string;
    "Period End Date": string;
    "Total Payable": string;
    "Currency": string;
    "Transaction Key": string;
    "Transaction Posted Timestamp": string;
    "Transaction Type": string;
    "Transaction Description": string;
    "Customer Order #": string;
    "Customer Order line #": string;
    "Purchase Order #": string;
    "Purchase Order line #": string;
    "Amount": string;
    "Amount Type": string;
    "Ship Qty": string;
    "Commission Rate": string;
    "Transaction Reason Description": string;
    "Partner Item Id": string;
    "Partner GTIN": string;
    "Partner Item Name": string;
    "Product Tax Code": string;
    "Ship to State": string;
    "Ship to City": string;
    "Ship to Zipcode": string;
    "Contract Category": string;
    "Product Type": string;
    "Commission Rule": string;
    "Shipping Method": string;
    "Fulfillment Type": string;
}

export interface WalmartCSVRow {
    "periodStartDate": string;
    "periodEndDate":string;
    "totalPayable":string;
    "currency":string;
    "transactionKey":string;
    "transactionPostedTimestamp":string;
    "transactionType":string;
    "transactionDescription":string;
    "customerOrderNo":string;
    "customerOrderLineNo":string;
    "purchaseOrderNo":string;
    "purchaseOrderLineNo":string;
    "amount":string;
    "amountType":string;
    "shipQty":string;
    "commissionRate":string;
    "transactionReasonDescription":string;
    "partnerItemId":string;
    "partnerGTIN":string;
    "partnerItemName":string;
    "productTaxCode":string;
    "shipToState":string;
    "shipToCity":string;
    "shipToZipcode":string;
    "contractCategory":string;
    "productType":string;
    "commissionRule":string;
    "shippingMethod":string;
    "fulfillmentType":string;
}

export type WalmartCSVTitles = Record<string, keyof WalmartCSVRow>;
// export type WalmartCSVTitles = {
//     [key in keyof WalmartRawCSVRow]: keyof WalmartCSVRow;
// };




export interface WMItemTotal {
    partnerItemId: string;
    description: string;
    shipQty: Decimal.Value,
    amount: Decimal.Value,
    commission: Decimal.Value;
}

export interface WMItemTotalList {
    [key:string]: WMItemTotal;
}
