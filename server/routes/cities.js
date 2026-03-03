const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');

router.get('/', cityController.getCities);
router.post('/', cityController.createCity);
router.put('/:id', cityController.updateCity);
router.delete('/:id', cityController.deleteCity);

// Neighborhoods by city
router.get('/:cityId/neighborhoods', cityController.getNeighborhoodsByCity);
router.post('/:cityId/neighborhoods', cityController.createNeighborhood);
router.put('/:cityId/neighborhoods/:id', cityController.updateNeighborhood);
router.delete('/:cityId/neighborhoods/:id', cityController.deleteNeighborhood);

module.exports = router;
