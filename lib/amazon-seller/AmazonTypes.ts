export interface Amount {
    Amount: string|number,
    CurrencyCode: string,
}

export interface AmazonOrder {
    OrderType: string,
    BuyerEmail: string,
    LastUpdateDate: string,
    NumberOfItemsShipped: number,
    ShipServiceLevel: string,
    SalesChannel: string,

}
