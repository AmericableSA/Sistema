const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.get('/', clientController.getClients);
router.get('/history/global', clientController.getGlobalHistory);
router.get('/:id/history', clientController.getClientHistory);
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);
router.post('/movements', clientController.registerMovement);

// Service Orders
router.get('/:id/orders', clientController.getServiceOrders);
router.put('/orders/:orderId', clientController.updateServiceOrder);
router.post('/:id/manual-order', clientController.createManualServiceOrder);
router.get('/technicians/list', clientController.getTechnicians);

module.exports = router;
