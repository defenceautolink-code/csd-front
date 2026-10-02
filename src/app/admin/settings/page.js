"use client";

import React, { useState } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  // Dealership Profile State
  const [dealershipName, setDealershipName] = useState("Defence Autolink");
  const [gstin, setGstin] = useState("07AAAAA0000A1Z5");
  const [phone, setPhone] = useState("+91 98000 11111");
  const [email, setEmail] = useState("info@defenceautolink.com");
  const [address, setAddress] = useState(
    "Main Ring Road Showroom, South Extension Part-II, New Delhi - 110049"
  );
  const [workingHours, setWorkingHours] = useState("09:30 AM - 08:00 PM (All 7 Days)");

  // Notification switches
  const [smsOnNewLead, setSmsOnNewLead] = useState(true);
  const [waOnTestDrive, setWaOnTestDrive] = useState(true);
  const [emailQuoteAlert, setEmailQuoteAlert] = useState(true);
  const [overdueCallReminder, setOverdueCallReminder] = useState(true);

  // API Config
  const [waApiKey, setWaApiKey] = useState("live_wa_sec_994850239485720194857");
  const [smsSenderId, setSmsSenderId] = useState("DEFALNK");

  const handleSaveSettings = (e) => {
    e.preventDefault();
    showToast("CRM & Dealership settings saved successfully!", "success");
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Breadcrumbs & Header Actions */}
        <div className="page-header-wrapper">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <a href="#">Management</a>
              </li>
              <li className="breadcrumb-item active">Settings</li>
            </ul>
            <h1 className="page-title mt-1">Dealership CRM Preferences & System Settings</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <button className="btn btn-primary" onClick={handleSaveSettings}>
              <i className="bi bi-check-circle-fill me-1"></i>
              <span>Save All Changes</span>
            </button>
          </div>
        </div>

        <div className="row g-4 mb-4">
          {/* Settings Navigation Sidebar */}
          <div className="col-xl-3 col-lg-4">
            <div className="card">
              <div className="card-body p-2">
                <div className="list-group list-group-flush border-0">
                  <button
                    type="button"
                    className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-3 border-0 rounded-2 ${
                      activeTab === "profile" ? "bg-primary text-white" : "bg-transparent text-dark"
                    }`}
                    onClick={() => setActiveTab("profile")}
                  >
                    <i className="bi bi-building"></i>
                    <span>Dealership Profile</span>
                  </button>

                  <button
                    type="button"
                    className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-3 border-0 rounded-2 ${
                      activeTab === "notifications" ? "bg-primary text-white" : "bg-transparent text-dark"
                    }`}
                    onClick={() => setActiveTab("notifications")}
                  >
                    <i className="bi bi-bell"></i>
                    <span>Notification Rules</span>
                  </button>

                  <button
                    type="button"
                    className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-3 border-0 rounded-2 ${
                      activeTab === "whatsapp" ? "bg-primary text-white" : "bg-transparent text-dark"
                    }`}
                    onClick={() => setActiveTab("whatsapp")}
                  >
                    <i className="bi bi-whatsapp"></i>
                    <span>WhatsApp & SMS API</span>
                  </button>

                  <button
                    type="button"
                    className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-3 border-0 rounded-2 ${
                      activeTab === "security" ? "bg-primary text-white" : "bg-transparent text-dark"
                    }`}
                    onClick={() => setActiveTab("security")}
                  >
                    <i className="bi bi-shield-lock"></i>
                    <span>Security & Access Roles</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Tab Content */}
          <div className="col-xl-9 col-lg-8">
            {/* 1. Dealership Profile Tab */}
            {activeTab === "profile" && (
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-1">Dealership Business Information</h5>
                  <p className="text-muted small mb-0">Appears on quotations, customer invoices and headers</p>
                </div>

                <div className="card-body">
                  <form onSubmit={handleSaveSettings}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label text-dark fw-semibold small">Dealership Trade Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={dealershipName}
                          onChange={(e) => setDealershipName(e.target.value)}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label text-dark fw-semibold small">GSTIN Registration Number</label>
                        <input
                          type="text"
                          className="form-control font-monospace"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value)}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label text-dark fw-semibold small">Official Hotline Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label text-dark fw-semibold small">Support & Inquiries Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label text-dark fw-semibold small">Main Showroom Physical Address</label>
                        <input
                          type="text"
                          className="form-control"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label text-dark fw-semibold small">Showroom Operating Hours</label>
                        <input
                          type="text"
                          className="form-control"
                          value={workingHours}
                          onChange={(e) => setWorkingHours(e.target.value)}
                        />
                      </div>

                      <div className="col-12 mt-4">
                        <button type="submit" className="btn btn-primary px-4">
                          <i className="bi bi-check-circle me-1"></i> Save Dealership Profile
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 2. Notification Rules Tab */}
            {activeTab === "notifications" && (
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-1">Automated Notification Rules</h5>
                  <p className="text-muted small mb-0">Configure instant alerts sent to reps and customers</p>
                </div>

                <div className="card-body">
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between align-items-center p-3 rounded-2 dark-selection-box" style={{ background: "#181a1b", border: "1px solid var(--border-color)", color: "#FFFFFF" }}>
                      <div>
                        <h6 className="fw-bold mb-0" style={{ color: "#FFFFFF" }}>Instant SMS Alert on New Lead</h6>
                        <span className="small" style={{ color: "#94A3B8" }}>Notify sales executive when a fresh inquiry is received</span>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={smsOnNewLead}
                          onChange={(e) => setSmsOnNewLead(e.target.checked)}
                          style={{ cursor: "pointer", width: "42px", height: "22px" }}
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center p-3 rounded-2 dark-selection-box" style={{ background: "#181a1b", border: "1px solid var(--border-color)", color: "#FFFFFF" }}>
                      <div>
                        <h6 className="fw-bold mb-0" style={{ color: "#FFFFFF" }}>WhatsApp Test Drive Confirmation</h6>
                        <span className="small" style={{ color: "#94A3B8" }}>Send automated booking confirmation & location map to customer</span>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={waOnTestDrive}
                          onChange={(e) => setWaOnTestDrive(e.target.checked)}
                          style={{ cursor: "pointer", width: "42px", height: "22px" }}
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center p-3 rounded-2 dark-selection-box" style={{ background: "#181a1b", border: "1px solid var(--border-color)", color: "#FFFFFF" }}>
                      <div>
                        <h6 className="fw-bold mb-0" style={{ color: "#FFFFFF" }}>Official Quotation Copy to Sales Director</h6>
                        <span className="small" style={{ color: "#94A3B8" }}>Email audit copy of generated quotation sheets</span>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={emailQuoteAlert}
                          onChange={(e) => setEmailQuoteAlert(e.target.checked)}
                          style={{ cursor: "pointer", width: "42px", height: "22px" }}
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center p-3 rounded-2 dark-selection-box" style={{ background: "#181a1b", border: "1px solid var(--border-color)", color: "#FFFFFF" }}>
                      <div>
                        <h6 className="fw-bold mb-0" style={{ color: "#FFFFFF" }}>Overdue Follow-Up Call Escalations</h6>
                        <span className="small" style={{ color: "#94A3B8" }}>Send reminder to sales manager if lead has no update in 48 hours</span>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={overdueCallReminder}
                          onChange={(e) => setOverdueCallReminder(e.target.checked)}
                          style={{ cursor: "pointer", width: "42px", height: "22px" }}
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <button type="button" className="btn btn-primary px-4" onClick={handleSaveSettings}>
                        <i className="bi bi-check-circle me-1"></i> Update Notification Rules
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. WhatsApp & SMS API Tab */}
            {activeTab === "whatsapp" && (
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-1">WhatsApp Cloud API & SMS Gateway</h5>
                  <p className="text-muted small mb-0">Connect official WhatsApp Business API credentials</p>
                </div>

                <div className="card-body">
                  <form onSubmit={handleSaveSettings}>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label text-dark fw-semibold small">WhatsApp Business API Token</label>
                        <input
                          type="password"
                          className="form-control font-monospace"
                          value={waApiKey}
                          onChange={(e) => setWaApiKey(e.target.value)}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label text-dark fw-semibold small">SMS DLT Header / Sender ID</label>
                        <input
                          type="text"
                          className="form-control font-monospace"
                          value={smsSenderId}
                          onChange={(e) => setSmsSenderId(e.target.value)}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label text-dark fw-semibold small">API Gateway Status</label>
                        <div className="p-2 rounded-2 d-flex align-items-center gap-2" style={{ background: "#181a1b", border: "1px solid var(--border-color)" }}>
                          <span style={{ width: "10px", height: "10px", background: "#22c55e", borderRadius: "50%" }}></span>
                          <span className="text-success fw-bold small">Connected & Active</span>
                        </div>
                      </div>

                      <div className="col-12 mt-4">
                        <button type="submit" className="btn btn-primary px-4">
                          <i className="bi bi-check-circle me-1"></i> Save API Configuration
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 4. Security & Access Roles Tab */}
            {activeTab === "security" && (
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-1 text-dark">Security & Session Management</h5>
                  <p className="text-muted small mb-0">Two-factor auth and CRM login permissions</p>
                </div>

                <div className="card-body">
                  <div className="d-flex flex-column gap-3">
                    <div className="p-3 rounded-2 dark-selection-box" style={{ background: "#181a1b", border: "1px solid var(--border-color)", color: "#FFFFFF" }}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0" style={{ color: "#FFFFFF" }}>Two-Factor Authentication (2FA)</h6>
                        <span className="badge bg-success-subtle text-success">Enabled for Admins</span>
                      </div>
                      <span className="small" style={{ color: "#94A3B8" }}>Requires OTP verification when logging in from new devices.</span>
                    </div>

                    <div className="p-3 rounded-2 dark-selection-box" style={{ background: "#181a1b", border: "1px solid var(--border-color)", color: "#FFFFFF" }}>
                      <h6 className="fw-bold mb-1" style={{ color: "#FFFFFF" }}>Session Inactivity Timeout</h6>
                      <select className="form-select form-select-sm mt-2" style={{ maxWidth: "200px" }}>
                        <option value="30">30 Minutes</option>
                        <option value="60">1 Hour</option>
                        <option value="120">2 Hours</option>
                        <option value="480">8 Hours (Full Shift)</option>
                      </select>
                    </div>

                    <div className="mt-3">
                      <button type="button" className="btn btn-primary px-4" onClick={handleSaveSettings}>
                        <i className="bi bi-shield-check me-1"></i> Update Security Policy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
