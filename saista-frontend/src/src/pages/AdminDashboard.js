import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../api/api';
import '../styles/admin.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  const [stats, setStats] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Modals
  const [emailModal, setEmailModal] = useState({ show: false, customerId: null, subject: '', message: '' });
  const [productModal, setProductModal] = useState({ show: false, isEdit: false, product: null });

  useEffect(() => {
    if (localStorage.getItem('role') !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchStats();
    fetchData();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getStats();
      setStats(res);
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const res = await adminAPI.getOrders();
        setData(res.orders || []);
      } else if (activeTab === 'custom') {
        const res = await adminAPI.getCustomOrders();
        setData(res.custom_orders || []);
      } else if (activeTab === 'products') {
        const res = await adminAPI.getProducts();
        setData(res.products || []);
      } else if (activeTab === 'customers') {
        const res = await adminAPI.getCustomers();
        setData(res.customers || []);
      }
    } catch (e) {
      console.error(e);
      if (e.detail === 'Invalid credentials') navigate('/admin/login');
    } finally { setLoading(false); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus);
      fetchData();
    } catch (e) { alert('Failed to update status'); }
  };

  const handleSendEmail = async () => {
    try {
      await adminAPI.emailCustomer(emailModal.customerId, emailModal.subject, emailModal.message);
      alert('Email sent successfully!');
      setEmailModal({ show: false, customerId: null, subject: '', message: '' });
    } catch (e) { alert('Failed to send email'); }
  };

  const handleProductSave = async (e) => {
    e.preventDefault();
    try {
      if (productModal.isEdit) {
        await adminAPI.updateProduct(productModal.product.id, productModal.product);
      } else {
        await adminAPI.addProduct(productModal.product);
      }
      setProductModal({ show: false, isEdit: false, product: null });
      fetchData();
    } catch (e) { alert('Failed to save product'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('role');
    navigate('/admin/login');
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <h2>Admin Panel</h2>
        <div className="admin-nav">
          <div className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>📦 Orders</div>
          <div className={`admin-nav-item ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}>🎨 Custom Orders</div>
          <div className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>🍰 Products</div>
          <div className={`admin-nav-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>👥 Customers</div>
        </div>
        <div className="admin-logout" onClick={handleLogout}>Log Out</div>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <h1>Dashboard Overview</h1>
        </div>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card"><h3>Total Orders</h3><div className="value">{stats.total_orders}</div></div>
            <div className="stat-card"><h3>Revenue</h3><div className="value">Rs. {stats.revenue.toLocaleString()}</div></div>
            <div className="stat-card"><h3>Total Customers</h3><div className="value">{stats.total_customers}</div></div>
            <div className="stat-card"><h3>Pending Orders</h3><div className="value">{stats.pending_orders}</div></div>
          </div>
        )}

        <div className="admin-panel">
          <div className="panel-header">
            <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management</h2>
            {activeTab === 'products' && (
              <button className="admin-btn" onClick={() => setProductModal({ show: true, isEdit: false, product: { name: '', description: '', price: 0, category: 'Cakes', available: true } })}>
                + Add Product
              </button>
            )}
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  {activeTab === 'orders' && <><th>ID</th><th>Customer</th><th>Total</th><th>Pay Mode</th><th>Pay Status</th><th>Status</th><th>Actions</th></>}
                  {activeTab === 'custom' && <><th>ID</th><th>Customer</th><th>Specs</th><th>Est. Price</th><th>Status</th><th>Actions</th></>}
                  {activeTab === 'products' && <><th>Name</th><th>Category</th><th>Price</th><th>Available</th><th>Actions</th></>}
                  {activeTab === 'customers' && <><th>ID</th><th>Name</th><th>Email</th><th>Actions</th></>}
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id}>
                    {activeTab === 'orders' && (
                      <>
                        <td>#SA-{item.id}</td>
                        <td>{item.username}<br/><small>{item.email}</small></td>
                        <td>Rs. {item.total_price}</td>
                        <td>{item.payment_mode || 'N/A'}</td>
                        <td><span className={`status-badge ${item.payment_status}`}>{item.payment_status}</span></td>
                        <td>
                          <select className="action-select" value={item.status} onChange={(e) => handleStatusChange(item.id, e.target.value)}>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <button className="email-btn" onClick={() => setEmailModal({ show: true, customerId: item.user_id, subject: `Update on Order #SA-${item.id}`, message: '' })}>Email</button>
                        </td>
                      </>
                    )}
                    {activeTab === 'custom' && (
                      <>
                        <td>#CU-{item.id}</td>
                        <td>{item.username}</td>
                        <td>{item.pound}lb {item.flavour}</td>
                        <td>Rs. {item.estimated_price}</td>
                        <td><span className={`status-badge ${item.status}`}>{item.status}</span></td>
                        <td><button className="email-btn" onClick={() => setEmailModal({ show: true, customerId: item.user_id, subject: `Custom Order #CU-${item.id}`, message: '' })}>Contact</button></td>
                      </>
                    )}
                    {activeTab === 'products' && (
                      <>
                        <td>{item.name}</td>
                        <td>{item.category}</td>
                        <td>Rs. {item.price}</td>
                        <td>{item.available ? 'Yes' : 'No'}</td>
                        <td>
                          <button className="admin-btn" style={{marginRight: '10px'}} onClick={() => setProductModal({ show: true, isEdit: true, product: { ...item } })}>Edit</button>
                        </td>
                      </>
                    )}
                    {activeTab === 'customers' && (
                      <>
                        <td>{item.id}</td>
                        <td>{item.username}</td>
                        <td>{item.email}</td>
                        <td><button className="email-btn" onClick={() => setEmailModal({ show: true, customerId: item.id, subject: '', message: '' })}>Email</button></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Email Modal */}
      {emailModal.show && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h2>Send Email to Customer</h2>
            <div className="field">
              <label>Subject</label>
              <input type="text" value={emailModal.subject} onChange={e => setEmailModal({...emailModal, subject: e.target.value})} />
            </div>
            <div className="field">
              <label>Message (HTML supported)</label>
              <textarea rows="5" value={emailModal.message} onChange={e => setEmailModal({...emailModal, message: e.target.value})}></textarea>
            </div>
            <div className="modal-actions">
              <button className="cancel" onClick={() => setEmailModal({ show: false })}>Cancel</button>
              <button className="save" onClick={handleSendEmail}>Send Email</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {productModal.show && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h2>{productModal.isEdit ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleProductSave}>
              <div className="field">
                <label>Name</label>
                <input type="text" value={productModal.product.name} onChange={e => setProductModal({...productModal, product: {...productModal.product, name: e.target.value}})} required />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={productModal.product.category} onChange={e => setProductModal({...productModal, product: {...productModal.product, category: e.target.value}})}>
                  <option value="Cakes">Cakes</option>
                  <option value="Cookies">Cookies</option>
                </select>
              </div>
              <div className="field">
                <label>Price (Rs.)</label>
                <input type="number" value={productModal.product.price} onChange={e => setProductModal({...productModal, product: {...productModal.product, price: parseFloat(e.target.value)}})} required />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea value={productModal.product.description} onChange={e => setProductModal({...productModal, product: {...productModal.product, description: e.target.value}})} required />
              </div>
              <div className="field" style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <label style={{marginBottom: 0}}>Available</label>
                <input type="checkbox" style={{width: 'auto'}} checked={productModal.product.available} onChange={e => setProductModal({...productModal, product: {...productModal.product, available: e.target.checked}})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel" onClick={() => setProductModal({ show: false })}>Cancel</button>
                <button type="submit" className="save">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
