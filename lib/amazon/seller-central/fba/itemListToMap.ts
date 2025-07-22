import {FBAItem, FBAItemMap} from "chums-types";

export function itemListToMap(rows:FBAItem[]):FBAItemMap {
    const map: FBAItemMap = {};
    rows.forEach(row => {
        map[row.sku] = {...row};
    });
    return map;
}
