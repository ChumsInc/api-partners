import {Router} from 'express';
import {onUpload, testUpload} from './csv-import.js';
import {getInvoiceTracking, getOrders, getOrdersV2, postCompleteOrders, removeFailedOrder} from "./orders-list.js";

const router = Router({mergeParams: true});

router.post('/test-upload', testUpload);
router.post('/upload', onUpload);
router.post('/orders/complete', postCompleteOrders)
router.get('/orders/so/:SalesOrderNo', getOrders)
router.get('/orders.json', getOrdersV2);
// router.get('/orders/:status', getOrders)
// router.get('/orders/:minDate/:maxDate', getOrders);
// router.get('/orders/:minDate', getOrders);
router.get('/urban-outfitters-tracking.csv', getInvoiceTracking);
router.delete('/urban-order/:uoOrderNo', removeFailedOrder)

export default router;
