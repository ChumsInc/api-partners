import {Router} from 'express';
import {
    deleteItemMap,
    getItemMap,
    postFBAInvoice,
    postFBAInvoiceBaseData,
    postFBAInvoiceCharges,
    postFBAInvoiceSalesOrder,
    postFBASettlement,
    postGLAccount,
    postItemMap
} from './seller-central/fba/index.js';

const router = Router();


router.post('/seller-central/fba/invoice/base', postFBAInvoiceBaseData);
router.post('/seller-central/fba/invoice/charges', postFBAInvoiceCharges);
router.post('/seller-central/fba/invoice/sales-order', postFBAInvoiceSalesOrder);
router.post('/seller-central/fba/invoice/settlement', postFBASettlement);
router.post('/seller-central/fba/invoice', postFBAInvoice);
router.post('/seller-central/fba/gl-account', postGLAccount);
router.get('/seller-central/fba/item-map', getItemMap);
router.post('/seller-central/fba/item-map', postItemMap);
router.delete('/seller-central/fba/item-map/:sku', deleteItemMap);


export default router;
