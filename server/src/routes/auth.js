const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDb, saveDatabase } = require('../database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Rate limiter: max 10 login requests per IP per 15-minute window
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to get single row
function getOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Helper function to run insert/update and get lastInsertRowid
function runInsert(db, sql, params = []) {
  db.run(sql, params);
  const result = db.exec("SELECT last_insert_rowid() as id");
  return result[0]?.values[0]?.[0];
}

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const db = getDb();
    
    // Check if user already exists
    const existingUser = getOne(db, 'SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const lastId = runInsert(db, 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    saveDatabase();

    // Generate token
    const token = jwt.sign({ id: lastId, username, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: lastId, username, email, timezone: 'America/Los_Angeles' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = getOne(db, 'SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((lockedUntil - new Date()) / 60000);
        return res.status(423).json({
          error: `Account is locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s).`
        });
      }
      // Lock period expired — reset
      db.run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
      saveDatabase();
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      const attempts = (user.failed_login_attempts || 0) + 1;

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000).toISOString();
        db.run('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockUntil, user.id]);
        saveDatabase();
        return res.status(423).json({
          error: `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
        });
      }

      db.run('UPDATE users SET failed_login_attempts = ? WHERE id = ?', [attempts, user.id]);
      saveDatabase();

      const remaining = MAX_LOGIN_ATTEMPTS - attempts;
      return res.status(401).json({
        error: `Invalid credentials. ${remaining} attempt(s) remaining before account lockout.`
      });
    }

    // Successful login — reset failed attempts
    if (user.failed_login_attempts > 0) {
      db.run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
      saveDatabase();
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, timezone: user.timezone || 'America/Los_Angeles' }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = getOne(db, 'SELECT id, username, email, timezone FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.timezone = user.timezone || 'America/Los_Angeles';
    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update username
router.put('/update-username', authenticateToken, async (req, res) => {
  try {
    const { newUsername } = req.body;

    if (!newUsername) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (newUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const db = getDb();

    // Check if username already exists
    const existingUser = getOne(db, 'SELECT id FROM users WHERE username = ? AND id != ?', [newUsername, req.user.id]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Update username
    db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, req.user.id]);
    saveDatabase();

    res.json({
      message: 'Username updated successfully',
      user: { id: req.user.id, username: newUsername, email: req.user.email }
    });
  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update timezone
router.put('/update-timezone', authenticateToken, (req, res) => {
  try {
    const { timezone } = req.body;

    if (!timezone) {
      return res.status(400).json({ error: 'Timezone is required' });
    }

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch (e) {
      return res.status(400).json({ error: 'Invalid timezone' });
    }

    const db = getDb();
    db.run('UPDATE users SET timezone = ? WHERE id = ?', [timezone, req.user.id]);
    saveDatabase();

    res.json({
      message: 'Timezone updated successfully',
      user: { timezone }
    });
  } catch (error) {
    console.error('Update timezone error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update email
router.put('/update-email', authenticateToken, async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const db = getDb();

    // Check if email already exists
    const existingUser = getOne(db, 'SELECT id FROM users WHERE email = ? AND id != ?', [newEmail, req.user.id]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Update email
    db.run('UPDATE users SET email = ? WHERE id = ?', [newEmail, req.user.id]);
    saveDatabase();

    res.json({
      message: 'Email updated successfully',
      user: { id: req.user.id, username: req.user.username, email: newEmail }
    });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password
router.put('/update-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();
    const user = getOne(db, 'SELECT password FROM users WHERE id = ?', [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    saveDatabase();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
