// server.js
require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const settingsRoutes = require('./routes/settingsRoutes');
const viewerVotesRoutes = require('./routes/viewerVotesRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const gameRoutes = require('./routes/gameRoutes');
const cors = require('cors');

// Initialize app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/settings', settingsRoutes);
app.use('/api/viewer-votes', viewerVotesRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api', gameRoutes);

// Start server
const PORT = process.env.PORT || 5030;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
