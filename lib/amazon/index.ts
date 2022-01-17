import {Router, Request, Response, NextFunction} from 'express';
const router = Router();
import {postFBAInvoice} from './seller-central/fba';


router.post('/seller-central/fba/invoice', postFBAInvoice);


export default router;
