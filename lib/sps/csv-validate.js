"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCSVFile = exports.getMappedField = exports.parseFile = void 0;
const debug_1 = __importDefault(require("debug"));
const dayjs_1 = __importDefault(require("dayjs"));
const promises_1 = __importDefault(require("fs/promises"));
const chums_local_modules_1 = require("chums-local-modules");
const mapping_js_1 = require("./mapping.js");
const debug = (0, debug_1.default)('chums:lib:sps:csv-validate');
const { updateCustomHeader, updateCustomDetail } = require('./csv-customization');
const defaultSalesOrder = {
    Company: 'chums',
    ARDivisionNo: '',
    CustomerNo: '',
    CustomerPONo: '',
    ShipExpireDate: '',
    CancelDate: '',
    ShipToCode: '',
    WarehouseCode: '000',
    detail: []
};
/**
 * Parse an SPS Date, and optionally add X business days
 * @param value
 * @param {number} addDays
 * @return {null|Date}
 */
const parseSPSDate = (value = '', addDays = 0) => {
    if (value === '') {
        return null;
    }
    if (/ - /.test(value)) {
        const values = value.split(' - ');
        if (values.length === 2) {
            value = values[0].trim();
        }
    }
    const date = (0, dayjs_1.default)(value);
    if (addDays !== 0) {
        return (0, dayjs_1.default)(date).add(addDays, 'days').toISOString();
    }
    return date.toISOString();
};
async function parseFile(filename, removeUpload = true) {
    try {
        const buffer = await promises_1.default.readFile(filename);
        const csv = Buffer.from(buffer).toString();
        const lines = csv.trim().split('\n');
        const [header, ...rest] = lines;
        const fields = header.split(',').map(str => str.trim());
        if (removeUpload) {
            await promises_1.default.unlink(filename);
        }
        return rest
            .map((line, _index) => {
            const row = { _index };
            line.split(',')
                .forEach((value, index) => {
                row[fields[index]] = value;
            });
            return row;
        });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("parseFile()", err.message);
            return Promise.reject(err);
        }
        debug('parseFile()', err);
        return Promise.reject(new Error('Unknown error in parseFile()'));
    }
}
exports.parseFile = parseFile;
/**
 * returns a mapped value given a lookup field and customer value,
 * for example ShipToCode, 60001, "Ship To Location",  => {... MappedValue: 6000}
 */
function getMapping(line, mapping = [], field, defaultCSVField) {
    let MappedValue = line[defaultCSVField];
    const [map] = mapping
        .filter(map => map.MapField === field)
        .filter(map => map.CustomerValue === line[map.CSVField]);
    return map || {
        MapField: field,
        CSVField: defaultCSVField,
        CustomerValue: line[defaultCSVField],
        MappedValue: MappedValue,
        MappedOptions: {},
    };
}
/**
 * returns a mapped field (and additional data) given a lookup field,
 * for example ShipExpireDate => {... CSVField: 'PO Date', CustomerValue: line[map.CSVField], MappedValue: {add: 7}}
 * @param line
 * @param mapping
 * @param field
 * @param defaultCSVField
 * @return {*|{CustomerValue: *, CSVField: *, MappedValue: *, MapField: *}}
 */
function getMappedField(line, mapping, field, defaultCSVField) {
    const [map] = mapping
        .filter(map => map.MapField === field)
        .map(map => {
        map.CustomerValue = line[map.CSVField];
        return map;
    });
    return map || {
        MapField: field,
        CSVField: defaultCSVField,
        CustomerValue: line[defaultCSVField],
        MappedValue: line[defaultCSVField],
        MappedOptions: {},
    };
}
exports.getMappedField = getMappedField;
async function convertToOrder(lines) {
    try {
        const [header] = lines.filter(line => line['Record Type'] === 'H');
        const detail = lines.filter(line => line['Record Type'] === 'D');
        const comments = [
            lines.filter(line => line['Record Type'] === 'H').map(line => line['Notes/Comments']).join(' '),
            lines.filter(line => line['Record Type'] === 'O').map(line => line['Notes/Comments']).join(' '),
            lines.filter(line => line['Record Type'] === 'N').map(line => line['Notes/Comments']).join(' '),
        ].filter(line => !!line);
        // const customers = await loadCustomers();
        if (!header) {
            return Promise.reject('Unable to find Header Line');
        }
        const customers = await (0, mapping_js_1.loadMatchingCustomers)(header);
        const customer = customers.length === 1 ? customers[0] : null;
        let mapping = [];
        const so = { ...defaultSalesOrder };
        if (customer && customer.ARDivisionNo) {
            const { Company, ARDivisionNo, CustomerNo, options } = customer;
            debug('convertToOrder()', options);
            mapping = await (0, mapping_js_1.loadCustomerMapping)({ Company, ARDivisionNo, CustomerNo });
            so.Company = Company;
            so.ARDivisionNo = ARDivisionNo;
            so.CustomerNo = CustomerNo;
            so.zeroCommissions = options.zeroCommissions === true;
        }
        so.CustomerPONo = (header['PO Number'] ?? '');
        const ShipExpireMapping = getMappedField(header, mapping, 'ShipExpireDate', 'Ship Dates');
        so.ShipExpireDate = parseSPSDate(ShipExpireMapping.CustomerValue, ShipExpireMapping.MappedOptions?.add)
            || new Date().toISOString();
        const CancelDateMapping = getMappedField(header, mapping, 'CancelDate', 'Cancel Date');
        so.CancelDate = parseSPSDate(CancelDateMapping.CustomerValue, CancelDateMapping.MappedOptions?.add)
            || '';
        so.ShipToCode = getMapping(header, mapping, 'ShipToCode', 'Ship To Location').MappedValue ?? '';
        const [BillToAddress] = await (0, mapping_js_1.loadBillToAddress)(so);
        so.BillToAddress = BillToAddress ?? null;
        so.DropShip = false;
        if (header['PO Type'] && header['PO Type'] === 'Direct Ship') {
            so.DropShip = true;
            so.ShipToAddress = {
                ShipToCode: '',
                ShipToName: header['Ship To Name'],
                ShipToAddress1: header['Ship To Address 1'],
                ShipToAddress2: header['Ship To Address 2'],
                ShipToAddress3: null,
                ShipToCity: header['Ship To City'],
                ShipToState: header['Ship To State'],
                ShipToZipCode: header['Ship to Zip'],
                ShipToCountryCode: header['Ship To Country'],
                WarehouseCode: null,
            };
            if (!!header['Ship To Additional Name'] && header['Ship To Additional Name'].trim() !== '') {
                so.ShipToAddress.ShipToAddress3 = so.ShipToAddress.ShipToAddress2;
                so.ShipToAddress.ShipToAddress2 = so.ShipToAddress.ShipToAddress1;
                so.ShipToAddress.ShipToAddress1 = header['Ship To Additional Name'];
            }
            so.CarrierCode = header['Carrier'];
            so.ShipVia = getMapping(header, mapping, 'ShipVia', 'Carrier Details').MappedValue;
        }
        else {
            const [ShipToAddress] = await (0, mapping_js_1.loadShipToAddress)(so);
            if (ShipToAddress) {
                so.ShipToAddress = ShipToAddress;
                so.WarehouseCode = ShipToAddress.WarehouseCode || so.WarehouseCode;
                if (ShipToAddress.ShipToCode !== so.ShipToCode) {
                    // so.mappedShipToCode = so.ShipToCode;
                    // so.ShipToCode = '';
                }
            }
        }
        const ItemCodes = detail.map(line => getMapping(line, mapping, 'ItemCode', 'Vendor Style').MappedValue);
        const unitsOfMeasure = await (0, mapping_js_1.loadItemUnits)({ Company: so.Company || 'chums', ItemCodes });
        so.detail = detail.map(csv => {
            const VendorStyle = csv['Vendor Style'];
            const QuantityOrdered = Number(csv['Qty per Store #']) || Number(csv['Qty Ordered']) || 0;
            const UnitOfMeasure = csv['Unit of Measure'];
            const StoreNo = csv['Store #'];
            const map = getMapping(csv, mapping, 'ItemCode', 'Vendor Style');
            // debug('so.detail()', {map});
            const ItemCode = map.MappedValue;
            const { conversionFactor = 1, UOMOverride = '' } = map.MappedOptions || {};
            const row = {
                _index: csv._index,
                VendorStyle,
                ItemCode: ItemCode,
                ItemCodeDesc: (csv['Product/Item Description'] || map.CustomerValue),
                QuantityOrdered: QuantityOrdered,
                UnitOfMeasure: UnitOfMeasure,
                UnitPrice: Number(csv['Unit Price']),
                CommentText: (csv['Notes/Comments'] ?? ''),
                UDF_SHIP_CODE: StoreNo || null,
                errors: [],
                csv,
                map,
            };
            if (String(UOMOverride || '') !== '') {
                row.UnitOfMeasure = UOMOverride;
            }
            if (conversionFactor < 1) {
                row.QuantityOrdered *= conversionFactor;
                row.UnitPrice /= conversionFactor;
            }
            else if (conversionFactor > 1 && row.QuantityOrdered % conversionFactor === 0) {
                row.QuantityOrdered /= conversionFactor;
                row.UnitPrice *= conversionFactor;
            }
            else if (conversionFactor > 1 && row.QuantityOrdered % conversionFactor !== 0) {
                row.errors.push(`Invalid conversion factor in ${ItemCode}: ${row.QuantityOrdered} / ${conversionFactor} = ${row.QuantityOrdered / conversionFactor}`);
            }
            // if (conversionFactor !== 0 && QuantityOrdered % conversionFactor === 0 && conversionFactor !== 1) {
            //     row.QuantityOrdered /= conversionFactor;
            //     row.UnitPrice *= conversionFactor;
            // } else if (conversionFactor === 0 || QuantityOrdered % conversionFactor !== 0) {
            //     row.errors.push('Invalid conversion factor in ' + ItemCode);
            // }
            const [unitMap] = unitsOfMeasure.filter(item => item.ItemCode === ItemCode);
            if (unitMap) {
                if (unitMap.InactiveItem === 'Y') {
                    row.errors.push(`Item '${ItemCode}' is inactive.`);
                }
                else if (unitMap.ProductType === 'D') {
                    row.errors.push(`Item '${ItemCode}' is discontinued.`);
                }
                else if (unitMap.BillType === 'I') {
                    row.errors.push(`Item '${ItemCode}' has an invalid Bill of Materials - See Laura.`);
                }
                else {
                    row.ItemCodeDesc = unitMap.ItemCodeDesc;
                    // row.unitMap = unitMap;
                    if (row.UnitOfMeasure === UnitOfMeasure && unitMap.SalesUMConvFctr !== 0 && row.QuantityOrdered % unitMap.SalesUMConvFctr === 0) {
                        row.QuantityOrdered /= unitMap.SalesUMConvFctr;
                        row.UnitPrice *= unitMap.SalesUMConvFctr;
                        row.UnitOfMeasure = unitMap.SalesUnitOfMeasure;
                    }
                }
            }
            else {
                // row.ItemCode = '-';
                row.errors.push(`Item not found: ${ItemCode} - please map to a valid item.`);
            }
            return { ...row, ...updateCustomDetail(customer, row, csv) };
        });
        so.comments = comments;
        const SalesOrder = { ...so, ...updateCustomHeader(customer, so, header) };
        return {
            SalesOrder,
            mapping,
            customer,
            customers,
            unitsOfMeasure,
            ItemCodes
        };
    }
    catch (err) {
        if (err instanceof Error) {
            debug("convertToOrder()", err.message, err.stack);
            return Promise.reject(err);
        }
        debug("convertToOrder()", err);
        return Promise.reject(new Error('Error in convertToOrder()'));
    }
}
const testCSVFile = async (req, res) => {
    try {
        const file = await (0, chums_local_modules_1.handleUpload)(req);
        const csvLines = await parseFile(file.filepath);
        const result = await convertToOrder(csvLines);
        res.json({ ...result, csvLines });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("testCSVFile()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in testCSVFile' });
    }
};
exports.testCSVFile = testCSVFile;
