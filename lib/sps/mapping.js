"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCustomer = exports.getCustomers = exports.deleteMapping = exports.postMapping = exports.getMapping = exports.loadShipToAddress = exports.loadBillToAddress = exports.loadItemUnits = exports.addCustomerMapping = exports.loadCustomerMapping = exports.loadMatchingCustomers = void 0;
const debug_1 = __importDefault(require("debug"));
const chums_local_modules_1 = require("chums-local-modules");
const debug = (0, debug_1.default)('chums:lib:sps:mapping');
async function loadMatchingCustomers(header) {
    try {
        const customers = await loadCustomers();
        return customers.filter(customer => {
            return customer.LookupFields.reduce((pv, cv) => {
                if (cv.value.startsWith('^') || cv.value.endsWith('$')) {
                    let re = /^INVALID_VALUE$/;
                    try {
                        re = new RegExp(cv.value);
                    }
                    catch (err) {
                        re = /^INVALID_VALUE$/;
                    }
                    return pv && re.test(header[cv.field].toString());
                }
                return pv && header[cv.field] === cv.value;
            }, true);
        });
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("loadMatchingCustomers()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadMatchingCustomers()", err);
        return Promise.reject(new Error('Error in loadMatchingCustomers()'));
    }
}
exports.loadMatchingCustomers = loadMatchingCustomers;
async function loadCustomers() {
    try {
        const query = `SELECT c.id,
                                      c.Company,
                                      c.ARDivisionNo,
                                      c.CustomerNo,
                                      ar.CustomerName,
                                      c.LookupFields,
                                      c.LookupValue,
                                      c.options
                               FROM sps_edi.customers c
                                        INNER JOIN c2.ar_customer ar
                                                   USING (Company, ARDivisionNo, CustomerNo)
                               ORDER BY JSON_LENGTH(c.LookupFields) desc`;
        const [rows] = await chums_local_modules_1.mysql2Pool.query(query);
        return rows.map((row) => {
            return {
                ...row,
                LookupFields: JSON.parse(row.LookupFields ?? '[]'),
                LookupValue: JSON.parse(row.LookupValue ?? '[]'),
                options: JSON.parse(row.options ?? '{}')
            };
        });
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("loadCustomers()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadCustomers()", err);
        return Promise.reject(new Error('Error in loadCustomers()'));
    }
}
async function saveCustomer({ Company, ARDivisionNo, CustomerNo, LookupFields, options }) {
    try {
        if (LookupFields.length === 0) {
            return Promise.reject(new Error('Invalid lookup fields'));
        }
        const query = `INSERT INTO sps_edi.customers (Company, ARDivisionNo, CustomerNo, LookupFields, options)
                               VALUES (:Company, :ARDivisionNo, :CustomerNo, :LookupFields, :options)
                               ON DUPLICATE KEY UPDATE LookupFields = :LookupFields,
                                                       options      = :options`;
        const data = {
            Company, ARDivisionNo, CustomerNo,
            LookupFields: JSON.stringify(LookupFields),
            options: JSON.stringify(options || {}),
        };
        await chums_local_modules_1.mysql2Pool.query(query, data);
        return loadCustomers();
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("saveCustomer()", err.message);
            return Promise.reject(err);
        }
        console.debug("saveCustomer()", err);
        return Promise.reject(new Error('Error in saveCustomer()'));
    }
}
async function loadCustomerMapping({ Company, ARDivisionNo, CustomerNo }) {
    try {
        const query = `SELECT id, MapField, CSVField, CustomerValue, MappedValue, MappedOptions
                               FROM sps_edi.mapping
                               WHERE Company = :Company
                                 AND ARDivisionNo = :ARDivisionNo
                                 AND CustomerNo = :CustomerNo`;
        const data = { Company, ARDivisionNo, CustomerNo };
        const [rows] = await chums_local_modules_1.mysql2Pool.query(query, data);
        return rows.map(row => {
            return {
                ...row,
                MappedOptions: JSON.parse(row.MappedOptions),
            };
        });
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("loadCustomerMapping()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadCustomerMapping()", err);
        return Promise.reject(new Error('Error in loadCustomerMapping()'));
    }
}
exports.loadCustomerMapping = loadCustomerMapping;
async function addCustomerMapping({ id, Company, ARDivisionNo, CustomerNo, MapField, CSVField, CustomerValue, MappedValue, MappedOptions }) {
    try {
        id = Number(id) || 0;
        const query = `INSERT INTO sps_edi.mapping (Company, ARDivisionNo, CustomerNo, MapField, CSVField,
                                                            CustomerValue, MappedValue, MappedOptions)
                               VALUES (:Company, :ARDivisionNo, :CustomerNo, :MapField, :CSVField, :CustomerValue,
                                       :MappedValue, :MappedOptions)
                               ON DUPLICATE KEY UPDATE CSVField      = :CSVField,
                                                       MappedValue   = :MappedValue,
                                                       MappedOptions = :MappedOptions`;
        const queryUpdate = `UPDATE sps_edi.mapping
                                     SET CSVField      = :CSVField,
                                         MappedValue   = :MappedValue,
                                         MappedOptions = :MappedOptions
                                     WHERE id = :id`;
        const data = {
            id,
            Company,
            ARDivisionNo,
            CustomerNo,
            MapField,
            CSVField,
            CustomerValue,
            MappedValue,
            MappedOptions: JSON.stringify(MappedOptions),
        };
        debug('addCustomerMapping()', data);
        await chums_local_modules_1.mysql2Pool.query(id > 0 ? queryUpdate : query, data);
        return await loadCustomerMapping({ Company, ARDivisionNo, CustomerNo });
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("addCustomerMapping()", err.message);
            return Promise.reject(err);
        }
        console.debug("addCustomerMapping()", err);
        return Promise.reject(new Error('Error in addCustomerMapping()'));
    }
}
exports.addCustomerMapping = addCustomerMapping;
async function removeCustomerMapping({ Company, ARDivisionNo, CustomerNo, MapField, CustomerValue }) {
    try {
        const query = `DELETE
                               FROM sps_edi.mapping
                               WHERE Company = :Company
                                 AND ARDivisionNo = :ARDivisionNo
                                 AND CustomerNo = :CustomerNo
                                 AND CustomerValue = :CustomerValue`;
        const data = { Company, ARDivisionNo, CustomerNo, MapField, CustomerValue };
        await chums_local_modules_1.mysql2Pool.query(query, data);
        return await loadCustomerMapping({ Company, ARDivisionNo, CustomerNo });
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("removeCustomerMapping()", err.message);
            return Promise.reject(err);
        }
        console.debug("removeCustomerMapping()", err);
        return Promise.reject(new Error('Error in removeCustomerMapping()'));
    }
}
async function loadItemUnits({ Company, ItemCodes = [] }) {
    try {
        const query = `SELECT i.ItemCode,
                                      i.ItemCodeDesc,
                                      i.SalesUnitOfMeasure,
                                      i.SalesUMConvFctr,
                                      i.StandardUnitOfMeasure,
                                      i.InactiveItem,
                                      i.ProductType,
                                      IFNULL(bh.BillType, 'S') AS BillType
                               FROM c2.ci_item i
                                        LEFT JOIN c2.BM_BillHeader bh
                                                  ON bh.Company = i.company AND bh.BillNo = i.ItemCode
                               WHERE i.company = :Company
                                 AND i.ItemCode IN (:ItemCodes)`;
        const data = { Company, ItemCodes };
        const [rows] = await chums_local_modules_1.mysql2Pool.query(query, data);
        return rows;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("loadItemUnits()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadItemUnits()", err);
        return Promise.reject(new Error('Error in loadItemUnits()'));
    }
}
exports.loadItemUnits = loadItemUnits;
async function loadBillToAddress({ Company, ARDivisionNo, CustomerNo }) {
    try {
        const query = `SELECT CustomerName,
                                      AddressLine1,
                                      AddressLine2,
                                      AddressLine3,
                                      City,
                                      State,
                                      ZipCode,
                                      CountryCode
                               FROM c2.ar_customer
                               WHERE Company = :Company
                                 AND ARDivisionNo = :ARDivisionNo
                                 AND CustomerNo = :CustomerNo`;
        const data = { Company, ARDivisionNo, CustomerNo };
        const [rows] = await chums_local_modules_1.mysql2Pool.query(query, data);
        return rows;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("loadBillToAddress()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadBillToAddress()", err);
        return Promise.reject(new Error('Error in loadBillToAddress()'));
    }
}
exports.loadBillToAddress = loadBillToAddress;
async function loadShipToAddress({ Company, ARDivisionNo, CustomerNo, ShipToCode = '%' }) {
    try {
        const query = `SELECT ShipToCode,
                                      ShipToName,
                                      ShipToAddress1,
                                      ShipToAddress2,
                                      ShipToAddress3,
                                      ShipToCity,
                                      ShipToState,
                                      ShipToZipCode,
                                      ShipToCountryCode,
                                      WarehouseCode
                               FROM c2.so_shiptoaddress
                               WHERE Company = :Company
                                 AND ARDivisionNo = :ARDivisionNo
                                 AND CustomerNo = :CustomerNo
                                 AND ShipToCode LIKE :ShipToCode`;
        const data = { Company, ARDivisionNo, CustomerNo, ShipToCode };
        const [rows] = await chums_local_modules_1.mysql2Pool.query(query, data);
        return rows;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("loadShipToAddress()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadShipToAddress()", err);
        return Promise.reject(new Error('Error in loadShipToAddress()'));
    }
}
exports.loadShipToAddress = loadShipToAddress;
const getMapping = async (req, res) => {
    try {
        const { Company, ARDivisionNo, CustomerNo } = req.params;
        const mapping = await loadCustomerMapping({ Company, ARDivisionNo, CustomerNo });
        res.json({ mapping });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getMapping()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in getMapping' });
    }
};
exports.getMapping = getMapping;
const postMapping = async (req, res) => {
    try {
        const params = { ...req.params, ...req.body };
        const mapping = await addCustomerMapping(params);
        res.json({ mapping });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postMapping()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in postMapping' });
    }
};
exports.postMapping = postMapping;
const deleteMapping = async (req, res) => {
    try {
        const { Company, ARDivisionNo, CustomerNo, MapField, CustomerValue } = req.params;
        const mapping = await removeCustomerMapping({ Company, ARDivisionNo, CustomerNo, MapField, CustomerValue });
        res.json({ mapping });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("deleteMapping()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in deleteMapping' });
    }
};
exports.deleteMapping = deleteMapping;
const getCustomers = async (req, res) => {
    try {
        const customers = await loadCustomers();
        res.json({ customers });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("getCustomers()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in getCustomers' });
    }
};
exports.getCustomers = getCustomers;
const postCustomer = async (req, res) => {
    try {
        const params = { ...req.params, ...req.body };
        const customers = await saveCustomer(params);
        res.json({ customers });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("postCustomer()", err.message);
            return res.json({ error: err.message, name: err.name });
        }
        res.json({ error: 'unknown error in postCustomer' });
    }
};
exports.postCustomer = postCustomer;
