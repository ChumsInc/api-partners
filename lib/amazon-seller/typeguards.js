export function isListOrdersXMLResponse(arg) {
    return arg.ListOrdersResponse !== undefined;
}
export function isAmazonErrorResponse(arg) {
    return arg.Error !== undefined;
}
export function isGetOrdesXMLResponse(arg) {
    return arg.GetOrderResponse !== undefined;
}
