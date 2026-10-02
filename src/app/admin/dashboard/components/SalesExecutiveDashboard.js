"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useToast } from "@/app/components/Toast";

export default function SalesExecutiveDashboard({ onAddLead }) {
  const { showToast } = useToast();

  // Modals state
  const [showInternalAddLead, setShowInternalAddLead] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedCallLead, setSelectedCallLead] = useState(null);
  const [callOutcome, setCallOutcome] = useState("Connected - Interested");
  const [callNotes, setCallNotes] = useState("");

  // Customer form state
  const [custForm, setCustForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    interestedModel: "Creta Automatic",
  });

  // Today's Follow-up state
  const [followups, setFollowups] = useState([
    {
      id: 1,
      name: "Rajesh Patel",
      model: "Hyundai Creta Automatic",
      time: "10:30 AM",
      lastContact: "Yesterday",
      phone: "+91 98231 44520",
    },
    {
      id: 2,
      name: "Priya Menon",
      model: "Tata Safari Adventure AT",
      time: "02:00 PM",
      lastContact: "2 days ago",
      phone: "+91 97410 88231",
    },
  ]);

  // Active Requirements
  const [requirements] = useState([
    {
      id: 1,
      name: "Anita Sharma",
      model: "Venue SX Opt",
      priority: "HOT",
      badgeClass: "bg-danger-subtle text-danger",
    },
    {
      id: 2,
      name: "Vikram Singh",
      model: "i20 Asta",
      priority: "WARM",
      badgeClass: "bg-secondary-subtle text-secondary",
    },
    {
      id: 3,
      name: "Deepak Verma",
      model: "Grand Vitara Alpha",
      priority: "HOT",
      badgeClass: "bg-danger-subtle text-danger",
    },
  ]);

  // Active Negotiations
  const [negotiations] = useState([
    {
      id: 1,
      name: "Sunil Kumar",
      amount: "₹12.5L",
      detail: "Verna SX(O) • Exchange Pending",
      progress: 72,
    },
    {
      id: 2,
      name: "Meera Joshi",
      amount: "₹18.2L",
      detail: "Creta SX(O) Turbo • Loan Sanctioned",
      progress: 88,
    },
  ]);

  // Recent Quotations
  const [quotations] = useState([
    {
      id: 1,
      name: "Priya Patel",
      model: "Creta EX",
      time: "2h ago",
    },
    {
      id: 2,
      name: "Rahul Mehra",
      model: "Thar Roxx AX7L",
      time: "4h ago",
    },
    {
      id: 3,
      name: "Sneha Kapoor",
      model: "Scorpio N Z8L",
      time: "Yesterday",
    },
  ]);

  // Recent Bookings
  const [bookings] = useState([
    {
      id: 1,
      name: "Amit Desai",
      model: "Alcazar Signature",
      status: "Conf",
    },
    {
      id: 2,
      name: "Sunita Rao",
      model: "Grand Vitara Strong Hybrid",
      status: "Conf",
    },
  ]);

  // WhatsApp click handler
  const handleWhatsApp = (lead) => {
    showToast(`Launching WhatsApp chat with ${lead.name} (${lead.phone})...`, "success");
    const text = encodeURIComponent(
      `Hello ${lead.name}, thank you for inquiring about ${lead.model}. I am your dedicated relationship manager at Defence Autolink.`
    );
    window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  // Call button handler
  const handleOpenCallModal = (lead) => {
    setSelectedCallLead(lead);
    setCallOutcome("Connected - Interested");
    setCallNotes("");
    setShowCallModal(true);
  };

  const handleSaveCallNote = (e) => {
    e.preventDefault();
    if (!selectedCallLead) return;
    showToast(`Call logged for ${selectedCallLead.name}: "${callOutcome}"`, "success");
    setShowCallModal(false);
  };

  const handleSaveCustomer = (e) => {
    e.preventDefault();
    showToast(`Customer ${custForm.name} registered successfully!`, "success");
    setShowAddCustomerModal(false);
    setCustForm({
      name: "",
      phone: "",
      email: "",
      city: "",
      interestedModel: "Creta Automatic",
    });
  };

  const handleTriggerAddLead = () => {
    if (onAddLead) {
      onAddLead();
    } else {
      setShowInternalAddLead(true);
    }
  };

  return (
    <div className="container-fluid px-0 pb-5">
      {/* ----------------------------------------------------
          1. HEADER AREA: Title, Subtitle
          ---------------------------------------------------- */}
      <div className="mb-4">
        <h1
          className="fw-bolder mb-1 text-dark"
          style={{ fontSize: "1.75rem", letterSpacing: "-0.5px" }}
        >
          Good Morning, Rahul
        </h1>
        <p className="text-secondary small mb-0">Sales Executive • 25 Aug</p>
      </div>

      {/* ----------------------------------------------------
          2. TOP 4 STAT CARDS (4 cols on desktop, 2x2 on mobile)
          ---------------------------------------------------- */}
      <div className="row g-3 mb-4">
        {/* Card 1: NEW LEADS */}
        <div className="col-6 col-lg-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm position-relative overflow-hidden text-center text-sm-start">
            <div className="mb-2">
              <i className="bi bi-person-plus text-dark fs-4"></i>
            </div>
            <div className="fw-bolder text-dark mb-1" style={{ fontSize: "2.1rem", lineHeight: "1" }}>
              12
            </div>
            <div
              className="text-muted fw-bold text-uppercase small"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
            >
              NEW LEADS
            </div>
          </div>
        </div>

        {/* Card 2: ACTIVE LEADS (with subtle olive green accent) */}
        <div className="col-6 col-lg-3">
          <div
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm position-relative overflow-hidden text-center text-sm-start"
            style={{ borderColor: "rgba(88, 99, 42, 0.25)" }}
          >
            {/* Top-Right Accent Tint */}
            <div
              className="position-absolute top-0 end-0"
              style={{
                width: "48px",
                height: "48px",
                backgroundColor: "#F4F8E8",
                borderBottomLeftRadius: "24px",
              }}
            ></div>

            <div className="mb-2 position-relative">
              <i className="bi bi-graph-up-arrow fs-4" style={{ color: "#4D5D25" }}></i>
            </div>
            <div
              className="fw-bolder mb-1 position-relative"
              style={{ fontSize: "2.1rem", lineHeight: "1", color: "#4D5D25" }}
            >
              28
            </div>
            <div
              className="fw-bold text-uppercase small position-relative"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px", color: "#4D5D25" }}
            >
              ACTIVE LEADS
            </div>
          </div>
        </div>

        {/* Card 3: FOLLOW-UPS */}
        <div className="col-6 col-lg-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-center text-sm-start">
            <div className="mb-2">
              <i className="bi bi-clock-history text-muted fs-4"></i>
            </div>
            <div className="fw-bolder text-dark mb-1" style={{ fontSize: "2.1rem", lineHeight: "1" }}>
              7
            </div>
            <div
              className="text-muted fw-bold text-uppercase small"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
            >
              FOLLOW-UPS
            </div>
          </div>
        </div>

        {/* Card 4: REQUIREMENTS */}
        <div className="col-6 col-lg-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-center text-sm-start">
            <div className="mb-2">
              <i className="bi bi-card-checklist text-muted fs-4"></i>
            </div>
            <div className="fw-bolder text-dark mb-1" style={{ fontSize: "2.1rem", lineHeight: "1" }}>
              15
            </div>
            <div
              className="text-muted fw-bold text-uppercase small"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
            >
              REQUIREMENTS
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          3. MAIN CONTENT: 2 COLUMNS ON DESKTOP, 1 COLUMN ON MOBILE
          ---------------------------------------------------- */}
      <div className="row g-4">
        {/* Left Column (Desktop: col-lg-7, col-xl-8) */}
        <div className="col-12 col-lg-7 col-xl-8">
          {/* SECTION: TODAY'S FOLLOW-UPS */}
          <div className="mb-4">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
            >
              TODAY&apos;S FOLLOW-UPS
            </div>

            {followups.map((lead, idx) => (
              <div
                key={lead.id}
                className={`card border rounded-4 p-3 bg-white shadow-sm ${
                  idx < followups.length - 1 ? "mb-3" : ""
                }`}
              >
                <div className="d-flex align-items-start justify-content-between mb-1">
                  <div>
                    <h5 className="fw-bold text-dark mb-0 fs-6">{lead.name}</h5>
                    <span className="text-secondary small">{lead.model}</span>
                  </div>
                  {/* Time Badge (Light Salmon / Pink) */}
                  <span
                    className="badge fw-bold px-2 py-1 rounded-2"
                    style={{
                      backgroundColor: "#FEE2E2",
                      color: "#DC2626",
                      fontSize: "0.75rem",
                    }}
                  >
                    {lead.time}
                  </span>
                </div>

                {/* Last Contact */}
                <div className="d-flex align-items-center gap-1 text-muted small mt-2 mb-3" style={{ fontSize: "0.78rem" }}>
                  <i className="bi bi-clock-history"></i>
                  <span>Last contact: {lead.lastContact}</span>
                </div>

                {/* Action Buttons */}
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn flex-fill d-inline-flex align-items-center justify-content-center gap-2 py-2 fw-semibold shadow-sm"
                    style={{
                      backgroundColor: "#4D5D25",
                      color: "#ffffff",
                      borderRadius: "10px",
                      fontSize: "0.88rem",
                      border: "none",
                    }}
                    onClick={() => handleOpenCallModal(lead)}
                  >
                    <i className="bi bi-telephone-fill"></i>
                    <span>Call</span>
                  </button>

                  <button
                    type="button"
                    className="btn flex-fill d-inline-flex align-items-center justify-content-center gap-2 py-2 fw-semibold shadow-sm bg-white"
                    style={{
                      borderColor: "#4D5D25",
                      color: "#4D5D25",
                      borderRadius: "10px",
                      fontSize: "0.88rem",
                    }}
                    onClick={() => handleWhatsApp(lead)}
                  >
                    <i className="bi bi-whatsapp"></i>
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* SECTION: MY SALES PIPELINE */}
          <div className="mb-4">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
            >
              MY SALES PIPELINE
            </div>
            <div className="row g-3">
              <div className="col-6 col-sm-6 col-md-3">
                <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
                  <div
                    className="text-muted fw-bold text-uppercase small mb-2"
                    style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
                  >
                    DISCOVERY
                  </div>
                  <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
                    18
                  </div>
                </div>
              </div>

              <div className="col-6 col-sm-6 col-md-3">
                <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
                  <div
                    className="text-muted fw-bold text-uppercase small mb-2"
                    style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
                  >
                    NEGOTIATION
                  </div>
                  <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
                    5
                  </div>
                </div>
              </div>

              {/* Enhanced Desktop Pipeline stages */}
              <div className="col-6 col-sm-6 col-md-3">
                <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
                  <div
                    className="text-muted fw-bold text-uppercase small mb-2"
                    style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
                  >
                    TEST DRIVE
                  </div>
                  <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
                    8
                  </div>
                </div>
              </div>

              <div className="col-6 col-sm-6 col-md-3">
                <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
                  <div
                    className="text-muted fw-bold text-uppercase small mb-2"
                    style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
                  >
                    WON / BOOKED
                  </div>
                  <div className="fw-bolder" style={{ fontSize: "1.9rem", lineHeight: "1", color: "#4D5D25" }}>
                    12
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: ACTIVE REQUIREMENTS */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
              >
                ACTIVE REQUIREMENTS
              </span>
              <Link
                href="/sales-executive/leads"
                className="text-decoration-none text-muted fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ fontSize: "0.78rem" }}
              >
                <span>View All</span>
                <i className="bi bi-chevron-right fs-8"></i>
              </Link>
            </div>

            <div className="d-flex flex-column gap-2">
              {requirements.map((req) => (
                <div
                  key={req.id}
                  className="card border rounded-4 p-3 bg-white shadow-sm d-flex flex-row align-items-center justify-content-between"
                >
                  <div>
                    <h6 className="fw-bold text-dark mb-0 small">{req.name}</h6>
                    <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                      {req.model}
                    </span>
                  </div>
                  <span className={`badge ${req.badgeClass} rounded-1 px-2 py-1 fw-bold`} style={{ fontSize: "0.7rem" }}>
                    {req.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: ACTIVE NEGOTIATIONS */}
          <div className="mb-4">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
            >
              ACTIVE NEGOTIATIONS
            </div>

            <div className="d-flex flex-column gap-3">
              {negotiations.map((neg) => (
                <div key={neg.id} className="card border rounded-4 p-3 bg-white shadow-sm">
                  <div className="d-flex align-items-start justify-content-between mb-1">
                    <h6 className="fw-bold text-dark mb-0 small">{neg.name}</h6>
                    <span className="fw-bolder text-dark" style={{ fontSize: "1.05rem" }}>
                      {neg.amount}
                    </span>
                  </div>
                  <span className="text-secondary small mb-2 d-block" style={{ fontSize: "0.78rem" }}>
                    {neg.detail}
                  </span>
                  {/* Progress Bar with Olive Green fill */}
                  <div
                    className="w-100 rounded-pill"
                    style={{ height: "6px", backgroundColor: "#E5E7EB", overflow: "hidden" }}
                  >
                    <div
                      className="h-100 rounded-pill"
                      style={{
                        width: `${neg.progress}%`,
                        backgroundColor: "#4D5D25",
                        transition: "width 0.6s ease",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Desktop: col-lg-5, col-xl-4) */}
        <div className="col-12 col-lg-5 col-xl-4">
          {/* SECTION: QUICK ACTIONS */}
          <div className="mb-4">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
            >
              QUICK ACTIONS
            </div>
            <div className="row g-2">
              {/* + LEAD */}
              <div className="col-4">
                <button
                  type="button"
                  className="btn w-100 h-100 card border rounded-4 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2"
                  onClick={handleTriggerAddLead}
                  style={{ minHeight: "90px" }}
                >
                  <i className="bi bi-plus-circle fs-4 text-dark"></i>
                  <span className="fw-bold text-dark text-uppercase small" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
                    + LEAD
                  </span>
                </button>
              </div>

              {/* + CUST */}
              <div className="col-4">
                <button
                  type="button"
                  className="btn w-100 h-100 card border rounded-4 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2"
                  onClick={() => setShowAddCustomerModal(true)}
                  style={{ minHeight: "90px" }}
                >
                  <i className="bi bi-person-plus fs-4 text-dark"></i>
                  <span className="fw-bold text-dark text-uppercase small" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
                    + CUST
                  </span>
                </button>
              </div>

              {/* QUOTE */}
              <div className="col-4">
                <Link
                  href="/admin/quotation/create"
                  className="btn w-100 h-100 card border rounded-4 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "90px" }}
                >
                  <i className="bi bi-file-earmark-text fs-4 text-dark"></i>
                  <span className="fw-bold text-dark text-uppercase small" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
                    QUOTE
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* SECTION: RECENT QUOTATIONS */}
          <div className="mb-4">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
            >
              RECENT QUOTATIONS
            </div>
            <div className="d-flex flex-column gap-2">
              {quotations.map((q) => (
                <div
                  key={q.id}
                  className="card border rounded-4 p-3 bg-white shadow-sm d-flex flex-row align-items-center justify-content-between"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{ width: "40px", height: "40px", backgroundColor: "#F1F5F9", color: "#334155" }}
                    >
                      <i className="bi bi-file-earmark-text fs-5"></i>
                    </div>
                    <div>
                      <h6 className="fw-bold text-dark mb-0 small">{q.name}</h6>
                      <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                        {q.model}
                      </span>
                    </div>
                  </div>
                  <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                    {q.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: RECENT BOOKINGS */}
          <div className="mb-4">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
            >
              RECENT BOOKINGS
            </div>
            <div className="d-flex flex-column gap-2">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="card border rounded-4 p-3 bg-white shadow-sm d-flex flex-row align-items-center justify-content-between position-relative overflow-hidden"
                  style={{ borderLeft: "4px solid #4D5D25" }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle"
                      style={{ width: "38px", height: "38px", backgroundColor: "#ECFDF5", color: "#16A34A" }}
                    >
                      <i className="bi bi-patch-check-fill fs-5"></i>
                    </div>
                    <div>
                      <h6 className="fw-bold text-dark mb-0 small">{b.name}</h6>
                      <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                        {b.model}
                      </span>
                    </div>
                  </div>
                  <span className="fw-bold text-dark small" style={{ letterSpacing: "0.5px" }}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          4. MODALS (Quick Add Lead, Add Cust, Call Log)
          ---------------------------------------------------- */}
      {/* Call Log Modal */}
      {showCallModal && selectedCallLead && (
        <div className="modal-backdrop-custom" onClick={() => setShowCallModal(false)}>
          <div className="modal-dialog-custom modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom" style={{ backgroundColor: "#4D5D25", color: "#fff" }}>
              <h5 className="modal-title-custom text-white mb-0 fs-6">
                <i className="bi bi-telephone-outbound-fill me-2"></i>
                Call Interaction: {selectedCallLead.name}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowCallModal(false)}
              ></button>
            </div>

            <form onSubmit={handleSaveCallNote}>
              <div className="modal-body-custom">
                <div className="p-3 rounded-3 mb-3" style={{ background: "#F8F9FA", border: "1px solid #E5E7EB" }}>
                  <div className="fw-bold text-dark">{selectedCallLead.name}</div>
                  <div className="text-muted small">
                    {selectedCallLead.phone} • {selectedCallLead.model}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Call Outcome</label>
                  <select
                    className="form-select"
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value)}
                  >
                    <option value="Connected - Interested">Connected - Highly Interested</option>
                    <option value="Connected - Quotation Requested">Connected - Quotation Requested</option>
                    <option value="Connected - Scheduled Test Drive">Connected - Scheduled Test Drive</option>
                    <option value="Call Back Later">Call Back Later / Busy</option>
                    <option value="Ringing No Answer">Ringing No Answer</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Discussion Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Enter key customer points, model variant preferences, loan requirements..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-light border px-3"
                  onClick={() => setShowCallModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white px-4 fw-semibold"
                  style={{ backgroundColor: "#4D5D25" }}
                >
                  Save Call Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowAddCustomerModal(false)}>
          <div className="modal-dialog-custom modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom" style={{ backgroundColor: "#4D5D25", color: "#fff" }}>
              <h5 className="modal-title-custom text-white mb-0 fs-6">
                <i className="bi bi-person-plus-fill me-2"></i> Add New Customer
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowAddCustomerModal(false)}
              ></button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div className="modal-body-custom">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Customer Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ramesh Chandra"
                      required
                      value={custForm.name}
                      onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Phone Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+91 98765 43210"
                      required
                      value={custForm.phone}
                      onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="customer@email.com"
                      value={custForm.email}
                      onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">City / Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Mumbai, Pune"
                      value={custForm.city}
                      onChange={(e) => setCustForm({ ...custForm, city: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Vehicle of Interest</label>
                    <select
                      className="form-select"
                      value={custForm.interestedModel}
                      onChange={(e) => setCustForm({ ...custForm, interestedModel: e.target.value })}
                    >
                      <option value="Creta Automatic">Hyundai Creta Automatic</option>
                      <option value="Grand Vitara Alpha">Maruti Grand Vitara</option>
                      <option value="Thar Roxx AX7L">Mahindra Thar Roxx</option>
                      <option value="Tata Safari Adventure">Tata Safari Dark AT</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-light border px-3"
                  onClick={() => setShowAddCustomerModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white px-4 fw-semibold"
                  style={{ backgroundColor: "#4D5D25" }}
                >
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Add Lead Fallback Modal */}
      {showInternalAddLead && (
        <div className="modal-backdrop-custom" onClick={() => setShowInternalAddLead(false)}>
          <div className="modal-dialog-custom modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom" style={{ backgroundColor: "#4D5D25", color: "#fff" }}>
              <h5 className="modal-title-custom text-white mb-0 fs-6">
                <i className="bi bi-plus-circle-fill me-2"></i> Add New Lead
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowInternalAddLead(false)}
              ></button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                showToast("New Lead added to your conversion pipeline!", "success");
                setShowInternalAddLead(false);
              }}
            >
              <div className="modal-body-custom">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Prospect Name *</label>
                    <input type="text" className="form-control" placeholder="e.g. Anand Sharma" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Phone Number *</label>
                    <input type="tel" className="form-control" placeholder="+91 99887 76655" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Vehicle Model *</label>
                    <input type="text" className="form-control" placeholder="e.g. Creta SX Opt" required />
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-light border px-3"
                  onClick={() => setShowInternalAddLead(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white px-4 fw-semibold"
                  style={{ backgroundColor: "#4D5D25" }}
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
