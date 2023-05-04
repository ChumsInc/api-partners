import { SPSCustomerBillingAddress, SPSCustomerKey, SPSCustomerMap, SPSCustomerShipToAddress, SPSCustomerValueMap, SPSItemUnit, SPSOrderLine, SPSShipToKey } from "./sps-types";
import { Request, Response } from "express";
export declare function loadCustomer(header: SPSOrderLine): Promise<SPSCustomerMap | null>;
export declare function loadCustomerMapping({ Company, ARDivisionNo, CustomerNo }: SPSCustomerKey): Promise<SPSCustomerValueMap[]>;
export declare function addCustomerMapping({ id, Company, ARDivisionNo, CustomerNo, MapField, CSVField, CustomerValue, MappedValue, MappedOptions }: SPSCustomerValueMap): Promise<SPSCustomerValueMap[]>;
export interface RemoveCustomerMappingParams extends SPSCustomerKey {
    MapField: string;
    CustomerValue: string;
}
export declare function loadItemUnits({ Company, ItemCodes }: {
    Company: string;
    ItemCodes: string[];
}): Promise<SPSItemUnit[]>;
export declare function loadBillToAddress({ Company, ARDivisionNo, CustomerNo }: SPSCustomerKey): Promise<SPSCustomerBillingAddress[]>;
export declare function loadShipToAddress({ Company, ARDivisionNo, CustomerNo, ShipToCode }: SPSShipToKey): Promise<SPSCustomerShipToAddress[]>;
export declare const getMapping: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const postMapping: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteMapping: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCustomers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const postCustomer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
