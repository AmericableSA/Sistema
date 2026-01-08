const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');

router.get('/', cityController.getCities);
router.post('/', cityController.createCity);
router.put('/:id', cityController.updateCity);
router.delete('/:id', cityController.deleteCity);

module.exports = router;
