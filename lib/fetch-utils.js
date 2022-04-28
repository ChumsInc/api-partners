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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPUT = exports.fetchPOST = exports.fetchGETResults = void 0;
var debug_1 = require("debug");
var debug = (0, debug_1.default)('chums:lib:fetch-utils');
var node_fetch_1 = require("node-fetch");
var url_1 = require("url");
var LOCAL_API_KEY = process.env.INTRANET_API_KEY || 'N/A';
var LOCAL_API_PWD = process.env.INTRANET_API_PWD || 'Not the password';
function localBasicAuth() {
    var auth = Buffer.from("".concat(LOCAL_API_KEY, ":").concat(LOCAL_API_PWD)).toString('base64');
    return "Basic ".concat(auth);
}
var fetchError = function (res) {
    return new Error("".concat(res.status, "; ").concat(res.statusText));
};
function fetchGETResults(url, auth) {
    return __awaiter(this, void 0, void 0, function () {
        var urlParts, headers, response, results, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!auth) {
                        auth = localBasicAuth();
                    }
                    urlParts = new url_1.URL(url, 'https://intranet.chums.com');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    headers = new node_fetch_1.Headers();
                    headers.set('Authorization', auth);
                    return [4 /*yield*/, (0, node_fetch_1.default)(urlParts.toString(), { method: 'GET', headers: headers })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        debug('fetchGETResults()', urlParts.toString(), response);
                        return [2 /*return*/, Promise.reject(fetchError(response))];
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    results = _a.sent();
                    return [2 /*return*/, { results: results, responseHeaders: response.headers }];
                case 4:
                    err_1 = _a.sent();
                    if (err_1 instanceof Error) {
                        debug("fetchGETResults()", err_1.message);
                        return [2 /*return*/, Promise.reject(err_1)];
                    }
                    debug("fetchGETResults()", err_1);
                    return [2 /*return*/, Promise.reject(new Error('Error in fetchGETResults()'))];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.fetchGETResults = fetchGETResults;
function fetchPOST(url, data, auth) {
    if (data === void 0) { data = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var headers, body, response, results, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!auth) {
                        auth = localBasicAuth();
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    headers = new node_fetch_1.Headers();
                    headers.set('Authorization', auth);
                    headers.set('Content-Type', 'application/json');
                    body = JSON.stringify(data);
                    return [4 /*yield*/, (0, node_fetch_1.default)(url, { method: 'POST', headers: headers, body: body })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        debug('fetchPOST()', url, response);
                        return [2 /*return*/, Promise.reject(fetchError(response))];
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    results = _a.sent();
                    return [2 /*return*/, { results: results, responseHeaders: response.headers }];
                case 4:
                    err_2 = _a.sent();
                    if (err_2 instanceof Error) {
                        debug("fetchPOST()", err_2.message);
                        return [2 /*return*/, Promise.reject(err_2)];
                    }
                    debug("fetchPOST()", err_2);
                    return [2 /*return*/, Promise.reject(new Error('Error in fetchPOST()'))];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.fetchPOST = fetchPOST;
function fetchPUT(url, data, auth) {
    if (data === void 0) { data = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var headers, body, response, results, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!auth) {
                        auth = localBasicAuth();
                    }
                    headers = new node_fetch_1.Headers();
                    headers.set('Authorization', auth);
                    headers.set('Content-Type', 'application/json');
                    body = JSON.stringify(data);
                    return [4 /*yield*/, (0, node_fetch_1.default)(url, { method: 'PUT', headers: headers, body: body })];
                case 1:
                    response = _a.sent();
                    if (response.ok) {
                        debug('fetchPUT()', url, response);
                        return [2 /*return*/, Promise.reject(fetchError(response))];
                    }
                    return [4 /*yield*/, response.json()];
                case 2:
                    results = _a.sent();
                    return [2 /*return*/, { results: results, responseHeaders: response.headers }];
                case 3:
                    err_3 = _a.sent();
                    if (err_3 instanceof Error) {
                        debug("fetchPUT()", err_3.message);
                        return [2 /*return*/, Promise.reject(err_3)];
                    }
                    debug("fetchPUT()", err_3);
                    return [2 /*return*/, Promise.reject(new Error('Error in fetchPUT()'))];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.fetchPUT = fetchPUT;
