"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useToast } from "@/app/components/Toast";

export default function SalesManagerDashboard() {
  const { showToast } = useToast();

  // Modals state
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterPrice, setCounterPrice] = useState("₹16,15,000");
  const [counterNotes, setCounterNotes] = useState("");

  // Action Required State
  const [actionItem, setActionItem] = useState({
    id: 1,
    name: "Rajesh Patel",
    vehicle: "Hyundai Creta Automatic",
    rep: "Amit Kumar",
    date: "Oct 24, 2023",
    originalPrice: "₹16.4L",
    counterPrice: "₹16.2L",
    proposedPrice: "₹16.25L",
    status: "pending",
  });

  // Handle Approve
  const handleApprove = () => {
    showToast(`Approved proposed pricing ₹16.25L for ${actionItem.name}!`, "success");
    setActionItem(null);
  };

  // Handle Reject
  const handleReject = () => {
    showToast(`Rejected proposed discount for ${actionItem.name}.`, "warning");
    setActionItem(null);
  };

  // Handle Submit Counter Offer
  const handleSubmitCounter = (e) => {
    e.preventDefault();
    showToast(`Counter offer of ${counterPrice} sent to Amit Kumar for ${actionItem.name}!`, "info");
    setShowCounterModal(false);
    if (actionItem) {
      setActionItem({ ...actionItem, counterPrice: counterPrice });
    }
  };

  return (
    <div className="container-fluid px-0 pb-5">
      {/* ----------------------------------------------------
          1. HEADER: PERFORMANCE OVERVIEW
          ---------------------------------------------------- */}
      <div className="mb-3">
        <span
          className="text-muted fw-bold text-uppercase small"
          style={{ fontSize: "0.76rem", letterSpacing: "0.8px" }}
        >
          PERFORMANCE OVERVIEW
        </span>
      </div>

      {/* ----------------------------------------------------
          2. TOP STAT CARDS (7 White Cards + 1 Dark Total Sales Card)
          ---------------------------------------------------- */}
      <div className="row g-3 mb-4">
        {/* Card 1: New Leads */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium">New Leads</span>
              <i className="bi bi-person-plus text-secondary fs-6"></i>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "2rem", lineHeight: "1" }}>
              42
            </div>
          </div>
        </div>

        {/* Card 2: Active Leads */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium">Active Leads</span>
              <i className="bi bi-graph-up-arrow text-secondary fs-6"></i>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "2rem", lineHeight: "1" }}>
              128
            </div>
          </div>
        </div>

        {/* Card 3: Sourcing */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium">Sourcing</span>
              <i className="bi bi-search text-secondary fs-6"></i>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "2rem", lineHeight: "1" }}>
              15
            </div>
          </div>
        </div>

        {/* Card 4: Quotations */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium">Quotations</span>
              <i className="bi bi-file-earmark-text text-secondary fs-6"></i>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "2rem", lineHeight: "1" }}>
              34
            </div>
          </div>
        </div>

        {/* Card 5: Negotiations */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium">Negotiations</span>
              <i className="bi bi-chat-square-dots text-secondary fs-6"></i>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "2rem", lineHeight: "1" }}>
              12
            </div>
          </div>
        </div>

        {/* Card 6: Approvals */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium">Approvals</span>
              <i className="bi bi-shield-check text-secondary fs-6"></i>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "2rem", lineHeight: "1" }}>
              8
            </div>
          </div>
        </div>

        {/* Card 7: Bookings */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-secondary small fw-medium">Bookings</span>
              <i className="bi bi-calendar3 text-secondary fs-6"></i>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "2rem", lineHeight: "1" }}>
              24
            </div>
          </div>
        </div>

        {/* Card 8: Total Sales Value (Dark Card Highlight) */}
        <div className="col-6 col-md-3">
          <div
            className="h-100 border-0 rounded-4 p-3 shadow-sm position-relative overflow-hidden"
            style={{
              backgroundColor: "#0D1527",
              color: "#FFFFFF",
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.75)" }}>
                Total Sales Value
              </span>
              <i className="bi bi-credit-card-2-front text-warning fs-6"></i>
            </div>
            <div className="fw-bolder" style={{ fontSize: "2rem", lineHeight: "1", color: "#FFFFFF" }}>
              ₹4.2 Cr
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          3. MAIN LAYOUT: 2 COLUMNS ON DESKTOP, 1 ON MOBILE
          ---------------------------------------------------- */}
      <div className="row g-4">
        {/* Left Column (Desktop: col-lg-7, col-xl-8) */}
        <div className="col-12 col-lg-7 col-xl-8">
          {/* SECTION: ACTION REQUIRED */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div
                className="d-flex align-items-center gap-1 fw-bold text-uppercase small"
                style={{ color: "#DC2626", fontSize: "0.75rem", letterSpacing: "0.8px" }}
              >
                <i className="bi bi-exclamation-triangle"></i>
                <span>ACTION REQUIRED</span>
              </div>
              <Link
                href="/admin/leads"
                className="text-decoration-none text-muted fw-semibold small"
                style={{ fontSize: "0.8rem" }}
              >
                View All
              </Link>
            </div>

            {actionItem ? (
              <div
                className="card rounded-4 p-3 bg-white shadow-sm"
                style={{ border: "1.5px solid #FCA5A5" }}
              >
                {/* Header Row */}
                <div className="d-flex align-items-start justify-content-between mb-1">
                  <div>
                    <h5 className="fw-bold text-dark mb-0 fs-6">{actionItem.name}</h5>
                    <div className="text-secondary small d-flex align-items-center gap-1 mt-1">
                      <i className="bi bi-car-front"></i>
                      <span>{actionItem.vehicle}</span>
                    </div>
                  </div>
                  <span
                    className="badge fw-bold px-2 py-1 rounded-1"
                    style={{ backgroundColor: "#FEE2E2", color: "#DC2626", fontSize: "0.7rem", letterSpacing: "0.5px" }}
                  >
                    NEGOTIATION
                  </span>
                </div>

                {/* Subtitle / Rep Meta */}
                <div className="d-flex align-items-center justify-content-between text-muted small mb-3" style={{ fontSize: "0.78rem" }}>
                  <span>Rep: {actionItem.rep}</span>
                  <span>{actionItem.date}</span>
                </div>

                {/* Pricing Box (Original, Counter, Proposed) */}
                <div
                  className="rounded-3 p-2 px-3 mb-3 d-flex align-items-center justify-content-between text-center"
                  style={{ backgroundColor: "#F9FAFB", border: "1px solid #F3F4F6" }}
                >
                  <div>
                    <span className="text-muted d-block small" style={{ fontSize: "0.72rem" }}>
                      Original
                    </span>
                    <span className="text-decoration-line-through text-muted small fw-semibold">
                      {actionItem.originalPrice}
                    </span>
                  </div>
                  <div style={{ borderLeft: "1px solid #E5E7EB", height: "24px" }}></div>
                  <div>
                    <span className="text-muted d-block small" style={{ fontSize: "0.72rem" }}>
                      Counter
                    </span>
                    <span className="fw-bold text-dark small">{actionItem.counterPrice}</span>
                  </div>
                  <div style={{ borderLeft: "1px solid #E5E7EB", height: "24px" }}></div>
                  <div>
                    <span className="text-muted d-block small" style={{ fontSize: "0.72rem" }}>
                      Proposed
                    </span>
                    <span className="fw-bolder text-success small">{actionItem.proposedPrice}</span>
                  </div>
                </div>

                {/* 3 Action Buttons */}
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn flex-fill bg-white border py-2 fw-semibold shadow-sm"
                    style={{ borderColor: "#E5E7EB", color: "#1E293B", borderRadius: "10px", fontSize: "0.85rem" }}
                    onClick={handleReject}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn flex-fill bg-white border py-2 fw-semibold shadow-sm"
                    style={{ borderColor: "#4D5D25", color: "#4D5D25", borderRadius: "10px", fontSize: "0.85rem" }}
                    onClick={() => setShowCounterModal(true)}
                  >
                    Negotiate
                  </button>
                  <button
                    type="button"
                    className="btn flex-fill text-white py-2 fw-semibold shadow-sm"
                    style={{ backgroundColor: "#0D1527", borderRadius: "10px", fontSize: "0.85rem", border: "none" }}
                    onClick={handleApprove}
                  >
                    Approve
                  </button>
                </div>
              </div>
            ) : (
              <div className="card border rounded-4 p-4 text-center text-muted bg-white">
                <i className="bi bi-check-circle-fill text-success fs-3 mb-2"></i>
                <p className="mb-0 fw-semibold">All negotiation requests resolved!</p>
              </div>
            )}
          </div>

          {/* SECTION: SALES PIPELINE */}
          <div className="mb-4">
            <span
              className="text-muted fw-bold text-uppercase small d-block mb-2"
              style={{ fontSize: "0.74rem", letterSpacing: "0.8px" }}
            >
              SALES PIPELINE
            </span>

            <div className="card border rounded-4 p-4 bg-white shadow-sm mb-0">
              {/* Pipeline Stage Pills (6 stages in responsive grid) */}
              <div className="row g-3 text-center">
                {/* Stage 1: New Lead */}
                <div className="col-4 col-sm-4 col-md-2">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 text-white fw-bold shadow-sm"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: "#0D1527",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    120
                  </div>
                  <span className="fw-bold small text-dark d-block" style={{ fontSize: "0.8rem" }}>
                    New Lead
                  </span>
                </div>

                {/* Stage 2: Contacted */}
                <div className="col-4 col-sm-4 col-md-2">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 text-white fw-bold shadow-sm"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: "#0D1527",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    85
                  </div>
                  <span className="fw-bold small text-dark d-block" style={{ fontSize: "0.8rem" }}>
                    Contacted
                  </span>
                </div>

                {/* Stage 3: Requirement */}
                <div className="col-4 col-sm-4 col-md-2">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: "#F3F4F6",
                      borderColor: "#E5E7EB",
                      color: "#1E293B",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    60
                  </div>
                  <span className="fw-bold small text-secondary d-block" style={{ fontSize: "0.8rem" }}>
                    Requirement
                  </span>
                </div>

                {/* Stage 4: Quotation */}
                <div className="col-4 col-sm-4 col-md-2">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: "#F3F4F6",
                      borderColor: "#E5E7EB",
                      color: "#1E293B",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    45
                  </div>
                  <span className="fw-bold small text-secondary d-block" style={{ fontSize: "0.8rem" }}>
                    Quotation
                  </span>
                </div>

                {/* Stage 5: Negotiation */}
                <div className="col-4 col-sm-4 col-md-2">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: "#F3F4F6",
                      borderColor: "#E5E7EB",
                      color: "#1E293B",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    30
                  </div>
                  <span className="fw-bold small text-secondary d-block" style={{ fontSize: "0.8rem" }}>
                    Negotiation
                  </span>
                </div>

                {/* Stage 6: Booking (Green) */}
                <div className="col-4 col-sm-4 col-md-2">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: "#DCFCE7",
                      borderColor: "#BBF7D0",
                      color: "#16A34A",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    24
                  </div>
                  <span className="fw-bold small d-block" style={{ fontSize: "0.8rem", color: "#16A34A" }}>
                    Booking
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: ACTIVE REQUIREMENTS */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.74rem", letterSpacing: "0.8px" }}
              >
                ACTIVE REQUIREMENTS
              </span>
              <Link
                href="/admin/leads"
                className="text-decoration-none text-muted fw-semibold small"
                style={{ fontSize: "0.8rem" }}
              >
                View All
              </Link>
            </div>

            <div className="card border rounded-4 p-3 bg-white shadow-sm">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  REQ-1042
                </span>
                <span
                  className="badge fw-semibold px-2 py-1 rounded-1"
                  style={{ backgroundColor: "#F1F5F9", color: "#475569", fontSize: "0.7rem", letterSpacing: "0.5px" }}
                >
                  SOURCING
                </span>
              </div>

              <h6 className="fw-bold text-dark mb-1 fs-6">Sunil Sharma</h6>

              <div className="d-flex align-items-center gap-2 text-secondary small mb-1" style={{ fontSize: "0.8rem" }}>
                <i className="bi bi-car-front"></i>
                <span>Toyota Innova Crysta</span>
              </div>

              <div className="d-flex align-items-center gap-2 text-secondary small mb-2" style={{ fontSize: "0.8rem" }}>
                <i className="bi bi-cash-stack"></i>
                <span>Budget: ₹22L - ₹25L</span>
              </div>

              <div className="d-flex align-items-center justify-content-between text-muted small pt-2 border-top" style={{ borderColor: "#F1F5F9", fontSize: "0.76rem" }}>
                <span>Rep: Vikram S.</span>
                <span>Oct 23, 2023</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Desktop: col-lg-5, col-xl-4) */}
        <div className="col-12 col-lg-5 col-xl-4">
          {/* SECTION: UPCOMING DELIVERIES */}
          <div className="mb-4">
            <span
              className="text-muted fw-bold text-uppercase small d-block mb-2"
              style={{ fontSize: "0.74rem", letterSpacing: "0.8px" }}
            >
              UPCOMING DELIVERIES
            </span>

            <div className="card border rounded-4 p-3 bg-white shadow-sm">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <h6 className="fw-bold text-dark mb-0 fs-6">Priya Desai</h6>
                <span
                  className="badge fw-bold px-2 py-1 rounded-1"
                  style={{ backgroundColor: "#ECFDF5", color: "#16A34A", fontSize: "0.7rem", letterSpacing: "0.5px" }}
                >
                  READY
                </span>
              </div>

              <div className="d-flex align-items-center gap-2 text-secondary small mt-1 mb-1" style={{ fontSize: "0.8rem" }}>
                <i className="bi bi-car-front"></i>
                <span>Kia Seltos GTX+</span>
              </div>

              <div className="d-flex align-items-center gap-2 text-muted small" style={{ fontSize: "0.78rem" }}>
                <i className="bi bi-calendar-event"></i>
                <span>Delivery: Today, 4:00 PM</span>
              </div>
            </div>
          </div>

          {/* SECTION: QUICK ACTIONS */}
          <div className="mb-4">
            <span
              className="text-muted fw-bold text-uppercase small d-block mb-2"
              style={{ fontSize: "0.74rem", letterSpacing: "0.8px" }}
            >
              QUICK ACTIONS
            </span>

            <div className="row g-2">
              {/* Action 1: View Leads */}
              <div className="col-6">
                <Link
                  href="/admin/leads"
                  className="btn w-100 card border rounded-3 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "85px" }}
                >
                  <i className="bi bi-person-lines-fill fs-5 text-dark"></i>
                  <span className="fw-semibold text-dark small" style={{ fontSize: "0.78rem" }}>
                    View Leads
                  </span>
                </Link>
              </div>

              {/* Action 2: Requirements */}
              <div className="col-6">
                <Link
                  href="/admin/leads"
                  className="btn w-100 card border rounded-3 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "85px" }}
                >
                  <i className="bi bi-card-checklist fs-5 text-dark"></i>
                  <span className="fw-semibold text-dark small" style={{ fontSize: "0.78rem" }}>
                    Requirements
                  </span>
                </Link>
              </div>

              {/* Action 3: Quotations */}
              <div className="col-6">
                <Link
                  href="/admin/quotation"
                  className="btn w-100 card border rounded-3 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "85px" }}
                >
                  <i className="bi bi-file-earmark-text fs-5 text-dark"></i>
                  <span className="fw-semibold text-dark small" style={{ fontSize: "0.78rem" }}>
                    Quotations
                  </span>
                </Link>
              </div>

              {/* Action 4: Negotiations */}
              <div className="col-6">
                <Link
                  href="/admin/leads"
                  className="btn w-100 card border rounded-3 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "85px" }}
                >
                  <i className="bi bi-chat-square-dots fs-5 text-dark"></i>
                  <span className="fw-semibold text-dark small" style={{ fontSize: "0.78rem" }}>
                    Negotiations
                  </span>
                </Link>
              </div>

              {/* Action 5: Bookings */}
              <div className="col-6">
                <Link
                  href="/admin/quotation"
                  className="btn w-100 card border rounded-3 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "85px" }}
                >
                  <i className="bi bi-calendar-check fs-5 text-dark"></i>
                  <span className="fw-semibold text-dark small" style={{ fontSize: "0.78rem" }}>
                    Bookings
                  </span>
                </Link>
              </div>

              {/* Action 6: Reports */}
              <div className="col-6">
                <Link
                  href="/admin/reports"
                  className="btn w-100 card border rounded-3 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "85px" }}
                >
                  <i className="bi bi-bar-chart-line fs-5 text-dark"></i>
                  <span className="fw-semibold text-dark small" style={{ fontSize: "0.78rem" }}>
                    Reports
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          4. MODAL: COUNTER OFFER NEGOTIATION
          ---------------------------------------------------- */}
      {showCounterModal && actionItem && (
        <div className="modal-backdrop-custom" onClick={() => setShowCounterModal(false)}>
          <div className="modal-dialog-custom modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom" style={{ backgroundColor: "#0D1527", color: "#fff" }}>
              <h5 className="modal-title-custom text-white mb-0 fs-6">
                <i className="bi bi-cash-coin me-2 text-warning"></i> Counter Offer: {actionItem.name}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowCounterModal(false)}
              ></button>
            </div>

            <form onSubmit={handleSubmitCounter}>
              <div className="modal-body-custom">
                <div className="p-3 rounded-3 mb-3" style={{ background: "#F8F9FA", border: "1px solid #E5E7EB" }}>
                  <div className="fw-bold text-dark">{actionItem.name}</div>
                  <div className="text-secondary small">{actionItem.vehicle} • Rep: {actionItem.rep}</div>
                  <div className="small text-muted mt-1">
                    Original: <span className="text-decoration-line-through">{actionItem.originalPrice}</span> • Proposed: <strong className="text-success">{actionItem.proposedPrice}</strong>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Manager Counter Offer Price *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. ₹16,15,000"
                    required
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Special Note to Sales Rep</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Include 1st year insurance discount instead of cash discount..."
                    value={counterNotes}
                    onChange={(e) => setCounterNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-light border px-3"
                  onClick={() => setShowCounterModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white px-4 fw-semibold"
                  style={{ backgroundColor: "#0D1527" }}
                >
                  Send Counter Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
