import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../api/api';
import Navbar from '../components/Navbar';
import '../styles/orders.css';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [customCakes, setCustomCakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('authToken')) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, customRes] = await Promise.all([
        orderAPI.getOrders(),
        orderAPI.getCustomCakes()
      ]);
      setOrders(ordersRes.orders || []);
      setCustomCakes(customRes.custom_cakes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusLower = status.toLowerCase();
    let className = 'status-badge ';
    if (statusLower === 'pending' || statusLower === 'cart') className += 'pending';
    else if (statusLower === 'confirmed') className += 'confirmed';
    else if (statusLower === 'completed') className += 'completed';
    else if (statusLower === 'cancelled') className += 'cancelled';
    
    return <span className={className}>{status.toUpperCase()}</span>;
  };

  return (
    <div className="orders-page">
      <Navbar />

      <div className="orders-hero">
        <h1>Track Your Happiness</h1>
        <p>Keep an eye on your delicious treats as they make their way to you.</p>
      </div>

      <main className="orders-main">
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 Regular Orders
          </button>
          <button 
            className={`tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            🎨 Custom Designs
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Fetching your orders...</p>
          </div>
        ) : (
          <div className="orders-list">
            {activeTab === 'orders' ? (
              orders.length === 0 ? (
                <div className="empty-state">
                  <span className="icon">🛒</span>
                  <h3>No regular orders yet</h3>
                  <button onClick={() => navigate('/products')}>Browse Menu</button>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="order-card-new">
                    <div className="card-header">
                      <div className="order-id">Order #SA-{order.id}</div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="card-body">
                      <div className="info-row">
                        <span>Delivery Date</span>
                        <strong>{order.delivery_date}</strong>
                      </div>
                      <div className="info-row">
                        <span>Items Total</span>
                        <strong>Rs. {order.total_price.toFixed(2)}</strong>
                      </div>
                      <div className="info-row">
                        <span>Address</span>
                        <p>{order.delivery_address}</p>
                      </div>
                    </div>
                    <div className="card-footer">
                      <p className="timestamp">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                      {order.status === 'pending' && <p className="payment-reminder">💳 Check email for payment link</p>}
                    </div>
                  </div>
                ))
              )
            ) : (
              customCakes.length === 0 ? (
                <div className="empty-state">
                  <span className="icon">🎂</span>
                  <h3>No custom designs yet</h3>
                  <button onClick={() => navigate('/custom-cake')}>Design a Cake</button>
                </div>
              ) : (
                customCakes.map(cake => (
                  <div key={cake.id} className="order-card-new custom">
                    <div className="card-header">
                      <div className="order-id">Design #CU-{cake.id}</div>
                      {getStatusBadge(cake.status)}
                    </div>
                    <div className="card-body">
                      <div className="info-row specs">
                        <span>{cake.pound} lb • {cake.flavour} Flavour</span>
                      </div>
                      <div className="info-row">
                        <span>Description</span>
                        <p>{cake.description}</p>
                      </div>
                      <div className="info-row">
                        <span>Estimated Price</span>
                        <strong>Rs. {cake.estimated_price.toFixed(2)}</strong>
                      </div>
                      <div className="info-row">
                        <span>Delivery</span>
                        <strong>{cake.delivery_date}</strong>
                      </div>
                    </div>
                    <div className="card-footer">
                       <p className="timestamp">Requested on {new Date(cake.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Orders;
