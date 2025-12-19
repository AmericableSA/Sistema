const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');

router.get('/', zoneController.getZones);
router.post('/', zoneController.createZone);
router.put('/:id', zoneController.updateZone);
router.delete('/:id', zoneController.deleteZone);

module.exports = router;
