export function getInventoryLevels(req: any, res: any): Promise<void>;
/**
 *
 * @param ItemCode
 * @param store
 * @return {Promise<*[]>}
 */
export function postInventoryLevel({ ItemCode, store }: {
    ItemCode: any;
    store: any;
}): Promise<any[]>;
export function setInventoryLevels(req: any, res: any): Promise<void>;
export function updateInventory(req: any, res: any): Promise<void>;
export function updateInventoryItem(req: any, res: any): Promise<void>;
