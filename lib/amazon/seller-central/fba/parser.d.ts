import { FBAItemMap, SettlementChargeTotals, SettlementOrder, SettlementOrderList, SettlementRow } from "./types";
export declare function parseTextFile(content: string): Promise<SettlementRow[]>;
export declare function updateFBMOrders(rows: SettlementRow[]): Promise<import("./types").FBMOrder[]>;
export declare function buildTotals(rows: SettlementRow[]): Promise<SettlementChargeTotals>;
export declare function buildOrderLines(rows: SettlementRow[], itemMap: FBAItemMap): Promise<SettlementOrderList>;
export declare function parseSettlement(rows: SettlementRow[]): Promise<SettlementOrder>;
export declare function parseSettlementBaseData(rows: SettlementRow[]): Promise<Partial<SettlementOrder>>;
export declare function parseSettlementCharges(rows: SettlementRow[]): Promise<Partial<SettlementOrder>>;
export declare function parseSettlementSalesOrder(rows: SettlementRow[]): Promise<Partial<SettlementOrder>>;
