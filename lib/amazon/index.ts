import {Router, Request, Response, NextFunction} from 'express';
const router = Router();
import {postFBAInvoice, postGLAccount, postItemMap} from './seller-central/fba';


router.post('/seller-central/fba/invoice', postFBAInvoice);
router.post('/seller-central/fba/gl-account', postGLAccount);
router.post('/seller-central/fba/item-map', postItemMap);


export default router;
