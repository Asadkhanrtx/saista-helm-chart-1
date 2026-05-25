import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/about.css';

const About = () => {
  return (
    <div className="about-page">
      <Navbar />
      <div className="about-hero">
        <h1>Our Sweet Story</h1>
      </div>
      <main className="about-container">
        <section className="about-content">
          <div className="about-text">
            <h2>Meet the Heart Behind Saista Bakers</h2>
            <p>
              <strong>Saista Bakers</strong> is a labor of love, driven by the passion and dedication of my mom, our main chef. 
              What started as a heartfelt endeavor in our home kitchen has blossomed into a beloved bakery, known for crafting 
              cakes and cookies that don't just look stunning, but taste like home.
            </p>
            <p>
              Every recipe is a guarded secret, perfected over years of baking for loved ones. From our signature rich chocolate 
              cakes to our melt-in-the-mouth cookies, every single treat is baked fresh with the purest ingredients and an abundance 
              of motherly love. We don't just bake; we pour our hearts into creating centerpieces for your most cherished memories.
            </p>
            
            <div className="contact-info-box">
              <h3>Get in Touch</h3>
              <p>📞 <strong>Phone/WhatsApp:</strong> 7352710076</p>
              <p>📸 <strong>Instagram:</strong> <a href="https://instagram.com/cakes_n_cookies_basket" target="_blank" rel="noreferrer">@cakes_n_cookies_basket</a></p>
              
              <h4 style={{marginTop: '15px', color: '#8b3a3a'}}>Our Locations:</h4>
              <p>📍 <strong>Bhubaneswar:</strong> Swagat Vihar, Naharkanta, 751035</p>
              <p>📍 <strong>Jamshedpur:</strong> HK Tower, Jharkhand, 831006</p>
            </div>
          </div>
          <div className="about-images-col">
             <img src="/images/gallery/img1.jpeg" alt="Mom's Creation 1" className="about-img-main" />
             <div className="about-img-row">
               <img src="/images/gallery/img2.jpeg" alt="Mom's Creation 2" />
               <img src="/images/gallery/img13.jpeg" alt="Certificate of Excellence" className="certificate-img" />
             </div>
          </div>
        </section>

        <section className="values-section">
          <h2>Why Choose Us?</h2>
          <div className="values-grid">
            <div className="value-card">
              <span className="icon">👩‍🍳</span>
              <h3>Mother's Magic</h3>
              <p>Every cake is baked by our main chef (mom) with the utmost care, love, and perfection.</p>
            </div>
            <div className="value-card">
              <span className="icon">🌿</span>
              <h3>Purest Ingredients</h3>
              <p>We never compromise on quality. No preservatives, just pure, wholesome goodness.</p>
            </div>
            <div className="value-card">
              <span className="icon">🎨</span>
              <h3>Bespoke Artistry</h3>
              <p>Every custom cake is a unique masterpiece designed specifically for your special day.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
