import Debug from 'debug';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const debug = Debug('chums:lib:amazon-seller:templates');
export const XML_CANCEL_REASON = './CancelReason.xml';
export const XML_ENVELOPE = './Envelope.xml';
export const XML_INVENTORY = './Inventory.xml';
export const XML_MESSAGE = './Message.xml';
export const XML_ORDER_ACK = './OrderAcknowledgement.xml';
export const XML_ORDER_ACK_ITEM = './OrderAcknowledgementItem.xml';
export const XML_PRODUCT = './Product.xml';
export const XML_ORDER_FULFILLMENT = './OrderFulfillment.xml';
export const XML_ORDER_FULFILLMENT_ITEM = './OrderFulfillmentItem.xml';
/**
 *
 * @param {String} file
 * @returns Promise.<any>
 */
export async function loadXML(file) {
    try {
        const filename = resolve(__dirname, file);
        return await readFile(filename, 'utf8');
    }
    catch (err) {
        if (err instanceof Error) {
            debug("loadXML()", err.message);
            return Promise.reject(err);
        }
        debug("loadXML()", err);
        return Promise.reject(new Error('Error in loadXML()'));
    }
}
