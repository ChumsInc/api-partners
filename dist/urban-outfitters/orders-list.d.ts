import { Request, Response } from "express";
export declare function getOrders(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getInvoiceTracking(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function postCompleteOrders(req: Request, res: Response): Promise<void>;
