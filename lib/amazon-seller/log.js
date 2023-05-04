import Debug from 'debug';
import { mysql2Pool } from 'chums-local-modules';
const debug = Debug('chums:lib:amazon-seller:log');
export const logResponse = async ({ status = 200, request, xmlResponse = '', post = null }) => {
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
        const [result] = await mysql2Pool.query(query, data);
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
export const getLogEntries = async ({ action = [''], limit = 1, offset = 0, id = null, searchResponse = {
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
        const [rows] = await mysql2Pool.query(query, data);
        return rows.map(row => {
            let request = null;
            try {
                request = JSON.parse(row.request);
            }
            catch (err) {
            }
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
