import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Intro from './pages/Intro';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Products from './pages/Products';
import Cart from './pages/Cart';
import CustomCake from './pages/CustomCake';
import Orders from './pages/Orders';
import About from './pages/About';
import Gallery from './pages/Gallery';
import Payment from './pages/Payment';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Intro is the new root */}
        <Route path="/" element={<Intro />} />
        <Route path="/home" element={<Home />} />
        
        {/* Auth & Admin */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Customer Routes */}
        <Route path="/products" element={<Products />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/payment/:orderId" element={<Payment />} />
        <Route path="/custom-cake" element={<CustomCake />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/custom-cakes" element={<Navigate to="/orders" replace />} />
        <Route path="/about" element={<About />} />
        <Route path="/gallery" element={<Gallery />} />
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
