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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPUT = exports.fetchPOST = exports.fetchGETResults = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('chums:lib:fetch-utils');
const node_fetch_1 = __importStar(require("node-fetch"));
const url_1 = require("url");
const LOCAL_API_KEY = process.env.INTRANET_API_KEY || 'N/A';
const LOCAL_API_PWD = process.env.INTRANET_API_PWD || 'Not the password';
function localBasicAuth() {
    const auth = Buffer.from(`${LOCAL_API_KEY}:${LOCAL_API_PWD}`).toString('base64');
    return `Basic ${auth}`;
}
const fetchError = (res) => {
    return new Error(`${res.status}; ${res.statusText}`);
};
async function fetchGETResults(url, auth) {
    if (!auth) {
        auth = localBasicAuth();
    }
    const urlParts = new url_1.URL(url, 'https://intranet.chums.com');
    try {
        const headers = new node_fetch_1.Headers();
        headers.set('Authorization', auth);
        const response = await (0, node_fetch_1.default)(urlParts.toString(), { method: 'GET', headers });
        if (!response.ok) {
            debug('fetchGETResults()', urlParts.toString(), response);
            return Promise.reject(fetchError(response));
        }
        const results = await response.json();
        return { results, responseHeaders: response.headers };
    }
    catch (err) {
        if (err instanceof Error) {
            debug("fetchGETResults()", err.message);
            return Promise.reject(err);
        }
        debug("fetchGETResults()", err);
        return Promise.reject(new Error('Error in fetchGETResults()'));
    }
}
exports.fetchGETResults = fetchGETResults;
async function fetchPOST(url, data = {}, auth) {
    if (!auth) {
        auth = localBasicAuth();
    }
    try {
        const headers = new node_fetch_1.Headers();
        headers.set('Authorization', auth);
        headers.set('Content-Type', 'application/json');
        const body = JSON.stringify(data);
        const response = await (0, node_fetch_1.default)(url, { method: 'POST', headers, body });
        if (!response.ok) {
            debug('fetchPOST()', url, response);
            return Promise.reject(fetchError(response));
        }
        const results = await response.json();
        return { results, responseHeaders: response.headers };
    }
    catch (err) {
        if (err instanceof Error) {
            debug("fetchPOST()", err.message);
            return Promise.reject(err);
        }
        debug("fetchPOST()", err);
        return Promise.reject(new Error('Error in fetchPOST()'));
    }
}
exports.fetchPOST = fetchPOST;
async function fetchPUT(url, data = {}, auth) {
    try {
        if (!auth) {
            auth = localBasicAuth();
        }
        const headers = new node_fetch_1.Headers();
        headers.set('Authorization', auth);
        headers.set('Content-Type', 'application/json');
        const body = JSON.stringify(data);
        const response = await (0, node_fetch_1.default)(url, { method: 'PUT', headers, body });
        if (response.ok) {
            debug('fetchPUT()', url, response);
            return Promise.reject(fetchError(response));
        }
        const results = await response.json();
        return { results, responseHeaders: response.headers };
    }
    catch (err) {
        if (err instanceof Error) {
            debug("fetchPUT()", err.message);
            return Promise.reject(err);
        }
        debug("fetchPUT()", err);
        return Promise.reject(new Error('Error in fetchPUT()'));
    }
}
exports.fetchPUT = fetchPUT;
