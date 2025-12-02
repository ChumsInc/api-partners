import {Router} from 'express';
import rateLimiter from 'express-rate-limit';

import {onUpload, testUpload} from './csv-import.js';
import {getInvoiceTracking, getOrders, getOrdersV2, postCompleteOrders, removeFailedOrder} from "./orders-list.js";

const router = Router({mergeParams: true});

const rateLimit = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 15,
})

router.post('/test-upload.csv', testUpload);
router.post('/test-upload', testUpload);
router.post('/upload.csv', onUpload);
router.post('/upload', onUpload);
router.post('/orders/complete.json', postCompleteOrders)
router.post('/orders/complete', postCompleteOrders)
router.get('/orders/so/:SalesOrderNo', getOrders)
router.get('/orders.json', getOrdersV2);
// router.get('/orders/:status', getOrders)
// router.get('/orders/:minDate/:maxDate', getOrders);
// router.get('/orders/:minDate', getOrders);
router.get('/urban-outfitters-tracking.csv', rateLimit, getInvoiceTracking);
router.delete('/urban-order/:uoOrderNo', removeFailedOrder)

export default router;
