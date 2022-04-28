import { TrackingInfo, UOSalesOrder, UOSalesOrderProps } from "./uo-types";
export declare function addSalesOrder({ uoOrderNo, SalesOrderNo, userId, import_result, original_csv, }: UOSalesOrderProps): Promise<UOSalesOrder[]>;
export interface LoadSalesOrderProps {
    uoOrderNo?: string;
    SalesOrderNo?: string;
    completed?: boolean;
    minDate?: string;
    maxDate?: string;
}
export declare function loadSalesOrder({ uoOrderNo, SalesOrderNo, completed, minDate, maxDate }: LoadSalesOrderProps): Promise<UOSalesOrder[]>;
export declare function loadItem(company: string, itemCode: string): Promise<string>;
export declare function loadTracking(company: string, invoices: string | string[]): Promise<TrackingInfo[]>;
export declare function markComplete(salesOrders: string | string[]): Promise<undefined>;
