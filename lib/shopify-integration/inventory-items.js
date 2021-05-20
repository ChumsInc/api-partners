const debug = require('debug')('chums:lib:shopify-integration:inventory-items');
const {fetchGETResults, genAdminApiURL, fetchPUT, parseStore} = require('./utils');
const {mysql2Pool} = require('chums-local-modules');

const INVENTORY_ITEM_LIMIT = 100;

async function saveInventoryItems(items = [], store) {
    try {
        const query = `INSERT INTO shopify.inventory_item (id, store, sku, cost, country_code_of_origin,
                                                           harmonized_system_code, admin_graphql_api_id, chums_company)
                       VALUES (:id, :store, :sku, :cost, :country_code_of_origin, :harmonized_system_code,
                               :admin_graphql_api_id, 'chums')
                       ON DUPLICATE KEY UPDATE sku                    = :sku,
                                               cost                   = :cost,
                                               country_code_of_origin = :country_code_of_origin,
                                               harmonized_system_code = :harmonized_system_code,
                                               admin_graphql_api_id   = :admin_graphql_api_id`;
        const connection = await mysql2Pool.getConnection();
        await Promise.all(items.map(item => {
            const {id, sku, cost, country_code_of_origin, harmonized_system_code, admin_graphql_api_id} = item;
            const data = {id, store, sku, cost, country_code_of_origin, harmonized_system_code, admin_graphql_api_id};
            return connection.query(query, data);
        }));
        connection.release();
    } catch (err) {
        debug("saveInventoryItems()", err.message);
        return Promise.reject(err);
    }

}

async function fetchInventoryItems(ids = [], store) {
    try {
        if (ids.length > INVENTORY_ITEM_LIMIT) {
            return Promise.reject(new Error(`Limit of ${INVENTORY_ITEM_LIMIT} ids is required`));
        }
        let items = [];
        let url = genAdminApiURL(`/inventory_items.json?ids=${ids.join(',')}`, {}, store);
        while (!!url) {
            const {results, nextLink} = await fetchGETResults(url, store);
            url = nextLink || null;
            await saveInventoryItems(results.inventory_items, store);
            items = items.concat(results.inventory_items);
        }
        return items;
    } catch (err) {
        debug("fetchInventoryItems()", err.message);
        return Promise.reject(err);
    }
}


async function loadInventoryItemIDs(start = 0, limit = INVENTORY_ITEM_LIMIT, store) {
    start = Number(start);
    limit = Number(limit);
    try {
        const query = `SELECT inventory_item_id
                       FROM shopify.variants v
                       WHERE v.inventory_item_id IS NOT NULL
                         AND (ifnull(:store, '') = '' OR store = :store )
                       ORDER BY inventory_item_id
                       LIMIT ${limit} OFFSET ${start}`;
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query, {store});
        connection.release();
        return rows.map(row => row.inventory_item_id);
    } catch (err) {
        debug("loadInventoryItemIDs()", err.message);
        return Promise.reject(err);
    }
}

async function loadInventoryItemUpdates(store, inventoryIds = []) {
    try {
        const query = `SELECT ii.id,
                              ii.sku,
                              ii.cost,
                              round(AverageUnitCost, 2)                           AS cost_update,
                              ii.country_code_of_origin,
                              ifnull(ucase(c.alpha_2), ii.country_code_of_origin) AS country_code_of_origin_update,
                              ii.harmonized_system_code,
                              left(replace(i.UDF_HTSCODE, '.', ''), 6)            AS harmonized_system_code_update
                       FROM shopify.products p
                            INNER JOIN shopify.variants v
                                       ON v.product_id = p.id
                            INNER JOIN shopify.inventory_item ii
                                       ON ii.id = v.inventory_item_id
                            LEFT JOIN  c2.ci_item i
                                       ON ii.sku = i.ItemCode AND i.Company = ii.chums_company
                            LEFT JOIN  shopify.iso_countries c
                                       ON (c.name = i.UDF_COUNTRY_ORIGIN OR c.alpha_3 = i.UDF_COUNTRY_ORIGIN)
                       WHERE 
                           (ifnull(:store, '') = '' OR p.store = :store)
                             AND (
                                         left(replace(i.UDF_HTSCODE, '.', ''), 6) <>
                                         ifnull(ii.harmonized_system_code, '')
                                     OR round(AverageUnitCost, 2) <> ifnull(ii.cost, 0)
                                     OR ifnull(ucase(c.alpha_2), ii.country_code_of_origin) <>
                                        ifnull(ii.country_code_of_origin, '')
                                 )`;
        const connection = await mysql2Pool.getConnection();
        const [rows] = await connection.query(query, {store});
        connection.release();
        return rows;
    } catch (err) {
        debug("loadInventoryItemUpdates()", err.message);
        return err
    }
}

async function putInventoryItemUpdates(store, inventoryIds = []) {
    function dataFromItem(item) {
        return {
            inventory_item: {
                id: item.id,
                cost: item.cost_update,
                country_code_of_origin: item.country_code_of_origin_update || null,
                harmonized_system_code: item.harmonized_system_code_update || null,
            }
        };
    }

    try {
        const inventory_items = [];
        const changes = await loadInventoryItemUpdates(store, inventoryIds);
        for (let i = 0; i < changes.length; i += 1) {
            const data = dataFromItem(changes[i]);
            const url = genAdminApiURL(`/inventory_items/${data.inventory_item.id}.json`, {}, store);
            const {inventory_item} = await fetchPUT(url, data, store);
            if (!!inventory_item) {
                inventory_items.push(inventory_item);
            } else {
                debug('putInventoryItemUpdates()', inventory_item, data);
            }
        }
        await saveInventoryItems(inventory_items.filter(item => !!item), store);
        return inventory_items.map(({id, sku, cost, country_code_of_origin, harmonized_system_code}) => ({
            id,
            sku,
            cost,
            country_code_of_origin,
            harmonized_system_code
        }));
    } catch (err) {
        debug("putInventoryItemUpdates()", err.message);
        return Promise.reject(err);
    }
}

async function fetchAllInventoryItems(store) {
    try {
        let items = [];
        let ids = [];
        do {
            ids = await loadInventoryItemIDs(items.length, INVENTORY_ITEM_LIMIT, store);
            if (ids.length) {
                const _items = await fetchInventoryItems(ids, store);
                items.push(..._items);
                debug('fetchAllInventoryItems()', `${ids.length} => ${items.length}`);
            }
        } while (ids.length > 0);
        return items;
    } catch (err) {
        debug("fetchAllInventoryItems()", err.message);
        return err;
    }
}

exports.fetchAllInventoryItems = fetchAllInventoryItems;

async function getInventoryItems(req, res) {
    try {
        const store = parseStore(req);
        const items = await fetchAllInventoryItems(store);
        res.json({items});
    } catch (err) {
        debug("getInventoryItems()", err.message);
        res.status(500).json({error: err.message});
    }
}

async function pushInventoryItems(req, res) {
    try {
        const store = parseStore(req);
        const changes = await putInventoryItemUpdates(store);
        res.json({changes});
    } catch (err) {
        debug("pushInventoryItems()", err.message);
        res.json({error: err.message});
    }
}

exports.getInventoryItems = getInventoryItems;
exports.pushInventoryItems = pushInventoryItems;
