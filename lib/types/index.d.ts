export interface SuccessfulImportResult {
    Company: string;
    SalesOrderNo: string;
    CustomerPONo: string;
    log: string[];
    lineResponse: Record<string, string>;
    import_status: 'successful'
}

export interface FailedImportResult {
    error: string;
    Company: string;
    SalesOrderNo: string;
    CustomerPONo: string;
    log: string[];
    lineResponse: Record<string, string>;
    import_status: 'failed'
}

export type ImportResult = SuccessfulImportResult|FailedImportResult;
