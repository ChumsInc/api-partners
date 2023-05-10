import Debug from 'debug';
import {
    SPSConversionResponse,
    SPSCustomerMap,
    SPSValueMap,
    SPSItemUnit,
    SPSOrderLine,
    SPSSalesOrder,
    SPSSalesOrderDetailLine
} from "sps-integration-types";
import dayjs from "dayjs";
import {Request, Response} from "express";
import fs from 'fs/promises';
import {handleUpload} from 'chums-local-modules';
import {loadBillToAddress, loadCustomer, loadCustomerMapping, loadItemUnits, loadShipToAddress} from './mapping.js';
import {updateCustomDetail, updateCustomHeader} from './csv-customization.js';

const debug = Debug('chums:lib:sps:csv-validate');

const defaultSalesOrder: SPSSalesOrder = {
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
const parseSPSDate = (value: string = '', addDays: number = 0) => {
    if (value === '') {
        return null;
    }
    if (/ - /.test(value)) {
        const values = value.split(' - ');
        if (values.length === 2) {
            value = values[0].trim();
        }
    }
    const date = dayjs(value);
    if (addDays !== 0) {
        return dayjs(date).add(addDays, 'days').toISOString();
    }
    return date.toISOString();
};

export async function parseFile(filename: string, removeUpload: boolean = true): Promise<SPSOrderLine[]> {
    try {
        const buffer = await fs.readFile(filename);
        const csv = Buffer.from(buffer).toString();
        const lines: string[] = csv.trim().split('\n');
        const [header, ...rest] = lines;
        const fields: string[] = header.split(',').map(str => str.trim());
        if (removeUpload) {
            await fs.unlink(filename);
        }
        return rest
            .map((line, _index) => {
                const row: SPSOrderLine = {};
                line.split(',')
                    .forEach((value, index) => {
                        row[fields[index]] = value;
                    });
                return row;
            });
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("parseFile()", err.message);
            return Promise.reject(err);
        }
        debug('parseFile()', err);
        return Promise.reject(new Error('Unknown error in parseFile()'));
    }
}


/**
 * returns a mapped value given a lookup field and customer value,
 * for example ShipToCode, 60001, "Ship To Location",  => {... MappedValue: 6000}
 */
function getMapping(line: SPSOrderLine, mapping: SPSValueMap[] = [], field: string, defaultCSVField: string): SPSValueMap {
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
export function getMappedField(line: SPSOrderLine, mapping: SPSValueMap[], field: string, defaultCSVField: string) {
    const [map] = mapping
        .filter(map => map.MapField === field)
        .map(map => {
            map.CustomerValue = line[map.CSVField] as string;
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

async function convertToOrder(lines: SPSOrderLine[]): Promise<SPSConversionResponse> {
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
        const customer: SPSCustomerMap | null = await loadCustomer(header);

        let mapping: SPSValueMap[] = [];
        const so: SPSSalesOrder = {...defaultSalesOrder};

        if (customer && customer.ARDivisionNo) {
            const {Company, ARDivisionNo, CustomerNo, options} = customer;
            debug('convertToOrder()', options);
            mapping = await loadCustomerMapping({Company, ARDivisionNo, CustomerNo});
            so.Company = Company;
            so.ARDivisionNo = ARDivisionNo;
            so.CustomerNo = CustomerNo;
            so.zeroCommissions = options.zeroCommissions === true;
        }
        so.CustomerPONo = (header['PO Number'] ?? '') as string;

        const ShipExpireMapping = getMappedField(header, mapping, 'ShipExpireDate', 'Ship Dates');
        so.ShipExpireDate = parseSPSDate(ShipExpireMapping.CustomerValue, ShipExpireMapping.MappedOptions?.add)
            || new Date().toISOString();

        const CancelDateMapping = getMappedField(header, mapping, 'CancelDate', 'Cancel Date');
        so.CancelDate = parseSPSDate(CancelDateMapping.CustomerValue, CancelDateMapping.MappedOptions?.add)
            || '';

        so.ShipToCode = getMapping(header, mapping, 'ShipToCode', 'Ship To Location').MappedValue ?? '';

        const [BillToAddress] = await loadBillToAddress(so);
        so.BillToAddress = BillToAddress ?? null;

        so.DropShip = false;
        if (header['PO Type'] && header['PO Type'] === 'Direct Ship') {
            so.DropShip = true;
            so.ShipToAddress = {
                ShipToCode: '',
                ShipToName: header['Ship To Name'] as string,
                ShipToAddress1: header['Ship To Address 1'] as string,
                ShipToAddress2: header['Ship To Address 2'] as string,
                ShipToAddress3: null,
                ShipToCity: header['Ship To City'] as string,
                ShipToState: header['Ship To State'] as string,
                ShipToZipCode: header['Ship to Zip'] as string,
                ShipToCountryCode: header['Ship To Country'] as string,
                WarehouseCode: null,
            };
            if (!!header['Ship To Additional Name'] && (header['Ship To Additional Name'] as string).trim() !== '') {
                so.ShipToAddress.ShipToAddress3 = so.ShipToAddress.ShipToAddress2;
                so.ShipToAddress.ShipToAddress2 = so.ShipToAddress.ShipToAddress1;
                so.ShipToAddress.ShipToAddress1 = header['Ship To Additional Name'] as string;
            }
            so.CarrierCode = header['Carrier'] as string;
            so.ShipVia = getMapping(header, mapping, 'ShipVia', 'Carrier Details').MappedValue;
        } else {
            const [ShipToAddress] = await loadShipToAddress(so);
            if (ShipToAddress) {
                so.ShipToAddress = ShipToAddress;
                so.WarehouseCode = ShipToAddress.WarehouseCode || so.WarehouseCode;
                if (ShipToAddress.ShipToCode !== so.ShipToCode) {
                    // so.mappedShipToCode = so.ShipToCode;
                    // so.ShipToCode = '';
                }
            }
        }


        const ItemCodes = detail.map(line => getMapping(line, mapping, 'ItemCode', 'Vendor Style').MappedValue) as string[];
        const unitsOfMeasure: SPSItemUnit[] = await loadItemUnits({Company: so.Company || 'chums', ItemCodes});

        so.detail = detail.map(csv => {
            const VendorStyle = csv['Vendor Style'] as string;
            const QuantityOrdered = Number(csv['Qty per Store #']) || Number(csv['Qty Ordered']) || 0;
            const UnitOfMeasure = csv['Unit of Measure'] as string;
            const StoreNo = csv['Store #'] as string;
            const map = getMapping(csv, mapping, 'ItemCode', 'Vendor Style');
            // debug('so.detail()', {map});
            const ItemCode = map.MappedValue;
            const {conversionFactor = 1, UOMOverride = ''} = map.MappedOptions || {};
            const row: SPSSalesOrderDetailLine = {
                VendorStyle,
                ItemCode: ItemCode,
                ItemCodeDesc: (csv['Product/Item Description'] || map.CustomerValue) as string,
                QuantityOrdered: QuantityOrdered,
                UnitOfMeasure: UnitOfMeasure,
                UnitPrice: Number(csv['Unit Price']),
                CommentText: (csv['Notes/Comments'] ?? '') as string,
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
            } else if (conversionFactor > 1 && row.QuantityOrdered % conversionFactor === 0) {
                row.QuantityOrdered /= conversionFactor;
                row.UnitPrice *= conversionFactor;
            } else if (conversionFactor > 1 && row.QuantityOrdered % conversionFactor !== 0) {
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
                } else if (unitMap.ProductType === 'D') {
                    row.errors.push(`Item '${ItemCode}' is discontinued.`);
                } else if (unitMap.BillType === 'I') {
                    row.errors.push(`Item '${ItemCode}' has an invalid Bill of Materials - See Laura.`);
                } else {
                    row.ItemCodeDesc = unitMap.ItemCodeDesc;
                    // row.unitMap = unitMap;
                    if (row.UnitOfMeasure === UnitOfMeasure && unitMap.SalesUMConvFctr !== 0 && row.QuantityOrdered % unitMap.SalesUMConvFctr === 0) {
                        row.QuantityOrdered /= unitMap.SalesUMConvFctr;
                        row.UnitPrice *= unitMap.SalesUMConvFctr;
                        row.UnitOfMeasure = unitMap.SalesUnitOfMeasure;
                    }
                }
            } else {
                // row.ItemCode = '-';
                row.errors.push(`Item not found: ${ItemCode} - please map to a valid item.`);
            }
            return {...row, ...updateCustomDetail(customer, csv)};
        });

        so.comments = comments;
        const SalesOrder: SPSSalesOrder = {...so, ...updateCustomHeader(customer, header)};
        return {
            SalesOrder,
            mapping,
            customer,
            unitsOfMeasure,
            ItemCodes
        };
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("convertToOrder()", err.message, err.stack);
            return Promise.reject(err);
        }
        debug("convertToOrder()", err);
        return Promise.reject(new Error('Error in convertToOrder()'));
    }
}

export const testCSVFile = async (req: Request, res: Response) => {
    try {
        const file = await handleUpload(req);
        const csvLines = await parseFile(file.filepath);
        const result = await convertToOrder(csvLines);
        res.json({...result, csvLines});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("testCSVFile()", err.message);
            return res.json({error: err.message, name: err.name});
        }
        res.json({error: 'unknown error in testCSVFile'});
    }
};

