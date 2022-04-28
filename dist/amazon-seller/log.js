"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogEntries = exports.logResponse = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('chums:lib:amazon-seller:log');
const chums_local_modules_1 = require("chums-local-modules");
const logResponse = async ({ status = 200, request, xmlResponse = '', post = null }) => {
    try {
        const query = `INSERT INTO c2.amws_response (action, status, request, post, response, is_error_response)
                       VALUES (:action,
                               :status,
                               :request,
                               :post,
                               :response,
                               EXTRACTVALUE(:xmlResponse, 'count(/ErrorResponse)') = 1)`;
        const data = {
            action: request?.Action || '',
            status,
            request: JSON.stringify(request || {}),
            post,
            xmlResponse
        };
        const [result] = await chums_local_modules_1.mysql2Pool.query(query, data);
        return result;
    }
    catch (err) {
        if (err instanceof Error) {
            debug("logResponse()", err.message);
            return Promise.reject(err);
        }
        debug("logResponse()", err);
        return Promise.reject(new Error('Error in logResponse()'));
    }
};
exports.logResponse = logResponse;
const getLogEntries = async ({ action = [''], limit = 1, offset = 0, id = null, searchResponse = {
    xpath: null,
    value: null
} }) => {
    try {
        if (!Array.isArray(action)) {
            action = [action];
        }
        const query = `SELECT idamws_response,
                              action,
                              status,
                              request,
                              post,
                              response,
                              is_error_response,
                              timestamp
                       FROM c2.amws_response
                       WHERE action IN (:action)
                         AND (:id IS NULL OR :id = 0 OR idamws_response = :id)
                         AND ((:xpath IS NULL AND :value IS NULL) OR EXTRACTVALUE(response, :xpath) = :value)
                       ORDER BY idamws_response DESC
                       LIMIT :offset, :limit`;
        const data = {
            action,
            limit: Number(limit),
            offset: Number(offset),
            id: Number(id),
            ...searchResponse
        };
        const [rows] = await chums_local_modules_1.mysql2Pool.query(query, data);
        return rows.map(row => {
            let request = null;
            try {
                request = JSON.parse(row.request);
            }
            catch (err) { }
            return {
                ...row,
                request,
                is_error_response: !!row.is_error_response
            };
        });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getLogEntries()", err.message);
            return Promise.reject(err);
        }
        debug("getLogEntries()", err);
        return Promise.reject(new Error('Error in getLogEntries()'));
    }
};
exports.getLogEntries = getLogEntries;
