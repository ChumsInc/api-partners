import { SettlementOrder, SettlementRow } from "./types";
export declare function parseTextFile(content: string): Promise<SettlementRow[]>;
export declare function parseSettlement(rows: SettlementRow[]): Promise<SettlementOrder>;
