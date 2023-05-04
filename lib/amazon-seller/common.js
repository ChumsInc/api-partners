import { AMAZON_SC_DOMAIN, encode, getQueryString, getSignature } from "./config.js";
import fetch from "node-fetch";
import { logResponse } from "./log.js";
export async function execRequest(url, request, body) {
    const signature = encode(getSignature(url, request));
    const queryStr = getQueryString(request);
    const requestOptions = {
        method: 'POST',
    };
    if (body) {
        requestOptions.body = body;
        requestOptions.headers = { 'Content-Type': 'text/xml' };
    }
    const response = await fetch(`https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, requestOptions);
    const status = response.status;
    const xmlResponse = await response.text();
    await logResponse({ status, request, xmlResponse, post: body });
    return xmlResponse;
}
