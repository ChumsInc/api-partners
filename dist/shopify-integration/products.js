"use strict";
const debug = require('debug')('chums:lib:shopify-integration:products');
const { fetchGETResults, genAdminApiURL, fetchPUT, parseStore } = require('./utils');
const { mysql2Pool } = require('chums-local-modules');
const { parseISO, formatISO9075 } = require('date-fns');
const queryProduct = `INSERT INTO shopify.products (id, store, handle, published_scope, created_at, updated_at,
                                                    published_at, admin_graphql_api_id)
                      VALUES (:id, :store, :handle, :published_scope, :created_at, :updated_at,
                              :published_at, :admin_graphql_api_id)
                      ON DUPLICATE KEY UPDATE handle          = :handle,
                                              published_scope = :published_scope,
                                              updated_at      = :updated_at,
                                              published_at    = :published_at`;
const queryVariant = `INSERT INTO shopify.variants (id, store, product_id, title, price, compare_at_price, sku, barcode,
                                                    grams, inventory_item_id, inventory_quantity, admin_graphql_api_id,
                                                    created_at, updated_at)
                      VALUES (:id, :store, :product_id, :title, :price, :compare_at_price, :sku, :barcode, :grams,
                              :inventory_item_id, :inventory_quantity, :admin_graphql_api_id, :created_at, :updated_at)
                      ON DUPLICATE KEY UPDATE title              = :title,
                                              price              = :price,
                                              compare_at_price   = :compare_at_price,
                                              sku                = :sku,
                                              barcode            = :barcode,
                                              grams              = :grams,
                                              inventory_item_id  = :inventory_item_id,
                                              inventory_quantity = :inventory_quantity,
                                              created_at         = :created_at,
                                              updated_at         = :updated_at`;
async function prepSaveProducts(store = '') {
    try {
        const queryPrep = `UPDATE shopify.products
                           SET published_scope = NULL
                           WHERE (store = :store OR :store = '')`;
        const queryPrepVariants = `UPDATE shopify.variants
                                   SET inventory_item_id  = NULL,
                                       inventory_quantity = 0
                                   WHERE (store = :store OR :store = '')`;
        const queryPrepInventoryLevels = `UPDATE shopify.inventory_levels
                                          SET active_item = 0
                                          WHERE (store = :store OR :store = '')`;
        const args = { store };
        const connection = await mysql2Pool.getConnection();
        await connection.query(queryPrep, args);
        await connection.query(queryPrepVariants, args);
        await connection.query(queryPrepInventoryLevels, args);
        connection.release();
    }
    catch (err) {
        debug("prepSaveProducts()", err.message);
        return Promise.reject(err);
    }
}
async function saveVariant(variant, store) {
    try {
        const { id, product_id, title, price, sku, compare_at_price, barcode, grams, inventory_item_id, inventory_quantity, admin_graphql_api_id, created_at, updated_at } = variant;
        const variantData = {
            id,
            store,
            product_id,
            title,
            price,
            sku,
            compare_at_price,
            barcode,
            grams,
            inventory_item_id,
            inventory_quantity,
            admin_graphql_api_id,
            created_at,
            updated_at
        };
        // debug('saveVariant()', {variantData});
        await mysql2Pool.query(queryVariant, variantData);
    }
    catch (err) {
        debug("saveVariant()", err.message);
        return Promise.reject(err);
    }
}
async function saveProduct(product, store) {
    try {
        const { id, handle, published_scope, created_at, updated_at, published_at, variants, admin_graphql_api_id } = product;
        // debug('saveProduct()', created_at);
        // debug('saveProduct()', updated_at);
        // debug('saveProduct()', published_at);
        const productData = {
            id,
            store,
            handle,
            published_scope,
            created_at: !!created_at ? formatISO9075(parseISO(created_at)) : null,
            updated_at: !!updated_at ? formatISO9075(parseISO(updated_at)) : null,
            published_at: !!published_at ? formatISO9075(parseISO(published_at)) : null,
            admin_graphql_api_id
        };
        // debug('saveProduct()', productData);
        const connection = await mysql2Pool.getConnection();
        await connection.query(queryProduct, productData);
        await Promise.all(variants.map(variant => {
            const { id, product_id, title, price, compare_at_price, sku, barcode, grams, inventory_item_id, inventory_quantity, admin_graphql_api_id, created_at, updated_at, } = variant;
            const variantData = {
                id,
                store,
                product_id,
                title,
                price,
                compare_at_price,
                sku,
                barcode,
                grams,
                inventory_item_id,
                inventory_quantity,
                admin_graphql_api_id,
                created_at: !!created_at ? formatISO9075(parseISO(created_at)) : null,
                updated_at: !!updated_at ? formatISO9075(parseISO(updated_at)) : null,
            };
            // debug('saveProduct() variant:',id, sku);
            return connection.query(queryVariant, variantData);
        }));
        connection.release();
        // debug('saveProduct() end', product.id, product.handle);
    }
    catch (err) {
        debug("saveProduct()", product.id, err.message);
        return Promise.reject(err);
    }
}
async function loadChangedVariants(store) {
    try {
        const query = `SELECT v.id,
                              v.store,
                              v.sku,
                              v.barcode,
                              IFNULL(i.UDF_UPC_BY_COLOR, i.UDF_UPC) AS UPC,
                              v.price,
                              v.compare_at_price,
                              i.SuggestedRetailPrice,
                              v.grams,
                              ROUND(i.ShipWeight * 453.592)         AS updatedGrams
                       FROM shopify.variants v
                            INNER JOIN c2.ci_item i
                                       ON i.Company = 'chums' AND i.ItemCode = v.sku
                       WHERE v.inventory_item_id IS NOT NULL
                         AND (v.store = :store OR IFNULL(:store, '') = '')
                         AND (
                               v.barcode <> IFNULL(i.UDF_UPC_BY_COLOR, i.UDF_UPC)
                               OR IFNULL(v.compare_at_price, 0) <> i.SuggestedRetailPrice
                               OR v.grams <> ROUND(i.ShipWeight * 453.592)
                           )`;
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query, { store });
        connection.release();
        rows.map(row => {
            row.price = Number(row.price);
            row.compare_at_price = Number(row.compare_at_price);
        });
        return rows;
    }
    catch (err) {
        debug("loadChangedVariants()", err.message);
        return Promise.reject(err);
    }
}
async function pushVariantChanges(store) {
    let _variants = [];
    try {
        const variants = await loadChangedVariants(store);
        for (let i = 0; i < variants.length; i += 1) {
            const v = variants[i];
            let url = genAdminApiURL(`/variants/${v.id}.json`, {}, store);
            const data = {
                id: v.id,
                barcode: v.UPC,
                compare_at_price: v.SuggestedRetailPrice,
                grams: v.updatedGrams
            };
            debug('pushVariantChanges()', v.id, v.sku);
            const { variant } = await fetchPUT(url, { variant: data }, store);
            await saveVariant(variant, store);
            _variants.push(variant);
        }
        return _variants;
    }
    catch (err) {
        debug("pushVariantChanges()", err.message);
        return Promise.reject(err);
    }
}
async function pushSalePrice(store, variants = []) {
    try {
        debug('pushSalePrice()', store, variants);
        const _variants = [];
        for (let i = 0; i < variants.length; i += 1) {
            const v = variants[i];
            let url = genAdminApiURL(`/variants/${v.id}.json`, {}, store);
            const data = {
                id: v.id,
                price: v.price,
            };
            debug('pushSalePrice()', url);
            const { variant } = await fetchPUT(url, { variant: data }, store);
            await saveVariant(variant, store);
            _variants.push(variant);
        }
        return _variants;
    }
    catch (err) {
        debug("pushSalePrice()", err.message);
        return Promise.reject(err);
    }
}
async function saveProducts(products, store) {
    try {
        await Promise.all(products.map(product => saveProduct(product, store)));
    }
    catch (err) {
        debug("saveProducts()", err.message, store, products.length);
        return err;
    }
}
async function fetchProducts(store = '') {
    try {
        await prepSaveProducts(store);
        let allProducts = [];
        let url = genAdminApiURL('/products.json', { limit: 200 }, store);
        debug('fetchProducts()', url);
        while (!!url) {
            const { results, nextLink } = await fetchGETResults(url, store);
            url = nextLink || null;
            debug('fetchProducts()', results.products.length);
            await saveProducts(results.products, store);
            allProducts = allProducts.concat(results.products);
        }
        return allProducts;
    }
    catch (err) {
        debug("fetchProducts()", err.message);
        return err;
    }
}
async function fetchProduct(id, store) {
    try {
        let url = genAdminApiURL(`/products/${id}.json`, {}, store);
        const { results, nextLink } = await fetchGETResults(url);
        if (results.product) {
            await saveProduct(results.product, store);
        }
        return results.product;
    }
    catch (err) {
        debug("fetchProducts()", err.message);
        return err;
    }
}
async function triggerImportProduct(id, store) {
    try {
        const product = await fetchProduct(id, store);
    }
    catch (err) {
        debug("triggerImportProduct()", err.message);
        return Promise.reject(err);
    }
}
exports.getProducts = async (req, res) => {
    try {
        const store = parseStore(req);
        const products = await fetchProducts(store);
        res.json({ products, count: products.length });
    }
    catch (err) {
        debug("getProducts()", err.message);
        res.json({ error: err.message });
    }
};
exports.getProduct = async (req, res) => {
    try {
        const store = parseStore(req);
        const product = await fetchProduct(req.params.id, store);
        res.json({ product });
    }
    catch (err) {
        debug("getProducts()", err.message);
        res.json({ error: err.message });
    }
};
exports.getChangedVariants = async (req, res) => {
    try {
        const store = parseStore(req);
        const variants = await loadChangedVariants(store);
        res.json({ variants });
    }
    catch (err) {
        debug("getChangedVariants()", err.message);
        res.json({ error: err.message });
    }
};
exports.putChangedVariants = async (req, res) => {
    try {
        const store = parseStore(req);
        const variants = await pushVariantChanges(store);
        res.json({ variants });
    }
    catch (err) {
        debug("putChangedVariants()", err.message);
        res.json({ error: err.message });
    }
};
exports.putSalePrice = async (req, res) => {
    try {
        const store = parseStore(req);
        const variants = await pushSalePrice(store, req.body.variants);
        res.json({ variants });
    }
    catch (err) {
        debug("putSalePrice()", err.message);
        res.json({ error: err.message });
    }
};
exports.fetchProducts = fetchProducts;
exports.fetchProduct = fetchProduct;
