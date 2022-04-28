import Debug from 'debug';
const debug = Debug('chums:lib:amazon-seller:log');
import {mysql2Pool} from 'chums-local-modules';
import {AWSRequest, LogEntryRow, LoggedEntry} from "./types";


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
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("logResponse()", err.message);
            return Promise.reject(err);
        }
        debug("logResponse()", err);
        return Promise.reject(new Error('Error in logResponse()'));
    }
};

export interface GetEntriesProps {
    action: string | string[],
    limit?: number,
    offset?: number,
    id?: string | number | null,
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
        const [rows] = await mysql2Pool.query<LogEntryRow[]>(query, data);
        return rows.map(row => {
            let request:AWSRequest|null = null;
            try {
                request = JSON.parse(row.request);
            } catch(err:unknown) {}
            return {
                ...row,
                request,
                is_error_response: !!row.is_error_response
            }
        });
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("getLogEntries()", err.message);
            return Promise.reject(err);
        }
        debug("getLogEntries()", err);
        return Promise.reject(new Error('Error in getLogEntries()'));
    }
};
