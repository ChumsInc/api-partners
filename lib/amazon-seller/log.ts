import Debug from 'debug';
const debug = Debug('chums:lib:amazon-seller:log');
import {mysql2Pool} from 'chums-local-modules';


export interface LogResponseProps {
    status?: number,
    request?: {
        Action?: string
    },
    xmlResponse?: string,
    post?: string | null,
}

export const logResponse = async ({
                                      status = 200,
                                      request,
                                      xmlResponse = '',
                                      post = null
                                  }: LogResponseProps): Promise<any> => {
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
    } catch (err) {
        debug('logResponse', err.message);
        return Promise.reject(err);
    }
};

export interface LoggedEntry {
    idamws_response: number,
    action: string,
    status: string | null,
    request: any,
    post: string,
    response: string,
    is_error_response: boolean,
    timestamp: string,
}

export interface GetEntriesProps {
    action: string | string[],
    limit?: number,
    offset?: number,
    id?: number | null,
    searchResponse?: {
        xpath: string | null,
        value: string | null,
    }
}

export const getLogEntries = async ({
                                     action = [''],
                                     limit = 1,
                                     offset = 0,
                                     id = null,
                                     searchResponse = {
                                         xpath: null,
                                         value: null
                                     }
                                 }: GetEntriesProps): Promise<LoggedEntry[]> => {
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
        rows.map(row => {
            row.request = JSON.parse(row.request);
            row.is_error_response = !!row.is_error_response;
        });
        return rows as LoggedEntry[];
    } catch (err) {
        debug('getEntries', err.message);
        return Promise.reject(err);
    }
};
