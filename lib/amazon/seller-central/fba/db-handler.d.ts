import { AccountList, FBAItem, FBAItemMap, FBMOrder, GLMapRecord, SettlementImportResult } from "./types";
/**
 *
 * @param {SettlementImportResult} result
 * @param {Number} userId
 * @return {Promise<never>}
 */
export declare function logSettlementImport(result: SettlementImportResult, userId: number): Promise<undefined>;
/**
 * Loads items set up in the AMZ Warehouse for a list of items codes.
 * @param {string[]} items
 * @return {Promise<FBAItemMap>}
 */
export declare function loadAMZItemMap(items: string[]): Promise<FBAItemMap>;
/**
 * Loads a list of already mapped items saved
 * @return {Promise<FBAItemMap>}
 */
export declare function loadFBAItemMap(): Promise<FBAItemMap>;
/**
 *
 * @param {FBAItem} item
 * @return {Promise<FBAItemMap>}
 */
export declare function addFBAItem(item: FBAItem): Promise<FBAItemMap>;
export declare function removeFBAItem(sku: string): Promise<FBAItemMap>;
export declare function loadFBMOrders(poList: string[]): Promise<FBMOrder[]>;
export declare function loadGLMap(): Promise<AccountList>;
export declare function addGLAccount(gl: GLMapRecord): Promise<AccountList>;
