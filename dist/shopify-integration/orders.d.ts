export function loadOrderImport(id: any[] | undefined, store: any): Promise<any>;
export function fetchOrders({ status, since_id, created_at_min, created_at_max }?: {
    status?: string | undefined;
    since_id: any;
    created_at_min: any;
    created_at_max: any;
}): Promise<any[]>;
export function fetchShopifyOrder(id: any, store: any): Promise<any>;
export function triggerImport(req: any, res: any): Promise<void>;
export function fetchOrder(req: any, res: any): Promise<void>;
export function getOrder(req: any, res: any): Promise<void>;
export function getOrderRisk(req: any, res: any): Promise<void>;
export function getOrders(req: any, res: any): Promise<void>;
export function postUpdateOrderNo(req: any, res: any): Promise<undefined>;
export function getOpenPayPalInvoices(req: any, res: any): Promise<void>;
