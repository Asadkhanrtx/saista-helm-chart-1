import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('authToken'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Re-check auth on every route change
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('authToken'));
    setUsername(localStorage.getItem('username') || '');
  }, [location]);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <div className="navbar-wrapper">
      {/* Top bar with logo */}
      <div className="navbar-top">
        <Link to="/" className="logo-link">Saista Bakers</Link>
      </div>

      {/* Bottom nav */}
      <nav className="navbar-bottom">
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
          ☰
        </button>

        <ul className={`nav-links ${mobileOpen ? 'open' : ''}`}>
          <li><Link to="/" onClick={() => setMobileOpen(false)}>HOME</Link></li>
          <li><Link to="/products" onClick={() => setMobileOpen(false)}>PRODUCTS</Link></li>
          <li><Link to="/about" onClick={() => setMobileOpen(false)}>ABOUT US</Link></li>
          <li><Link to="/gallery" onClick={() => setMobileOpen(false)}>GALLERY</Link></li>

          {/* Speciality Cakes Dropdown */}
          <li
            className="dropdown"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <span className="dropbtn">SPECIALITY ▾</span>
            {dropdownOpen && (
              <div className="dropdown-content">
                <Link to="/custom-cake" onClick={() => { setDropdownOpen(false); setMobileOpen(false); }}>🎂 Custom Cake Design</Link>
                {isLoggedIn && <Link to="/custom-cakes" onClick={() => { setDropdownOpen(false); setMobileOpen(false); }}>📋 My Custom Orders</Link>}
              </div>
            )}
          </li>

          {isLoggedIn && <li><Link to="/orders" onClick={() => setMobileOpen(false)}>MY ORDERS</Link></li>}
        </ul>

        <div className="nav-actions">
          {isLoggedIn ? (
            <>
              <span className="nav-user">👤 {username}</span>
              <Link to="/cart" className="cart-btn">🛒 Cart</Link>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-nav-login">Login</Link>
              <Link to="/signup" className="btn-nav-signup">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
