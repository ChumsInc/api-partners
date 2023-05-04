import Debug from 'debug';
import fetch from 'node-fetch';
import { logResponse } from './log.js';
import { AMAZON_SC_AWSAccessKeyId, AMAZON_SC_DOMAIN, AMAZON_SC_MWSAuthToken, AMAZON_SC_SellerId, AMAZON_SC_SignatureMethod, AMAZON_SC_SignatureVersion, encode, getQueryString, getSignature, toISO8601 } from './config.js';
const AWS_FEED_API_VERSION = '2009-01-01';
const debug = Debug('chums:lib:amazon-seller:orders');
export async function getFeedSubmissionResult({ FeedSubmissionId }) {
    try {
        const url = '/';
        const Timestamp = toISO8601();
        const Action = 'getFeedSubmissionResult';
        const request = {
            AWSAccessKeyId: AMAZON_SC_AWSAccessKeyId,
            Action,
            FeedSubmissionId,
            MWSAuthToken: AMAZON_SC_MWSAuthToken,
            Merchant: AMAZON_SC_SellerId,
            SignatureMethod: AMAZON_SC_SignatureMethod,
            SignatureVersion: AMAZON_SC_SignatureVersion,
            Timestamp,
            Version: AWS_FEED_API_VERSION,
        };
        const signature = encode(getSignature(url, request));
        const queryStr = getQueryString(request);
        const response = await fetch(`https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml' }
        });
        const status = response.status;
        debug('getFeedSubmissionResult', status);
        // return await response.text();
        const xmlResponse = await response.text();
        await logResponse({ status, request, xmlResponse });
        return xmlResponse;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getFeedSubmissionResult()", err.message);
            return Promise.reject(err);
        }
        debug("getFeedSubmissionResult()", err);
        return Promise.reject(new Error('Error in getFeedSubmissionResult()'));
    }
}
export async function doGetFeedSubmissionResult(req, res) {
    try {
        const props = {
            FeedSubmissionId: req.params.FeedSubmissionId || '',
        };
        const xml = await getFeedSubmissionResult(props);
        res.set('Content-Type', 'text/xml');
        res.send(xml);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("doGetFeedSubmissionResult()", err.message);
            return Promise.reject(err);
        }
        debug("doGetFeedSubmissionResult()", err);
        return Promise.reject(new Error('Error in doGetFeedSubmissionResult()'));
    }
}
