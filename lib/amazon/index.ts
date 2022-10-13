import {Router} from 'express';
import {getItemMap, postFBAInvoice, postGLAccount, postItemMap} from './seller-central/fba';

const router = Router();


router.post('/seller-central/fba/invoice', postFBAInvoice);
router.post('/seller-central/fba/gl-account', postGLAccount);
router.get('/seller-central/fba/item-map', getItemMap);
router.post('/seller-central/fba/item-map', postItemMap);


export default router;
