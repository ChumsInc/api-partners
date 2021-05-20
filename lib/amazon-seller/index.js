const router = require('express').Router();
const orders = require('./orders');
const products = require('./products');
const productFeed = require('./product-feed');
const feed = require('./feed');

router.get('/order/db/:ID(\\d+)/:format', orders.doLoadOrderFromDB);

router.get('/orders', orders.doListOrders);
router.get('/orders/since/:CreatedAfter(\\d+)', orders.doListOrders);
router.get('/orders/since/:CreatedAfter(\\d+)/:format', orders.doListOrders);
router.get('/orders/createOrder/:CreatedAfter(\\d+)', (req, res) => {
    res.json(req.params);
});

router.get('/order/create/:AmazonOrderId', orders.createOrder);
router.get('/order/parse/:AmazonOrderId', orders.parseOrder);
router.get('/order/id/:AmazonOrderId', orders.doGetOrder);
router.get('/order/list/:AmazonOrderId', orders.doGetOrder);
router.get('/order/items/:AmazonOrderId', orders.doListOrderItems);
router.get('/order/ack/:AmazonOrderId', orders.doSubmitFeed_OrderAcknowledgement);
router.get('/order/fulfill/:AmazonOrderId', orders.doSubmitFeed_OrderFulfillment);
router.get('/order/onestep/:AmazonOrderId', orders.getOneStepOrder);
router.post('/order/onestep/:AmazonOrderId', orders.getOneStepOrder);

router.get('/products', products.getAvailable);
router.post('/product', products.postProduct);
router.get('/product/pricing/:SKU', products.getProductCompetitivePricing);
router.get('/product/:ASIN', products.getProduct);
router.get('/product-feed', productFeed.postFeed);
router.post('/product-feed', productFeed.postFeed);

router.get('/feed/result/:FeedSubmissionId', feed.doGetFeedSubmissionResult);




exports.router = router;
