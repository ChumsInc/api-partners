export function getProduct(req: any, res: any): void;
export function getProductCompetitivePricing(req: any, res: any): void;
export function postProduct(req: any, res: any): void;
export function getAvailable(req: any, res: any): void;
export function loadQuantityAvailable({ testMode, items }: {
    testMode?: boolean | undefined;
    items?: any[] | undefined;
}): Promise<any>;
