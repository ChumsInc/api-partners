import Debug from 'debug';
import {logPath, validateUser} from 'chums-local-modules';
import {Router} from 'express';
import {default as amazonRouter} from './amazon/index.js';
import {default as amwsRouter} from './amazon-seller/index.js';
import {default as urbanRouter} from './urban-outfitters/index.js';
import {default as walmartSellerRouter} from './walmart-seller/index.js';
import {default as spsRouter} from './sps/index.js'
import {aboutAPI, aboutMe} from "./about/index.js";

const debug = Debug('chums:lib');
const router = Router({mergeParams: true});

router.use(validateUser, logPath(debug));

router.use('/amazon', amazonRouter);
router.use('/amws', amwsRouter);
router.use('/sps', spsRouter);
router.use('/urban-outfitters', urbanRouter);
router.use('/walmart-seller', walmartSellerRouter);
router.get('/about.json', aboutAPI);
router.get('/about-me.json', aboutMe);

export default router;



