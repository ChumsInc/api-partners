import {AmazonErrorResponse, GetOrdersXMLResponse, ListOrdersXMLResponse} from "./types.js";

export function isListOrdersXMLResponse(arg:ListOrdersXMLResponse|AmazonErrorResponse|GetOrdersXMLResponse|unknown): arg is ListOrdersXMLResponse {
  return (arg as ListOrdersXMLResponse).ListOrdersResponse !== undefined;
}

export function isAmazonErrorResponse(arg:ListOrdersXMLResponse|AmazonErrorResponse|unknown): arg is AmazonErrorResponse {
  return (arg as AmazonErrorResponse).Error !== undefined;
}

export function isGetOrdesXMLResponse(arg:GetOrdersXMLResponse|unknown) : arg is GetOrdersXMLResponse {
    return (arg as GetOrdersXMLResponse).GetOrderResponse !== undefined;
}
