const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// New Dashboard Endpoints
router.get('/sales-summary', reportController.getSalesSummary);
router.get('/inventory-value', reportController.getInventoryValue);
router.get('/sales-by-user', reportController.getSalesByUser); // Uses collector_id
router.get('/top-products', reportController.getTopProducts); // Placeholder
router.get('/sales-chart', reportController.getSalesChart);

// Legacy (still kept if needed for other parts, but page uses new ones)
router.get('/dashboard', reportController.getDashboardStats);
// router.get('/history', reportController.getDetailedHistory); // Removed as not in controller

// Cable TV Specific Reports
router.get('/cable-stats', reportController.getCableStats);
router.get('/daily-closing', reportController.getDailyClosing);
router.get('/daily-details', reportController.getDailyDetails);

// Operational Reports (Movements & Orders)
router.get('/movements', reportController.getMovementsReport);
router.get('/orders', reportController.getServiceOrdersReport);

module.exports = router;
