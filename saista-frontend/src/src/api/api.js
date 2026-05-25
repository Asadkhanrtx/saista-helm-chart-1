import axios from 'axios';

const USER_SERVICE_URL = process.env.REACT_APP_USER_SERVICE_URL || '/api/users';
const ORDER_SERVICE_URL = process.env.REACT_APP_ORDER_SERVICE_URL || '/api/orders';
const PAYMENT_SERVICE_URL = process.env.REACT_APP_PAYMENT_SERVICE_URL || '/api/payment';

const getAuthToken = () => localStorage.getItem('authToken');
const authHeader = () => ({ Authorization: `Bearer ${getAuthToken()}` });

// ── User / Auth Service ──────────────────────────────────
export const userAPI = {
  signup: async (username, email, password, fullName) => {
    try {
      const { data } = await axios.post(`${USER_SERVICE_URL}/signup`, { username, email, password, full_name: fullName });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  login: async (username, password) => {
    try {
      const { data } = await axios.post(`${USER_SERVICE_URL}/login`, { username, password });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getProfile: async () => {
    try {
      const { data } = await axios.get(`${USER_SERVICE_URL}/profile`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getProducts: async (category = null) => {
    try {
      const url = category ? `${USER_SERVICE_URL}/products?category=${category}` : `${USER_SERVICE_URL}/products`;
      const { data } = await axios.get(url);
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getCategories: async () => {
    try {
      const { data } = await axios.get(`${USER_SERVICE_URL}/products/categories`);
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getProduct: async (productId) => {
    try {
      const { data } = await axios.get(`${USER_SERVICE_URL}/products/${productId}`);
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  }
};

// ── Order Service ────────────────────────────────────────
export const orderAPI = {
  addToCart: async (productId, quantity) => {
    try {
      const { data } = await axios.post(`${ORDER_SERVICE_URL}/cart`, { product_id: productId, quantity }, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getCart: async (orderId) => {
    try {
      const { data } = await axios.get(`${ORDER_SERVICE_URL}/cart/${orderId}`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  removeFromCart: async (orderId, itemId) => {
    try {
      const { data } = await axios.delete(`${ORDER_SERVICE_URL}/cart/${orderId}/item/${itemId}`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  placeOrder: async (orderId, deliveryAddress, deliveryDate) => {
    try {
      const { data } = await axios.post(`${ORDER_SERVICE_URL}/order`, {
        order_id: orderId, delivery_address: deliveryAddress, delivery_date: deliveryDate
      }, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getOrders: async () => {
    try {
      const { data } = await axios.get(`${ORDER_SERVICE_URL}/orders`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getOrder: async (orderId) => {
    try {
      const { data } = await axios.get(`${ORDER_SERVICE_URL}/orders/${orderId}`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  createCustomCake: async (pound, flavour, description, deliveryDate) => {
    try {
      const { data } = await axios.post(`${ORDER_SERVICE_URL}/custom-cake`, {
        pound, flavour, description, delivery_date: deliveryDate
      }, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getCustomCakes: async () => {
    try {
      const { data } = await axios.get(`${ORDER_SERVICE_URL}/custom-cakes`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  }
};

// ── Payment Service ──────────────────────────────────────
export const paymentAPI = {
  pay: async (orderId, paymentMode, cardDetails = {}) => {
    try {
      const { data } = await axios.post(`${PAYMENT_SERVICE_URL}/payment/pay`, {
        order_id: orderId,
        payment_mode: paymentMode,
        ...cardDetails
      }, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getInvoice: async (orderId) => {
    try {
      const { data } = await axios.get(`${PAYMENT_SERVICE_URL}/payment/invoice/${orderId}`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  }
};

// ── Admin Service ────────────────────────────────────────
export const adminAPI = {
  login: async (username, password) => {
    try {
      const { data } = await axios.post(`${USER_SERVICE_URL}/admin/login`, { username, password });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getStats: async () => {
    try {
      const { data } = await axios.get(`${USER_SERVICE_URL}/admin/stats`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getOrders: async () => {
    try {
      const { data } = await axios.get(`${USER_SERVICE_URL}/admin/orders`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      const { data } = await axios.put(`${USER_SERVICE_URL}/admin/orders/${orderId}/status`, { order_id: orderId, status }, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getCustomOrders: async () => {
    try {
      const { data } = await axios.get(`${USER_SERVICE_URL}/admin/custom-orders`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getCustomers: async () => {
    try {
      const { data } = await axios.get(`${USER_SERVICE_URL}/admin/customers`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  emailCustomer: async (customerId, subject, message) => {
    try {
      const { data } = await axios.post(`${USER_SERVICE_URL}/admin/email-customer`, { customer_id: customerId, subject, message }, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  getProducts: async () => {
    try {
      const { data } = await axios.get(`${USER_SERVICE_URL}/admin/products`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  addProduct: async (product) => {
    try {
      const { data } = await axios.post(`${USER_SERVICE_URL}/admin/products`, product, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  updateProduct: async (productId, updates) => {
    try {
      const { data } = await axios.put(`${USER_SERVICE_URL}/admin/products/${productId}`, updates, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  },

  deleteProduct: async (productId) => {
    try {
      const { data } = await axios.delete(`${USER_SERVICE_URL}/admin/products/${productId}`, { headers: authHeader() });
      return data;
    } catch (e) { throw e.response?.data || e.message; }
  }
};
