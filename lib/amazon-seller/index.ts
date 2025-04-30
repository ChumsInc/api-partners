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
} from './orders.js';
import {getAvailable, getProduct, getProductCompetitivePricing, postProduct} from './products.js';
import {postFeed} from './product-feed.js';
import {doGetFeedSubmissionResult} from './feed.js';

const router = Router();

router.get('/order/db/:ID/:format', doLoadOrderFromDB);

router.get('/orders/since/:CreatedAfter/:format', doListOrders);
router.get('/orders/since/:CreatedAfter', doListOrders);
router.get('/orders/createOrder/:CreatedAfter', (req, res) => {
    res.json(req.params);
});
router.get('/orders', doListOrders);

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
