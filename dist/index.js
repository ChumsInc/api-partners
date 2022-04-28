"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("chums-local-modules/dist/express-auth"), exports);
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('chums:lib');
const chums_local_modules_1 = require("chums-local-modules");
const express_1 = require("express");
const shopify_integration_1 = __importDefault(require("./shopify-integration"));
const urban_outfitters_1 = __importDefault(require("./urban-outfitters"));
const amazon_1 = __importDefault(require("./amazon"));
const router = (0, express_1.Router)({ mergeParams: true });
router.use(chums_local_modules_1.validateUser, (req, res, next) => {
    const { ip, method, originalUrl } = req;
    const user = res.locals.profile?.user?.email || res.locals.profile?.user?.id || '-';
    const referer = req.get('referer') || '';
    debug(ip, user, method, originalUrl, referer);
    // debug(req.url);
    next();
});
router.use('/shopify', shopify_integration_1.default);
router.use('/urban-outfitters', urban_outfitters_1.default);
router.use('/amazon', amazon_1.default);
router.get('/exists', (req, res) => res.json({ hello: 'world' }));
exports.default = router;
