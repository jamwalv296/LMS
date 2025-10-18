require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'defaultSecret123',
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static('public'));
app.set('view engine', 'ejs');

// ---------- PostgreSQL Pool ----------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for some hosted DBs
  },
});

// ---------- File Upload Setup ----------
const uploadDir = '/tmp/uploads';
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

// ---------- Routes ----------

// Test route
app.get('/', async (req, res) => {
  res.send('Serverless function running!');
});

// File upload route
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded');
    res.send({ message: 'File uploaded', file: req.file });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Example database route
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error' });
  }
});

// Example login route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (result.rows.length === 0) return res.status(401).send('Invalid credentials');

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).send('Invalid credentials');

    req.session.userId = user.id;
    res.send('Logged in');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Catch-all for unknown routes
app.all('*', (req, res) => res.status(404).send('Not Found'));

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
