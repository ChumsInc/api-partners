export function postAction(req: any, res: any): void;
/**
 *
 * @param {Object} params
 * @param {String} params.Company
 * @param {String} params.SalesOrderNo
 * @param {String} params.AmazonOrderId
 * @param {String} params.OrderStatus
 * @param {String} [params.Notes]
 * @param {number} params.UserID
 * @param {String} params.action
 */
export function logSalesOrder(params: {
    Company: string;
    SalesOrderNo: string;
    AmazonOrderId: string;
    OrderStatus: string;
    Notes?: string | undefined;
    UserID: number;
    action: string;
}): Promise<{
    success: boolean;
}>;
export function loadSalesOrder({ AmazonOrderId }: {
    AmazonOrderId: any;
}): Promise<import("mysql2/typings/mysql/lib/protocol/packets/RowDataPacket")[] | import("mysql2/typings/mysql/lib/protocol/packets/RowDataPacket")[][] | import("mysql2/typings/mysql/lib/protocol/packets/OkPacket") | import("mysql2/typings/mysql/lib/protocol/packets/OkPacket")[] | import("mysql2/typings/mysql/lib/protocol/packets/ResultSetHeader")>;
/**
 *
 * @param {string[]} AmazonOrderId
 * @return {Promise<AmazonOrderInvoice[]>}
 */
export function loadInvoiceData(AmazonOrderId?: string[]): Promise<AmazonOrderInvoice[]>;
