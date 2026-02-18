export interface FetchResults {
    results: unknown;
    responseHeaders: unknown;
}
export declare function fetchGETResults(url: string, auth?: string): Promise<FetchResults>;
export declare function fetchPOST(url: string, data?: unknown, auth?: string): Promise<FetchResults>;
export declare function fetchPUT(url: string, data?: unknown, auth?: string): Promise<FetchResults>;
