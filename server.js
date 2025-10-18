require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const OpenAI = require("openai");
const cron = require('node-cron');
const sgMail = require('@sendgrid/mail');

const app = express();

// ----------------------
// Config
// ----------------------
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect()
  .then(() => console.log("✅ Connected to DB!"))
  .catch(err => console.error("❌ DB connection error", err));

const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ----------------------
// Middleware
// ----------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadPath));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ----------------------
// Helpers
// ----------------------
async function sendEmailNotification(to, subject, message) {
  try {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM,
      replyTo: process.env.SENDGRID_FROM,
      subject,
      text: message,
      html: `<p>${message}</p>`
    };
    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`❌ Email error for ${to}:`, err.response?.body || err.message);
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----------------------
// Routes
// ----------------------
app.get('/', (req, res) => res.render('index', { user: req.session.user }));
app.get('/register', (req, res) => res.render('register', { message: '' }));

app.post('/register', async (req, res) => {
  const { username, full_name, email, phone, age, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, full_name, email, phone, age, password, role) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [username, full_name, email, phone, age, hashedPassword, role]
    );
    res.redirect('/login');
  } catch {
    res.render('register', { message: 'User exists or invalid input' });
  }
});

app.get('/login', (req, res) => res.render('login', { message: '' }));
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (!userRes.rows[0]) return res.render('login', { message: 'Invalid email or password' });
    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render('login', { message: 'Invalid email or password' });
    req.session.user = { id: user.id, username: user.username, full_name: user.full_name, email: user.email, role: user.role };
    res.redirect('/home');
  } catch {
    res.render('login', { message: 'Something went wrong' });
  }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// ----------------------
// AI Route
// ----------------------
app.get('/ask-ai', (req, res) => { if (!req.session.user) return res.redirect('/login'); res.render('ask_ai', { user: req.session.user }); });
app.post('/ask-ai', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "Question required" });
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an AI tutor helping students with programming and computer science topics." },
        { role: "user", content: question }
      ]
    });
    res.json({ answer: response.choices[0].message.content });
  } catch { res.status(500).json({ error: "AI request failed" }); }
});

// ----------------------
// Notifications Cron
// ----------------------
cron.schedule('0 9 * * *', async () => {
  try {
    const rows = await pool.query(`
      SELECT a.id, a.title, a.due_date, u.email
      FROM assignments a
      JOIN enrollments e ON e.course_id = a.course_id
      JOIN users u ON u.id = e.student_id
      WHERE (a.due_date::date) = (CURRENT_DATE + INTERVAL '1 day')::date
    `);
    if (rows.rows.length) {
      await Promise.all(rows.rows.map(r => sendEmailNotification(r.email, '⏰ Assignment Due Tomorrow', `Your assignment "${r.title}" is due tomorrow.`)));
      console.log(`✅ Sent ${rows.rows.length} reminders`);
    }
  } catch (err) { console.error('❌ Cron error:', err); }
}, { scheduled: true, timezone: 'Asia/Kolkata' });

// ----------------------
// Start server
// ----------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
