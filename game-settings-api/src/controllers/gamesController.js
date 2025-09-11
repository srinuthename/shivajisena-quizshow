const Game = require('../models/gameModel');
const games = require('../data/games');

exports.createGame = (req, res) => {
  const { questions } = req.body;
  const game = new Game({ questions });
  games.push(game);
  res.status(201).json(game);
};

exports.getGame = (req, res) => {
  const { id } = req.params;
  const game = games.find(g => g.id === id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
};

// Add more methods for updating progress, score, etc.