const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.get('/export-xls', clientController.exportClientsXLS); // Must be before /:id routes to avoid conflict

router.get('/', clientController.getClients);
router.get('/history/global', clientController.getGlobalHistory);
router.get('/:id/history', clientController.getClientHistory);
router.get('/:id/transactions', clientController.getClientTransactions);
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);
router.post('/movements', clientController.registerMovement);

const materialController = require('../controllers/materialController');

// Service Orders
router.get('/:id/orders', clientController.getServiceOrders);
router.put('/orders/:orderId', clientController.updateServiceOrder);
router.post('/:id/manual-order', clientController.createManualServiceOrder);
router.get('/technicians/list', clientController.getTechnicians);

// Materials for Orders
router.get('/orders/:orderId/materials', materialController.getMaterials);
router.post('/orders/:orderId/materials', materialController.addMaterial);
router.delete('/orders/materials/:id', materialController.removeMaterial);

// Client Notes
router.get('/:id/notes', clientController.getClientNotes);
router.post('/:id/notes', clientController.createClientNote);
router.put('/notes/:noteId', clientController.updateClientNote);
router.delete('/notes/:noteId', clientController.deleteClientNote);

module.exports = router;
