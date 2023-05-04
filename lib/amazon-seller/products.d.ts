import { ChumsAzProduct } from "./types";
import { Request, Response } from "express";
export interface FetchProductProps {
    ASIN: string;
}
export declare function fetchProduct(parameters: FetchProductProps): Promise<string>;
export declare function getCompetitivePricingForSKU(SKU: string): Promise<any>;
export declare const parseObject: (azObject?: any) => any;
export interface LoadQuantityAvailableProps {
    testMode?: boolean;
    items?: unknown[];
}
export declare function loadQuantityAvailable({ testMode, items }: LoadQuantityAvailableProps): Promise<any>;
export declare function addProduct(product: ChumsAzProduct): Promise<any>;
export declare const getProduct: (req: Request, res: Response) => void;
export declare const getProductCompetitivePricing: (req: Request, res: Response) => void;
export declare const postProduct: (req: Request, res: Response) => void;
export declare const getAvailable: (req: Request, res: Response) => void;
