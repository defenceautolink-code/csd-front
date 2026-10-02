"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function CrmLoginPage() {
  const router = useRouter();

  // 1. Form state variables
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeRole, setActiveRole] = useState("admin");

  // 2. Quick Demo button click handler
  const handleRoleSelect = (role) => {
    setActiveRole(role);
    setErrorMessage("");
    setSuccessMessage("");

    if (role === "admin") {
      setEmail("admin@example.com");
      setPassword("password");
    } else if (role === "manager") {
      setEmail("neha.sharma@carcrm.com");
      setPassword("password");
    } else if (role === "executive") {
      setEmail("david.miller@carcrm.com");
      setPassword("password");
    } else if (role === "receptionist") {
      setEmail("pooja.iyer@carcrm.com");
      setPassword("password");
    } else if (role === "accountant") {
      setEmail("amit.patel@carcrm.com");
      setPassword("password");
    }
  };

  // 3. Login submit handler using simple Axios
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

      const response = await axios.post(`${apiUrl}/auth/login`, {
        email: email,
        password: password,
      });

      if (response.data && response.data.status) {
        const token = response.data.data.token;
        const user = response.data.data.user;

        localStorage.setItem("auth_token", token);
        localStorage.setItem("user", JSON.stringify(user));

        setSuccessMessage("Login successful! Redirecting to dashboard...");

        setTimeout(() => {
          if (user?.role === "Sales Executive") {
            router.push("/sales-executive/dashboard");
          } else {
            router.push("/admin/dashboard");
          }
        }, 500);
      }
    } catch (error) {
      console.log("Login Error:", error);

      if (error.response && error.response.data && error.response.data.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Server error or invalid credentials. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-split-wrapper">
      {/* ----------------------------------------------------
          LEFT SIDE: Luxury Automotive Hero & Brand Experience
          ---------------------------------------------------- */}
      <div className="login-hero-panel">
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>
        <div className="hero-grid-pattern"></div>

        {/* Brand Header */}
        <div className="hero-brand-header">
          <div className="hero-brand-logo">
            <img src="/image/logo.png" alt="Defence Autolink Logo" />
          </div>
          <div>
            <div className="hero-brand-title">Defence Autolink</div>
            <div className="hero-brand-tag">Dealership CRM Enterprise</div>
          </div>
        </div>

        {/* Hero Main Content */}
        <div className="hero-main-content">
          <div className="hero-badge-pill">
            <i className="bi bi-shield-check text-success"></i>
            <span>Next-Gen Multi-Brand Dealership Management</span>
          </div>
          <h1 className="hero-heading">
            Supercharge Your <span>Dealership Sales</span> & Operations
          </h1>
          <p className="hero-description">
            Complete automotive CRM managing 2-Wheeler and 4-Wheeler leads pipeline, test drives, dynamic quotation sheets, automated follow-ups, and team performance analytics.
          </p>

          {/* Floating Feature / KPI Metrics */}
          <div className="hero-kpi-grid">
            <div className="hero-kpi-card">
              <div className="hero-kpi-icon">
                <i className="bi bi-funnel-fill text-primary"></i>
              </div>
              <div>
                <div className="hero-kpi-val">1,450+</div>
                <div className="hero-kpi-lbl">Monthly Inquiries Handled</div>
              </div>
            </div>

            <div className="hero-kpi-card">
              <div className="hero-kpi-icon">
                <i className="bi bi-graph-up-arrow text-warning"></i>
              </div>
              <div>
                <div className="hero-kpi-val">34.8%</div>
                <div className="hero-kpi-lbl">Pipeline Conversion Rate</div>
              </div>
            </div>

            <div className="hero-kpi-card">
              <div className="hero-kpi-icon">
                <i className="bi bi-car-front-fill text-success"></i>
              </div>
              <div>
                <div className="hero-kpi-val">350+</div>
                <div className="hero-kpi-lbl">2W & 4W Vehicles Listed</div>
              </div>
            </div>

            <div className="hero-kpi-card">
              <div className="hero-kpi-icon">
                <i className="bi bi-people-fill text-info"></i>
              </div>
              <div>
                <div className="hero-kpi-val">28 Reps</div>
                <div className="hero-kpi-lbl">Active Sales Executives</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="hero-footer-note">
          <span>&copy; 2026 Defence Autolink. All rights reserved.</span>
          <span>v3.4.0 Secure Enterprise Portal</span>
        </div>
      </div>

      {/* ----------------------------------------------------
          RIGHT SIDE: Authentication Form Panel
          ---------------------------------------------------- */}
      <div className="login-form-panel">
        <div className="login-form-box">
          <div className="login-form-header">
            <h2 className="login-title">Sign In</h2>
            <p className="login-subtitle">Enter your credentials to access the dealership CRM portal</p>
          </div>

          {/* Quick Demo Preset Buttons */}
          <div className="mb-2">
            <label className="text-muted small fw-semibold mb-1 d-block">Quick Demo Fill:</label>
            <div className="role-pills-wrapper d-flex flex-wrap gap-1">
              <button
                type="button"
                className={`role-pill-btn ${activeRole === "admin" ? "active" : ""}`}
                onClick={() => handleRoleSelect("admin")}
              >
                <i className="bi bi-shield-lock"></i>
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                className={`role-pill-btn ${activeRole === "manager" ? "active" : ""}`}
                onClick={() => handleRoleSelect("manager")}
              >
                <i className="bi bi-person-badge"></i>
                <span>Manager</span>
              </button>
              <button
                type="button"
                className={`role-pill-btn ${activeRole === "executive" ? "active" : ""}`}
                onClick={() => handleRoleSelect("executive")}
              >
                <i className="bi bi-briefcase"></i>
                <span>Sales Exec</span>
              </button>
              <button
                type="button"
                className={`role-pill-btn ${activeRole === "receptionist" ? "active" : ""}`}
                onClick={() => handleRoleSelect("receptionist")}
              >
                <i className="bi bi-door-open"></i>
                <span>Reception</span>
              </button>
              <button
                type="button"
                className={`role-pill-btn ${activeRole === "accountant" ? "active" : ""}`}
                onClick={() => handleRoleSelect("accountant")}
              >
                <i className="bi bi-calculator"></i>
                <span>Accountant</span>
              </button>
            </div>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert Box */}
          {successMessage && (
            <div className="alert alert-success py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill flex-shrink-0"></i>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <div className="custom-input-group">
              <label>Work Email Address</label>
              <div className="input-icon-box">
                <i className="bi bi-envelope input-icon"></i>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@dealership.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="custom-input-group">
              <label>Password</label>
              <div className="input-icon-box">
                <i className="bi bi-lock input-icon"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
                </button>
              </div>
            </div>

            <div className="login-options-row">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="rememberMeCheckbox" defaultChecked />
                <label className="form-check-label text-muted small" htmlFor="rememberMeCheckbox">
                  Remember this device
                </label>
              </div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Please contact your CRM Super Administrator to reset your password.");
                }}
              >
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="btn-login-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to CRM</span>
                  <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <span className="text-muted small">
              Connected API: <code className="text-warning small">POST /api/auth/login</code> • Protected by 256-bit SSL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
