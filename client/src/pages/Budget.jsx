import { useState, useEffect } from 'react';
import { budgetApi } from '../services/api';
import { getLocalDate } from '../utils/date';

const DEFAULT_CATEGORIES = [
  'Food & Groceries',
  'Housing/Mortgage',
  'Utilities',
  'Transportation',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Other'
];

function Budget({ user }) {
  const today = getLocalDate(user?.timezone);
  const [todayYear, todayMonth] = today.split('-').map(Number);
  const [month, setMonth] = useState(todayMonth);
  const [year, setYear] = useState(todayYear);
  const [totalBudget, setTotalBudget] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [existingBudget, setExistingBudget] = useState(null);

  useEffect(() => {
    loadBudget();
  }, [month, year]);

  const loadBudget = async () => {
    setLoading(true);
    try {
      const data = await budgetApi.getBudget(year, month);
      if (data.budget) {
        setExistingBudget(data.budget);
        setTotalBudget(data.budget.total_budget.toString());
        setCategories(data.categories.map(cat => ({
          name: cat.name,
          allocatedAmount: cat.allocated_amount.toString()
        })));
      } else {
        setExistingBudget(null);
        setTotalBudget('');
        setCategories(DEFAULT_CATEGORIES.map(name => ({
          name,
          allocatedAmount: ''
        })));
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (index, field, value) => {
    const updated = [...categories];
    updated[index][field] = value;
    setCategories(updated);
  };

  const addCategory = () => {
    setCategories([...categories, { name: '', allocatedAmount: '' }]);
  };

  const removeCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    if (!totalBudget || parseFloat(totalBudget) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid total budget' });
      return;
    }

    const validCategories = categories.filter(cat => cat.name && cat.allocatedAmount);
    const totalAllocated = validCategories.reduce((sum, cat) => sum + parseFloat(cat.allocatedAmount || 0), 0);
    
    if (totalAllocated > parseFloat(totalBudget)) {
      setMessage({ type: 'error', text: 'Category allocations exceed total budget' });
      return;
    }

    setSaving(true);
    try {
      await budgetApi.saveBudget({
        month,
        year,
        totalBudget: parseFloat(totalBudget),
        categories: validCategories.map(cat => ({
          name: cat.name,
          allocatedAmount: parseFloat(cat.allocatedAmount)
        }))
      });
      setMessage({ type: 'success', text: 'Budget saved successfully!' });
      loadBudget();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const getMonthName = (monthNum) => {
    return new Date(2024, monthNum - 1).toLocaleString('default', { month: 'long' });
  };

  const totalAllocated = categories.reduce((sum, cat) => sum + parseFloat(cat.allocatedAmount || 0), 0);
  const unallocated = parseFloat(totalBudget || 0) - totalAllocated;

  if (loading) {
    return (
      <div className="container">
        <p>Loading budget...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 style={{ marginBottom: '1.5rem' }}>Monthly Budget Planning</h2>

      {/* Month/Year Selector */}
      <div className="month-selector">
        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
          {Array.from({ length: 5 }, (_, i) => {
            const y = new Date().getFullYear() - 2 + i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>

      {message.text && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2>Total Budget for {getMonthName(month)} {year}</h2>
          <div className="form-group">
            <label htmlFor="totalBudget">Total Monthly Budget ($)</label>
            <input
              type="number"
              id="totalBudget"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              placeholder="Enter your total budget"
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        <div className="card">
          <h2>Budget Categories</h2>
          <p style={{ color: '#888', marginBottom: '1rem' }}>
            Allocate your budget across different spending categories.
          </p>

          {categories.map((category, index) => (
            <div key={index} className="category-input-group">
              <input
                type="text"
                value={category.name}
                onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
                placeholder="Category name"
              />
              <input
                type="number"
                value={category.allocatedAmount}
                onChange={(e) => handleCategoryChange(index, 'allocatedAmount', e.target.value)}
                placeholder="Amount"
                min="0"
                step="0.01"
              />
              <button 
                type="button" 
                className="btn btn-danger btn-sm"
                onClick={() => removeCategory(index)}
              >
                ✕
              </button>
            </div>
          ))}

          <button type="button" className="btn btn-secondary" onClick={addCategory}>
            + Add Category
          </button>

          {totalBudget && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Total Allocated:</span>
                <strong>${totalAllocated.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Unallocated:</span>
                <strong style={{ color: unallocated < 0 ? '#e74c3c' : '#27ae60' }}>
                  ${unallocated.toFixed(2)}
                </strong>
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : (existingBudget ? 'Update Budget' : 'Create Budget')}
        </button>
      </form>
    </div>
  );
}

export default Budget;
