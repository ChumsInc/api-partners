"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const fba_1 = require("./seller-central/fba");
router.post('/seller-central/fba/invoice', fba_1.postFBAInvoice);
exports.default = router;
