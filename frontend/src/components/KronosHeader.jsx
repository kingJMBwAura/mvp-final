import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar'; 

export default function KronosHeader({ overlay = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className={`kronos-header ${overlay ? "kronos-header--overlay" : ""}`}>
      
      <Link to="/" className="kronos-header__brand" style={{ textDecoration: 'none', color: '#D4AF37' }}>
        KRONOS
      </Link>

      <div className="kronos-header__actions">
        
        <div className="kronos-search">
          <span className="kronos_search_icon"></span>
          <input type="text" placeholder="Search" />
        </div>
        
        <Link to="/cart" type="button" className="kronos-icon-btn" aria-label="Cart">
          🛒
        </Link>

        <button type="button" className="kronos-icon-btn" aria-label="Menu" onClick={toggleMenu}>
          =
        </button>
      </div>

      {isMenuOpen && (
        <div className="kronos-sidebar-container">
          <button className="close-sidebar-btn" onClick={toggleMenu}>
            =
          </button>
          <Navbar />
        </div>
      )}
    </header>
  );
}