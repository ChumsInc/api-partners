export * from 'chums-local-modules/dist/express-auth';
import { Request, Response } from 'express';
import { SageOrder } from "./uo-types";
export interface SageOrderList {
    [key: string]: SageOrder;
}
export declare const onUpload: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const testUpload: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
