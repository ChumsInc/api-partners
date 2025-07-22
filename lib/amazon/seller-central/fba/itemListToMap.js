export function itemListToMap(rows) {
    const map = {};
    rows.forEach(row => {
        map[row.sku] = { ...row };
    });
    return map;
}
