import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userAPI } from '../api/api';
import Navbar from '../components/Navbar';
import '../styles/auth.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await userAPI.login(username, password);
      localStorage.setItem('authToken', response.access_token);
      localStorage.setItem('userId', response.user_id);
      localStorage.setItem('username', response.username);
      localStorage.setItem('cartOrderId', '');
      navigate('/products');
    } catch (err) {
      setError(err.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-logo">Saista Bakers</h1>
          <h2>Login</h2>
          {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p>
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </p>
        <p style={{ marginTop: '15px', fontSize: '0.85rem' }}>
          <Link to="/admin/login" style={{ color: '#8b3a3a' }}>Staff / Admin Login</Link>
        </p>
      </div>
      </div>
    </>
  );
}

export default Login;
