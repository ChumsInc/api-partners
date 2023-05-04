import { LoggedEntry } from "./types";
export interface LogResponseProps {
    status?: number;
    request?: {
        Action?: string;
    };
    xmlResponse?: string;
    post?: string | null;
}
export declare const logResponse: ({ status, request, xmlResponse, post }: LogResponseProps) => Promise<any>;
export interface GetEntriesProps {
    action: string | string[];
    limit?: number;
    offset?: number;
    id?: string | number | null;
    searchResponse?: {
        xpath: string | null;
        value: string | null;
    };
}
export declare const getLogEntries: ({ action, limit, offset, id, searchResponse }: GetEntriesProps) => Promise<LoggedEntry[]>;
