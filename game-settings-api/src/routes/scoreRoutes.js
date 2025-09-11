const express = require('express');
const router = express.Router();

// POST /api/score
router.post('/', (req, res) => {
  // Extract values from request body
  const { guestChoice, correctAnswer, viewerCorrect, viewerIncorrect } = req.body;

  // Dummy logic: generate a random score between 10 and 20
  const score = Math.floor(Math.random() * 11) + 10;

  res.json({ score });
});

module.exports = router;