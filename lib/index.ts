import Debug from 'debug';
import {getUserValidation, validateUser} from 'chums-local-modules';
import {NextFunction, Request, Response, Router} from 'express';
import {default as amazonRouter} from './amazon/index.js';
import {default as amwsRouter} from './amazon-seller/index.js';
import {default as urbanRouter} from './urban-outfitters/index.js';
import {default as walmartSellerRouter} from './walmart-seller/index.js';
import {default as spsRouter} from './sps/index.js'

const debug = Debug('chums:lib');
const router = Router({mergeParams: true});

router.use(validateUser, (req: Request, res: Response, next: NextFunction) => {
    const {ip, method, originalUrl} = req;
    const auth = getUserValidation(res);
    const user = auth?.profile?.user?.email || auth?.profile?.user?.id || '-';
    const referer = req.get('referer') || '';
    debug(ip, user, method, originalUrl, referer);
    // debug(req.url);
    next();
});


router.use('/amazon', amazonRouter);
router.use('/amws', amwsRouter);
router.use('/sps', spsRouter);
router.use('/urban-outfitters', urbanRouter);
router.use('/walmart-seller', walmartSellerRouter);
router.get('/exists', (req: Request, res: Response) => res.json({hello: 'world'}));

export default router;



