"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function VisitorNavbar({ onOpenSearch }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    }
    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSearchOpen]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "EMI Calculator", href: "/calculator" },
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Blogs", href: "/blogs" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="site__header">
      <div className="header">
        <div className="header__inner">
          {/* Logo */}
          <div className="header__logo">
            <Link href="/" className="logo">
              <div className="logo__image">
                <img
                  src="/image/logo.png"
                  alt="Defence Autolink - CSD"
                  onError={(e) => {
                    e.currentTarget.src = "/image/logo-original.png";
                  }}
                />
              </div>
            </Link>
          </div>

          {/* Navbar Menu (Desktop Pill) */}
          <div className="header__navbar d-none d-lg-flex">
            <nav className="header__navbar-menu">
              <ul className="main-menu__list">
                {navLinks.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li
                      key={item.label}
                      className={`main-menu__item ${
                        isActive ? "main-menu__item--active" : ""
                      }`}
                    >
                      <Link href={item.href} className="main-menu__link">
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Right Indicators: Account & Search */}
          <div className="header__indicators">
            {/* Account Link */}
            <div
              className="indicator indicator--trigger--click"
              onMouseEnter={() => setAccountMenuOpen(true)}
              onMouseLeave={() => setAccountMenuOpen(false)}
            >
              <Link href="/login" className="indicator__button">
                <span className="indicator__icon">
                  <svg width="28" height="28" viewBox="0 0 32 32">
                    <path d="M16,18C9.4,18,4,23.4,4,30H2c0-6.2,4-11.5,9.6-13.3C9.4,15.3,8,12.8,8,10c0-4.4,3.6-8,8-8s8,3.6,8,8c0,2.8-1.5,5.3-3.6,6.7 C26,18.5,30,23.8,30,30h-2C28,23.4,22.6,18,16,18z M22,10c0-3.3-2.7-6-6-6s-6,2.7-6,6s2.7,6,6,6S22,13.3,22,10z"></path>
                  </svg>
                </span>
                <span className="indicator__titles">
                  <span className="indicator__title">Hello, Log In</span>
                  <span className="indicator__value">My Account</span>
                </span>
              </Link>

              {/* Account Dropdown */}
              {accountMenuOpen && (
                <div className="indicator__content">
                  <div className="account-menu">
                    <ul className="account-menu__links">
                      <li>
                        <Link href="/login" onClick={() => setAccountMenuOpen(false)}>
                          Login
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Search Button & Dropdown */}
            <div className="desktop-search-wrapper" ref={searchRef}>
              <button
                className="desktop-search-btn"
                type="button"
                onClick={() => setIsSearchOpen((prev) => !prev)}
                aria-label="Search cars"
              >
                <i className="bi bi-search"></i>
              </button>

              <div
                className={`desktop-header__search ${
                  isSearchOpen ? "desktop-header__search--open" : ""
                }`}
              >
                <form
                  className="desktop-search__body"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <span className="desktop-search__car-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M6.6,2c2,0,4.8,0,6.8,0c1,0,2.9,0.8,3.6,2.2C17.7,5.7,17.9,7,18.4,7C20,7,20,8,20,8v1h-1v7.5 c0,0.8-0.7,1.5-1.5,1.5h-1c-0.8,0-1.5-0.7-1.5-1.5V16H5v0.5C5,17.3,4.3,18,3.5,18h-1C1.7,18,1,17.3,1,16.5V16V9H0V8 c0,0,0.1-1,1.6-1C2.1,7,2.3,5.7,3,4.2C3.7,2.8,5.6,2,6.6,2z M13.3,4H6.7c-0.8,0-1.4,0-2,0.7c-0.5,0.6-0.8,1.5-1,2 C3.6,7.1,3.5,7.9,3.7,8C4.5,8.4,6.1,9,10,9c4,0,5.4-0.6,6.3-1c0.2-0.1,0.2-0.8,0-1.2c-0.2-0.4-0.5-1.5-1-2 C14.7,4,14.1,4,13.3,4z M4,10c-0.4-0.3-1.5-0.5-2,0c-0.4,0.4-0.4,1.6,0,2c0.5,0.5,4,0.4,4,0C6,11.2,4.5,10.3,4,10z M14,12 c0,0.4,3.5,0.5,4,0c0.4-0.4,0.4-1.6,0-2c-0.5-0.5-1.3-0.3-2,0C15.5,10.2,14,11.3,14,12z" />
                    </svg>
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="desktop-search__input"
                    placeholder="Search for cars..."
                  />
                  <button
                    type="button"
                    className="desktop-search__close"
                    onClick={() => setIsSearchOpen(false)}
                    aria-label="Close search"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </form>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="mobile-header__menu-button d-lg-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <i className={`bi ${mobileMenuOpen ? "bi-x-lg" : "bi-list"}`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-header__drawer d-lg-none">
          <ul className="mobile-menu__list">
            {navLinks.map((item) => (
              <li key={item.label} className="mobile-menu__item">
                <Link
                  href={item.href}
                  className="mobile-menu__link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
