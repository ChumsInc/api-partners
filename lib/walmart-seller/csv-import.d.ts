export * from 'chums-local-modules/dist/express-auth';
import { Request, Response } from 'express';
export declare const testUpload: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
