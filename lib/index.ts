import Debug from 'debug';
import {validateUser} from 'chums-local-modules';
import {NextFunction, Request, Response, Router} from 'express';
import {default as shopifyRouter} from './shopify-integration';
import {default as urbanRouter} from './urban-outfitters';
import {default as amazonRouter} from './amazon';

const debug = Debug('chums:lib');

const router = Router({mergeParams: true});

router.use(validateUser, (req: Request, res: Response, next: NextFunction) => {
    const {ip, method, originalUrl} = req;
    const user = res.locals.profile?.user?.email || res.locals.profile?.user?.id || '-';
    const referer = req.get('referer') || '';
    debug(ip, user, method, originalUrl, referer);
    // debug(req.url);
    next();
});


router.use('/shopify', shopifyRouter);
router.use('/urban-outfitters', urbanRouter);
router.use('/amazon', amazonRouter);
router.get('/exists', (req: Request, res: Response) => res.json({hello: 'world'}));

export default router;



