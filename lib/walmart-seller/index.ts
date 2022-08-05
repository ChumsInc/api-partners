import {Router} from 'express';
import {testUpload} from './csv-import';

const router = Router({mergeParams: true});

router.post('/test-upload', testUpload);
// router.post('/upload', onUpload);
// router.post('/orders/complete', postCompleteOrders)
// router.get('/orders/so/:SalesOrderNo([0-9A-Z]{7})', getOrders)
// router.get('/orders/:status', getOrders)
// router.get('/orders/:minDate?/:maxDate?', getOrders);
// router.get('/urban-outfitters-tracking.csv', getInvoiceTracking);

export default router;
