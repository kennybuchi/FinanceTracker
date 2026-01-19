import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { budgetApi, expenseApi } from '../services/api';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Color palette for charts
const CHART_COLORS = [
  '#667eea',
  '#764ba2',
  '#f093fb',
  '#f5576c',
  '#4facfe',
  '#00f2fe',
  '#43e97b',
  '#fa709a',
  '#fee140',
  '#ff9a9e'
];

function Dashboard() {
  const [budget, setBudget] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState({ byCategory: [], totalSpent: 0 });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'last12'

  useEffect(() => {
    loadDashboardData();
  }, [month, year, viewMode]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'last12') {
        // Last 12 months view - aggregate budgets and get 12 month expense summary
        const [summary, expenses] = await Promise.all([
          expenseApi.getLast12MonthsSummary(),
          expenseApi.getExpenses()
        ]);
        
        // For last 12 months, we'll show aggregated data without a specific budget
        setBudget(null);
        setCategories([]);
        setExpenseSummary(summary);
        setRecentExpenses(expenses.slice(0, 5));
      } else {
        const [budgetData, summary, expenses] = await Promise.all([
          budgetApi.getBudget(year, month),
          expenseApi.getExpenseSummary(year, month),
          expenseApi.getExpenses(month, year)
        ]);
        
        setBudget(budgetData.budget);
        setCategories(budgetData.categories || []);
        setExpenseSummary(summary);
        setRecentExpenses(expenses.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getMonthName = (m) => {
    return new Date(2024, m - 1).toLocaleString('default', { month: 'long' });
  };

  const handleViewModeChange = (e) => {
    const value = e.target.value;
    if (value === 'last12') {
      setViewMode('last12');
    } else {
      setViewMode('month');
    }
  };

  const totalBudget = budget?.total_budget || 0;
  const totalSpent = expenseSummary.totalSpent || 0;
  const remaining = totalBudget - totalSpent;

  if (loading) {
    return (
      <div className="container">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>
          Dashboard - {viewMode === 'last12' ? 'Last 12 Months' : `${getMonthName(month)} ${year}`}
        </h2>
        <div className="month-selector">
          <select 
            value={viewMode === 'last12' ? 'last12' : 'month'} 
            onChange={handleViewModeChange}
          >
            <option value="month">Monthly View</option>
            <option value="last12">Last 12 Months</option>
          </select>
          {viewMode === 'month' && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Budget Summary */}
      <div className="card">
        <h2>{viewMode === 'last12' ? 'Spending Overview' : 'Budget Overview'}</h2>
        {viewMode === 'last12' ? (
          <div className="budget-summary">
            <div className="budget-summary-item">
              <h4>Total Spent (12 Months)</h4>
              <span className="amount spent">{formatCurrency(totalSpent)}</span>
            </div>
            <div className="budget-summary-item">
              <h4>Monthly Average</h4>
              <span className="amount budget">{formatCurrency(totalSpent / 12)}</span>
            </div>
            <div className="budget-summary-item">
              <h4>Categories</h4>
              <span className="amount">{expenseSummary.byCategory.length}</span>
            </div>
          </div>
        ) : budget ? (
          <>
            <div className="budget-summary">
              <div className="budget-summary-item">
                <h4>Total Budget</h4>
                <span className="amount budget">{formatCurrency(totalBudget)}</span>
              </div>
              <div className="budget-summary-item">
                <h4>Total Spent</h4>
                <span className="amount spent">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="budget-summary-item">
                <h4>Remaining</h4>
                <span className={`amount ${remaining >= 0 ? 'remaining' : 'spent'}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className={`fill ${totalSpent > totalBudget ? 'over-budget' : ''}`}
                style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
              />
            </div>
            <p style={{ marginTop: '0.5rem', color: '#888', fontSize: '0.875rem' }}>
              {((totalSpent / totalBudget) * 100).toFixed(1)}% of budget used
            </p>
          </>
        ) : (
          <div>
            <p>No budget set for this month.</p>
            <Link to="/budget" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
              Create Budget
            </Link>
          </div>
        )}
      </div>

      {/* Pie Charts Section */}
      {(categories.length > 0 || expenseSummary.byCategory.length > 0) && (
        <div className="dashboard-grid">
          {/* Budget Allocation Pie Chart */}
          <div className="card">
            <h2>Budget Allocation</h2>
            {categories.length > 0 ? (
              <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                <Pie
                  data={{
                    labels: categories.map(c => c.name),
                    datasets: [{
                      data: categories.map(c => c.allocated_amount),
                      backgroundColor: CHART_COLORS.slice(0, categories.length),
                      borderColor: '#fff',
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 15,
                          usePointStyle: true
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <p>No budget categories set.</p>
            )}
          </div>

          {/* Actual Spending Pie Chart */}
          <div className="card">
            <h2>Actual Spending</h2>
            {expenseSummary.byCategory.length > 0 ? (
              <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                <Pie
                  data={{
                    labels: expenseSummary.byCategory.map(c => c.category),
                    datasets: [{
                      data: expenseSummary.byCategory.map(c => c.total),
                      backgroundColor: CHART_COLORS.slice(0, expenseSummary.byCategory.length),
                      borderColor: '#fff',
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 15,
                          usePointStyle: true
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <p>No expenses recorded this month.</p>
            )}
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Category Breakdown */}
        <div className="card">
          <h2>Spending by Category</h2>
          {expenseSummary.byCategory.length > 0 ? (
            <ul className="category-list">
              {expenseSummary.byCategory.map((cat, index) => {
                const budgetCategory = categories.find(c => c.name === cat.category);
                const allocated = budgetCategory?.allocated_amount || 0;
                const percentage = allocated > 0 ? (cat.total / allocated) * 100 : 0;
                
                return (
                  <li key={index} className="category-item">
                    <div>
                      <span className="category-name">{cat.category}</span>
                      {allocated > 0 && (
                        <div className="progress-bar" style={{ width: '150px', marginTop: '0.25rem' }}>
                          <div 
                            className={`fill ${percentage > 100 ? 'over-budget' : ''}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="category-amount">{formatCurrency(cat.total)}</span>
                      {allocated > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                          of {formatCurrency(allocated)}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No expenses recorded this month.</p>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <h2>Recent Expenses</h2>
          {recentExpenses.length > 0 ? (
            <>
              <ul className="category-list">
                {recentExpenses.map((expense) => (
                  <li key={expense.id} className="category-item">
                    <div>
                      <span className="category-name">{expense.name}</span>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>
                        {expense.category} • {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="category-amount">{formatCurrency(expense.amount)}</span>
                  </li>
                ))}
              </ul>
              <Link to="/expenses" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                View All Expenses
              </Link>
            </>
          ) : (
            <div>
              <p>No expenses recorded yet.</p>
              <Link to="/expenses" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                Add Expense
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
