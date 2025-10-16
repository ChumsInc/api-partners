import {Router} from 'express';
import {getWMItems, postUpload} from './csv-import.js';

const router = Router({mergeParams: true});

router.get('/items.json', getWMItems);
router.post('/test-upload.csv', postUpload);
router.post('/test-upload', postUpload);
// router.post('/upload', onUpload);
// router.post('/orders/complete', postCompleteOrders)
// router.get('/orders/so/:SalesOrderNo([0-9A-Z]{7})', getOrders)
// router.get('/orders/:status', getOrders)
// router.get('/orders/:minDate?/:maxDate?', getOrders);
// router.get('/urban-outfitters-tracking.csv', getInvoiceTracking);

export default router;
