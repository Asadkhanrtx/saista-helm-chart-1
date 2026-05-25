import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../api/api';
import '../styles/admin.css';

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await adminAPI.login(username, password);
      localStorage.setItem('authToken', res.access_token);
      localStorage.setItem('username', res.username);
      localStorage.setItem('role', 'admin');
      navigate('/admin');
    } catch (err) {
      setError(err.detail || err.error || 'Invalid admin credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-logo">🔒</div>
        <h1>Admin Panel</h1>
        <h2>Saista Bakers</h2>
        {error && <div className="admin-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="admin" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••" />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Authenticating...' : 'Login as Admin'}</button>
        </form>
        <p className="back-link" onClick={() => navigate('/login')}>← Back to Customer Login</p>
      </div>
    </div>
  );
}

export default AdminLogin;
