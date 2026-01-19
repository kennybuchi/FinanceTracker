# Finance Tracker - Budgeting App - Vibe Coded

A full-stack budgeting application with user authentication, monthly budget planning, and expense tracking.  

This was 100% vibe coded.  Only this README has been manually changed.

## Features

- **User Authentication**: Secure login and registration with JWT tokens
- **Monthly Budget Planning**: Set total budget and allocate across customizable categories
- **Expense Tracking**: Track purchases with name, category, date, and cost
- **Dashboard**: Overview of spending vs budget with category breakdowns

## Tech Stack

- **Frontend**: React 18 with Vite
- **Backend**: Node.js with Express
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT tokens with bcrypt password hashing

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

2. Install client dependencies:
   ```bash
   cd client
   npm install
   ```

### Running the Application

1. Start the backend server (runs on port 3001):
   ```bash
   cd server
   npm run dev
   ```

2. In a new terminal, start the frontend (runs on port 5173):
   ```bash
   cd client
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

## Project Structure

```
FinanceTracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth middleware
│   │   ├── database.js     # SQLite database setup
│   │   └── index.js        # Server entry point
│   ├── data/               # SQLite database files
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Budgets
- `GET /api/budgets/:year/:month` - Get budget for a specific month
- `POST /api/budgets` - Create or update budget
- `DELETE /api/budgets/:id` - Delete a budget

### Expenses
- `GET /api/expenses` - Get all expenses (with optional month/year filter)
- `GET /api/expenses/summary/:year/:month` - Get expense summary by category
- `POST /api/expenses` - Add new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

## Usage

1. **Register/Login**: Create an account or log in to access your personal finance data
2. **Set Budget**: Navigate to Budget page to set your monthly budget and allocate to categories
3. **Track Expenses**: Use the Expenses page to log your purchases
4. **View Dashboard**: See an overview of your spending vs budget on the Dashboard
