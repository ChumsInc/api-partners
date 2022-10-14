"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteItemMap = exports.postItemMap = exports.getItemMap = exports.postGLAccount = exports.postFBAInvoice = void 0;
const debug_1 = __importDefault(require("debug"));
const parser_1 = require("./parser");
const chums_local_modules_1 = require("chums-local-modules");
const db_handler_1 = require("./db-handler");
const debug = (0, debug_1.default)('chums:lib:amazon:seller-central:fba:invoice-import');
const postFBAInvoice = async (req, res) => {
    try {
        const content = await (0, chums_local_modules_1.expressUploadFile)(req);
        const data = await (0, parser_1.parseTextFile)(content);
        const settlement = await (0, parser_1.parseSettlement)(data);
        res.json({ settlement });
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
const postGLAccount = async (req, res) => {
    try {
        if (!req.body.glAccount || !req.body.keyValue) {
            debug('postGLAccount()', 'invalid body', req.body);
            return res.status(406).json({ error: 'Missing keyValue or glAccount values' });
        }
        const glAccounts = await (0, db_handler_1.addGLAccount)(req.body);
        res.json({ glAccounts });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postGLAccount()", err.message);
            return res.json({ error: err.message });
        }
        debug("postGLAccount()", err);
        return res.json({ error: err });
    }
};
exports.postGLAccount = postGLAccount;
const getItemMap = async (req, res) => {
    try {
        const itemMap = await (0, db_handler_1.loadFBAItemMap)();
        res.json({ itemMap });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getItemMap()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in getItemMap' });
    }
};
exports.getItemMap = getItemMap;
const postItemMap = async (req, res) => {
    try {
        const itemMap = await (0, db_handler_1.addFBAItem)(req.body);
        res.json({ itemMap });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postItemMap()", err.message);
            return res.json({ error: err.message });
        }
        debug("postItemMap()", err);
        return res.json({ error: err });
    }
};
exports.postItemMap = postItemMap;
const deleteItemMap = async (req, res) => {
    try {
        const itemMap = await (0, db_handler_1.removeFBAItem)(req.params.sku);
        res.json({ itemMap });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("deleteItemMap()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in deleteItemMap' });
    }
};
exports.deleteItemMap = deleteItemMap;
