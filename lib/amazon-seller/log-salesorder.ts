/**
 * Created by steve on 3/3/2017.
 */

import {getSageCompany, mysql2Pool, ValidatedUser} from 'chums-local-modules';
import Debug from "debug";
import type {AmazonOrderInvoice, LoggedSalesOrder} from "./types.d.ts";
import {RowDataPacket} from "mysql2";
import {Request, Response} from "express";

const debug = Debug('chums:lib:amazon-seller:log-salesorder');

/**
 *
 * @param {Object} params
 * @param {String} params.Company
 * @param {String} params.SalesOrderNo
 * @param {String} params.AmazonOrderId
 * @param {String} params.OrderStatus
 * @param {String} [params.Notes]
 * @param {number} params.UserID
 * @param {String} params.action
 */

export interface LogSalesOrderProps {
    Company: string;
    SalesOrderNo: string;
    AmazonOrderId: string | number;
    OrderStatus: string;
    Notes?: string;
    UserID: number;
    action: string;
}

export const logSalesOrder = async (params: LogSalesOrderProps) => {
    // debug('logSalesOrder()', params);
    const query = `INSERT INTO c2.AZ_SalesOrderLog (Company,
                                                    dbCompany,
                                                    SalesOrderNo,
                                                    AmazonOrderId,
                                                    OrderStatus,
                                                    Notes,
                                                    UserID,
                                                    action)
                   VALUES (:Company,
                           b2b.dbCompany(:Company),
                           :SalesOrderNo,
                           :AmazonOrderId,
                           :OrderStatus,
                           :Notes,
                           :UserID,
                           :action)
                   ON DUPLICATE KEY UPDATE OrderStatus = :OrderStatus,
                                           Notes       = :Notes,
                                           UserID      = :UserID,
                                           action      = :action`;
    const data = {
        Company: getSageCompany(params.Company),
        SalesOrderNo: params.SalesOrderNo,
        AmazonOrderId: params.AmazonOrderId,
        OrderStatus: params.OrderStatus,
        Notes: params.Notes || null,
        UserID: params.UserID,
        action: JSON.stringify(params.action)
    };
    try {
        await mysql2Pool.query(query, data);
        return {success: true};
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.debug("logSalesOrder()", err.message);
            return Promise.reject(err);
        }
        console.debug("logSalesOrder()", err);
        return Promise.reject(new Error('Error in logSalesOrder()'));
    }
};


export const loadSalesOrder = async ({AmazonOrderId}: {
    AmazonOrderId: string | number
}): Promise<LoggedSalesOrder[]> => {
    try {
        const query: string = `SELECT az.Company, az.SalesOrderNo, az.OrderStatus, u.name
                               FROM c2.AZ_SalesOrderLog az
                                        LEFT JOIN users.users u ON u.id = az.UserID
                               WHERE AmazonOrderId = :AmazonOrderId`;
        const data = {AmazonOrderId};

        const [rows] = await mysql2Pool.query<(LoggedSalesOrder & RowDataPacket)[]>(query, data);
        return rows;
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.debug("loadSalesOrder()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadSalesOrder()", err);
        return Promise.reject(new Error('Error in loadSalesOrder()'));
    }
};

/**
 *
 * @param {string[]} AmazonOrderId
 * @return {Promise<AmazonOrderInvoice[]>}
 */
export const loadInvoiceData = async (AmazonOrderId: string[] = []): Promise<AmazonOrderInvoice[]> => {
    try {
        const query = `
            SELECT az.AmazonOrderId,
                   az.Company,
                   az.SalesOrderNo,
                   az.OrderStatus,
                   u.name,
                   h.OrderStatus,
                   ifnull(ih.InvoiceNo, sh.CurrentInvoiceNo) as InvoiceNo,
                   it.TrackingID
            FROM c2.AZ_SalesOrderLog az
                     LEFT JOIN users.users u ON u.id = az.UserID
                     LEFT JOIN c2.SO_SalesOrderHistoryHeader h
                               on h.Company = az.dbCompany and h.SalesOrderNo = az.SalesOrderNo
                     LEFT JOIN c2.ar_invoicehistoryheader ih
                               on ih.Company = az.dbCompany and ih.SalesOrderNo = az.SalesOrderNo
                     LEFT JOIN c2.SO_SalesOrderHeader sh
                               on sh.Company = az.dbCompany and sh.SalesOrderNo = az.SalesOrderNo
                     LEFT JOIN c2.AR_InvoiceHistoryTracking it
                               on it.Company = ih.Company and it.InvoiceNo = ih.InvoiceNo
            WHERE AmazonOrderId IN (:AmazonOrderId)`;
        const data = {AmazonOrderId};

        const [rows] = await mysql2Pool.query<(AmazonOrderInvoice & RowDataPacket)[]>(query, data);

        return rows;
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.debug("loadInvoiceData()", err.message);
            return Promise.reject(err);
        }
        console.debug("loadInvoiceData()", err);
        return Promise.reject(new Error('Error in loadInvoiceData()'));
    }

};


export const postAction = async (req: Request, res: Response<unknown, ValidatedUser>):Promise<void> => {
    try {
        if (!req.body) {
            res.json({error: 'Missing body content'});
            return;
        }
        req.body.action = req.params.action;
        const params: LogSalesOrderProps = {
            Company: req.params.Company as string,
            SalesOrderNo: req.params.SalesOrderNo as string,
            UserID: res.locals.auth.profile!.user.id,
            action: req.body,
            OrderStatus: '',
            AmazonOrderId: '-',
        };
        const action = req.params.action as string;
        switch (action.toLowerCase()) {
            case 'create':
                params.OrderStatus = 'Q';
                break;
            case 'promote':
                params.OrderStatus = 'N';
                break;
            case 'print':
                params.OrderStatus = 'P';
                break;
        }
        const result = await logSalesOrder(params)
        res.json({result});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("postAction()", err.message);
            res.status(500).json({error: err.message, name: err.name});
            return;
        }
        res.status(500).json({error: 'unknown error in postAction'});
    }
}
