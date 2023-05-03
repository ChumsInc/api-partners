import Debug from 'debug';
import {SPSBaseCustomer, SPSOrderLine, SPSSalesOrder, SPSSalesOrderDetailLine} from "./sps-types";

const debug = Debug('chums:lib:sps:csv-customization');

function parseCustomerAccount ({ARDivisionNo = '', CustomerNo = ''}:SPSBaseCustomer):string {
    return [ARDivisionNo, CustomerNo].join('-');
}

/**
 * This function should return only new or changed fields to the SalesOrder
 */
export const updateCustomHeader = (customer:SPSBaseCustomer, header:unknown, csvLine:unknown):Partial<SPSSalesOrder> => {
    if (!customer) {
        return {};
    }
    const acct = parseCustomerAccount(customer);
    switch (acct) {
    case '01-TEST': // as en example;
        return {
            SalespersonDivisionNo: '01',
            SalespersonNo: 'TEST'
        };
    case '02-IL0010':
        return {};
    default:
        return {};
    }
};


/**
 * This function should return only changed fields to the SalesOrder Detail Line
 */
export const updateCustomDetail = (customer:SPSBaseCustomer, csvLine:SPSOrderLine):Partial<SPSSalesOrderDetailLine> => {
    if (!customer) {
        return {};
    }
    const acct = parseCustomerAccount(customer);
    switch (acct) {
    case '02-IL0010':
        return {
            CommentText: `Grainger Item: ${csvLine['Buyers Catalog or Stock Keeping #']}`
        };
    default:
        return {};
    }
};
