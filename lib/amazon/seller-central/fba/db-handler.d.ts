import { FBAItem, FBAItemMap, FBMOrder, SettlementImportResult } from "./types";
/**
 *
 * @param {SettlementImportResult} result
 * @param {Number} userId
 * @return {Promise<never>}
 */
export declare function logSettlementImport(result: SettlementImportResult, userId: number): Promise<undefined>;
export declare function loadFBAItemMap(): Promise<FBAItemMap>;
/**
 *
 * @param {FBAItem} item
 * @return {Promise<FBAItemMap>}
 */
export declare function addFBAItem(item: FBAItem): Promise<FBAItemMap>;
export declare function removeFBAItem(sku: string): Promise<FBAItemMap>;
export declare function loadFBMOrders(poList: string[]): Promise<FBMOrder[]>;
