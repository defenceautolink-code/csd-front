"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { hasPermission, hasRole, clearAuthSession } from "@/utils/auth";
import { getSidebarPages } from "@/utils/sidebarPages";

export default function Header({ onToggleSidebar, onQuickAddLead }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [currentUser, setCurrentUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const sidebarPages = React.useMemo(() => {
    return getSidebarPages(currentUser);
  }, [currentUser]);

  const filteredPages = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sidebarPages;
    return sidebarPages.filter((item) => {
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchSection = item.section?.toLowerCase().includes(q);
      const matchPath = item.path?.toLowerCase().includes(q);
      const matchKeywords = item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchSection || matchPath || matchKeywords;
    });
  }, [sidebarPages, searchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const navigateToPage = (item) => {
    if (!item) return;
    setIsSearchOpen(false);
    setSearchQuery("");
    router.push(item.path);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsSearchOpen(true);
      setSelectedIndex((prev) => (prev + 1 < filteredPages.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsSearchOpen(true);
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, filteredPages.length - 1)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredPages.length > 0 && filteredPages[selectedIndex]) {
        navigateToPage(filteredPages[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  useEffect(() => {
    setMounted(true);
    const syncUser = () => {
      if (typeof window !== "undefined") {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            setCurrentUser(JSON.parse(userStr));
          } catch (e) {
            console.error(e);
          }
        }
      }
    };

    syncUser();
    window.addEventListener("csd_user_updated", syncUser);
    return () => window.removeEventListener("csd_user_updated", syncUser);
  }, []);

  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      if (token) {
        fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }).catch(() => {});
      }
    } catch (_) {}
    clearAuthSession();
    showToast("Signed out successfully", "info");
    setShowProfileMenu(false);
    router.push("/login");
  };

  const canCreateLead = hasPermission("lead.create", currentUser) || hasRole(["admin", "manager"], currentUser);

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="header-toggle-btn"
          id="sidebarToggleBtn"
          aria-label="Toggle Navigation Sidebar"
          onClick={onToggleSidebar}
        >
          <i className="bi bi-list"></i>
        </button>
        <div className="header-search position-relative" ref={searchRef}>
          <i className="bi bi-search"></i>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search sidebar pages..."
            aria-label="Search sidebar pages"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
          />
          <span
            className="search-shortcut"
            style={{ cursor: "pointer" }}
            title="Press ⌘K or Ctrl+K to search"
            onClick={() => {
              searchInputRef.current?.focus();
              setIsSearchOpen(true);
            }}
          >
            ⌘K
          </span>

          {/* Searchable Sidebar Pages Dropdown */}
          {isSearchOpen && (
            <div
              className="sidebar-search-results shadow-lg"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                width: "360px",
                maxWidth: "92vw",
                maxHeight: "420px",
                overflowY: "auto",
                background: "#131C27",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "12px",
                boxShadow: "0 14px 35px rgba(0, 0, 0, 0.55)",
                zIndex: 1050,
                padding: "8px",
              }}
            >
              <div
                className="d-flex align-items-center justify-content-between px-2 py-1 mb-1 border-bottom"
                style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}
              >
                <span className="text-muted small fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Sidebar Pages ({filteredPages.length})
                </span>
                <span className="text-muted" style={{ fontSize: "10px" }}>
                  Press <kbd style={{ padding: "1px 4px", fontSize: "10px", background: "rgba(255,255,255,0.1)", borderRadius: "3px" }}>↵</kbd> to open
                </span>
              </div>

              {filteredPages.length === 0 ? (
                <div className="text-center py-4 px-3 text-muted">
                  <i className="bi bi-search fs-4 d-block mb-2 opacity-50"></i>
                  <div className="small fw-semibold text-white">No pages found</div>
                  <div style={{ fontSize: "12px" }}>No sidebar page matches &quot;{searchQuery}&quot;</div>
                </div>
              ) : (
                <div className="d-flex flex-column gap-1">
                  {filteredPages.map((page, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <div
                        key={page.path}
                        className="d-flex align-items-center justify-content-between p-2 rounded-2"
                        style={{
                          cursor: "pointer",
                          backgroundColor: isSelected ? "rgba(220, 233, 162, 0.15)" : "transparent",
                          border: isSelected ? "1px solid rgba(220, 233, 162, 0.3)" : "1px solid transparent",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => navigateToPage(page)}
                      >
                        <div className="d-flex align-items-center gap-2 overflow-hidden" style={{ minWidth: 0 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: isSelected ? "rgba(220, 233, 162, 0.25)" : "rgba(255, 255, 255, 0.06)",
                              color: isSelected ? "#DCE9A2" : "#CBD5E1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              fontSize: "14px",
                            }}
                          >
                            <i className={page.icon}></i>
                          </div>
                          <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                            <span
                              className="text-truncate fw-semibold"
                              style={{
                                color: isSelected ? "#FFFFFF" : "#E2E8F0",
                                fontSize: "13px",
                              }}
                            >
                              {page.title}
                            </span>
                            <span
                              className="text-truncate"
                              style={{
                                color: "#94A3B8",
                                fontSize: "11px",
                              }}
                            >
                              {page.section}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-1 flex-shrink-0 ms-2">
                          <span
                            className="badge text-truncate"
                            style={{
                              background: "rgba(255, 255, 255, 0.06)",
                              color: "#94A3B8",
                              fontSize: "10px",
                              fontWeight: 400,
                              maxWidth: "110px",
                            }}
                          >
                            {page.path}
                          </span>
                          <i
                            className="bi bi-arrow-right-short"
                            style={{
                              color: isSelected ? "#DCE9A2" : "#64748B",
                              fontSize: "16px",
                            }}
                          ></i>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* Quick Add Action removed as per requirement */}
        {mounted && currentUser?.role === "Sales Executive" ? (
          <button
            className="btn btn-sm btn-outline-primary d-none d-sm-inline-flex align-items-center gap-1 text-white"
            onClick={() => {
              router.push("/sales-executive/leads");
            }}
          >
            <i className="bi bi-funnel-fill me-1"></i>
            <span>My Leads</span>
          </button>
        ) : null}

        {/* Notifications Dropdown */}
        <div className="dropdown position-relative" ref={notifRef}>
          <button
            className="header-action-btn"
            type="button"
            title="Notifications"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
          >
            <i className="bi bi-bell"></i>
            <span className="badge-dot"></span>
          </button>

          {showNotifications && (
            <div
              className="dropdown-menu dropdown-menu-end shadow-lg p-2 show"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                minWidth: "320px",
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                zIndex: 1000,
                marginTop: "8px",
              }}
            >
              <div className="p-2 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: "var(--border-color) !important" }}>
                <span className="fw-bold" style={{ color: "var(--text-primary)" }}>Notifications</span>
                <span className="badge bg-primary-subtle text-primary rounded-pill">3 New</span>
              </div>
              <div>
                <a
                  className="dropdown-item py-2 text-wrap"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast("Navigating to Leads...", "info");
                    setShowNotifications(false);
                    router.push(currentUser?.role === "Sales Executive" ? "/sales-executive/leads" : "/admin/leads");
                  }}
                  style={{ borderRadius: "8px" }}
                >
                  <div className="d-flex align-items-start gap-2">
                    <i className="bi bi-fire text-danger fs-6 mt-1"></i>
                    <div>
                      <p className="mb-0 fw-semibold small" style={{ color: "var(--text-primary)" }}>Active Leads Pipeline Ready</p>
                      <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                        Check customer interactions
                      </span>
                    </div>
                  </div>
                </a>

                <a
                  className="dropdown-item py-2 text-wrap"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast("Opening Today's Scheduled Follow-ups...", "info");
                    setShowNotifications(false);
                    router.push("/admin/follow-up");
                  }}
                  style={{ borderRadius: "8px" }}
                >
                  <div className="d-flex align-items-start gap-2">
                    <i className="bi bi-telephone-outbound text-warning fs-6 mt-1"></i>
                    <div>
                      <p className="mb-0 fw-semibold small" style={{ color: "var(--text-primary)" }}>5 Call Follow-ups Due Today</p>
                      <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                        Grand Vitara & Thar inquiries pending
                      </span>
                    </div>
                  </div>
                </a>

                <a
                  className="dropdown-item py-2 text-wrap"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast("Catalog synchronized", "info");
                    setShowNotifications(false);
                  }}
                  style={{ borderRadius: "8px" }}
                >
                  <div className="d-flex align-items-start gap-2">
                    <i className="bi bi-shield-check text-success fs-6 mt-1"></i>
                    <div>
                      <p className="mb-0 fw-semibold small" style={{ color: "var(--text-primary)" }}>2W & 4W Brands Synchronized</p>
                      <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                        Catalog updated with Maruti, Tata, RE
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="dropdown position-relative" ref={profileRef}>
          <button
            className="header-profile-btn d-flex align-items-center gap-2 border-0 bg-transparent p-0"
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: mounted && currentUser?.role === "Sales Executive"
                  ? "linear-gradient(135deg, #58632A, #3F4912)"
                  : "linear-gradient(135deg, #000080, #131C27)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "0.95rem",
                color: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
              }}
            >
              {mounted && currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="header-profile-info d-none d-md-flex flex-column text-start">
              <span className="header-profile-name text-white fw-bold small">
                {mounted ? (currentUser?.name || "Admin User") : "Admin User"}
              </span>
              <span className="header-profile-role" style={{ fontSize: "0.75rem", color: "var(--header-title-color)" }}>
                {mounted ? (typeof currentUser?.role === "object" ? (currentUser.role.title || currentUser.role.name || "Super Admin") : (currentUser?.role || "Super Admin")) : "Super Admin"}
              </span>
            </div>
            <i className="bi bi-chevron-down fs-7" style={{ color: "var(--header-title-color)" }}></i>
          </button>

          {showProfileMenu && (
            <div
              className="dropdown-menu dropdown-menu-end shadow-lg p-2 show"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                minWidth: "220px",
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                zIndex: 1000,
                marginTop: "8px",
              }}
            >
              <div className="p-2 border-bottom" style={{ borderColor: "var(--border-color) !important" }}>
                <p className="mb-0 fw-bold" style={{ color: "var(--text-primary)" }}>{currentUser?.name || "Alexander Vance"}</p>
                <span className="text-muted small">{currentUser?.email || "user@carcrm.com"}</span>
              </div>
              <div className="pt-2">
                <Link
                  className="dropdown-item py-2 d-flex align-items-center"
                  href="/admin/profile"
                  onClick={() => setShowProfileMenu(false)}
                  style={{ color: "var(--text-primary)" }}
                >
                  <i className="bi bi-person me-2 text-primary"></i> My Profile
                </Link>
                <hr className="dropdown-divider my-1" style={{ borderColor: "var(--border-color)" }} />
                <a
                  className="dropdown-item py-2 d-flex align-items-center text-danger"
                  href="#"
                  onClick={handleSignOut}
                >
                  <i className="bi bi-box-arrow-right me-2"></i> Sign Out
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
