import { Request, Response } from 'express';
export * from 'chums-local-modules/dist/express-auth';
export declare const postUpload: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
