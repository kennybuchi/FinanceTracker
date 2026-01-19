const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

// Auth API
export const authApi = {
  async login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async register(username, email, password) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  }
};

// Budget API
export const budgetApi = {
  async getBudget(year, month) {
    const response = await fetch(`${API_BASE}/budgets/${year}/${month}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async saveBudget(budgetData) {
    const response = await fetch(`${API_BASE}/budgets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(budgetData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async deleteBudget(id) {
    const response = await fetch(`${API_BASE}/budgets/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  }
};

// Expenses API
export const expenseApi = {
  async getExpenses(month, year) {
    let url = `${API_BASE}/expenses`;
    if (month && year) {
      url += `?month=${month}&year=${year}`;
    }
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async getExpenseSummary(year, month) {
    const response = await fetch(`${API_BASE}/expenses/summary/${year}/${month}`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async getLast12MonthsSummary() {
    const response = await fetch(`${API_BASE}/expenses/summary/last12months`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async addExpense(expenseData) {
    const response = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(expenseData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async updateExpense(id, expenseData) {
    const response = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(expenseData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  },

  async deleteExpense(id) {
    const response = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  }
};
