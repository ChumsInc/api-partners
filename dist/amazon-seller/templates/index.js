"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadXML = exports.XML_ORDER_FULFILLMENT_ITEM = exports.XML_ORDER_FULFILLMENT = exports.XML_PRODUCT = exports.XML_ORDER_ACK_ITEM = exports.XML_ORDER_ACK = exports.XML_MESSAGE = exports.XML_INVENTORY = exports.XML_ENVELOPE = exports.XML_CANCEL_REASON = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('chums:lib:amazon-seller:templates');
const promises_1 = require("fs/promises");
const path_1 = require("path");
exports.XML_CANCEL_REASON = './CancelReason.xml';
exports.XML_ENVELOPE = './Envelope.xml';
exports.XML_INVENTORY = './Inventory.xml';
exports.XML_MESSAGE = './Message.xml';
exports.XML_ORDER_ACK = './OrderAcknowledgement.xml';
exports.XML_ORDER_ACK_ITEM = './OrderAcknowledgementItem.xml';
exports.XML_PRODUCT = './Product.xml';
exports.XML_ORDER_FULFILLMENT = './OrderFulfillment.xml';
exports.XML_ORDER_FULFILLMENT_ITEM = './OrderFulfillmentItem.xml';
/**
 *
 * @param {String} file
 * @returns Promise.<any>
 */
async function loadXML(file) {
    try {
        const filename = (0, path_1.resolve)(__dirname, file);
        return await (0, promises_1.readFile)(filename, 'utf8');
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
exports.loadXML = loadXML;
