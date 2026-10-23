export function isSuccessfulImportResponse(response) {
    return response.import_status === 'successful';
}
