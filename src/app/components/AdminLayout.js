"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { ToastProvider, useToast } from "./Toast";
import { canAccessAdminPath, getRoleDashboardPath } from "@/utils/auth";

function AdminLayoutInner({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [showQuickLeadModal, setShowQuickLeadModal] = useState(false);
  const { showToast } = useToast();

  // Quick Lead Form State
  const [quickLeadName, setQuickLeadName] = useState("");
  const [quickLeadPhone, setQuickLeadPhone] = useState("");
  const [quickLeadBrand, setQuickLeadBrand] = useState("Maruti Suzuki");
  const [quickLeadModel, setQuickLeadModel] = useState("Grand Vitara");
  const [quickLeadPriority, setQuickLeadPriority] = useState("Hot");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Check local storage for desktop sidebar collapsed preference
    if (typeof window !== "undefined" && window.innerWidth >= 992) {
      const saved = localStorage.getItem("carcrm_sidebar_collapsed");
      if (saved === "true") {
        document.body.classList.add("sidebar-collapsed");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsDesktopCollapsed(true);
      }
    }
  }, []);

  // Real-time Authentication & Authorization Guard
  useEffect(() => {
    const verifyAuth = () => {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("auth_token");
      const userStr = localStorage.getItem("user");

      // If localStorage is cleared or auth_token/user is missing, redirect immediately to login
      if (!token || !userStr) {
        router.replace("/login");
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (!canAccessAdminPath(pathname, user)) {
          router.replace(getRoleDashboardPath(user?.role));
        }
      } catch (err) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        router.replace("/login");
      }
    };

    // Run verification immediately
    verifyAuth();

    // Listen to storage event (cross-tab or storage changes)
    const handleStorageChange = (e) => {
      if (e.key === "auth_token" || e.key === "user" || e.key === null) {
        verifyAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", verifyAuth);

    // Periodic check (1s) to immediately catch localStorage.clear() in active tab DevTools
    const interval = setInterval(verifyAuth, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", verifyAuth);
      clearInterval(interval);
    };
  }, [pathname, router]);

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 992) {
      document.body.classList.toggle("sidebar-collapsed");
      const isCollapsed = document.body.classList.contains("sidebar-collapsed");
      setIsDesktopCollapsed(isCollapsed);
      localStorage.setItem("carcrm_sidebar_collapsed", isCollapsed ? "true" : "false");
    } else {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    }
  };

  const handleCloseMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleSaveQuickLead = (e) => {
    e.preventDefault();
    if (!quickLeadName || !quickLeadPhone) {
      showToast("Please enter customer name and contact phone.", "warning");
      return;
    }
    showToast(`New Lead added for ${quickLeadName} (${quickLeadBrand} - ${quickLeadModel}) with ${quickLeadPriority} priority!`, "success");
    setShowQuickLeadModal(false);
    setQuickLeadName("");
    setQuickLeadPhone("");
  };

  return (
    <div className="app-wrapper">
      {/* Mobile Sidebar Overlay Backdrop */}
      <div
        className={`sidebar-backdrop ${isMobileSidebarOpen ? "show" : ""}`}
        id="sidebarBackdrop"
        onClick={handleCloseMobileSidebar}
      ></div>

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        isCollapsed={isDesktopCollapsed}
        onCloseMobile={handleCloseMobileSidebar}
      />

      {/* Main Content Area */}
      <main className="app-main-content">
        <Header
          onToggleSidebar={handleToggleSidebar}
          onQuickAddLead={() => setShowQuickLeadModal(true)}
        />

        {children}
      </main>

      {/* Quick Add Lead Modal */}
      {showQuickLeadModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowQuickLeadModal(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold" style={{ color: "#FFFFFF" }}>
                <i className="bi bi-person-plus-fill text-primary"></i> Quick Add New Lead
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowQuickLeadModal(false)}
                aria-label="Close"
              ></button>
            </div>

            <form onSubmit={handleSaveQuickLead}>
              <div className="modal-body-custom">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Customer Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Vikram Sharma"
                      required
                      value={quickLeadName}
                      onChange={(e) => setQuickLeadName(e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Phone Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+91 98765 43210"
                      required
                      value={quickLeadPhone}
                      onChange={(e) => setQuickLeadPhone(e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Vehicle Brand</label>
                    <select
                      className="form-select"
                      value={quickLeadBrand}
                      onChange={(e) => setQuickLeadBrand(e.target.value)}
                    >
                      <option value="Maruti Suzuki">Maruti Suzuki</option>
                      <option value="Tata Motors">Tata Motors</option>
                      <option value="Mahindra">Mahindra</option>
                      <option value="Hyundai">Hyundai</option>
                      <option value="Toyota">Toyota</option>
                      <option value="Royal Enfield">Royal Enfield</option>
                      <option value="Honda 2W">Honda 2W</option>
                      <option value="TVS Motor">TVS Motor</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Model Interested</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Grand Vitara Alpha"
                      value={quickLeadModel}
                      onChange={(e) => setQuickLeadModel(e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold small">Priority Level</label>
                    <div className="d-flex gap-3">
                      {["Hot", "Warm", "Cold"].map((p) => (
                        <div className="form-check" key={p}>
                          <input
                            className="form-check-input"
                            type="radio"
                            name="quickLeadPriority"
                            id={`priority-${p}`}
                            checked={quickLeadPriority === p}
                            onChange={() => setQuickLeadPriority(p)}
                          />
                          <label className="form-check-label small" htmlFor={`priority-${p}`}>
                            {p === "Hot" && <i className="bi bi-fire text-danger me-1"></i>}
                            {p === "Warm" && <i className="bi bi-sun-fill text-warning me-1"></i>}
                            {p === "Cold" && <i className="bi bi-snow text-info me-1"></i>}
                            {p}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-outline-custom"
                  onClick={() => setShowQuickLeadModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-check-circle me-1"></i> Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <ToastProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </ToastProvider>
  );
}
