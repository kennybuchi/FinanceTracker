import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

const TIMEZONE_OPTIONS = [
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKST)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PST)' },
  { value: 'America/Denver', label: 'Mountain (MST)' },
  { value: 'America/Chicago', label: 'Central (CST)' },
  { value: 'America/New_York', label: 'Eastern (EST)' },
  { value: 'America/Phoenix', label: 'Arizona (MST, no DST)' },
  { value: 'America/Puerto_Rico', label: 'Atlantic (AST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

function AccountSettings({ user, onUserUpdate, onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Username form state
  const [usernameForm, setUsernameForm] = useState({
    newUsername: ''
  });
  
  // Email form state
  const [emailForm, setEmailForm] = useState({
    newEmail: ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Password visibility states
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  // Timezone state
  const [selectedTimezone, setSelectedTimezone] = useState(user.timezone || 'America/Los_Angeles');

  useEffect(() => {
    // Clear messages after 3 seconds
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const handleUsernameChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await authApi.updateUsername(usernameForm.newUsername);
      setMessage(result.message);
      onUserUpdate(result.user);
      setUsernameForm({ newUsername: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setLoading(false);
    setError('');
    setMessage('');

    try {
      const result = await authApi.updateEmail(emailForm.newEmail);
      setMessage(result.message);
      onUserUpdate(result.user);
      setEmailForm({ newEmail: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await authApi.updatePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      setMessage('Password updated successfully! Please log in again.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Auto logout and redirect to login after 2 seconds
      setTimeout(() => {
        onLogout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTimezoneChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await authApi.updateTimezone(selectedTimezone);
      setMessage(result.message);
      onUserUpdate(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <h2>Account Settings</h2>
      <p className="current-user">Logged in as: <strong>{user.username}</strong></p>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="settings-section">
        <h3>Change Username</h3>
        <form onSubmit={handleUsernameChange}>
          <div className="form-group">
            <label htmlFor="newUsername">New Username</label>
            <input
              type="text"
              id="newUsername"
              placeholder="Enter new username"
              value={usernameForm.newUsername}
              onChange={(e) => setUsernameForm({ newUsername: e.target.value })}
              minLength="3"
              required
              disabled={loading}
            />
            <small>Username must be at least 3 characters</small>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Username'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h3>Change Email</h3>
        <form onSubmit={handleEmailChange}>
          <div className="form-group">
            <label htmlFor="newEmail">New Email</label>
            <input
              type="email"
              id="newEmail"
              placeholder="Enter new email"
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm({ newEmail: e.target.value })}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Email'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h3>Changes Password</h3>
        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPasswords.currentPassword ? 'text' : 'password'}
                id="currentPassword"
                placeholder="Enter current password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPasswords({ ...showPasswords, currentPassword: !showPasswords.currentPassword })}
                disabled={loading}
              >
                {showPasswords.currentPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPasswords.newPassword ? 'text' : 'password'}
                id="newPassword"
                placeholder="Enter new password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                minLength="6"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPasswords({ ...showPasswords, newPassword: !showPasswords.newPassword })}
                disabled={loading}
              >
                {showPasswords.newPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <small>Password must be at least 6 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPasswords.confirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                minLength="6"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                disabled={loading}
              >
                {showPasswords.confirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h3>Timezone</h3>
        <form onSubmit={handleTimezoneChange}>
          <div className="form-group">
            <label htmlFor="timezone">Your Timezone</label>
            <select
              id="timezone"
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              disabled={loading}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <small>All dates and times will be shown in this timezone</small>
          </div>
          <button type="submit" disabled={loading || selectedTimezone === (user.timezone || 'America/Los_Angeles')}>
            {loading ? 'Updating...' : 'Update Timezone'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AccountSettings;
