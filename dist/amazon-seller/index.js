"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const orders_1 = require("./orders");
const products_1 = __importDefault(require("./products"));
const product_feed_1 = __importDefault(require("./product-feed"));
const feed_1 = require("./feed");
router.get('/order/db/:ID(\\d+)/:format', orders_1.doLoadOrderFromDB);
router.get('/orders', orders_1.doListOrders);
router.get('/orders/since/:CreatedAfter(\\d+)', orders_1.doListOrders);
router.get('/orders/since/:CreatedAfter(\\d+)/:format', orders_1.doListOrders);
router.get('/orders/createOrder/:CreatedAfter(\\d+)', (req, res) => {
    res.json(req.params);
});
router.get('/order/create/:AmazonOrderId', orders_1.createOrder);
router.get('/order/parse/:AmazonOrderId', orders_1.parseOrder);
router.get('/order/id/:AmazonOrderId', orders_1.doGetOrder);
router.get('/order/list/:AmazonOrderId', orders_1.doGetOrder);
router.get('/order/items/:AmazonOrderId', orders_1.doListOrderItems);
router.get('/order/ack/:AmazonOrderId', orders_1.doSubmitFeed_OrderAcknowledgement);
router.get('/order/fulfill/:AmazonOrderId', orders_1.doSubmitFeed_OrderFulfillment);
router.get('/order/onestep/:AmazonOrderId', orders_1.getOneStepOrder);
router.post('/order/onestep/:AmazonOrderId', orders_1.getOneStepOrder);
router.get('/products', products_1.default.getAvailable);
router.post('/product', products_1.default.postProduct);
router.get('/product/pricing/:SKU', products_1.default.getProductCompetitivePricing);
router.get('/product/:ASIN', products_1.default.getProduct);
router.get('/product-feed', product_feed_1.default.postFeed);
router.post('/product-feed', product_feed_1.default.postFeed);
router.get('/feed/result/:FeedSubmissionId', feed_1.doGetFeedSubmissionResult);
exports.default = router;