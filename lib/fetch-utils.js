import Debug from 'debug';
import fetch, { Headers } from 'node-fetch';
import { URL } from 'url';
const debug = Debug('chums:lib:fetch-utils');
const LOCAL_API_KEY = process.env.INTRANET_API_KEY || 'N/A';
const LOCAL_API_PWD = process.env.INTRANET_API_PWD || 'Not the password';
function localBasicAuth() {
    const auth = Buffer.from(`${LOCAL_API_KEY}:${LOCAL_API_PWD}`).toString('base64');
    return `Basic ${auth}`;
}
const fetchError = (res) => {
    return new Error(`${res.status}; ${res.statusText}`);
};
export async function fetchGETResults(url, auth) {
    if (!auth) {
        auth = localBasicAuth();
    }
    const urlParts = new URL(url, 'https://intranet.chums.com');
    try {
        const headers = new Headers();
        headers.set('Authorization', auth);
        const response = await fetch(urlParts.toString(), { method: 'GET', headers });
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
export async function fetchPOST(url, data, auth) {
    if (!auth) {
        auth = localBasicAuth();
    }
    try {
        const headers = new Headers();
        headers.set('Authorization', auth);
        headers.set('Content-Type', 'application/json');
        const body = JSON.stringify(data ?? {});
        const response = await fetch(url, { method: 'POST', headers, body });
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
export async function fetchPUT(url, data, auth) {
    try {
        if (!auth) {
            auth = localBasicAuth();
        }
        const headers = new Headers();
        headers.set('Authorization', auth);
        headers.set('Content-Type', 'application/json');
        const body = JSON.stringify(data ?? {});
        const response = await fetch(url, { method: 'PUT', headers, body });
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
