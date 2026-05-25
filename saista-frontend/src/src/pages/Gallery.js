import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import '../styles/gallery.css';

const Gallery = () => {
  // Using the real images provided by the user
  const images = Array.from({ length: 12 }, (_, i) => `/images/gallery/img${i + 1}.jpeg`);
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="gallery-page">
      <Navbar />
      <div className="gallery-hero">
        <h1>Our Creations</h1>
        <p>A glimpse into our world of sweet masterpieces</p>
      </div>
      <main className="gallery-container">
        <div className="gallery-grid">
          {images.map((url, index) => (
            <div key={index} className="gallery-item" onClick={() => openLightbox(index)}>
              <img src={url} alt={`Cake ${index + 1}`} loading="lazy" />
              <div className="gallery-overlay">
                <span>View Full</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Lightbox / Slider */}
      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}>×</button>
          <button className="lightbox-nav prev" onClick={prevImage}>❮</button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={images[currentIndex]} alt={`Cake ${currentIndex + 1}`} />
          </div>
          <button className="lightbox-nav next" onClick={nextImage}>❯</button>
        </div>
      )}
    </div>
  );
};

export default Gallery;
