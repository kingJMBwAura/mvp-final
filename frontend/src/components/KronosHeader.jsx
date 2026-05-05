import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './Navbar'; 

export default function KronosHeader({ overlay = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get("search") || "");
  }, [location.search]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmedSearch = searchTerm.trim();
    const nextPath = trimmedSearch
      ? `/shopnow?search=${encodeURIComponent(trimmedSearch)}`
      : "/shopnow";

    navigate(nextPath);
  };

  return (
    <header className={`kronos-header ${overlay ? "kronos-header--overlay" : ""}`}>
      
      <Link to="/" className="kronos-header__brand" style={{ textDecoration: 'none', color: '#D4AF37' }}>
        KRONOS
      </Link>

      <div className="kronos-header__actions">
        
        <form className="kronos-search" role="search" onSubmit={handleSearchSubmit}>
          <button className="kronos-search__icon" type="submit" aria-label="Search">
            🔍
          </button>
          <input
            type="search"
            placeholder="Search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </form>
        
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
