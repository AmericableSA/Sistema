const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// @route   GET /api/products/history/all
// @desc    Get all inventory history (global)
router.get('/history/all', productController.getAllInventoryHistory); // Global History - Must be before /:id routes

// @route   GET /api/products
// @desc    Get all products
router.get('/', productController.getAllProducts);

// @route   GET /api/products/:id/bundle
// @desc    Get bundle details for a product
router.get('/:id/bundle', productController.getBundleDetails);

// @route   PUT /api/products/:id
// @desc    Update a product
router.put('/:id', productController.updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete a product
router.delete('/:id', productController.deleteProduct);

module.exports = router;
