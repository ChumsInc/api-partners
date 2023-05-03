import { SPSCustomerValueMap, SPSOrderLine } from "./sps-types";
import { Request, Response } from "express";
export declare function parseFile(filename: string, removeUpload?: boolean): Promise<SPSOrderLine[]>;
/**
 * returns a mapped field (and additional data) given a lookup field,
 * for example ShipExpireDate => {... CSVField: 'PO Date', CustomerValue: line[map.CSVField], MappedValue: {add: 7}}
 * @param line
 * @param mapping
 * @param field
 * @param defaultCSVField
 * @return {*|{CustomerValue: *, CSVField: *, MappedValue: *, MapField: *}}
 */
export declare function getMappedField(line: SPSOrderLine, mapping: SPSCustomerValueMap[], field: string, defaultCSVField: string): SPSCustomerValueMap;
export declare const testCSVFile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
