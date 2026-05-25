import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentAPI, orderAPI } from '../api/api';
import Navbar from '../components/Navbar';
import '../styles/cart.css'; // Reusing some cart styles

function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [paymentMode, setPaymentMode] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invoice, setInvoice] = useState(null);

  // Dummy card state
  const [cardDetails, setCardDetails] = useState({
    card_number: '', card_name: '', card_expiry: '', card_cvv: ''
  });

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const data = await orderAPI.getOrder(orderId);
      if (data.payment_status === 'paid' || data.status === 'confirmed') {
        // Already paid/confirmed, fetch invoice
        const inv = await paymentAPI.getInvoice(orderId);
        setInvoice(inv);
        setSuccess(true);
      } else {
        setOrder(data);
      }
    } catch (e) {
      console.error(e);
      navigate('/orders');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await paymentAPI.pay(orderId, paymentMode, paymentMode === 'card' ? cardDetails : {});
      if (res) {
        const inv = await paymentAPI.getInvoice(orderId);
        setInvoice(inv);
        setSuccess(true);
      }
    } catch (e) {
      alert(e.detail || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (success && invoice) {
    return (
      <div className="cart-page">
        <Navbar />
        <div className="success-overlay animate-fade">
          <div className="success-card" style={{ maxWidth: '600px' }}>
            <div className="icon">🎉</div>
            <h2>Order Confirmed!</h2>
            <p>Your invoice has been sent to <strong>{invoice.email}</strong></p>
            
            <div className="summary" style={{ textAlign: 'left', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Invoice No:</span> <strong>{invoice.invoice_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Amount:</span> <strong style={{color: '#d4af37'}}>Rs. {invoice.total_price}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Payment Mode:</span> <strong>{invoice.payment_mode.toUpperCase()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Status:</span> <strong>{invoice.payment_status === 'paid' ? '✅ Paid' : '⏳ Pending (COD)'}</strong>
              </div>
            </div>

            <button className="btn-primary" onClick={() => navigate('/orders')}>View My Orders</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <Navbar />
      <div className="cart-container">
        <h2>Complete Your Payment</h2>
        
        {order ? (
          <div className="cart-grid">
            <div className="cart-items">
              <div className="summary-card">
                <h3>Order Summary</h3>
                <div className="summary-row total" style={{marginTop: 0, border: 'none'}}>
                  <span>Total Amount to Pay</span>
                  <span>Rs. {order.total_price}</span>
                </div>
                <p style={{color: '#888', fontSize: '0.9rem', marginTop: '10px'}}>
                  Delivery to: {order.delivery_address}
                </p>
              </div>

              <div className="payment-options" style={{marginTop: '20px', background: 'white', padding: '20px', borderRadius: '20px'}}>
                <h3 style={{marginBottom: '15px'}}>Select Payment Method</h3>
                <div style={{display: 'flex', gap: '15px', marginBottom: '20px'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type="radio" name="payMode" checked={paymentMode === 'cod'} onChange={() => setPaymentMode('cod')} />
                    Cash on Delivery
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type="radio" name="payMode" checked={paymentMode === 'card'} onChange={() => setPaymentMode('card')} />
                    Credit / Debit Card
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type="radio" name="payMode" checked={paymentMode === 'upi'} onChange={() => setPaymentMode('upi')} />
                    UPI
                  </label>
                </div>

                <form onSubmit={handlePayment}>
                  {paymentMode === 'card' && (
                    <div style={{marginBottom: '20px'}}>
                      <input type="text" placeholder="Card Number (Dummy)" required style={{width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd'}} />
                      <input type="text" placeholder="Name on Card" required style={{width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd'}} />
                      <div style={{display: 'flex', gap: '10px'}}>
                        <input type="text" placeholder="MM/YY" required style={{width: '50%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd'}} />
                        <input type="text" placeholder="CVV" required style={{width: '50%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd'}} />
                      </div>
                    </div>
                  )}

                  {paymentMode === 'upi' && (
                    <div style={{marginBottom: '20px'}}>
                      <input type="text" placeholder="UPI ID (Dummy, e.g. user@okicici)" required style={{width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd'}} />
                    </div>
                  )}

                  <button type="submit" className="btn-primary" style={{width: '100%'}} disabled={loading}>
                    {loading ? 'Processing...' : `Pay Rs. ${order.total_price}`}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <p>Loading order details...</p>
        )}
      </div>
    </div>
  );
}

export default Payment;
