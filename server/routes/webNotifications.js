const express = require('express');
const router = express.Router();
const controller = require('../controllers/webNotificationsController');

// AVERIAS
router.get('/averias', controller.getAverias);
router.post('/averias/:id/assign', controller.assignAveriaToClient); // NEW
router.put('/averias/:id/resolve', controller.resolveAveria);
router.delete('/averias/:id', controller.deleteAveria);
router.get('/averias/export', controller.exportAveriasXLS);

// CONTACTOS
router.get('/cajas', async (req, res) => {
    try {
        await controller.getCajas(req, res);
    } catch (error) {
        console.error("Error in /cajas route:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/contactos', async (req, res) => {
    try {
        await controller.getContactos(req, res);
    } catch (error) {
        console.error("Error in /contactos route:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// Contact routes
router.put('/contactos/:id/assign', controller.assignContact); // Missing route added
router.put('/contactos/:id/status', controller.toggleContactStatus);
router.delete('/contactos/:id', controller.deleteContacto);
router.get('/contactos/export', controller.exportContactosXLS);

module.exports = router;
