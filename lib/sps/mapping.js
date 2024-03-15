import Debug from 'debug';
import { mysql2Pool } from "chums-local-modules";
const debug = Debug('chums:lib:sps:mapping');
export async function loadCustomer(header) {
    try {
        const customers = await loadCustomers();
        const [customer] = customers.filter(customer => {
            let match = true;
            customer.LookupFields
                .forEach(({ field, value }) => {
                match = match && header[field] === value;
            });
            return match;
        });
        return customer ?? null;
    }
    catch (err) {
        if (err instanceof Error) {
            console.debug("loadCustomer()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadCustomer()", err);
        return Promise.reject(new Error('Error in loadCustomer()'));
    }
}
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
                                                   USING (Company, ARDivisionNo, CustomerNo)`;
        const [rows] = await mysql2Pool.query(query);
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
        await mysql2Pool.query(query, data);
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
export async function loadCustomerMapping({ Company, ARDivisionNo, CustomerNo }) {
    try {
        const query = `SELECT id, MapField, CSVField, CustomerValue, MappedValue, MappedOptions
                               FROM sps_edi.mapping
                               WHERE Company = :Company
                                 AND ARDivisionNo = :ARDivisionNo
                                 AND CustomerNo = :CustomerNo`;
        const data = { Company, ARDivisionNo, CustomerNo };
        const [rows] = await mysql2Pool.query(query, data);
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
export async function addCustomerMapping({ id, Company, ARDivisionNo, CustomerNo, MapField, CSVField, CustomerValue, MappedValue, MappedOptions }) {
    try {
        id = Number(id) || 0;
        if (MappedOptions && !MappedOptions.conversionFactor) {
            MappedOptions.conversionFactor = 1;
        }
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
        await mysql2Pool.query(id > 0 ? queryUpdate : query, data);
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
async function removeCustomerMapping({ Company, ARDivisionNo, CustomerNo, MapField, CustomerValue }) {
    try {
        const query = `DELETE
                               FROM sps_edi.mapping
                               WHERE Company = :Company
                                 AND ARDivisionNo = :ARDivisionNo
                                 AND CustomerNo = :CustomerNo
                                 AND CustomerValue = :CustomerValue`;
        const data = { Company, ARDivisionNo, CustomerNo, MapField, CustomerValue };
        await mysql2Pool.query(query, data);
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
export async function loadItemUnits({ Company, ItemCodes = [] }) {
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
        const [rows] = await mysql2Pool.query(query, data);
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
export async function loadBillToAddress({ Company, ARDivisionNo, CustomerNo }) {
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
        const [rows] = await mysql2Pool.query(query, data);
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
export async function loadShipToAddress({ Company, ARDivisionNo, CustomerNo, ShipToCode = '%' }) {
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
        const [rows] = await mysql2Pool.query(query, data);
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
export const getMapping = async (req, res) => {
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
export const postMapping = async (req, res) => {
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
export const deleteMapping = async (req, res) => {
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
export const getCustomers = async (req, res) => {
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
export const postCustomer = async (req, res) => {
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
