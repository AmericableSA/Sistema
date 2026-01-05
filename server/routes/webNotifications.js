const express = require('express');
const router = express.Router();
const controller = require('../controllers/webNotificationsController');

// AVERIAS
router.get('/averias', controller.getAverias);
router.put('/averias/:id/resolve', controller.resolveAveria);
router.delete('/averias/:id', controller.deleteAveria);
router.get('/averias/export', controller.exportAveriasXLS);

// CONTACTOS
router.get('/contactos', controller.getContactos);
router.put('/contactos/:id/assign', controller.assignContact);
router.put('/contactos/:id/status', controller.toggleContactStatus);
router.delete('/contactos/:id', controller.deleteContacto);
router.get('/contactos/export', controller.exportContactosXLS);

module.exports = router;
