const settingsService = require('../services/settingsService');
const defaultData = require('../data/defaultSettings.json'); // Create this file with your default settings

exports.getSettings = async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.saveSettings = async (req, res) => {
  try {
    const settings = await settingsService.saveSettings(req.body);
    res.json(settings);
  } catch (err) {
    console.error("Error in saveSettings:", err); // Add this line
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.resetSettings = async (req, res) => {
  try {
    const settings = await settingsService.resetSettings(defaultData);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};