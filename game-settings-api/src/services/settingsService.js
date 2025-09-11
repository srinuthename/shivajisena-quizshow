const Settings = require('../models/settingsModel');

// Get settings, or create with defaults if none exist
const getSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings({
      questions: [],
      questionCount: 10,
      timerDuration: 30,
      targetScore: 99,
      pointsPerQuestion: 11,
      useApiScoring: false,
      allowNegativeMarks: true,
      negativePointsPerQuestion: 10,
      skipPenaltyPointsPerQuestion:0,
      lifelinePenaltyPointsPerLifeline:5,
      fetchViewerVotes: false,
      viewerVotesApiUrl: '',
      viewerVotesApiKey: '',
      allowAnswerReview: true,
      gameShowMode: 'Solo',
    });
    await settings.save();
  }
  return settings;
};

// Save settings (update if exists, otherwise create)
const saveSettings = async (data) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings(data);
  } else {
    Object.assign(settings, data); // merge all fields dynamically
    settings.updatedAt = new Date();
  }
  await settings.save();
  return settings;
};

// Reset settings to given default data
const resetSettings = async (defaultData) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings(defaultData);
  } else {
    Object.assign(settings, defaultData); // overwrite with defaults
    settings.updatedAt = new Date();
  }
  await settings.save();
  return settings;
};

module.exports = { getSettings, saveSettings, resetSettings };
