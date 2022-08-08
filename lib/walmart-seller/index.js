"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const csv_import_1 = require("./csv-import");
const router = (0, express_1.Router)({ mergeParams: true });
router.post('/test-upload', csv_import_1.postUpload);
// router.post('/upload', onUpload);
// router.post('/orders/complete', postCompleteOrders)
// router.get('/orders/so/:SalesOrderNo([0-9A-Z]{7})', getOrders)
// router.get('/orders/:status', getOrders)
// router.get('/orders/:minDate?/:maxDate?', getOrders);
// router.get('/urban-outfitters-tracking.csv', getInvoiceTracking);
exports.default = router;
