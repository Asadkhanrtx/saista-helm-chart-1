import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../api/api';
import Navbar from '../components/Navbar';
import '../styles/cart.css';

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Checkout states
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [placing, setPlacing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const cartOrderId = localStorage.getItem('cartOrderId');
      if (!cartOrderId) {
        setCartItems([]);
        setTotal(0);
        return;
      }
      const data = await orderAPI.getCart(cartOrderId);
      setCartItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError('Failed to fetch cart. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const cartOrderId = localStorage.getItem('cartOrderId');
      await orderAPI.removeFromCart(cartOrderId, itemId);
      fetchCart();
    } catch (err) {
      alert('Error removing item');
    }
  };

  const handleCheckoutClick = (e) => {
    e.preventDefault();
    if (!deliveryAddress || !deliveryDate) {
      alert("Please enter delivery details.");
      return;
    }
    setShowConfirm(true);
  };

  const confirmOrder = async () => {
    try {
      setPlacing(true);
      const cartOrderId = localStorage.getItem('cartOrderId');
      const response = await orderAPI.placeOrder(cartOrderId, deliveryAddress, deliveryDate);
      
      if (response && response.order_id) {
        localStorage.removeItem('cartOrderId');
        setShowConfirm(false);
        navigate(`/payment/${response.order_id}`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      alert('Error placing order: ' + (err.error || err.detail || 'Please try again'));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="cart-page">
      <Navbar />
      <div className="cart-container">
        <h2>Your Shopping Cart</h2>

        {loading ? (
          <div className="cart-loading">Loading...</div>
        ) : error ? (
          <div className="cart-error">{error}</div>
        ) : cartItems.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-icon">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added any sweet treats yet.</p>
            <button className="btn-primary" onClick={() => navigate('/products')}>Browse Menu</button>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item-card">
                  <div className="item-details">
                    <h3>{item.name}</h3>
                    <p className="item-price">Rs. {Number(item.price).toFixed(2)}</p>
                  </div>
                  <div className="item-actions">
                    <span className="qty-badge">Qty: {item.quantity}</span>
                    <button className="remove-btn" onClick={() => removeItem(item.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-section">
              <div className="summary-card">
                <h3>Order Summary</h3>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>Rs. {Number(total).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  <span className="free">Calculated at payment</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>Rs. {Number(total).toFixed(2)}</span>
                </div>
              </div>

              <div className="delivery-form">
                <h3>Delivery Details</h3>
                <form onSubmit={handleCheckoutClick}>
                  <div className="field">
                    <label>Delivery Address</label>
                    <textarea 
                      required 
                      rows="3" 
                      placeholder="Enter your full address..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="field">
                    <label>Expected Delivery Date</label>
                    <input 
                      type="date" 
                      required 
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <button type="submit" className="btn-primary checkout-btn">
                    Proceed to Payment
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>Confirm Order Details</h3>
            <div className="confirm-details">
              <p><strong>Total Amount:</strong> Rs. {Number(total).toFixed(2)}</p>
              <p><strong>Delivery Date:</strong> {deliveryDate}</p>
              <p><strong>Address:</strong> {deliveryAddress}</p>
            </div>
            <p className="confirm-note">You will be redirected to payment securely.</p>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowConfirm(false)} disabled={placing}>Cancel</button>
              <button className="btn-primary" onClick={confirmOrder} disabled={placing}>
                {placing ? 'Processing...' : 'Confirm & Pay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;
