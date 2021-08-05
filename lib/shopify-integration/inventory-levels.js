const debug = require('debug')('chums:lib:shopify-integration:inventory-levels');
const {fetchGETResults, genAdminApiURL, fetchPOST, parseStore} = require('./utils');
const {STORES, CONFIG} = require('./config');
const {mysql2Pool} = require('chums-local-modules');
const {fetchProducts} = require('./products');
const {fetchAllInventoryItems} = require('./inventory-items');
const {parseISO, formatISO9075} = require('date-fns');

async function saveInventoryLevel(item, store) {
    if (!item) {
        return;
    }
    try {
        const {inventory_item_id, location_id, available, updated_at, admin_graphql_api_id} = item;
        const query = `INSERT INTO shopify.inventory_levels (inventory_item_id, location_id, store, available,
                                                             updated_at,
                                                             admin_graphql_api_id, active_item)
                       VALUES (:inventory_item_id, :location_id, :store, :available, :updated_at, :admin_graphql_api_id,
                               1)
                       ON DUPLICATE KEY UPDATE available   = :available,
                                               updated_at  = :updated_at,
                                               active_item = 1`;
        const updatedAt = !!updated_at ? formatISO9075(parseISO(updated_at)) : null;
        const data = {inventory_item_id, location_id, store, available, updated_at: updatedAt, admin_graphql_api_id};
        const connection = await mysql2Pool.getConnection();
        await connection.query(query, data);
        connection.release();
    } catch (err) {
        debug("saveInventoryLevel()", err.message);
        return err;
    }
}

async function saveInventoryLevels(items, store) {
    return await items.map(async (item) => {
        await saveInventoryLevel(item, store);
    });
}

async function loadInventoryLevelsToChange({ItemCode, store} = {}) {
    try {
        const query = `
            SELECT l.location_id, l.inventory_item_id, GREATEST(FLOOR(IFNULL(a.QuantityAvailable, 0)), 0) AS available
            FROM shopify.variants v
                 INNER JOIN shopify.inventory_item ii
                            ON ii.id = v.inventory_item_id
                 INNER JOIN shopify.inventory_levels l
                            ON l.inventory_item_id = v.inventory_item_id
                 INNER JOIN shopify.products p
                            ON p.id = v.product_id
                 LEFT JOIN  c2.v_web_available a
                            ON a.Company = ii.chums_company AND a.ItemCode = v.sku
            WHERE a.WarehouseCode = a.DefaultWarehouseCode
              AND p.store = :store
              AND p.published_scope IS NOT NULL
              AND (IFNULL(:itemCode, '') = a.ItemCode OR
                   GREATEST(FLOOR(IFNULL(a.QuantityAvailable, 0)), 0) <> l.available)
        `;
        const data = {ItemCode, store};
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query, data);
        connection.release();
        return rows.map(row => {
            row.location_id = Number(row.location_id);
            row.inventory_item_id = Number(row.inventory_item_id);
            row.available = Number(row.available);
            return row;
        });
    } catch (err) {
        debug("loadInventoryLevelsToChange()", ItemCode, err.message);
        return err;
    }
}


async function fetchInventoryLevels(store) {
    try {
        let allItems = [];
        const {LOCATION_IDS} = CONFIG[store] || CONFIG[STORES.chums];
        let url = genAdminApiURL('/inventory_levels.json', {location_ids: LOCATION_IDS.join(',')}, store);
        debug('fetchInventoryLevels()', url);
        while (!!url) {
            const {results, nextLink} = await fetchGETResults(url, store);
            const {inventory_levels} = results;
            url = nextLink || null;
            await saveInventoryLevels(inventory_levels, store);
            allItems = allItems.concat(inventory_levels);
        }
        return allItems;

    } catch (err) {
        debug("fetchInventoryLevels()", err.message);
        return err;
    }
}

async function postInventoryLevels(store) {
    let inventory_levels = [];
    try {
        const items = await loadInventoryLevelsToChange({store});
        let url = genAdminApiURL('/inventory_levels/set.json', {}, store);
        for (let i = 0; i < items.length; i += 1) {
            const data = items[i];
            const {inventory_level} = await fetchPOST(url, data, store);
            debug('postInventoryLevels()', data);
            await saveInventoryLevel(inventory_level, store);
            inventory_levels.push(inventory_level);
        }
        return inventory_levels;
    } catch (err) {
        debug("postInventoryLevels()", err.message);
        return Promise.reject(err);
    }
}

async function postInventoryLevel({ItemCode, store}) {
    try {
        const [item] = await loadInventoryLevelsToChange({ItemCode, store});
        if (!item) {
            return {};
        }
        let url = genAdminApiURL('/inventory_levels/set.json', {}, store);
        const {inventory_level} = await fetchPOST(url, item, store);
        await saveInventoryLevel(inventory_level, store);
        return inventory_level;
    } catch (err) {
        debug("postInventoryLevel()", err.message);
        return Promise.reject(err);
    }
}

const getInventoryLevels = async (req, res) => {
    try {
        const store = parseStore(req);
        const items = await fetchInventoryLevels(store);
        res.json({items});
    } catch (err) {
        debug("getInventoryLevels()", err.message);
        res.json({error: err.message});
    }
};

const setInventoryLevels = async (req, res) => {
    try {
        const store = parseStore(req);
        const inventory_levels = await postInventoryLevels(store);
        res.json({inventory_levels});
    } catch (err) {
        debug("setInventoryLevels()", err.message);
        res.json({error: err.message});
    }
};

const updateInventory = async (req, res) => {
    try {
        const start = Date.now();
        debug('updateInventory()', 'starting');
        const store = parseStore(req);
        const products = await fetchProducts(store);
        const items = await fetchAllInventoryItems(store);
        await fetchInventoryLevels(CONFIG.chums.LOCATION_IDS);
        const inventory_levels = await postInventoryLevels(store);
        debug('updateInventory()', {['duration-ms']: Date.now() - start});
        res.json({products: products.length, items: items.length, inventory_levels});
    } catch (err) {
        debug("updateInventory()", err.message);
        res.json({error: err.message});
    }
};

const updateInventoryItem = async (req, res) => {
    try {
        const store = parseStore(req);
        const {ItemCode} = req.params;
        const inventory_level = await postInventoryLevel({ItemCode, store});
        res.json({ItemCode, inventory_level});
    } catch (err) {
        debug("updateInventoryItem()", err.message);
        res.json({error: err.message});
    }
}


exports.getInventoryLevels = getInventoryLevels;
exports.postInventoryLevel = postInventoryLevel;
exports.setInventoryLevels = setInventoryLevels;
exports.updateInventory = updateInventory;
exports.updateInventoryItem = updateInventoryItem;

