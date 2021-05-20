const debug = require('debug')('chums:lib:shopify-integration:item-validation');
const {mysql2Pool} = require('chums-local-modules');
const {parseStore} = require('./utils');

async function loadItemValidation(store, variants = []) {
    try {
        const query = `
            SELECT p.id,
                   v.id                                  AS variant_id,
                   p.handle,
                   p.store,
                   p.published_scope,
                   p.published_at,
                   v.title,
                   v.sku,
                   v.grams,
                   ROUND(i.ShipWeight * 453.592)         AS ShipWeight,
                   v.barcode,
                   IFNULL(i.UDF_UPC_BY_COLOR, i.UDF_UPC) AS UPC,
                   l.available,
                   i.ItemCode,
                   i.ItemCodeDesc,
                   i.InactiveItem,
                   i.ProductType,
                   a.QuantityAvailable,
                   ii.country_code_of_origin,
                   i.UDF_COUNTRY_ORIGIN,
                   ii.harmonized_system_code,
                   i.UDF_HTSCODE,
                   v.compare_at_price,
                   v.price,
                   i.SuggestedRetailPrice,
                   v.updated_at
            FROM shopify.variants v
                 INNER JOIN shopify.inventory_levels l
                            ON l.inventory_item_id = v.inventory_item_id
                 INNER JOIN shopify.inventory_item ii
                            ON ii.id = l.inventory_item_id
                 INNER JOIN shopify.products p
                            ON p.id = v.product_id
                 LEFT JOIN  c2.ci_item i
                            ON i.ItemCode = v.sku AND i.Company = ii.chums_company
                 LEFT JOIN  c2.v_web_available a
                            ON a.ItemCode = i.ItemCode AND a.Company = i.Company AND
                               a.WarehouseCode = i.DefaultWarehouseCode
            WHERE p.store = :store
              AND (IFNULL(:variants, '') = '' OR v.id REGEXP :variants)
        `;

        const args = {
            store,
            variants: Array.isArray(variants) && variants.length ? variants.join('|') : null};
        const [rows] = await mysql2Pool.query(query, args);
        rows.forEach(row => {
            row.QuantityAvailable = Number(row.QuantityAvailable);
            row.price = Number(row.price);
            row.compare_at_price = !!row.compare_at_price ? Number(row.compare_at_price) : row.compare_at_price;
            row.grams = Number(row.grams);
            row.ShipWeight = Number(row.ShipWeight);
        });
        return rows;
    } catch (err) {
        debug("loadItemValidation()", err.message);
        return err;
    }
}

exports.getItemValidation = async (req, res) => {
    try {
        const store = parseStore(req);
        const variants = (req.query.variants || '').split(',');
        const items = await loadItemValidation(store, variants);
        res.json({items});
    } catch (err) {
        debug("getItemValidation()", err.message);
        return req.json({error: err.message});
    }
};
