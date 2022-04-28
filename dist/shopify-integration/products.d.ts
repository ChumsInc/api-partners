export function getProducts(req: any, res: any): Promise<void>;
export function getProduct(req: any, res: any): Promise<void>;
export function getChangedVariants(req: any, res: any): Promise<void>;
export function putChangedVariants(req: any, res: any): Promise<void>;
export function putSalePrice(req: any, res: any): Promise<void>;
export function fetchProducts(store?: string): Promise<unknown>;
export function fetchProduct(id: any, store: any): Promise<any>;
