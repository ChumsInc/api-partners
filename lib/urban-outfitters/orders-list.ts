import Debug from 'debug';
const debug = Debug('chums:lib:urban-outfitters:orders-list');
import {loadSalesOrder, LoadSalesOrderProps, loadTracking, markComplete} from './db-utils';
import {Request, Response} from "express";
import {fetchGETResults} from "../fetch-utils";
import {unlink, writeFile} from 'fs/promises';
import {join} from 'path';
import {CarrierInfo, TrackingInfo} from "./uo-types";


const CSV_PATH = '/tmp/api-partners/';


export async function getOrders(req:Request, res:Response) {
    try {
        const {status, minDate, maxDate, SalesOrderNo} = req.params
        const props:LoadSalesOrderProps = {
            SalesOrderNo: SalesOrderNo,
            completed: status === 'all',
            minDate: minDate,
            maxDate: maxDate??new Date().toISOString(),
        }
        const orders = await loadSalesOrder(props);
        res.json({orders});
    } catch (err) {
        debug('getOrder()',);
        res.json({error: err.message})
    }
}

function carrierCode({StarshipShipVia, TrackingID}:TrackingInfo):CarrierInfo {
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

export async function getInvoiceTracking(req:Request, res:Response) {
    try {
        const soList:string = req.query.orders as string || '';
        const orders = soList.split(',');

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
        // const tracking = await loadTracking('chums', orders);
        //
        // const {results} = await fetchGETResults(`/node-sage/api/CHI/invoice/tracking/so?orders=${orders.join(',')}`);
        //
        //
        // for await (const track of results.tracking) {
        //     const [so] = await loadSalesOrder({SalesOrderNo: track.SalesOrderNo});
        //     // debug('getInvoiceTracking() so', so);
        //     const carrierInfo = carrierCode(track);
        //     csvData.push([
        //         so.uo_order_number || '',
        //         carrierInfo.code,
        //         carrierInfo.name,
        //         carrierInfo.url,
        //         track.TrackingID
        //     ].join(';'));
        // }
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

    } catch(err) {
        debug("getInvoiceTracking()", err.message);
        res.json({error: err.message})
    }
}

export async function postCompleteOrders(req:Request, res:Response) {
    try {
        const {salesOrders} = req.body;
        await markComplete(salesOrders);
        res.json({success: true});
    } catch(err) {
        debug("postCompleteOrders()", err.message);
        res.json({error: err.message})
    }
}
