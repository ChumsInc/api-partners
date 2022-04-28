export function genAdminApiURL(endpoint: any, options?: {}, store?: string): string;
export function fetchGETResults(url: any, store?: string): Promise<unknown>;
export function fetchPOST(url: any, data?: {}, store?: string): Promise<any>;
export function fetchPUT(url: any, data?: {}, store?: string): Promise<any>;
export function parseStore({ query, params }: {
    query: any;
    params: any;
}): any;
