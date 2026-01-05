const express = require('express');
const router = express.Router();
const cash = require('../controllers/cashController');
const billing = require('../controllers/billingController');
const inventory = require('../controllers/inventoryController');

const servicePlan = require('../controllers/servicePlanController');

// Cash
// Route Config
router.get('/status', cash.getStatus);
router.get('/stats', cash.getSessionStats); // NEW
router.post('/open', cash.openSession);
router.post('/close', cash.closeSession);
router.post('/movement', cash.addMovement); // New

// Billing
router.get('/details/:clientId', billing.getBillingDetails); // New
router.get('/history', billing.getDailyTransactions); // New
router.get('/transaction/:id', billing.getTransactionById); // MISSING ROUTE RESTORED
router.post('/pay', billing.createTransaction);
router.post('/transaction/:id/cancel', billing.cancelTransaction);
router.get('/plans', servicePlan.getPlans); // New Plan Route

// Inventory for Billing
router.get('/products', inventory.getProductsForBilling);

module.exports = router;
