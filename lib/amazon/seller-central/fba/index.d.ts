import { Request, Response } from 'express';
export declare const postFBAInvoice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const postFBAInvoiceBaseData: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const postFBAInvoiceSalesOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const postFBAInvoiceCharges: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const postGLAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getItemMap: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const postItemMap: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteItemMap: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
