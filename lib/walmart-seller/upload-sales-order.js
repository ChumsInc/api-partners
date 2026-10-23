import { apiFetchJSON } from "chums-local-modules";
import _debug from "debug";
import { isSuccessfulImportResponse } from "../utils/typeguards.js";
const debug = _debug('chums:lib:walmart-seller:upload-sales-order');
async function uploadSalesOrder(order) {
    try {
        const url = `https://intranet.chums.com/sage/api/walmart/order-import.php`;
        return await apiFetchJSON(url, {
            method: 'POST',
            body: JSON.stringify(order),
        });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("uploadSalesOrder()", err.message);
            return Promise.reject(err);
        }
        debug("uploadSalesOrder()", err);
        return Promise.reject(new Error('Error in uploadSalesOrder()'));
    }
}
export async function postWalmartOrder(req, res) {
    try {
        const userName = res.locals.profile?.user?.name ?? 'unknown';
        const order = {
            customerPONo: req.body.customerPONo,
            userName,
            detail: req.body.detail,
        };
        // res.json({message: 'order uploaded', order});
        const response = await uploadSalesOrder(order);
        const message = isSuccessfulImportResponse(response)
            ? `Order uploaded successfully; Sales Order ${response.SalesOrderNo}`
            : 'Order upload failed';
        res.status(200).json({ message, response });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postWalmartOrder()", err.message);
            res.status(500).json({ error: err.message, name: err.name });
            return;
        }
        res.status(500).json({ error: 'unknown error in postWalmartOrder' });
    }
}
