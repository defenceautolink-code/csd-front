"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useToast } from "@/app/components/Toast";

export default function SuperAdminDashboard({ onAddLead }) {
  const { showToast } = useToast();

  // Modals state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);

  // Quick Customer Form
  const [custForm, setCustForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "Ahmedabad",
  });

  // Quick Requirement Form
  const [reqForm, setReqForm] = useState({
    customerName: "",
    model: "Hyundai Creta",
    budget: "₹15 - 20 Lakhs",
    priority: "Hot",
  });

  // Approvals State (Interactive Approve / Reject)
  const [approvals, setApprovals] = useState([
    {
      id: 1,
      name: "Rajesh Patel",
      badge: "DISCOUNT",
      badgeBg: "#FEE2E2",
      badgeColor: "#DC2626",
      borderAccent: "#DC2626",
      vehicle: "Hyundai Creta Automatic",
      detail: "Proposed: ₹16,25,000 (Margin: 4%)",
      status: "pending",
    },
    {
      id: 2,
      name: "Amit Singh",
      badge: "SOURCING",
      badgeBg: "#FEF3C7",
      badgeColor: "#D97706",
      borderAccent: "#F59E0B",
      vehicle: "Mahindra Scorpio-N Z8L",
      detail: "Vendor Premium: +₹45k",
      status: "pending",
    },
  ]);

  // Handle Approve / Reject
  const handleApprovalAction = (id, action) => {
    const item = approvals.find((a) => a.id === id);
    if (!item) return;

    if (action === "Approve") {
      showToast(`Approved ${item.badge} request for ${item.name}!`, "success");
    } else {
      showToast(`Rejected ${item.badge} request for ${item.name}.`, "warning");
    }

    setApprovals((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveCustomer = (e) => {
    e.preventDefault();
    showToast(`Customer ${custForm.name} registered successfully!`, "success");
    setShowCustomerModal(false);
    setCustForm({ name: "", phone: "", email: "", city: "Ahmedabad" });
  };

  const handleSaveRequirement = (e) => {
    e.preventDefault();
    showToast(`Requirement added for ${reqForm.customerName} (${reqForm.model})!`, "success");
    setShowReqModal(false);
    setReqForm({ customerName: "", model: "Hyundai Creta", budget: "₹15 - 20 Lakhs", priority: "Hot" });
  };

  return (
    <div className="container-fluid px-0 pb-5">
      {/* ----------------------------------------------------
          1. HEADER SECTION: Business Overview & Date Pill
          ---------------------------------------------------- */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1
            className="fw-bolder mb-1 text-dark"
            style={{ fontSize: "1.85rem", letterSpacing: "-0.5px" }}
          >
            Business Overview
          </h1>
          <p className="text-secondary small mb-0">Here&apos;s your business overview for today</p>
        </div>

        {/* Date Pill */}
        <div>
          <span
            className="badge fw-semibold px-3 py-2 border text-dark"
            style={{
              backgroundColor: "#F3F4F6",
              borderColor: "#E5E7EB",
              borderRadius: "20px",
              fontSize: "0.82rem",
            }}
          >
            25 Aug 2026
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. QUICK ACTION BUTTONS ROW
          ---------------------------------------------------- */}
      <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-4" style={{ whiteSpace: "nowrap" }}>
        {/* + Lead (Solid Navy Button) */}
        <button
          type="button"
          className="btn text-white d-inline-flex align-items-center justify-content-center gap-2 px-3 py-2 fw-semibold shadow-sm"
          style={{
            backgroundColor: "#0D1554",
            borderRadius: "14px",
            minWidth: "105px",
            height: "44px",
            fontSize: "0.86rem",
            border: "none",
          }}
          onClick={onAddLead}
        >
          <i className="bi bi-plus-lg fs-6"></i>
          <span>+ Lead</span>
        </button>

        {/* + Customer */}
        <button
          type="button"
          className="btn bg-white border d-inline-flex align-items-center justify-content-center gap-2 px-3 py-2 fw-semibold text-dark shadow-sm"
          style={{
            borderColor: "#E5E7EB",
            borderRadius: "14px",
            minWidth: "125px",
            height: "44px",
            fontSize: "0.86rem",
          }}
          onClick={() => setShowCustomerModal(true)}
        >
          <i className="bi bi-person-plus text-secondary fs-6"></i>
          <span>+ Customer</span>
        </button>

        {/* + Req */}
        <button
          type="button"
          className="btn bg-white border d-inline-flex align-items-center justify-content-center gap-2 px-3 py-2 fw-semibold text-dark shadow-sm"
          style={{
            borderColor: "#E5E7EB",
            borderRadius: "14px",
            minWidth: "105px",
            height: "44px",
            fontSize: "0.86rem",
          }}
          onClick={() => setShowReqModal(true)}
        >
          <i className="bi bi-card-checklist text-secondary fs-6"></i>
          <span>+ Req</span>
        </button>

        {/* + Quote */}
        <Link
          href="/admin/quotation/create"
          className="btn bg-white border d-inline-flex align-items-center justify-content-center gap-2 px-3 py-2 fw-semibold text-dark shadow-sm text-decoration-none"
          style={{
            borderColor: "#E5E7EB",
            borderRadius: "14px",
            minWidth: "105px",
            height: "44px",
            fontSize: "0.86rem",
          }}
        >
          <i className="bi bi-file-earmark-text text-secondary fs-6"></i>
          <span>+ Quote</span>
        </Link>

        {/* Booking */}
        <Link
          href="/admin/quotation"
          className="btn bg-white border d-inline-flex align-items-center justify-content-center gap-2 px-3 py-2 fw-semibold text-dark shadow-sm text-decoration-none"
          style={{
            borderColor: "#E5E7EB",
            borderRadius: "14px",
            minWidth: "115px",
            height: "44px",
            fontSize: "0.86rem",
          }}
        >
          <i className="bi bi-car-front text-secondary fs-6"></i>
          <span>Booking</span>
        </Link>
      </div>

      {/* ----------------------------------------------------
          3. 8 KPI STAT CARDS 
          ---------------------------------------------------- */}
      <div className="row g-3 mb-4">
        {/* Card 1: TOTAL LEADS */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
              >
                TOTAL LEADS
              </span>
              <span
                className="badge fw-bold px-2 py-1 rounded-pill"
                style={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontSize: "0.7rem" }}
              >
                ↑ 12%
              </span>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
              248
            </div>
          </div>
        </div>

        {/* Card 2: ACTIVE REQ */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
            >
              ACTIVE REQ
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
              86
            </div>
          </div>
        </div>

        {/* Card 3: ACTIVE QUOTES */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
            >
              ACTIVE QUOTES
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
              34
            </div>
          </div>
        </div>

        {/* Card 4: CONFIRMED */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
            >
              CONFIRMED
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
              19
            </div>
          </div>
        </div>

        {/* Card 5: PENDING PAY */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
            >
              PENDING PAY
            </div>
            <div className="fw-bolder" style={{ fontSize: "1.9rem", lineHeight: "1", color: "#DC2626" }}>
              ₹12.4L
            </div>
          </div>
        </div>

        {/* Card 6: IN PROCESS */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
            >
              IN PROCESS
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
              27
            </div>
          </div>
        </div>

        {/* Card 7: DELIVERIES */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
            >
              DELIVERIES
            </div>
            <div className="fw-bolder" style={{ fontSize: "1.9rem", lineHeight: "1", color: "#16A34A" }}>
              142
            </div>
          </div>
        </div>

        {/* Card 8: GROSS PROFIT (Subtle tinted card background) */}
        <div className="col-6 col-md-3">
          <div
            className="card h-100 border rounded-4 p-3 shadow-sm"
            style={{ backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }}
          >
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
            >
              GROSS PROFIT
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
              ₹28.6L
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          4. MAIN SECTION: 2 
          ---------------------------------------------------- */}
      <div className="row g-4">
        {/* Left Column (Desktop: col-lg-7, col-xl-8) */}
        <div className="col-12 col-lg-7 col-xl-8">
          {/* SECTION: SALES PIPELINE */}
          <div className="card border rounded-4 p-4 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center gap-2 mb-4">
              <i className="bi bi-graph-up-arrow text-dark fs-5"></i>
              <h5 className="fw-bold text-dark mb-0 fs-6">Sales Pipeline</h5>
            </div>

            {/* Pipeline Stage Pills */}
            <div className="row g-3 text-center">
              {/* Stage 1: Lead */}
              <div className="col-4 col-sm-4 col-md-2">
                <div
                  className="d-flex align-items-center justify-content-center mx-auto mb-2 text-white fw-bold shadow-sm"
                  style={{
                    width: "56px",
                    height: "56px",
                    backgroundColor: "#0D1554",
                    borderRadius: "14px",
                    fontSize: "1.15rem",
                  }}
                >
                  120
                </div>
                <span className="fw-bold small text-dark d-block" style={{ fontSize: "0.82rem" }}>
                  Lead
                </span>
              </div>

              {/* Stage 2: Requirement */}
              <div className="col-4 col-sm-4 col-md-2">
                <div
                  className="d-flex align-items-center justify-content-center mx-auto mb-2 text-white fw-bold shadow-sm"
                  style={{
                    width: "56px",
                    height: "56px",
                    backgroundColor: "#0D1554",
                    borderRadius: "14px",
                    fontSize: "1.15rem",
                  }}
                >
                  85
                </div>
                <span className="fw-bold small text-dark d-block" style={{ fontSize: "0.82rem" }}>
                  Requirement
                </span>
              </div>

              {/* Stage 3: Quotation */}
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
                <span className="fw-bold small text-secondary d-block" style={{ fontSize: "0.82rem" }}>
                  Quotation
                </span>
              </div>

              {/* Stage 4: Negotiation */}
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
                <span className="fw-bold small text-secondary d-block" style={{ fontSize: "0.82rem" }}>
                  Negotiation
                </span>
              </div>

              {/* Stage 5: Booking */}
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
                <span className="fw-bold small text-secondary d-block" style={{ fontSize: "0.82rem" }}>
                  Booking
                </span>
              </div>

              {/* Stage 6: Delivered (Light Green) */}
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
                <span className="fw-bold small d-block" style={{ fontSize: "0.82rem", color: "#16A34A" }}>
                  Delivered
                </span>
              </div>
            </div>
          </div>

          {/* SECTION: PENDING APPROVALS */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-shield-exclamation text-danger fs-5"></i>
                <h5 className="fw-bold text-dark mb-0 fs-6">Pending Approvals</h5>
              </div>
              {approvals.length > 0 && (
                <span
                  className="badge fw-bold px-2 py-1 rounded-2"
                  style={{ backgroundColor: "#FEE2E2", color: "#DC2626", fontSize: "0.75rem" }}
                >
                  {approvals.length} Action Req
                </span>
              )}
            </div>

            {approvals.length === 0 ? (
              <div className="card border rounded-4 p-4 text-center text-muted bg-white">
                <i className="bi bi-check-circle-fill text-success fs-3 mb-2"></i>
                <p className="mb-0 fw-semibold">All pending discount and sourcing approvals cleared!</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {approvals.map((app) => (
                  <div
                    key={app.id}
                    className="card border rounded-4 p-3 bg-white shadow-sm position-relative overflow-hidden"
                    style={{ borderLeft: `5px solid ${app.borderAccent}` }}
                  >
                    <div className="d-flex align-items-start justify-content-between mb-1">
                      <div>
                        <h6 className="fw-bold text-dark mb-0 fs-6">{app.name}</h6>
                        <div className="text-secondary small mt-1">{app.vehicle}</div>
                      </div>
                      <span
                        className="badge fw-bold px-2 py-1 rounded-1"
                        style={{
                          backgroundColor: app.badgeBg,
                          color: app.badgeColor,
                          fontSize: "0.72rem",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {app.badge}
                      </span>
                    </div>

                    <div className="text-secondary small mb-3" style={{ fontSize: "0.82rem" }}>
                      {app.detail}
                    </div>

                    {/* Action Buttons: Approve & Reject */}
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn flex-fill text-white py-2 fw-semibold shadow-sm"
                        style={{
                          backgroundColor: "#0D1554",
                          borderRadius: "10px",
                          fontSize: "0.88rem",
                          border: "none",
                        }}
                        onClick={() => handleApprovalAction(app.id, "Approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn flex-fill bg-white border py-2 fw-semibold shadow-sm"
                        style={{
                          borderColor: "#E5E7EB",
                          color: "#DC2626",
                          borderRadius: "10px",
                          fontSize: "0.88rem",
                        }}
                        onClick={() => handleApprovalAction(app.id, "Reject")}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Desktop: col-lg-5, col-xl-4) */}
        <div className="col-12 col-lg-5 col-xl-4">
          {/* SECTION: UPCOMING DELIVERIES */}
          <div className="card border rounded-4 p-3 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-truck text-dark fs-5"></i>
              <h5 className="fw-bold text-dark mb-0 fs-6">Upcoming Deliveries</h5>
            </div>

            <div className="d-flex flex-column">
              {/* Delivery Item 1 */}
              <div className="py-2 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="fw-bold text-dark mb-0 small">Rajesh Patel</h6>
                  <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                    Tomorrow • Ahmedabad
                  </span>
                </div>
                <span
                  className="badge fw-bold px-2 py-1 rounded-2"
                  style={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontSize: "0.72rem" }}
                >
                  Ready for Delivery
                </span>
              </div>
              <hr className="my-2" style={{ borderColor: "#F1F5F9" }} />

              {/* Delivery Item 2 */}
              <div className="py-2 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="fw-bold text-dark mb-0 small">Neha Sharma</h6>
                  <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                    28 Aug • Surat
                  </span>
                </div>
                <span
                  className="badge fw-bold px-2 py-1 rounded-2"
                  style={{ backgroundColor: "#FEF3C7", color: "#D97706", fontSize: "0.72rem" }}
                >
                  PDI Pending
                </span>
              </div>
              <hr className="my-2" style={{ borderColor: "#F1F5F9" }} />

              {/* Delivery Item 3 */}
              <div className="py-2 d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="fw-bold text-dark mb-0 small">Vikram Desai</h6>
                  <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                    30 Aug • Vadodara
                  </span>
                </div>
                <span
                  className="badge fw-bold px-2 py-1 rounded-2"
                  style={{ backgroundColor: "#E0E7FF", color: "#4F46E5", fontSize: "0.72rem" }}
                >
                  In Transit
                </span>
              </div>
            </div>
          </div>

          {/* SECTION: RECENT ACTIVITY */}
          <div className="card border rounded-4 p-3 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-clock-history text-dark fs-5"></i>
              <h5 className="fw-bold text-dark mb-0 fs-6">Recent Activity</h5>
            </div>

            {/* Vertical Activity Timeline */}
            <div className="position-relative ps-3">
              {/* Activity 1 */}
              <div className="position-relative mb-4">
                <span
                  className="position-absolute rounded-circle"
                  style={{
                    width: "10px",
                    height: "10px",
                    backgroundColor: "#2563EB",
                    left: "-18px",
                    top: "4px",
                  }}
                ></span>
                {/* Connecting Line */}
                <div
                  className="position-absolute"
                  style={{
                    width: "2px",
                    backgroundColor: "#E2E8F0",
                    left: "-14px",
                    top: "16px",
                    bottom: "-16px",
                  }}
                ></div>
                <div className="fw-semibold text-dark small">New lead created Rahul Patel</div>
                <span className="text-muted" style={{ fontSize: "0.74rem" }}>
                  10 min ago
                </span>
              </div>

              {/* Activity 2 */}
              <div className="position-relative mb-4">
                <span
                  className="position-absolute rounded-circle"
                  style={{
                    width: "10px",
                    height: "10px",
                    backgroundColor: "#16A34A",
                    left: "-18px",
                    top: "4px",
                  }}
                ></span>
                {/* Connecting Line */}
                <div
                  className="position-absolute"
                  style={{
                    width: "2px",
                    backgroundColor: "#E2E8F0",
                    left: "-14px",
                    top: "16px",
                    bottom: "-16px",
                  }}
                ></div>
                <div className="fw-semibold text-dark small">Payment received ₹50,000 for BKG-042</div>
                <span className="text-muted" style={{ fontSize: "0.74rem" }}>
                  45 min ago
                </span>
              </div>

              {/* Activity 3 */}
              <div className="position-relative">
                <span
                  className="position-absolute rounded-circle"
                  style={{
                    width: "10px",
                    height: "10px",
                    backgroundColor: "#F59E0B",
                    left: "-18px",
                    top: "4px",
                  }}
                ></span>
                <div className="fw-semibold text-dark small">Quotation sent to Amit Kumar (Creta SX)</div>
                <span className="text-muted" style={{ fontSize: "0.74rem" }}>
                  2 hours ago
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          5. MODALS (Quick Customer & Requirement)
          ---------------------------------------------------- */}
      {/* Quick Add Customer Modal */}
      {showCustomerModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowCustomerModal(false)}>
          <div className="modal-dialog-custom modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom" style={{ backgroundColor: "#0D1554", color: "#fff" }}>
              <h5 className="modal-title-custom text-white mb-0 fs-6">
                <i className="bi bi-person-plus-fill me-2"></i> Add New Customer
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowCustomerModal(false)}
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

                  <div className="col-12">
                    <label className="form-label fw-semibold small">City / Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ahmedabad, Surat"
                      value={custForm.city}
                      onChange={(e) => setCustForm({ ...custForm, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-light border px-3"
                  onClick={() => setShowCustomerModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white px-4 fw-semibold"
                  style={{ backgroundColor: "#0D1554" }}
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Requirement Modal */}
      {showReqModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowReqModal(false)}>
          <div className="modal-dialog-custom modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom" style={{ backgroundColor: "#0D1554", color: "#fff" }}>
              <h5 className="modal-title-custom text-white mb-0 fs-6">
                <i className="bi bi-card-checklist me-2"></i> Add Customer Requirement
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowReqModal(false)}
              ></button>
            </div>

            <form onSubmit={handleSaveRequirement}>
              <div className="modal-body-custom">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Customer Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Anand Sharma"
                      required
                      value={reqForm.customerName}
                      onChange={(e) => setReqForm({ ...reqForm, customerName: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Vehicle Model *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Creta SX Opt"
                      required
                      value={reqForm.model}
                      onChange={(e) => setReqForm({ ...reqForm, model: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Budget Range</label>
                    <select
                      className="form-select"
                      value={reqForm.budget}
                      onChange={(e) => setReqForm({ ...reqForm, budget: e.target.value })}
                    >
                      <option value="₹10 - 15 Lakhs">₹10 - 15 Lakhs</option>
                      <option value="₹15 - 20 Lakhs">₹15 - 20 Lakhs</option>
                      <option value="₹20 - 25 Lakhs">₹20 - 25 Lakhs</option>
                      <option value="Above ₹25 Lakhs">Above ₹25 Lakhs</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-light border px-3"
                  onClick={() => setShowReqModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white px-4 fw-semibold"
                  style={{ backgroundColor: "#0D1554" }}
                >
                  Save Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
