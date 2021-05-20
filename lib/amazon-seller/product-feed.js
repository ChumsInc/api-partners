const config = require('./config');
const debug = require('debug')('chums:lib:amazon-seller:product-feed');
const {toISO8601, encode, getQueryString, getSignature, parseXML, getMD5} = config;
const {loadXML, XML_ENVELOPE, XML_MESSAGE, XML_INVENTORY} = require('./templates');
const fetch = require('node-fetch');
const log = require('./log');
const {mysql2Pool} = require('chums-base');
const {loadQuantityAvailable} = require('./products');


// Storm Series
// Downstream 4LWater Resistant Welded Travel case
// Charcoal/Black
// 54306
// 0 93039 54306 8
// $ 44.99
// end of March


const postInventoryUpdate = async () => {
    const {AMAZON_SC_DOMAIN, AMAZON_SC_AWSAccessKeyId, AMAZON_SC_MWSAuthToken, AMAZON_SC_MarketplaceId, AMAZON_SC_SellerId, AMAZON_SC_SignatureMethod, AMAZON_SC_SignatureVersion} = config;
    try {
        const available = await loadQuantityAvailable({testMode: false});
        const t_envelopeXML = await loadXML(XML_ENVELOPE);
        const t_messageXML = await loadXML(XML_MESSAGE);
        const t_inventoryXML = await loadXML(XML_INVENTORY);

        const MessagesXML = available.map((item, index) => {
            const inventory = t_inventoryXML
                .replace(/{SellerSKU}/g, item.SellerSKU)
                .replace(/{QuantityAvailable}/g, item.QuantityAvailable);
            return t_messageXML
                .replace(/{MessageID}/g, index + 1)
                .replace(/{MessageXML}/g, inventory)
                .replace(/>\s+</g, '><')
                .trim();
        });

        const body = t_envelopeXML
            .replace(/{SELLER_ID}/g, AMAZON_SC_SellerId)
            .replace(/{MessageType}/g, 'Inventory')
            .replace(/{MessagesXML}/g, MessagesXML.join(''))
            .replace(/>\s+</g, '><')
            .replace(/\s+/g, ' ');


        const url = '/';
        const Timestamp = toISO8601();
        // const Timestamp = '2018-04-02T17:22:26Z';

        const Action = 'SubmitFeed';
        // const body = await buildProduct(item);
        const FeedType = '_POST_INVENTORY_AVAILABILITY_DATA_';
        const ContentMD5Value = getMD5(body);
        const Version = '2009-01-01';
        // return body;
        const request = {
            AWSAccessKeyId: AMAZON_SC_AWSAccessKeyId,
            Action,
            ContentMD5Value,
            FeedType,
            MWSAuthToken: AMAZON_SC_MWSAuthToken,
            'MarketplaceIdList.Id.1': AMAZON_SC_MarketplaceId,
            Merchant: AMAZON_SC_SellerId,
            PurgeAndReplace: 'false',
            SignatureMethod: AMAZON_SC_SignatureMethod,
            SignatureVersion: AMAZON_SC_SignatureVersion,
            Timestamp,
            Version,
        };
        const signature = encode(getSignature(url, request));
        const queryStr = getQueryString(request);
        const response = await fetch(`https://${AMAZON_SC_DOMAIN}${url}?${queryStr}&Signature=${signature}`, {
            method: 'POST',
            body,
            headers: {'Content-Type': 'text/xml'}
        });
        const status = response.status;
        debug('postInventoryUpdate', status);
        // return await response.text();
        const xmlResponse = await response.text();
        await log.logResponse({status, request, xmlResponse, post: body});
        return xmlResponse;
    } catch (err) {
        debug('postInventoryUpdate', err.message);
        return Promise.reject(err);
    }
};

exports.postFeed = (req, res) => {
    postInventoryUpdate()
        .then(xml => {
            if (req.query.json) {
                parseXML(xml)
                    .then(result => {
                        res.json(result);
                    });
                return;
            }
            res.set('Content-Type', 'text/xml');
            res.send(xml);
        })
        .catch(err => {
            res.json({error: err.message});
        })
};

exports.testURL = (req, res) => {

};
