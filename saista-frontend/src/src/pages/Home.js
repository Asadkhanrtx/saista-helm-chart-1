import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Home.css';

const Home = () => {
  return (
    <div className="home-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay">
          <div className="hero-content">
            <span className="badge">FRESHLY BAKED DAILY</span>
            <h1>Crafting Sweet <br/><span className="script">Memories</span></h1>
            <p>Indulge in our collection of handcrafted cakes, cookies, and artisanal treats made with passion and the finest ingredients.</p>
            <div className="hero-actions">
              <Link to="/products" className="btn-primary">Order Now</Link>
              <Link to="/custom-cake" className="btn-outline">Custom Design</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="featured-cats">
        <div className="section-header">
          <h2>Our Specialty</h2>
          <p>Explore our most loved categories</p>
        </div>
        <div className="cats-grid">
          <Link to="/products" className="cat-card">
            <div className="cat-image"><img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80" alt="Cakes" /></div>
            <div className="cat-info">
              <h3>Signature Cakes</h3>
              <p>For every celebration</p>
            </div>
          </Link>
          <Link to="/custom-cake" className="cat-card">
            <div className="cat-image"><img src="/images/gallery/img5.jpeg" alt="Custom" /></div>
            <div className="cat-info">
              <h3>Custom Designs</h3>
              <p>Your vision, our bake</p>
            </div>
          </Link>
          <Link to="/products" className="cat-card">
            <div className="cat-image"><img src="https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&q=80" alt="Cookies" /></div>
            <div className="cat-info">
              <h3>Artisanal Cookies</h3>
              <p>Crunchy perfection</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="why-us">
        <div className="why-content">
          <div className="why-text">
            <h2>What Makes Us Special?</h2>
            <div className="feature-list">
              <div className="feature-item">
                <span className="f-icon">🥛</span>
                <div>
                  <h4>Premium Ingredients</h4>
                  <p>We use only the best dairy, chocolates, and fresh fruits.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="f-icon">🎨</span>
                <div>
                  <h4>Artisanal Craft</h4>
                  <p>Every cake is hand-decorated by our master pastry chefs.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="f-icon">📦</span>
                <div>
                  <h4>Safe Delivery</h4>
                  <p>Specially packaged to arrive in perfect condition.</p>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '30px' }}>
              <Link to="/about" className="btn-primary" style={{ padding: '10px 25px', fontSize: '1.1rem' }}>
                Read Our Story
              </Link>
            </div>
          </div>
          <div className="why-image">
            <img src="/images/gallery/img1.jpeg" alt="Saista Bakers Mom Chef" style={{ borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h2 className="script">Saista Bakers</h2>
            <p>Bringing sweetness to your doorstep since 2024.</p>
          </div>
          <div className="footer-links">
            <Link to="/about">About Us</Link>
            <Link to="/products">Menu</Link>
            <Link to="/gallery">Gallery</Link>
            <Link to="/custom-cake">Custom Design</Link>
          </div>
          <div className="footer-social">
            <p>Follow Us</p>
            <div className="social-icons">
              <a href="https://instagram.com/cakes_n_cookies_basket" target="_blank" rel="noreferrer" style={{color: 'inherit', textDecoration: 'none'}}>Instagram</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Saista Bakers. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
