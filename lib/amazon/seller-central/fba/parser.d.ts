import { SettlementOrder, SettlementRow } from "./types";
export interface AccountList {
    [key: string]: string;
}
export declare function parseTextFile(content: string): Promise<SettlementRow[]>;
export declare function parseSettlement(rows: SettlementRow[]): Promise<SettlementOrder>;
