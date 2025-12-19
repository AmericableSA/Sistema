const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// @route   GET /api/transactions
// @desc    Get all inventory movement history
router.get('/', transactionController.getTransactions);

// @route   POST /api/transactions
// @desc    Create a new movement (IN/OUT)
router.post('/', transactionController.createTransaction);

module.exports = router;
