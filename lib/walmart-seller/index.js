import { Router } from 'express';
import { getWMItems, postBuildSalesOrder, postUpload } from './csv-import.js';
import { postWalmartOrder } from "./upload-sales-order.js";
import { deprecationNotice } from "chums-local-modules";
const router = Router({ mergeParams: true });
router.get('/items.json', getWMItems);
router.post('/test-upload.csv', deprecationNotice, postUpload);
router.post('/test-upload.json', postUpload);
router.post('/test-upload', deprecationNotice, postUpload);
router.post('/build-sales-order.txt', postBuildSalesOrder);
router.post('/upload-sales-order.json', postWalmartOrder);
// router.post('/upload', onUpload);
// router.post('/orders/complete', postCompleteOrders)
// router.get('/orders/so/:SalesOrderNo([0-9A-Z]{7})', getOrders)
// router.get('/orders/:status', getOrders)
// router.get('/orders/:minDate?/:maxDate?', getOrders);
// router.get('/urban-outfitters-tracking.csv', getInvoiceTracking);
export default router;
