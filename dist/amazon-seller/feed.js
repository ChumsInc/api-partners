"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doGetFeedSubmissionResult = exports.getFeedSubmissionResult = void 0;
const debug_1 = __importDefault(require("debug"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const log_1 = require("./log");
const config_1 = require("./config");
const AWS_FEED_API_VERSION = '2009-01-01';
const debug = (0, debug_1.default)('chums:lib:amazon-seller:orders');
async function getFeedSubmissionResult({ FeedSubmissionId }) {
    try {
        const url = '/';
        const Timestamp = (0, config_1.toISO8601)();
        const Action = 'getFeedSubmissionResult';
        const request = {
            AWSAccessKeyId: config_1.AMAZON_SC_AWSAccessKeyId,
            Action,
            FeedSubmissionId,
            MWSAuthToken: config_1.AMAZON_SC_MWSAuthToken,
            Merchant: config_1.AMAZON_SC_SellerId,
            SignatureMethod: config_1.AMAZON_SC_SignatureMethod,
            SignatureVersion: config_1.AMAZON_SC_SignatureVersion,
            Timestamp,
            Version: AWS_FEED_API_VERSION,
        };
        const signature = (0, config_1.encode)((0, config_1.getSignature)(url, request));
        const queryStr = (0, config_1.getQueryString)(request);
        const response = await (0, node_fetch_1.default)(`https://${config_1.AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml' }
        });
        const status = response.status;
        debug('getFeedSubmissionResult', status);
        // return await response.text();
        const xmlResponse = await response.text();
        await (0, log_1.logResponse)({ status, request, xmlResponse });
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
exports.getFeedSubmissionResult = getFeedSubmissionResult;
async function doGetFeedSubmissionResult(req, res) {
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
exports.doGetFeedSubmissionResult = doGetFeedSubmissionResult;
