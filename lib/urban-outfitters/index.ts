import {Router} from 'express';
const router = Router({mergeParams: true});

import {onUpload, test, testUpload} from './csv-import';
import {getOrders, getInvoiceTracking, postCompleteOrders} from "./orders-list";

router.get('/test', test);
router.post('/test-upload', testUpload);
router.post('/upload', onUpload);
router.post('/orders/complete', postCompleteOrders)
router.get('/orders/so/:SalesOrderNo([0-9A-Z]{7})', getOrders)
router.get('/orders/:status', getOrders)
router.get('/orders/:minDate?/:maxDate?', getOrders);
router.get('/urban-outfitters-tracking.csv', getInvoiceTracking);

export default router;
