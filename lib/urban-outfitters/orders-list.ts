import Debug from 'debug';
const debug = Debug('chums:lib:urban-outfitters:orders-list');
import {loadSalesOrder, LoadSalesOrderProps, loadTracking, markComplete} from './db-utils';
import {Request, Response} from "express";
import {fetchGETResults} from "../fetch-utils";
import {unlink, writeFile, access, mkdir} from 'fs/promises';
import {constants} from 'fs';
import {join} from 'path';
import {CarrierInfo, TrackingInfo} from "./uo-types";


const CSV_PATH = '/tmp/api-partners/';


export async function getOrders(req:Request, res:Response) {
    try {
        const {status, minDate, maxDate, SalesOrderNo} = req.params
        const props:LoadSalesOrderProps = {
            SalesOrderNo: SalesOrderNo,
            completed: status === 'all' || (!!minDate && !!maxDate),
            minDate: minDate,
            maxDate: maxDate??new Date().toISOString(),
        }
        const orders = await loadSalesOrder(props);
        res.json({orders});
    } catch (err:unknown) {
        if (err instanceof Error) {
            debug('getOrder()', err.message);
            return res.json({error: err.message})
        }
        debug('getOrder()', err);
        res.json({error: err})
    }
}

function carrierCode({StarshipShipVia, TrackingID}:TrackingInfo):CarrierInfo {
    debug('carrierCode()',{StarshipShipVia, TrackingID});
    if (/usps/i.test(StarshipShipVia)) {
        const url = 'https://tools.usps.com/go/TrackConfirmAction.action?tLabels=TRACKINGNUMBER'
            .replace('TRACKINGNUMBER', encodeURIComponent(TrackingID));
        // const url = 'https://wwwapps.ups.com/';
        return {code: 'usps', name: 'USPS', url};
    }
    if (/ups/i.test(StarshipShipVia)) {
        const url = 'https://wwwapps.ups.com/WebTracking/processInputRequest?TypeOfInquiryNumber=T&InquiryNumber1=TRACKINGNUMBER'
            .replace('TRACKINGNUMBER', encodeURIComponent(TrackingID));
        // const url = 'https://tools.usps.com';
        return {code: 'ups', name: 'UPS', url};
    }
    if (/fedex/i.test(StarshipShipVia)) {
        // const url = 'https://www.fedex.com/fedextrack/?tracknumbers=TRACKINGNUMBER'
        //     .replace('TRACKINGNUMBER', encodeURIComponent(TrackingID));
        const url = 'https://www.fedex.com/fedextrack/';
        return {code: 'fedex', name: 'FedEx', url};
    }
    return {
        code: '',
        name: StarshipShipVia,
        url: ''
    }
}

async function ensureTempPathExists() {
    try {
        await mkdir(CSV_PATH, {recursive: true});
        await access(CSV_PATH, constants.W_OK);
        return true;
    } catch(error:unknown) {
        return Promise.reject(new Error('Unable to create temp path'));
    }
}

export async function getInvoiceTracking(req:Request, res:Response) {
    try {
        const soList:string = req.query.orders as string || '';
        const orders = soList.split(',').filter(so => !!so);
        if (orders.length === 0) {
            return res.json({error: 'No orders submitted'});
        }

        const csvData:string[] = [];
        csvData.push('order-id;carrier-code;carrier-name;carrier-url;tracking-number');

        for await (const SalesOrderNo of orders) {
            const [order] = await loadSalesOrder({SalesOrderNo});
            if (order) {
                const [tracking] = await loadTracking('chums', order.InvoiceNo);
                if (tracking) {
                    const carrierInfo = carrierCode(tracking);
                    csvData.push([
                        order.uo_order_number || '',
                        carrierInfo.code,
                        carrierInfo.name,
                        carrierInfo.url,
                        tracking.TrackingID
                    ].join(';'));
                }
            }
        }
        await ensureTempPathExists();
        const date = new Date();
        const filename = join(CSV_PATH, `tracking-${date.toISOString()}.csv`);
        const result = await writeFile(filename, csvData.join('\n'), );
        debug('getInvoiceTracking()', result);
        res.sendFile(filename, {}, async (err) => {
            if (err) {
                debug('getInvoiceTracking() res.sendFile', err);
            }
            await unlink(filename);
        });

    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("getInvoiceTracking()", err.message);
            return res.json({error: err.message})
        }
        res.json({error: `getInvoiceTracking() Error: ${err}`});
    }
}

export async function postCompleteOrders(req:Request, res:Response) {
    try {
        const {salesOrders} = req.body;
        await markComplete(salesOrders);
        res.json({success: true});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("postCompleteOrders()", err.message);
            res.json({error: err.message})
        }
        debug("postCompleteOrders()", err);
        res.json({error: err})
    }
}

