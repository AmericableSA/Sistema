const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// @route   GET /api/products/history/all
// @desc    Get all inventory history (global)
router.get('/history/all', productController.getAllInventoryHistory); // Global History - Must be before /:id routes

// @route   GET /api/products/export-xls
// @desc    Export products to Excel
router.get('/export-xls', productController.exportProductsXLS);

// @route   GET /api/products
// @desc    Get all products
// @desc    Get all// Routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Dynamic Units
router.get('/units/list', productController.getUnits);
router.post('/units', productController.createUnit);
router.delete('/units/:id', productController.deleteUnit);

router.get('/export/excel', productController.exportProductsXLS);
router.get('/bundles/:id', productController.getBundleDetails);

// @route   PUT /api/products/:id
// @desc    Update a product
router.put('/:id', productController.updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete a product
router.delete('/:id', productController.deleteProduct);

module.exports = router;
