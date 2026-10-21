"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { getRoleDashboardPath, setAuthSession } from "@/utils/auth";

export default function LoginPage() {
  const router = useRouter();

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [splashStep, setSplashStep] = useState("Initializing encrypted handshake...");

  // Form State
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeRole, setActiveRole] = useState("backend");
  const [activeTab, setActiveTab] = useState("leads");
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [greeting, setGreeting] = useState("Good Day");

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // Dynamic Greeting & Clock & Expired Check
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good Morning");
    } else if (hour < 17) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("expired") === "1") {
        setErrorMessage("Your session has expired after 24 hours. Please log in again to continue.");
      } else if (params.get("terminated") === "1") {
        setErrorMessage("Your session has ended or your account is no longer active. Please log in again.");
      }
    }
  }, []);

  // Splash Screen Timer & Progress Simulation
  useEffect(() => {
    if (!showSplash) return;

    const steps = [
      { p: 25, label: "Establishing secure SSL connection..." },
      { p: 55, label: "Loading Dealership 2W & 4W Inventory..." },
      { p: 85, label: "Synchronizing real-time lead pipelines..." },
      { p: 100, label: "Terminal Ready." },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setSplashProgress(steps[currentStep].p);
        setSplashStep(steps[currentStep].label);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setShowSplash(false);
        }, 350);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [showSplash]);

  // Quick Demo Role Preset Handler
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
      setEmail("rahul.verma@carcrm.com");
      setPassword("password");
    } else if (role === "receptionist") {
      setEmail("pooja.iyer@carcrm.com");
      setPassword("password");
    } else if (role === "accountant") {
      setEmail("amit.patel@carcrm.com");
      setPassword("password");
    }
  };

  // Caps Lock Key Detection
  const handleKeyDown = (e) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setIsCapsLockOn(true);
    } else {
      setIsCapsLockOn(false);
    }
  };

  // Login Submit Handler
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

        setAuthSession(token, user);

        setSuccessMessage("Authentication verified! Launching workspace...");

        setTimeout(() => {
          const targetUrl = getRoleDashboardPath(user?.role);
          router.push(targetUrl);
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

  // Forgot Password Handler
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError("Please enter your registered email address.");
      return;
    }

    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      const response = await axios.post(`${apiUrl}/auth/forgot-password`, {
        email: forgotEmail.trim(),
      });

      if (response.data && response.data.status) {
        setForgotSuccess(
          response.data.message || "Password reset link has been sent to your email!"
        );
      }
    } catch (error) {
      console.log("Forgot Password Error:", error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.errors?.email?.[0] ||
        "Failed to send password reset email. Please try again.";
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-split-wrapper">
      {/* ----------------------------------------------------
          SPLASH INTRO OVERLAY
          ---------------------------------------------------- */}
      {showSplash && (
        <div className="splash-overlay">
          <div className="splash-ambient-glow-1"></div>
          <div className="splash-ambient-glow-2"></div>
          <div className="splash-grid-mesh"></div>

          <div className="splash-content">
            <div className="splash-logo-container">
              <div className="splash-logo-ring"></div>
              <div className="splash-logo-glow"></div>
              <div className="splash-logo-box">
                <img src="/image/logo.png" alt="Defence Autolink Emblem" />
              </div>
            </div>

            <h1 className="splash-brand-name">
              Defence <span>Autolink</span>
            </h1>
            <p className="splash-brand-tagline">
              Automotive Dealership CRM Enterprise • 2W & 4W
            </p>

            <div className="splash-progress-wrapper">
              <div className="splash-progress-info">
                <span>{splashStep}</span>
                <span>{splashProgress}%</span>
              </div>
              <div className="splash-progress-track">
                <div
                  className="splash-progress-fill"
                  style={{ width: `${splashProgress}%` }}
                ></div>
              </div>
            </div>

            <button
              type="button"
              className="splash-btn-skip"
              onClick={() => setShowSplash(false)}
            >
              <span>Skip to Login</span>
              <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          LEFT SIDE: Luxury Automotive Hero & Showcase
          ---------------------------------------------------- */}
      <div className="login-hero-panel">
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>
        <div className="hero-glow-3"></div>
        <div className="hero-grid-pattern"></div>

        {/* Brand Header */}
        <div className="hero-brand-header">
          <div className="hero-brand-left">
            <div className="hero-brand-logo">
              <img src="/image/logo.png" alt="Defence Autolink Logo" />
            </div>
            <div>
              <div className="hero-brand-title">Defence Autolink</div>
              <div className="hero-brand-tag">Dealership CRM Enterprise</div>
            </div>
          </div>
          <div className="hero-status-pill">
            <span className="hero-status-dot"></span>
            <span>Cloud Sync Active</span>
          </div>
        </div>

        {/* Hero Main Content */}
        <div className="hero-main-content">
          <div className="hero-badge-pill">
            <i className="bi bi-shield-check text-success"></i>
            <span>Next-Gen Multi-Brand Dealership Management</span>
          </div>

          <h1 className="hero-heading">
            Supercharge Your <span>Dealership Velocity</span> & Sales
          </h1>
          <p className="hero-description">
            Complete luxury automotive CRM managing 2-Wheeler and 4-Wheeler leads pipeline, test drives, dynamic quotation sheets, automated follow-ups, and team performance analytics.
          </p>

          {/* Interactive Feature Tabs */}
          <div className="hero-feature-tabs">
            <button
              type="button"
              className={`hero-feature-tab ${activeTab === "leads" ? "active" : ""}`}
              onClick={() => setActiveTab("leads")}
            >
              <i className="bi bi-funnel-fill"></i>
              <span>Lead Velocity</span>
            </button>
            <button
              type="button"
              className={`hero-feature-tab ${activeTab === "fleet" ? "active" : ""}`}
              onClick={() => setActiveTab("fleet")}
            >
              <i className="bi bi-car-front-fill"></i>
              <span>Fleet Inventory</span>
            </button>
            <button
              type="button"
              className={`hero-feature-tab ${activeTab === "quotes" ? "active" : ""}`}
              onClick={() => setActiveTab("quotes")}
            >
              <i className="bi bi-file-earmark-text-fill"></i>
              <span>Smart Quotes</span>
            </button>
          </div>

          {/* Feature Highlight Card */}
          <div className="hero-feature-card">
            <div className="hero-feature-icon">
              {activeTab === "leads" && <i className="bi bi-lightning-charge-fill"></i>}
              {activeTab === "fleet" && <i className="bi bi-shield-shaded"></i>}
              {activeTab === "quotes" && <i className="bi bi-calculator-fill"></i>}
            </div>
            <div>
              <div className="hero-feature-title">
                {activeTab === "leads" && "AI-Driven Pipeline & WhatsApp Automation"}
                {activeTab === "fleet" && "Real-Time 2W & 4W Multi-Location Stock Tracking"}
                {activeTab === "quotes" && "Instant On-Road Pricing, RTO & EMI Matrix"}
              </div>
              <p className="hero-feature-desc">
                {activeTab === "leads" && "Auto-assign inquiries instantly to sales reps, set SLA escalation timers, and trigger automated WhatsApp follow-ups."}
                {activeTab === "fleet" && "Manage variant specifications, live showroom availability, booking status, and automated test-drive scheduling."}
                {activeTab === "quotes" && "Generate PDF quotation sheets with dynamic state taxes, custom accessories, insurance breakdowns, and director approvals."}
              </p>
            </div>
          </div>

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

          {/* Live Activity Ticker */}
          <div className="hero-ticker-box">
            <span className="hero-ticker-badge">LIVE TICKER</span>
            <span className="hero-ticker-text">
              🚗 New Test Drive booked: Mercedes-Benz E-Class • 2 mins ago • Assigned to Rajesh Kumar
            </span>
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
            <div className="login-greeting-badge">
              <i className="bi bi-sun-fill text-warning"></i>
              <span>{greeting}, Team</span>
            </div>
            <h2 className="login-title">Sign In to Terminal</h2>
            <p className="login-subtitle">
              Enter your credentials to access the dealership CRM workspace
            </p>
          </div>

          {/* Quick Demo Preset Buttons */}
          <div className="mb-2">
            <label className="text-muted small fw-semibold mb-1 d-block">
              Quick Demo Fill:
            </label>
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
              <div className="custom-input-header">
                <label>Work Email Address</label>
              </div>
              <div className="input-icon-box">
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@dealership.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <i className="bi bi-envelope input-icon"></i>
              </div>
            </div>

            <div className="custom-input-group">
              <div className="custom-input-header">
                <label>Password</label>
              </div>
              <div className="input-icon-box">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyDown}
                />
                <i className="bi bi-lock input-icon"></i>
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
                </button>
              </div>
              {isCapsLockOn && (
                <div className="caps-lock-warning">
                  <i className="bi bi-capslock-fill"></i>
                  <span>Caps Lock is ON</span>
                </div>
              )}
            </div>

            <div className="login-options-row">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="rememberMeCheckbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="form-check-label text-muted small" htmlFor="rememberMeCheckbox">
                  Remember this device
                </label>
              </div>

              <button
                type="button"
                className="btn-forgot-password-link"
                onClick={() => {
                  setForgotEmail(email || "");
                  setForgotError("");
                  setForgotSuccess("");
                  setShowForgotModal(true);
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="btn-login-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to CRM</span>
                  <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          {/* Security Badges & Splash Replay */}
          <div className="login-footer-security">
            <div className="security-badges-list">
              <span className="security-badge-item">
                <i className="bi bi-shield-lock-fill text-success"></i>
                <span>256-Bit SSL</span>
              </span>
              <span className="security-badge-item">
                <i className="bi bi-check2-circle text-info"></i>
                <span>ISO 27001</span>
              </span>
              <span className="security-badge-item">
                <i className="bi bi-cpu-fill text-warning"></i>
                <span>Live Auth API</span>
              </span>
            </div>

            <button
              type="button"
              className="btn-replay-splash"
              onClick={() => {
                setSplashProgress(0);
                setShowSplash(true);
              }}
            >
              <i className="bi bi-play-circle-fill"></i>
              <span>Replay Splash Intro</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          FORGOT PASSWORD POPUP MODAL
          ---------------------------------------------------- */}
      {showForgotModal && (
        <div
          className="forgot-modal-backdrop"
          onClick={() => !forgotLoading && setShowForgotModal(false)}
        >
          <div className="forgot-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="forgot-modal-header">
              <div className="forgot-modal-icon-badge">
                <i className="bi bi-shield-lock-fill"></i>
              </div>
              <button
                type="button"
                className="forgot-modal-close"
                onClick={() => !forgotLoading && setShowForgotModal(false)}
                disabled={forgotLoading}
                aria-label="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="forgot-modal-body">
              <h3 className="forgot-modal-title">Reset Your Password</h3>
              <p className="forgot-modal-desc">
                Enter your registered work email address. We will send a secure password reset link valid for <strong>4 minutes</strong>.
              </p>

              {/* Error Alert Box */}
              {forgotError && (
                <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
                  <span>{forgotError}</span>
                </div>
              )}

              {/* Success Result View */}
              {forgotSuccess ? (
                <div className="forgot-success-box">
                  <div className="forgot-success-icon">
                    <i className="bi bi-check-circle-fill"></i>
                  </div>
                  <h4 className="forgot-success-title">Email Sent Successfully!</h4>
                  <p className="forgot-success-text">
                    A password reset link has been dispatched to <strong>{forgotEmail}</strong>.
                  </p>
                  <div className="forgot-success-notice">
                    <i className="bi bi-clock-history"></i>
                    <span>Please check your inbox & spam folder. The link will expire in <strong>4 minutes</strong>.</span>
                  </div>
                  <button
                    type="button"
                    className="btn-login-submit mt-3"
                    onClick={() => setShowForgotModal(false)}
                  >
                    <span>Done / Back to Login</span>
                    <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword}>
                  <div className="custom-input-group mb-3">
                    <div className="custom-input-header">
                      <label>Work Email Address</label>
                    </div>
                    <div className="input-icon-box">
                      <input
                        type="email"
                        className="form-control"
                        placeholder="name@dealership.com"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={forgotLoading}
                        autoFocus
                      />
                      <i className="bi bi-envelope input-icon"></i>
                    </div>
                  </div>

                  <div className="d-flex gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-light flex-grow-1 py-2 fw-semibold border"
                      onClick={() => setShowForgotModal(false)}
                      disabled={forgotLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-login-submit flex-grow-1"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          <span>Sending Link...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Reset Link</span>
                          <i className="bi bi-send-fill"></i>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


