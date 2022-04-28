"use strict";
const debug = require('debug')('chums:lib:shopify-integration:non-inventory-items');
/**
 *
 * @param {ShopifyItem} item
 * @return {SageItem|null}
 */
const mapToSageItem = (item) => {
    if (/^ROUTEINS[0-9]+/i.test(item.sku)) {
        return {
            ItemType: '3',
            ItemCode: '/WEB_ROUTEINS',
            ItemCodeDesc: `${item.sku} / ${item.name}`,
            QuantityOrdered: item.quantity,
            UnitPrice: 0,
            lineDiscount: 0,
        };
    }
    return null;
};
exports.mapToSageItem = mapToSageItem;
