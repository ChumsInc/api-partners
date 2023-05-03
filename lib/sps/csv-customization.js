"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomDetail = exports.updateCustomHeader = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('chums:lib:sps:csv-customization');
function parseCustomerAccount({ ARDivisionNo = '', CustomerNo = '' }) {
    return [ARDivisionNo, CustomerNo].join('-');
}
/**
 * This function should return only new or changed fields to the SalesOrder
 */
const updateCustomHeader = (customer, header, csvLine) => {
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
exports.updateCustomHeader = updateCustomHeader;
/**
 * This function should return only changed fields to the SalesOrder Detail Line
 */
const updateCustomDetail = (customer, csvLine) => {
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
exports.updateCustomDetail = updateCustomDetail;
