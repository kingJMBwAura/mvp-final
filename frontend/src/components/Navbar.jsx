import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, isAdmin } = useAuth();

  return (
    <nav className="kronos-sidebar-nav">
      <ul className="kronos-sidebar-links">
        <li><Link to="/" className="kronos-sidebar-link">Home</Link></li>
        <li><Link to="/shopnow" className="kronos-sidebar-link">Buy</Link></li>
        <li><Link to="/sell" className="kronos-sidebar-link">Sell</Link></li>
        <li><Link to="/about" className="kronos-sidebar-link">About Us</Link></li>
        {isAdmin && <li><Link to="/admin/listings" className="kronos-sidebar-link">Admin Review</Link></li>}
        {!user && <li><Link to="/auth?mode=signup" className="kronos-sidebar-link">Sign Up</Link></li>}
      </ul>
    </nav>
  );
}
