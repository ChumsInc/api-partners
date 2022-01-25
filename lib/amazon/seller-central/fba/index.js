"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postFBAInvoice = void 0;
const debug_1 = __importDefault(require("debug"));
const parser_1 = require("./parser");
const chums_local_modules_1 = require("chums-local-modules");
const debug = (0, debug_1.default)('chums:lib:amazon:seller-central:fba:invoice-import');
const postFBAInvoice = async (req, res) => {
    try {
        const content = await (0, chums_local_modules_1.expressUploadFile)(req);
        const data = await (0, parser_1.parseTextFile)(content);
        const settlement = await (0, parser_1.parseSettlement)(data);
        res.json({ settlement, data });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("test()", err.message);
            return res.json({ error: err.message });
        }
        debug("test()", err);
        res.json({ error: err });
    }
};
exports.postFBAInvoice = postFBAInvoice;
