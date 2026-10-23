import {FailedImportResult, SuccessfulImportResult} from "../types/index.js";

export function isSuccessfulImportResponse(response: SuccessfulImportResult|FailedImportResult): response is SuccessfulImportResult {
    return response.import_status === 'successful';
}
