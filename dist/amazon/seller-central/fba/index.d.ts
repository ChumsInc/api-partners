import { Request, Response } from 'express';
export declare const postFBAInvoice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const postGLAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const postItemMap: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
