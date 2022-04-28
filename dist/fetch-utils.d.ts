export interface FetchResults {
    results: any;
    responseHeaders: any;
}
export declare function fetchGETResults(url: string, auth?: string): Promise<FetchResults>;
export declare function fetchPOST(url: string, data?: any, auth?: string): Promise<FetchResults>;
export declare function fetchPUT(url: string, data?: any, auth?: string): Promise<FetchResults>;
