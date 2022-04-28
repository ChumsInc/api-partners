export const STORES: {
    chums: string;
    chumssafety: string;
    'chums-safety': string;
};
export const STORE_URLS: {
    chums: string | undefined;
    chumsinc: string | undefined;
    chumssafety: string | undefined;
    'chums-safety': string | undefined;
};
export namespace CONFIG {
    import chumsinc = CONFIG.chums;
    export { chumsinc };
    import _chums_safety = CONFIG.chumssafety;
    export { _chums_safety as chums-safety };
}
