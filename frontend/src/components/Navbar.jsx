import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

export default function Navbar() {
  return (
    <nav className="kronos-sidebar-nav">
      <ul className="kronos-sidebar-links">
        <li><Link to="/" className="kronos-sidebar-link">Home</Link></li>
        <li><Link to="/shopnow" className="kronos-sidebar-link">Buy</Link></li>
        <li><Link to="/sell" className="kronos-sidebar-link">Sell</Link></li>
        <li><Link to="/about" className="kronos-sidebar-link">About Us</Link></li>
      </ul>
    </nav>
  );
}