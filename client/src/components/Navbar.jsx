import { Link } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  return (
    <header className="navbar">
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h1>💰 Finance Tracker</h1>
      </Link>
      <nav>
        <Link to="/">Dashboard</Link>
        <Link to="/budget">Budget</Link>
        <Link to="/expenses">Expenses</Link>
        <span className="user-info">Welcome, {user.username}</span>
        <button onClick={onLogout}>Logout</button>
      </nav>
    </header>
  );
}

export default Navbar;
