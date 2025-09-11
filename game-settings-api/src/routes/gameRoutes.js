const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gamesController');

router.post('/games', gameController.createGame);
router.get('/games/:id', gameController.getGame);

module.exports = router;