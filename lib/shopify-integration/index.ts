import Debug from 'debug';
const debug = Debug('chums:lib');

import {Router, Request, Response, NextFunction} from 'express';
const router = Router();

import {validateRole, validateUser} from 'chums-local-modules';

const {getProducts, getProduct, getChangedVariants, putChangedVariants, putSalePrice} = require('./products');
const {getInventoryLevels, setInventoryLevels, updateInventory, updateInventoryItem} = require('./inventory-levels');
const {getInventoryItems, pushInventoryItems} = require('./inventory-items');
const {triggerImport, getOrders, getOrder, getOrderRisk, fetchOrder, postUpdateOrderNo}  = require('./orders');

const {getPayouts, getTransactions, postUpdateComplete, getOpenPayPalInvoices} = require('./payments');
const {getFulfillTracking, getFulfillOrder} = require('./fulfillment');
const {getItemValidation} = require('./item-validation');
const collection = require('./collection');

function logPath(req:Request, res:Response, next:NextFunction) {
    const user:string = res.locals.profile?.user?.email || res.locals.profile?.user?.id || '-';
    debug(req.ip, user, req.method, req.originalUrl);
    next();
}

router.use(validateUser);
router.use(logPath);

router.get('/:store/products', getProducts);
router.get('/:store/product/:id(\\d+)', getProduct);
router.get('/:store/products/changed-variants', getChangedVariants);
router.put('/:store/products/changed-variants', putChangedVariants);
router.get('/:store/products/update-variants', putChangedVariants);
router.put('/:store/products/sale-price', putSalePrice);

router.get('/:store/collections', collection.getCollections);
router.get('/:store/fetch/collections', collection.getCollectionsFromShopify);
router.get('/:store/collections/:collectionId/products', collection.getCollectionProducts);

router.get('/:store/inventory-items', getInventoryItems);
router.get('/:store/inventory-items/update', pushInventoryItems);
router.get('/:store/inventory-items/problems', getItemValidation);
router.get('/:store/inventory-items/validation', getItemValidation);

router.get('/inventory-levels', getInventoryLevels);
router.get('/set-inventory-levels', setInventoryLevels);
router.get('/:store/update-inventory/:ItemCode', updateInventoryItem);
router.get('/:store/update-inventory', updateInventory);


router.post('/fulfillment/process', getFulfillTracking);
router.get('/fulfillment/:id', getFulfillOrder);
router.post('/fulfillment/:id', getFulfillOrder);

// router.get('/orders', triggerImport);
router.post('/orders/create', triggerImport);
router.post('/orders/create/:id(\\d+)', triggerImport);
router.get('/orders/fetch', getOrders);
router.get('/orders/fetch/:id(\\d+)', getOrder);
router.get('/orders/risk/:id(\\d+)', getOrderRisk);
router.get('/orders/:id(\\d+)', fetchOrder);
router.post('/orders/:id(\\d+)/link/:SalesOrderNo', postUpdateOrderNo);

router.get('/payments/payouts', getPayouts);
router.get('/payments/payouts/:payout_id(\\d+)', getTransactions);
router.post('/payments/payouts/complete/:payout_id(\\d+)', postUpdateComplete);

router.get('/payments/paypal/', getOpenPayPalInvoices);

router.get('/env', validateRole('root'), (req:Request, res:Response) => {
    res.json({env: process.env});
})

export default router;

