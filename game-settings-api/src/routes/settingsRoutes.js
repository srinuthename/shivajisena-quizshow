const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.post('/', settingsController.saveSettings);
router.post('/reset', settingsController.resetSettings);

module.exports = router;