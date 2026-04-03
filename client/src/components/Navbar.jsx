import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <header className="navbar">
      <div className="navbar-top">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1>💰 Finance Tracker</h1>
        </Link>
        <button
          className="hamburger"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
        </button>
      </div>
      <nav className={menuOpen ? 'nav-open' : ''}>
        <Link to="/">Dashboard</Link>
        <Link to="/budget">Budget</Link>
        <Link to="/expenses">Expenses</Link>
        <Link to="/settings">Settings</Link>
        <span className="nav-user">Logged in as {user.username}</span>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </nav>
    </header>
  );
}

export default Navbar;
