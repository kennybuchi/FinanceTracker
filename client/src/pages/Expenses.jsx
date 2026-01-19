import { useState, useEffect } from 'react';
import { expenseApi, budgetApi } from '../services/api';

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expensesData, budgetData] = await Promise.all([
        expenseApi.getExpenses(month, year),
        budgetApi.getBudget(year, month)
      ]);
      setExpenses(expensesData);
      
      // Get categories from budget or use defaults
      if (budgetData.categories && budgetData.categories.length > 0) {
        setCategories(budgetData.categories.map(c => c.name));
      } else {
        setCategories([
          'Food & Groceries',
          'Housing/Mortgage',
          'Utilities',
          'Transportation',
          'Entertainment',
          'Healthcare',
          'Shopping',
          'Other'
        ]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSubmitting(true);

    try {
      const expenseData = {
        name: formData.name,
        category: formData.category,
        amount: parseFloat(formData.amount),
        date: formData.date
      };

      if (editingId) {
        await expenseApi.updateExpense(editingId, expenseData);
        setMessage({ type: 'success', text: 'Expense updated successfully!' });
      } else {
        await expenseApi.addExpense(expenseData);
        setMessage({ type: 'success', text: 'Expense added successfully!' });
      }

      // Reset form
      setFormData({
        name: '',
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      setEditingId(null);
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense) => {
    setFormData({
      name: expense.name,
      category: expense.category,
      amount: expense.amount.toString(),
      date: expense.date
    });
    setEditingId(expense.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await expenseApi.deleteExpense(id);
      setMessage({ type: 'success', text: 'Expense deleted successfully!' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const cancelEdit = () => {
    setFormData({
      name: '',
      category: '',
      amount: '',
      date: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getMonthName = (monthNum) => {
    return new Date(2024, monthNum - 1).toLocaleString('default', { month: 'long' });
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="container">
      <h2 style={{ marginBottom: '1.5rem' }}>Expense Tracking</h2>

      {message.text && (
        <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
          {message.text}
        </div>
      )}

      {/* Expense Form */}
      <div className="card">
        <h2>{editingId ? 'Edit Expense' : 'Add New Expense'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Purchase Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Grocery shopping at Walmart"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat, index) => (
                <option key={index} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount ($)</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (editingId ? 'Update Expense' : 'Add Expense')}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Expense List */}
      <div className="card">
        <h2>Expenses</h2>
        
        {/* Month/Year Filter */}
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
          <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>
            Total: {formatCurrency(totalExpenses)}
          </span>
        </div>

        {loading ? (
          <p>Loading expenses...</p>
        ) : expenses.length > 0 ? (
          <table className="expense-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td>{expense.name}</td>
                  <td>{expense.category}</td>
                  <td>{formatCurrency(expense.amount)}</td>
                  <td>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleEdit(expense)}
                      style={{ marginRight: '0.5rem' }}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(expense.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No expenses recorded for {getMonthName(month)} {year}.</p>
        )}
      </div>
    </div>
  );
}

export default Expenses;
