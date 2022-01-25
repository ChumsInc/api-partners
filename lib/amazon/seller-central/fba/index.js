"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postFBAInvoice = void 0;
const debug_1 = __importDefault(require("debug"));
const parser_1 = require("./parser");
const chums_local_modules_1 = require("chums-local-modules");
const debug = (0, debug_1.default)('chums:lib:amazon:seller-central:fba:invoice-import');
const postFBAInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const content = yield (0, chums_local_modules_1.expressUploadFile)(req);
        const data = yield (0, parser_1.parseTextFile)(content);
        const settlement = yield (0, parser_1.parseSettlement)(data);
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
});
exports.postFBAInvoice = postFBAInvoice;
