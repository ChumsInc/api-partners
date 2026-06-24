import {Router} from 'express';
import {testCSVFile} from './csv-validate.js'
import {getMapping, postMapping, deleteMapping, getCustomers, postCustomer} from './mapping.js';

const router = Router();

router.get('/customers.json', getCustomers);
router.get('/customers', getCustomers);
router.post('/customers/:ARDivisionNo-:CustomerNo.json', postCustomer);
router.post('/customers/:Company/:ARDivisionNo-:CustomerNo', postCustomer);

router.delete('/mapping/item/:ARDivisionNo-:CustomerNo/:id.json', deleteMapping);
router.get('/mapping/:ARDivisionNo-:CustomerNo.json', getMapping);
router.post('/mapping/:ARDivisionNo-:CustomerNo.json', getMapping);
router.delete('/mapping/:ARDivisionNo-:CustomerNo/:MapField/:CustomerValue.json', deleteMapping);

router.get('/mapping/:Company/:ARDivisionNo-:CustomerNo', getMapping);
router.post('/mapping/:Company/:ARDivisionNo-:CustomerNo', postMapping);
router.delete('/mapping/:Company/:ARDivisionNo-:CustomerNo/:MapField/:CustomerValue', deleteMapping);

router.post('/upload.json', testCSVFile);
router.post('/upload', testCSVFile);

export default router;
