const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  id: Number,
  text: String,
  image: String,
  category: String,
  level: { type: String, default: 'Std V' },
  difficulty: { type: String, default: 'Medium' },
  options: [String],
  correctAnswer: Number,
  correctAnswerText: String,
});

const SettingsSchema = new mongoose.Schema({
  questions: [QuestionSchema],
  questionCount: { type: Number, default: 10 },
  timerDuration: Number,
  targetScore:  { type: Number, default: 99 },
  pointsPerQuestion: { type: Number, default: 11 },
  quizTitle: { type: String, default: 'SPP News Quiz Vijetha' },
  useApiScoring: { type: Boolean, default: false },
  allowNegativeMarks: { type: Boolean, default: true },
  negativePointsPerQuestion: { type: Number, default: 10 },
  skipPenaltyPointsPerQuestion:{type: Number, default: 0},
  lifelinePenaltyPointsPerLifeline:{type:Number, default:5},
  fetchViewerVotes: { type: Boolean, default: false },
  viewerVotesApiUrl: { type: String, default: '' },
  viewerVotesApiKey: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  allowAnswerReview: { type: Boolean, default: true },
  gameShowMode: { type: String, default: 'Solo' },
});

module.exports = mongoose.model('Settings', SettingsSchema);
