const debug = require('debug')('chums:lib:shopify-integration:utils');
const fetch = require('node-fetch');
const {CONFIG, LOCAL_API_KEY, LOCAL_API_PWD, STORES} = require('./config');

function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function parseOptions(options = {}) {
    return Object.keys(options)
        .map(key => {
            const val = encodeURIComponent(options[key]);
            return `${key}=${val}`;
        })
        .join('&');
}

function genAdminApiURL(endpoint, options = {}, store = STORES.chums) {
    if (typeof options === 'string' && STORES[options] !== undefined) {
        store = options;
        options = {};
    }
    const {API_VERSION, STORE_URL} = CONFIG[store] || CONFIG[STORES.chums];
    return `https://${STORE_URL}/admin/api/${API_VERSION}/${endpoint.replace(/^\//, '')}`
        + (Object.keys(options).length ? `?${parseOptions(options)}` : '');
}

function genAuthHeader(store) {
    const {API_KEY, API_PWD} = CONFIG[store] || CONFIG[STORES.chums];
    return Buffer.from(`${API_KEY}:${API_PWD}`).toString('base64');
}

function genLocalAuthHeader() {
    return Buffer.from(`${LOCAL_API_KEY}:${LOCAL_API_PWD}`).toString('base64');
}


function getNextLink(headers) {
    if (!headers.has('link')) {
        return null;
    }
    const linkHeader = headers.get('link');
    const [nextLinkHeader] = linkHeader.split(',')
        .filter(link => /rel="next"/.test(link))
        .map(link => link.trim().split(';'));
    return nextLinkHeader !== undefined && nextLinkHeader.length > 0
        ? nextLinkHeader[0].replace(/^</, '').replace(/>$/, '')
        : null;
}

async function fetchGETResults(url, store = STORES.chums) {
    let response = null;
    let results = {};
    try {
        await sleep(500);
        const auth = /intranet\.chums\.com/.test(url) ? genLocalAuthHeader() : genAuthHeader(store);
        // debug('fetchGETResults()', url, store, auth);
        const headers = new fetch.Headers();
        headers.set('Authorization', `Basic ${auth}`);
        response = await fetch(url, {method: 'GET', headers});
        const nextLink = getNextLink(response.headers);
        results = await response.json();
        if (response.status !== 200) {
            debug('fetchGETResults() response.status', {status: response.status});
        }
        return {results, nextLink};
    } catch(err) {
        debug("fetchGETResults()", err.message, response, results);
        return err;
    }
}

async function fetchPOST(url, data = {}, store = STORES.chums) {
    try {
        await sleep(500);
        const auth = /intranet\.chums\.com/.test(url) ? genLocalAuthHeader() : genAuthHeader(store);
        const headers = new fetch.Headers();
        headers.set('Authorization', `Basic ${auth}`);
        headers.set('Content-Type', 'application/json');
        const body = JSON.stringify(data);
        const response = await fetch(url, {method: 'POST', headers, body});
        if (response.status >= 400) {
            debug('fetchPOST()', {status: response.status, statusText: response.statusText});
            debug('fetchPOST()', await response.text());
            return {};
        }
        return await response.json();
    } catch(err) {
        debug("fetchPOST() error: ", err.message);
        return err;
    }
}

async function fetchPUT(url, data = {}, store = STORES.chums) {
    try {
        await sleep(500);
        const auth = /intranet\.chums\.com/.test(url) ? genLocalAuthHeader() : genAuthHeader(store);
        const headers = new fetch.Headers();
        headers.set('Authorization', `Basic ${auth}`);
        headers.set('Content-Type', 'application/json');
        const body = JSON.stringify(data);
        const response = await fetch(url, {method: 'PUT', headers, body});
        if (response.status !== 200) {
            const status = response.status;
            const statusText = response.statusText;
            const responseText = await response.text();
            debug('fetchPUT()', {status, statusText, responseText});
            return {url, data, status, statusText, responseText};
        }
        return await response.json();
    } catch(err) {
        debug("fetchPOST()", err.message);
        return err;
    }
}

function parseStore({query, params}) {
    const store = params.store || query.store;
    if (STORES[store] !== undefined) {
        return store;
    }
    return STORES.chums;
}

exports.genAdminApiURL = genAdminApiURL;
exports.fetchGETResults = fetchGETResults;
exports.fetchPOST = fetchPOST;
exports.fetchPUT = fetchPUT;
exports.parseStore = parseStore;
