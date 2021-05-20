import Debug from 'debug';
import fetch from 'node-fetch';
import {Request, Response} from 'express';
import {logResponse} from './log';
import {
    AMAZON_SC_AWSAccessKeyId,
    AMAZON_SC_DOMAIN,
    AMAZON_SC_MWSAuthToken,
    AMAZON_SC_SellerId,
    AMAZON_SC_SignatureMethod,
    AMAZON_SC_SignatureVersion,
    encode,
    getQueryString,
    getSignature,
    toISO8601
} from './config';

const AWS_FEED_API_VERSION = '2009-01-01';
const debug = Debug('chums:lib:amazon-seller:orders');

export interface GetFeedSubmissionResultProps {
    FeedSubmissionId: string,
}
export async function getFeedSubmissionResult({FeedSubmissionId}:GetFeedSubmissionResultProps):Promise<string> {
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
            headers: {'Content-Type': 'text/xml'}
        });
        const status = response.status;
        debug('getFeedSubmissionResult', status);
        // return await response.text();
        const xmlResponse = await response.text();
        await logResponse({status, request, xmlResponse});
        return xmlResponse;
    } catch (err) {
        debug('getFeedSubmissionResult', err.message);
        return Promise.reject(err);
    }
}


export async function doGetFeedSubmissionResult(req:Request, res:Response) {
    try {
        const props:GetFeedSubmissionResultProps = {
            FeedSubmissionId: req.params.FeedSubmissionId || '',
        }
        const xml = await getFeedSubmissionResult(props);
        res.set('Content-Type', 'text/xml');
        res.send(xml);
    } catch(err) {
        debug("doGetFeedSubmissionResult()", err.message);
        res.json({error: err.message});
    }
}
