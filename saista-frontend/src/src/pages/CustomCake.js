import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../api/api';
import Navbar from '../components/Navbar';
import '../styles/custom-cake.css';

function CustomCake() {
  const [pound, setPound] = useState(1);
  const [flavourType, setFlavourType] = useState('Fruit');
  const [specificFlavour, setSpecificFlavour] = useState('Strawberry');
  const [description, setDescription] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const navigate = useNavigate();

  const calculatePrice = (p, fType) => {
    const basePrice = 300;
    const extraPoundPrice = 200;
    let price = p <= 1 ? basePrice : basePrice + (p - 1) * extraPoundPrice;

    if (fType === 'Fruit') price += 100 * p;
    else if (fType === 'Chocolate') price += 200 * p;
    else if (fType === 'Fondant') price += 250 * p;

    return price;
  };

  useEffect(() => {
    setEstimatedPrice(calculatePrice(pound, flavourType));
  }, [pound, flavourType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localStorage.getItem('authToken')) {
      alert('Please login to place a custom order');
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const res = await orderAPI.createCustomCake(pound, flavourType === 'Fruit' ? specificFlavour : flavourType, description, deliveryDate);
      setOrderId(res.id || 'Pending');
      setSuccess(true);
    } catch (err) {
      alert('Error: ' + (err.error || err.detail || 'Failed to create order'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="custom-cake-page">
        <Navbar />
        <div className="success-overlay">
          <div className="success-card">
            <div className="icon">🎂</div>
            <h2>Custom Order Received!</h2>
            <p>Your custom cake design has been sent to our master bakers.</p>
            <div className="summary">
              <p><strong>Estimated Price:</strong> Rs. {estimatedPrice}</p>
              <p><strong>Delivery Date:</strong> {deliveryDate}</p>
            </div>
            <p className="note">We will contact you shortly to confirm the final design and price.</p>
            <button onClick={() => navigate('/orders')} className="btn-primary">View My Orders</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-cake-page">
      <Navbar />
      
      <div className="custom-hero">
        <h1>Design Your Masterpiece</h1>
        <p>Tell us your dream, and we'll bake it into reality.</p>
      </div>

      <main className="custom-container">
        <div className="custom-card">
          <div className="card-header">
            <h2>Customize Your Cake</h2>
            <div className="step-indicator">
              <span className="step active">1</span>
              <span className="divider"></span>
              <span className="step active">2</span>
              <span className="divider"></span>
              <span className="step active">3</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="custom-form">
            <div className="form-grid">
              {/* Left Side: Basic Specs */}
              <div className="form-section">
                <h3><span className="icon">⚖️</span> Size & Flavour</h3>
                
                <div className="field">
                  <label>Weight (Pounds)</label>
                  <div className="pound-selector">
                    {[1, 2, 3, 4, 5].map(p => (
                      <button 
                        key={p} 
                        type="button"
                        className={pound === p ? 'active' : ''} 
                        onClick={() => setPound(p)}
                      >
                        {p} lb
                      </button>
                    ))}
                    <input 
                      type="number" 
                      placeholder="Other" 
                      min="6" 
                      onChange={(e) => setPound(parseInt(e.target.value) || 1)}
                      className={pound > 5 ? 'active' : ''}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Base Flavour Category</label>
                  <select value={flavourType} onChange={(e) => setFlavourType(e.target.value)}>
                    <option value="Fruit">Fresh Fruit & Cream</option>
                    <option value="Chocolate">Premium Chocolate</option>
                    <option value="Fondant">Designer Fondant</option>
                  </select>
                </div>

                {flavourType === 'Fruit' && (
                  <div className="field animate-fade">
                    <label>Specific Fruit Choice</label>
                    <div className="fruit-grid">
                      {['Strawberry', 'Mango', 'Pineapple', 'Blueberry'].map(f => (
                        <button 
                          key={f} 
                          type="button"
                          className={specificFlavour === f ? 'active' : ''} 
                          onClick={() => setSpecificFlavour(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Design & Delivery */}
              <div className="form-section">
                <h3><span className="icon">🎨</span> Design Details</h3>
                
                <div className="field">
                  <label>Your Vision / Instructions</label>
                  <textarea 
                    placeholder="Describe the colors, theme, messages, or any specific design elements you want..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>Preferred Delivery Date</label>
                  <input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="price-sticky">
              <div className="price-info">
                <span className="label">Estimated Price</span>
                <span className="value">Rs. {estimatedPrice}</span>
              </div>
              <button type="submit" className="place-btn" disabled={loading}>
                {loading ? 'Processing...' : 'Place Custom Order →'}
              </button>
            </div>
          </form>

          <div className="pricing-guide">
            <h4>💡 Pricing Guide</h4>
            <div className="guide-grid">
              <div className="guide-item"><span>Base (1lb)</span><span>Rs. 300</span></div>
              <div className="guide-item"><span>Addl. lb</span><span>+Rs. 200</span></div>
              <div className="guide-item"><span>Fruit</span><span>+Rs. 100/lb</span></div>
              <div className="guide-item"><span>Chocolate</span><span>+Rs. 200/lb</span></div>
              <div className="guide-item"><span>Fondant</span><span>+Rs. 250/lb</span></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CustomCake;
