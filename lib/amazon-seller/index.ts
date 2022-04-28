import {Router} from 'express';

const router = Router();
import {
    doLoadOrderFromDB,
    doListOrders,
    createOrder,
    parseOrder,
    doGetOrder,
    doListOrderItems,
    doSubmitFeed_OrderAcknowledgement,
    doSubmitFeed_OrderFulfillment, getOneStepOrder,

} from './orders';
import products from './products';

import productFeed from './product-feed';
import {doGetFeedSubmissionResult} from './feed';

router.get('/order/db/:ID(\\d+)/:format', doLoadOrderFromDB);

router.get('/orders', doListOrders);
router.get('/orders/since/:CreatedAfter(\\d+)', doListOrders);
router.get('/orders/since/:CreatedAfter(\\d+)/:format', doListOrders);
router.get('/orders/createOrder/:CreatedAfter(\\d+)', (req, res) => {
    res.json(req.params);
});

router.get('/order/create/:AmazonOrderId', createOrder);
router.get('/order/parse/:AmazonOrderId', parseOrder);
router.get('/order/id/:AmazonOrderId', doGetOrder);
router.get('/order/list/:AmazonOrderId', doGetOrder);
router.get('/order/items/:AmazonOrderId', doListOrderItems);
router.get('/order/ack/:AmazonOrderId', doSubmitFeed_OrderAcknowledgement);
router.get('/order/fulfill/:AmazonOrderId', doSubmitFeed_OrderFulfillment);
router.get('/order/onestep/:AmazonOrderId', getOneStepOrder);
router.post('/order/onestep/:AmazonOrderId', getOneStepOrder);

router.get('/products', products.getAvailable);
router.post('/product', products.postProduct);
router.get('/product/pricing/:SKU', products.getProductCompetitivePricing);
router.get('/product/:ASIN', products.getProduct);
router.get('/product-feed', productFeed.postFeed);
router.post('/product-feed', productFeed.postFeed);

router.get('/feed/result/:FeedSubmissionId', doGetFeedSubmissionResult);


export default router;
