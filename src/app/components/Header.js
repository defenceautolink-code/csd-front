"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { hasPermission, hasRole } from "@/utils/auth";

export default function Header({ onToggleSidebar, onQuickAddLead }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      showToast(`Searching CRM for "${searchQuery}"...`, "info");
      router.push(`/leads?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
  }, []);

  const handleSignOut = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
    }
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
        <div className="header-search">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Search leads, vehicles, customers..."
            aria-label="Global search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <span className="search-shortcut">⌘K</span>
        </div>
      </div>

      <div className="header-right">
        {/* Quick Add Action for Admin and Manager */}
        {mounted ? (
          canCreateLead ? (
            <button
              className="btn btn-sm btn-primary d-none d-sm-inline-flex align-items-center gap-1"
              onClick={() => {
                if (onQuickAddLead) {
                  onQuickAddLead();
                } else {
                  router.push("/admin/leads?action=create");
                }
              }}
            >
              <i className="bi bi-plus-lg"></i>
              <span>New Lead</span>
            </button>
          ) : currentUser?.role === "Sales Executive" ? (
            <button
              className="btn btn-sm btn-outline-primary d-none d-sm-inline-flex align-items-center gap-1 text-white"
              onClick={() => {
                router.push("/sales-executive/leads");
              }}
            >
              <i className="bi bi-funnel-fill me-1"></i>
              <span>My Leads</span>
            </button>
          ) : null
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
                <a
                  className="dropdown-item py-2 d-flex align-items-center"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast(`Signed in as ${currentUser?.name} (${currentUser?.role})`, "info");
                    setShowProfileMenu(false);
                  }}
                  style={{ color: "var(--text-primary)" }}
                >
                  <i className="bi bi-person me-2 text-primary"></i> My Profile
                </a>
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
