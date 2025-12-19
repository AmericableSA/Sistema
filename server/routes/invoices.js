const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');


router.post('/', invoiceController.createInvoice);
router.get('/', invoiceController.getInvoices);
router.post('/:invoice_id/pay', invoiceController.registerPayment);
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
