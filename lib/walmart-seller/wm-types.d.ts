export interface ParsedCSV {
    [key:string]: string,
}

export interface WalmartCSVRow {
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
