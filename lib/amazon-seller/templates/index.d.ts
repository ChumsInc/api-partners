export declare const XML_CANCEL_REASON = "./CancelReason.xml";
export declare const XML_ENVELOPE = "./Envelope.xml";
export declare const XML_INVENTORY = "./Inventory.xml";
export declare const XML_MESSAGE = "./Message.xml";
export declare const XML_ORDER_ACK = "./OrderAcknowledgement.xml";
export declare const XML_ORDER_ACK_ITEM = "./OrderAcknowledgementItem.xml";
export declare const XML_PRODUCT = "./Product.xml";
export declare const XML_ORDER_FULFILLMENT = "./OrderFulfillment.xml";
export declare const XML_ORDER_FULFILLMENT_ITEM = "./OrderFulfillmentItem.xml";
/**
 *
 * @param {String} file
 * @returns Promise.<any>
 */
export declare function loadXML(file: string): Promise<string>;
