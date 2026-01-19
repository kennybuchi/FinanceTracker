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

// Get budget for a specific month/year
router.get('/:year/:month', (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user.id;
    const db = getDb();

    const budgetPlan = getOne(db, `
      SELECT * FROM budget_plans 
      WHERE user_id = ? AND year = ? AND month = ?
    `, [userId, year, month]);

    if (!budgetPlan) {
      return res.json({ budget: null, categories: [] });
    }

    const categories = getAll(db, `
      SELECT * FROM budget_categories 
      WHERE budget_plan_id = ?
    `, [budgetPlan.id]);

    res.json({
      budget: budgetPlan,
      categories
    });
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update budget for a month
router.post('/', (req, res) => {
  try {
    const { month, year, totalBudget, categories } = req.body;
    const userId = req.user.id;
    const db = getDb();

    if (!month || !year || totalBudget === undefined) {
      return res.status(400).json({ error: 'Month, year, and total budget are required' });
    }

    // Check if budget already exists for this month
    const existingBudget = getOne(db, `
      SELECT id FROM budget_plans 
      WHERE user_id = ? AND year = ? AND month = ?
    `, [userId, year, month]);

    let budgetPlanId;

    if (existingBudget) {
      // Update existing budget
      db.run(`
        UPDATE budget_plans SET total_budget = ? 
        WHERE id = ?
      `, [totalBudget, existingBudget.id]);
      budgetPlanId = existingBudget.id;

      // Delete existing categories
      db.run('DELETE FROM budget_categories WHERE budget_plan_id = ?', [budgetPlanId]);
    } else {
      // Create new budget
      budgetPlanId = runInsert(db, `
        INSERT INTO budget_plans (user_id, month, year, total_budget)
        VALUES (?, ?, ?, ?)
      `, [userId, month, year, totalBudget]);
    }

    // Insert categories
    if (categories && categories.length > 0) {
      for (const category of categories) {
        db.run(`
          INSERT INTO budget_categories (budget_plan_id, name, allocated_amount)
          VALUES (?, ?, ?)
        `, [budgetPlanId, category.name, category.allocatedAmount]);
      }
    }

    saveDatabase();

    // Return the created/updated budget
    const budget = getOne(db, 'SELECT * FROM budget_plans WHERE id = ?', [budgetPlanId]);
    const savedCategories = getAll(db, 'SELECT * FROM budget_categories WHERE budget_plan_id = ?', [budgetPlanId]);

    res.json({
      message: existingBudget ? 'Budget updated successfully' : 'Budget created successfully',
      budget,
      categories: savedCategories
    });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a budget
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDb();

    // Verify ownership
    const budget = getOne(db, 'SELECT * FROM budget_plans WHERE id = ? AND user_id = ?', [id, userId]);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Delete categories first (foreign key)
    db.run('DELETE FROM budget_categories WHERE budget_plan_id = ?', [id]);
    db.run('DELETE FROM budget_plans WHERE id = ?', [id]);
    saveDatabase();

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
