const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const GameSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 }, // unique game id
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question', // assuming you have a Question model
    },
  ],
  progress: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// middleware to auto-update `updatedAt`
GameSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Game = mongoose.model('Game', GameSchema);

module.exports = Game;
