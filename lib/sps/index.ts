import {Router} from 'express';
import {testCSVFile} from './csv-validate.js'
import {getMapping, postMapping, deleteMapping, getCustomers, postCustomer} from './mapping.js';

const router = Router();

router.get('/customers', getCustomers);
router.post('/customers/:Company/:ARDivisionNo-:CustomerNo', postCustomer);

router.get('/mapping/:Company/:ARDivisionNo-:CustomerNo', getMapping);
router.post('/mapping/:Company/:ARDivisionNo-:CustomerNo', postMapping);
router.delete('/mapping/:Company/:ARDivisionNo-:CustomerNo/:MapField/:CustomerValue', deleteMapping);

router.post('/upload', testCSVFile);

export default router;
