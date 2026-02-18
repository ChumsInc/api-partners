import { loadXML, XML_ENVELOPE, XML_INVENTORY, XML_MESSAGE } from './templates/index.js';
import { loadQuantityAvailable } from './products.js';
import * as config from './config.js';
import { contentMD5, parseXML, toISO8601 } from './config.js';
import Debug from 'debug';
import { execRequest } from "./common.js";
const debug = Debug('chums:lib:amazon-seller:product-feed');
// Storm Series
// Downstream 4LWater Resistant Welded Travel case
// Charcoal/Black
// 54306
// 0 93039 54306 8
// $ 44.99
// end of March
const postInventoryUpdate = async () => {
    const { AMAZON_SC_AWSAccessKeyId, AMAZON_SC_MWSAuthToken, AMAZON_SC_MarketplaceId, AMAZON_SC_SellerId, AMAZON_SC_SignatureMethod, AMAZON_SC_SignatureVersion } = config;
    try {
        const available = await loadQuantityAvailable({ testMode: false, items: [] });
        const t_envelopeXML = await loadXML(XML_ENVELOPE);
        const t_messageXML = await loadXML(XML_MESSAGE);
        const t_inventoryXML = await loadXML(XML_INVENTORY);
        const MessagesXML = available.map((item, index) => {
            const inventory = t_inventoryXML
                .replace(/{SellerSKU}/g, item.SellerSKU)
                .replace(/{QuantityAvailable}/g, item.QuantityAvailable.toString());
            return t_messageXML
                .replace(/{MessageID}/g, (index + 1).toString())
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
        const ContentMD5Value = contentMD5(body);
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
        return await await execRequest(url, request, body);
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("postInventoryUpdate()", err.message);
            return Promise.reject(err);
        }
        console.debug("postInventoryUpdate()", err);
        return Promise.reject(new Error('Error in postInventoryUpdate()'));
    }
};
export const postFeed = async (req, res) => {
    try {
        const xml = await postInventoryUpdate();
        if (req.query.json) {
            const result = await parseXML(xml);
            res.json(result);
            return;
        }
        res.set('Content-Type', 'text/xml');
        res.send(xml);
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postFeed()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in postFeed' });
    }
};
