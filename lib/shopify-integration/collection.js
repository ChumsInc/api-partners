const debug = require('debug')('chums:lib:shopify-integration:collection');
const {fetchGETResults, genAdminApiURL, fetchPUT, parseStore} = require('./utils');
const {mysql2Pool} = require('chums-local-modules');
const DEFAULT_FIELDS = 'id,handle,title,published_scope,updated_at,published_at,admin_graphql_api_id';

async function loadCollections(store) {
    try {
        const query = `SELECT id,
                              store,
                              handle,
                              published_scope,
                              updated_at,
                              published_at,
                              admin_graphql_api_id,
                              timestamp
                       FROM shopify.collections
                       WHERE store = :store`;
        const [rows] = await mysql2Pool.query(query, {store});
        return rows;
    } catch (err) {
        debug("loadCollections()", err.message);
        return Promise.reject(err);
    }
}

async function saveCollections(store, collections = []) {
    try {
        if (collections.length === 0) {
            return;
        }
        const queryPrep = `UPDATE shopify.collections SET published_scope = NULL WHERE store = :store`;
        const query = `INSERT INTO shopify.collections (id, store, handle, published_scope, updated_at, published_at,
                                                        admin_graphql_api_id)
                       VALUES (:id, :store, :handle, :published_scope, :updated_at, :published_at, :admin_graphql_api_id)
                       ON DUPLICATE KEY UPDATE handle               = :handle,
                                               published_scope       = :published_scope,
                                               published_at         = :published_at,
                                               updated_at           = :updated_at,
                                               admin_graphql_api_id = :admin_graphql_api_id`;
        const connection = await mysql2Pool.getConnection();
        await connection.query(queryPrep, {store});
        await Promise.all(collections.map(collection => connection.query(query, {store, ...collection})));
        connection.release();
    } catch (err) {
        debug("saveCollections()", err.message);
        return Promise.reject(err);
    }
}

async function fetchCollections(store) {
    try {
        const collections = [];
        let url = genAdminApiURL('/custom_collections.json', {fields: DEFAULT_FIELDS}, store);
        while (!!url) {
            const {results, nextLink} = await fetchGETResults(url, store);
            url = nextLink || null;
            collections.push(...results.custom_collections);
        }

        url = genAdminApiURL('/smart_collections.json', {fields: DEFAULT_FIELDS}, store);
        while (!!url) {
            const {results, nextLink} = await fetchGETResults(url, store);
            url = nextLink || null;

            collections.push(...results.smart_collections);
        }
        await saveCollections(store, collections);
        return collections;
    } catch (err) {
        debug("fetchCollections()", err.message);
        return Promise.reject(err);
    }
}

async function getCollectionsFromShopify(req, res) {
    try {
        const store = parseStore(req);
        const collections = await fetchCollections(store);
        res.json({collections});
    } catch (err) {
        debug("getCollectionsFromShopify()", err.message);
        res.json({error: err.message})
    }
}


async function fetchCollectionProducts(store, collectionId) {
    try {
        let url = genAdminApiURL(`/collections/${collectionId}/products.json`, {fields: 'id,title'}, store);
        const products = [];
        while (!!url) {
            const {results, nextLink} = await fetchGETResults(url, store);
            url = nextLink || null;
            products.push(...results.products);
        }
        return products;
    } catch (err) {
        debug("fetchCollectionProducts()", err.message);
        return Promise.reject(err);
    }
}

async function getCollectionProducts(req, res) {
    try {
        const store = parseStore(req);
        const products = await fetchCollectionProducts(store, req.params.collectionId);
        res.json({products});
    } catch (err) {
        debug("getCollectionProducts()", err.message);
        res.json({error: err.message})
    }
}

async function getCollections(req, res) {
    try {
        const collections = await loadCollections(parseStore(req));
        res.json({collections});
    } catch(err) {
        debug("getCollections()", err.message);
        return Promise.reject(err);
    }
}

exports.getCollections = getCollections;
exports.getCollectionsFromShopify = getCollectionsFromShopify;
exports.getCollectionProducts = getCollectionProducts;
