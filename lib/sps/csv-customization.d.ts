import { SPSBaseCustomer, SPSOrderLine, SPSSalesOrder, SPSSalesOrderDetailLine } from "./sps-types";
/**
 * This function should return only new or changed fields to the SalesOrder
 */
export declare const updateCustomHeader: (customer: SPSBaseCustomer, header: unknown, csvLine: unknown) => Partial<SPSSalesOrder>;
/**
 * This function should return only changed fields to the SalesOrder Detail Line
 */
export declare const updateCustomDetail: (customer: SPSBaseCustomer, csvLine: SPSOrderLine) => Partial<SPSSalesOrderDetailLine>;
