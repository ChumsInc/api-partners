import {Router} from 'express';
import {
    createOrder,
    doGetOrder,
    doListOrderItems,
    doListOrders,
    doLoadOrderFromDB,
    doSubmitFeed_OrderAcknowledgement,
    doSubmitFeed_OrderFulfillment,
    getOneStepOrder,
    parseOrder,
} from './orders';
import {getAvailable, getProduct, getProductCompetitivePricing, postProduct} from './products';

import {postFeed} from './product-feed';
import {doGetFeedSubmissionResult} from './feed';

const router = Router();

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

router.get('/products', getAvailable);
router.post('/product', postProduct);
router.get('/product/pricing/:SKU', getProductCompetitivePricing);
router.get('/product/:ASIN', getProduct);
router.get('/product-feed', postFeed);
router.post('/product-feed', postFeed);

router.get('/feed/result/:FeedSubmissionId', doGetFeedSubmissionResult);


export default router;
