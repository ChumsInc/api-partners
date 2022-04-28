"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const fba_1 = require("./seller-central/fba");
router.post('/seller-central/fba/invoice', fba_1.postFBAInvoice);
router.post('/seller-central/fba/gl-account', fba_1.postGLAccount);
router.post('/seller-central/fba/item-map', fba_1.postItemMap);
exports.default = router;
