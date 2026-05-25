import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, orderAPI } from '../api/api';
import Navbar from '../components/Navbar';
import '../styles/products.css';

// Product image mapping using reliable Unsplash photos
const PRODUCT_IMAGES = {
  'Vanilla Cake': 'https://images.unsplash.com/photo-1558636508-e0969c9c786b?w=400&q=80',
  'Chocolate Cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
  'Black Forest Cake': 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400&q=80',
  'White Forest Cake': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80',
  'Red Velvet Cake': 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=400&q=80',
  'Blueberry Cake': 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400&q=80',
  'Butterscotch Cake': 'https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=400&q=80',
  'Pineapple Cake': 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&q=80',
  'KitKat Cake': 'https://images.unsplash.com/photo-1562440499-64c9a111f713?w=400&q=80',
  'Ferrero Rocher Cake': 'https://images.unsplash.com/photo-1602351447937-745cb720612f?w=400&q=80',
  'Oreo Cake': 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=400&q=80',
  'Truffle Cake': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80',
  'Butter Cookies': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80',
  'Chocolate Chip Cookies': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&q=80',
  'Oatmeal Cookies': 'https://images.unsplash.com/photo-1621236378699-8597faf6a176?w=400&q=80',
  'Almond Cookies': 'https://images.unsplash.com/photo-1605342416439-d3e157790bd5?w=400&q=80',
  'Cashew Cookies': 'https://images.unsplash.com/photo-1557088915-d72db621db3d?w=400&q=80',
  'Double Chocolate Cookies': 'https://images.unsplash.com/photo-1618923850107-d1a234d7a73a?w=400&q=80',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80';

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({});
  const [addedItems, setAddedItems] = useState({});
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('authToken')) { navigate('/login'); return; }
    fetchCategories();
    fetchProducts();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const data = await userAPI.getCategories();
      setCategories(data.categories);
    } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await userAPI.getProducts(selectedCategory || null);
      setProducts(data.products);
      setError('');
    } catch (err) {
      setError('Error loading products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddToCart = async (product) => {
    try {
      const quantity = quantities[product.id] || 0;
      if (quantity === 0) {
        showToast('❌ Please select a quantity first.');
        return;
      }
      const response = await orderAPI.addToCart(product.id, quantity);
      localStorage.setItem('cartOrderId', response.order_id);
      setAddedItems(prev => ({ ...prev, [product.id]: true }));
      showToast(`🛒 ${product.name} added to cart!`);
      setTimeout(() => setAddedItems(prev => ({ ...prev, [product.id]: false })), 2000);
    } catch (err) {
      showToast('❌ Error adding to cart. Please login first.');
    }
  };

  const categoryIcons = { 'Cakes': '🎂', 'Cookies': '🍪' };

  return (
    <div className="products-page">
      <Navbar />

      {/* Toast notification */}
      {toast && <div className="toast-notification">{toast}</div>}

      <div className="products-hero">
        <h1>Our Delicious Menu</h1>
        <p>Handcrafted with love and the finest ingredients</p>
      </div>

      <main className="products-main">
        {/* Sidebar categories */}
        <aside className="category-sidebar">
          <h3>Browse By</h3>
          <button
            className={`cat-btn ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            🍽️ All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {categoryIcons[cat] || '🎁'} {cat}
            </button>
          ))}

          <div className="sidebar-promo">
            <h4>🎂 Custom Cake?</h4>
            <p>Design your dream cake!</p>
            <button onClick={() => navigate('/custom-cake')} className="promo-btn">
              Design Now
            </button>
          </div>
        </aside>

        {/* Products grid */}
        <section className="products-content">
          <div className="products-header">
            <h2>{selectedCategory ? `${categoryIcons[selectedCategory] || ''} ${selectedCategory}` : 'All Products'}</h2>
            <span className="product-count">{products.length} items</span>
          </div>

          {loading ? (
            <div className="loading-grid">
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card" />)}
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={fetchProducts}>Try Again</button>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state"><p>No products found in this category.</p></div>
          ) : (
            <div className="products-grid">
              {products.map(product => (
                <div key={product.id} className="product-card">
                  <div className="product-image-wrap">
                    <img
                      src={PRODUCT_IMAGES[product.name] || DEFAULT_IMAGE}
                      alt={product.name}
                      className="product-image"
                      onError={e => { e.target.src = DEFAULT_IMAGE; }}
                    />
                    <span className="product-category-badge">{product.category}</span>
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                    <div className="product-footer">
                      <span className="product-price">Rs. {product.price}</span>
                      <div className="product-actions">
                        <div className="qty-control">
                          <button onClick={() => {
                            const cur = quantities[product.id] || 0;
                            if (cur > 0) setQuantities(p => ({ ...p, [product.id]: cur - 1 }));
                          }}>−</button>
                          <span>{quantities[product.id] || 0}</span>
                          <button onClick={() => {
                            const cur = quantities[product.id] || 0;
                            setQuantities(p => ({ ...p, [product.id]: cur + 1 }));
                          }}>+</button>
                        </div>
                        <button
                          className={`add-cart-btn ${addedItems[product.id] ? 'added' : ''}`}
                          onClick={() => handleAddToCart(product)}
                          disabled={!quantities[product.id] || quantities[product.id] === 0}
                        >
                          {addedItems[product.id] ? 'Added!' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Products;
