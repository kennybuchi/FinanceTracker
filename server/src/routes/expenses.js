const express = require('express');
const { getDb, saveDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

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

// Helper function to get all rows
function getAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper function to run insert and get lastInsertRowid
function runInsert(db, sql, params = []) {
  db.run(sql, params);
  const result = db.exec("SELECT last_insert_rowid() as id");
  return result[0]?.values[0]?.[0];
}

// Get all expenses for a user (with optional month/year filter)
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    const db = getDb();

    let sql = 'SELECT * FROM expenses WHERE user_id = ?';
    const params = [userId];

    if (month && year) {
      sql += " AND strftime('%m', date) = ? AND strftime('%Y', date) = ?";
      params.push(month.toString().padStart(2, '0'), year.toString());
    }

    sql += ' ORDER BY date DESC';

    const expenses = getAll(db, sql, params);
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expense summary by category for a month
router.get('/summary/:year/:month', (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user.id;
    const db = getDb();

    const summary = getAll(db, `
      SELECT category, SUM(amount) as total
      FROM expenses
      WHERE user_id = ? 
        AND strftime('%Y', date) = ?
        AND strftime('%m', date) = ?
      GROUP BY category
    `, [userId, year, month.toString().padStart(2, '0')]);

    const totalResult = getOne(db, `
      SELECT SUM(amount) as total
      FROM expenses
      WHERE user_id = ? 
        AND strftime('%Y', date) = ?
        AND strftime('%m', date) = ?
    `, [userId, year, month.toString().padStart(2, '0')]);

    res.json({
      byCategory: summary,
      totalSpent: totalResult?.total || 0
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expense summary for last 12 months
router.get('/summary/last12months', (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    // Calculate date 12 months ago using user's timezone
    const userRow = getOne(db, 'SELECT timezone FROM users WHERE id = ?', [userId]);
    const tz = userRow?.timezone || 'America/Los_Angeles';
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    const [yr, mo] = todayStr.split('-').map(Number);
    let startMonth = mo - 11;
    let startYear = yr;
    if (startMonth <= 0) { startMonth += 12; startYear -= 1; }
    const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;

    const summary = getAll(db, `
      SELECT category, SUM(amount) as total
      FROM expenses
      WHERE user_id = ? 
        AND date >= ?
      GROUP BY category
    `, [userId, startDate]);

    const totalResult = getOne(db, `
      SELECT SUM(amount) as total
      FROM expenses
      WHERE user_id = ? 
        AND date >= ?
    `, [userId, startDate]);

    res.json({
      byCategory: summary,
      totalSpent: totalResult?.total || 0
    });
  } catch (error) {
    console.error('Get last 12 months summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new expense
router.post('/', (req, res) => {
  try {
    const { name, category, amount, date } = req.body;
    const userId = req.user.id;
    const db = getDb();

    if (!name || !category || amount === undefined || !date) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const lastId = runInsert(db, `
      INSERT INTO expenses (user_id, name, category, amount, date)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, name, category, amount, date]);

    saveDatabase();

    const expense = getOne(db, 'SELECT * FROM expenses WHERE id = ?', [lastId]);

    res.status(201).json({
      message: 'Expense added successfully',
      expense
    });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update expense
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, amount, date } = req.body;
    const userId = req.user.id;
    const db = getDb();

    // Verify ownership
    const existingExpense = getOne(db, 'SELECT * FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    db.run(`
      UPDATE expenses 
      SET name = ?, category = ?, amount = ?, date = ?
      WHERE id = ?
    `, [name, category, amount, date, id]);

    saveDatabase();

    const expense = getOne(db, 'SELECT * FROM expenses WHERE id = ?', [id]);

    res.json({
      message: 'Expense updated successfully',
      expense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete expense
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDb();

    // Verify ownership
    const expense = getOne(db, 'SELECT * FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    db.run('DELETE FROM expenses WHERE id = ?', [id]);
    saveDatabase();

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
