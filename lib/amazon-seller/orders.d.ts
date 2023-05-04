import { Request, Response } from "express";
export declare function loadLastCreatedBeforeDate(): Promise<Date>;
export interface ListOrdersProps {
    CreatedAfter?: string | Date;
    OrderStatus?: string | string[];
}
export declare function ListOrders(parameters?: ListOrdersProps): Promise<string>;
export interface GetOrderProps {
    AmazonOrderId: string | string[];
}
export interface FetchSageInvoice {
    Company: string;
    SalesOrderNo: string;
}
export declare const doListOrders: (req: Request, res: Response) => Promise<undefined>;
export declare const doLoadOrderFromDB: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const doGetOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const doListOrderItems: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const parseOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const doSubmitFeed_OrderAcknowledgement: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const doSubmitFeed_OrderFulfillment: (req: Request, res: Response) => Promise<undefined>;
export declare const getOneStepOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
