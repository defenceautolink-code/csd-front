"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useToast } from "@/app/components/Toast";

export default function ReceptionistDashboard() {
  const { showToast } = useToast();

  // Modals state
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // New inquiry form state
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    phone: "",
    model: "Hyundai Creta",
    source: "Walk-in",
    notes: "",
  });

  // Selected executive for assigning
  const [selectedExecutive, setSelectedExecutive] = useState("Rahul Verma");

  // Unassigned lead state
  const [unassignedLead, setUnassignedLead] = useState({
    id: "LD-9021",
    name: "Vikram Desai",
    initials: "VD",
    vehicle: "Mahindra XUV700",
    source: "Web Form",
    status: "Unassigned",
  });

  // Recent Inquiries List (from Image 1 & Image 2)
  const [inquiries, setInquiries] = useState([
    {
      id: 1,
      contact: "Rajesh Patel",
      time: "2 mins ago",
      vehicle: "Hyundai Creta Automatic",
      source: "WhatsApp",
      sourceIcon: "bi-whatsapp text-success",
      status: "NEW",
      statusBadge: {
        bg: "#F4F8E8",
        color: "#4D5D25",
        border: "#E2E8F0",
      },
    },
    {
      id: 2,
      contact: "Anita Sharma",
      time: "15 mins ago",
      vehicle: "Kia Seltos GT Line",
      source: "Phone Call",
      sourceIcon: "bi-telephone text-primary",
      status: "IN PROGRESS",
      statusBadge: {
        bg: "#F1F5F9",
        color: "#475569",
        border: "#E2E8F0",
      },
    },
    {
      id: 3,
      contact: "Mohammed Ali",
      time: "1 hour ago",
      vehicle: "Tata Nexon EV",
      source: "Website",
      sourceIcon: "bi-globe text-info",
      status: "NEW",
      statusBadge: {
        bg: "#F4F8E8",
        color: "#4D5D25",
        border: "#E2E8F0",
      },
    },
    {
      id: 4,
      contact: "Priya Singh",
      time: "2 hours ago",
      vehicle: "Royal Enfield Classic 350",
      source: "Walk-in",
      sourceIcon: "bi-shop text-warning",
      status: "IN PROGRESS",
      statusBadge: {
        bg: "#F1F5F9",
        color: "#475569",
        border: "#E2E8F0",
      },
    },
  ]);

  // Today's Follow-ups List (from Image 1)
  const [followups, setFollowups] = useState([
    {
      id: 1,
      time: "09:15",
      name: "Ramesh Iyer",
      vehicle: "Hyundai Verna",
      type: "done",
      note: "",
    },
    {
      id: 2,
      time: "10:30",
      name: "Suresh Kumar",
      vehicle: "Toyota Innova",
      type: "active",
      note: "Call scheduled",
      phone: "+91 98765 12345",
    },
    {
      id: 3,
      time: "14:00",
      name: "Deepak Chopra",
      vehicle: "Honda City",
      type: "upcoming",
      note: "Showroom Visit",
    },
  ]);

  // Handle Save New Inquiry
  const handleSaveInquiry = (e) => {
    e.preventDefault();
    if (!inquiryForm.name || !inquiryForm.phone) {
      showToast("Please enter customer name and phone number.", "warning");
      return;
    }

    const newEntry = {
      id: Date.now(),
      contact: inquiryForm.name,
      time: "Just now",
      vehicle: inquiryForm.model,
      source: inquiryForm.source,
      sourceIcon:
        inquiryForm.source === "WhatsApp"
          ? "bi-whatsapp text-success"
          : inquiryForm.source === "Walk-in"
          ? "bi-shop text-warning"
          : "bi-telephone text-primary",
      status: "NEW",
      statusBadge: {
        bg: "#F4F8E8",
        color: "#4D5D25",
        border: "#E2E8F0",
      },
    };

    setInquiries([newEntry, ...inquiries]);
    showToast(`New inquiry created for ${inquiryForm.name}!`, "success");
    setShowInquiryModal(false);
    setInquiryForm({ name: "", phone: "", model: "Hyundai Creta", source: "Walk-in", notes: "" });
  };

  // Handle Assign Lead
  const handleConfirmAssign = (e) => {
    e.preventDefault();
    if (!unassignedLead) return;
    showToast(`Lead ${unassignedLead.name} successfully assigned to ${selectedExecutive}!`, "success");
    setUnassignedLead(null);
    setShowAssignModal(false);
  };

  // Handle Phone Call click
  const handleCallFollowup = (lead) => {
    showToast(`Initiating front-desk call to ${lead.name} (${lead.phone})...`, "info");
  };

  // Handle Follow-up done click
  const handleMarkFollowupDone = (id) => {
    setFollowups((prev) =>
      prev.map((f) => (f.id === id ? { ...f, type: "done", note: "Call completed" } : f))
    );
    showToast("Follow-up marked as completed!", "success");
  };

  return (
    <div className="container-fluid px-0 pb-5">
      {/* ----------------------------------------------------
          1. HEADER SECTION: Reception Desk & Add Button
          ---------------------------------------------------- */}
      <div className="mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-2">
          <div>
            <h1
              className="fw-bolder mb-1 text-dark"
              style={{ fontSize: "1.85rem", letterSpacing: "-0.5px" }}
            >
              Reception Desk
            </h1>
            <p className="text-secondary small mb-0">
              Live overview of incoming traffic and immediate actions.
            </p>
          </div>

          {/* Add New Inquiry Button (Desktop & Tablet) */}
          <button
            type="button"
            className="btn text-white px-3 py-2 fw-semibold d-inline-flex align-items-center justify-content-center gap-2 shadow-sm"
            style={{
              backgroundColor: "#4D5D25",
              borderRadius: "10px",
              fontSize: "0.88rem",
              border: "none",
              minWidth: "180px",
            }}
            onClick={() => setShowInquiryModal(true)}
          >
            <i className="bi bi-plus-lg fs-6"></i>
            <span>Add New Inquiry</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. TOP STAT CARDS (3 Cards from Image 1 & Image 3)
          ---------------------------------------------------- */}
      <div className="row g-3 mb-4">
        {/* Card 1: NEW INQUIRIES (with olive green accent strip) */}
        <div className="col-12 col-md-4">
          <div
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm position-relative overflow-hidden"
            style={{ borderLeft: "5px solid #4D5D25" }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small d-flex align-items-center gap-1"
                style={{ fontSize: "0.72rem", letterSpacing: "0.6px" }}
              >
                <span>NEW INQUIRIES</span>
                <i className="bi bi-inbox text-muted"></i>
              </span>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "2.4rem", lineHeight: "1" }}>
              12
            </div>
          </div>
        </div>

        {/* Card 2: FOLLOW-UPS */}
        <div className="col-12 col-md-4">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small d-flex align-items-center gap-1"
                style={{ fontSize: "0.72rem", letterSpacing: "0.6px" }}
              >
                <span>FOLLOW-UPS</span>
                <i className="bi bi-arrow-repeat text-muted"></i>
              </span>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "2.4rem", lineHeight: "1" }}>
              24
            </div>
          </div>
        </div>

        {/* Card 3: UNASSIGNED (with Red Alert theme from Image 3!) */}
        <div className="col-12 col-md-4">
          <div
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm position-relative overflow-hidden"
            style={{ borderLeft: "5px solid #DC2626" }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="fw-bold text-uppercase small d-flex align-items-center gap-1"
                style={{ fontSize: "0.72rem", letterSpacing: "0.6px", color: "#DC2626" }}
              >
                <span>UNASSIGNED</span>
                <i className="bi bi-exclamation-triangle-fill" style={{ color: "#DC2626" }}></i>
              </span>
            </div>
            <div className="fw-bolder" style={{ fontSize: "2.4rem", lineHeight: "1", color: "#DC2626" }}>
              5
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          3. MAIN LAYOUT: 2 COLUMNS ON DESKTOP, 1 COLUMN ON MOBILE
          ---------------------------------------------------- */}
      <div className="row g-4">
        {/* Left Column (Desktop: col-lg-7, col-xl-8) */}
        <div className="col-12 col-lg-7 col-xl-8">
          {/* SECTION: UNASSIGNED LEADS (Action Required) */}
          {unassignedLead && (
            <div
              className="card border rounded-4 p-3 bg-white shadow-sm mb-4 position-relative overflow-hidden"
              style={{ borderLeft: "5px solid #DC2626" }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-lg text-danger fs-5 fw-bolder"></i>
                  <h5 className="fw-bold text-dark mb-0 fs-6">Unassigned Leads</h5>
                </div>
                <span
                  className="badge fw-bold px-2 py-1 rounded-2"
                  style={{ backgroundColor: "#FEE2E2", color: "#DC2626", fontSize: "0.75rem" }}
                >
                  Action Required
                </span>
              </div>

              {/* Lead Details Card */}
              <div className="d-flex align-items-center gap-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 fw-bold text-secondary"
                  style={{
                    width: "48px",
                    height: "48px",
                    backgroundColor: "#F1F5F9",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {unassignedLead.initials}
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-0 small">{unassignedLead.name}</h6>
                  <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                    {unassignedLead.vehicle} • {unassignedLead.source}
                  </span>
                </div>
              </div>

              {/* Assign Lead Button */}
              <button
                type="button"
                className="btn w-100 bg-white border py-2 fw-semibold shadow-sm text-center"
                style={{
                  borderColor: "#E5E7EB",
                  color: "#4D5D25",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                }}
                onClick={() => setShowAssignModal(true)}
              >
                Assign Lead
              </button>
            </div>
          )}

          {/* SECTION: RECENT INQUIRIES (from Image 1 & Image 2) */}
          <div className="card border rounded-4 p-3 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold text-dark mb-0 fs-6">Recent Inquiries</h5>
              <button type="button" className="btn btn-sm btn-link text-secondary p-0" title="Filter Inquiries">
                <i className="bi bi-sliders fs-6"></i>
              </button>
            </div>

            {/* Inquiries Table / List */}
            <div className="table-responsive">
              <table className="table table-borderless align-middle mb-0" style={{ minWidth: "540px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #F1F5F9", fontSize: "0.75rem" }}>
                    <th className="text-secondary fw-semibold text-uppercase ps-3 pb-2" style={{ width: "30%" }}>
                      Contact
                    </th>
                    <th className="text-secondary fw-semibold text-uppercase px-2 pb-2" style={{ width: "30%" }}>
                      Vehicle Interest
                    </th>
                    <th className="text-secondary fw-semibold text-uppercase px-2 pb-2" style={{ width: "22%" }}>
                      Source
                    </th>
                    <th className="text-secondary fw-semibold text-uppercase text-end pe-3 pb-2" style={{ width: "18%" }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inq, idx) => (
                    <tr
                      key={inq.id}
                      style={{
                        borderBottom: idx < inquiries.length - 1 ? "1px solid #F8FAFC" : "none",
                      }}
                    >
                      {/* Contact */}
                      <td className="ps-3 py-3">
                        <div className="fw-bold text-dark small">{inq.contact}</div>
                        <div className="text-muted" style={{ fontSize: "0.74rem" }}>
                          {inq.time}
                        </div>
                      </td>

                      {/* Vehicle Interest */}
                      <td className="px-2 py-3">
                        <div className="small text-dark fw-medium" style={{ fontSize: "0.82rem" }}>
                          {inq.vehicle}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-2 py-3">
                        <div className="d-flex align-items-center gap-2 small text-secondary">
                          <i className={`bi ${inq.sourceIcon} fs-6`}></i>
                          <span style={{ fontSize: "0.82rem" }}>{inq.source}</span>
                        </div>
                      </td>

                      {/* Status Badge (from Image 2) */}
                      <td className="pe-3 py-3 text-end">
                        <span
                          className="badge fw-bold px-2 py-1 rounded-1"
                          style={{
                            backgroundColor: inq.statusBadge.bg,
                            color: inq.statusBadge.color,
                            border: `1px solid ${inq.statusBadge.border}`,
                            fontSize: "0.7rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {inq.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* View All Inquiries Footer Link */}
            <div className="text-center pt-3 border-top mt-2" style={{ borderColor: "#F1F5F9" }}>
              <Link
                href="/admin/leads"
                className="fw-bold text-decoration-none small"
                style={{ color: "#4D5D25", fontSize: "0.84rem" }}
              >
                View All Inquiries
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (Desktop: col-lg-5, col-xl-4) */}
        <div className="col-12 col-lg-5 col-xl-4">
          {/* SECTION: TODAY'S FOLLOW-UPS (from Image 1) */}
          <div className="card border rounded-4 p-3 bg-white shadow-sm mb-4">
            <h5 className="fw-bold text-dark mb-3 fs-6">Today&apos;s Follow-ups</h5>

            <div className="d-flex flex-column gap-3">
              {followups.map((item) => (
                <div key={item.id} className="d-flex align-items-start gap-3">
                  {/* Left Time */}
                  <div
                    className="fw-bold text-secondary text-end pt-1"
                    style={{ minWidth: "48px", fontSize: "0.82rem" }}
                  >
                    {item.time}
                  </div>

                  {/* Timeline Status Icon */}
                  <div className="pt-1">
                    {item.type === "done" && (
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle border"
                        style={{
                          width: "22px",
                          height: "22px",
                          borderColor: "#E2E8F0",
                          backgroundColor: "#F8FAFC",
                          color: "#94A3B8",
                          fontSize: "0.75rem",
                        }}
                      >
                        <i className="bi bi-check"></i>
                      </div>
                    )}
                    {item.type === "active" && (
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle border"
                        style={{
                          width: "22px",
                          height: "22px",
                          borderColor: "#4D5D25",
                          backgroundColor: "#fff",
                          color: "#4D5D25",
                          fontSize: "0.65rem",
                        }}
                      >
                        <i className="bi bi-record-fill"></i>
                      </div>
                    )}
                    {item.type === "upcoming" && (
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle border"
                        style={{
                          width: "22px",
                          height: "22px",
                          borderColor: "#E2E8F0",
                          backgroundColor: "#F8FAFC",
                          color: "#94A3B8",
                          fontSize: "0.65rem",
                        }}
                      >
                        <i className="bi bi-clock"></i>
                      </div>
                    )}
                  </div>

                  {/* Right Followup Card Content */}
                  <div
                    className="flex-fill p-3 rounded-3"
                    style={{
                      backgroundColor: item.type === "active" ? "#FFFFFF" : "#F8FAFC",
                      border:
                        item.type === "active" ? "1px solid #E2E8F0" : "1px solid transparent",
                      boxShadow: item.type === "active" ? "0 2px 6px rgba(0,0,0,0.03)" : "none",
                    }}
                  >
                    <h6
                      className={`mb-0 small ${
                        item.type === "done" ? "text-muted" : "fw-bold text-dark"
                      }`}
                    >
                      {item.name}
                    </h6>
                    <div className="text-secondary small mt-1" style={{ fontSize: "0.78rem" }}>
                      {item.vehicle} {item.note ? `• ${item.note}` : ""}
                    </div>

                    {/* Action Buttons for Active item */}
                    {item.type === "active" && (
                      <div className="d-flex gap-2 mt-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border p-1 px-2 rounded-2"
                          title="Call Customer"
                          onClick={() => handleCallFollowup(item)}
                        >
                          <i className="bi bi-telephone-fill text-dark" style={{ fontSize: "0.8rem" }}></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border p-1 px-2 rounded-2"
                          title="Mark Done"
                          onClick={() => handleMarkFollowupDone(item.id)}
                        >
                          <i className="bi bi-check text-dark fs-6"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          4. MODALS (Add Inquiry & Assign Lead)
          ---------------------------------------------------- */}
      {/* Modal: Add New Inquiry */}
      {showInquiryModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowInquiryModal(false)}>
          <div className="modal-dialog-custom modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom" style={{ backgroundColor: "#4D5D25", color: "#fff" }}>
              <h5 className="modal-title-custom text-white mb-0 fs-6">
                <i className="bi bi-person-plus-fill me-2"></i> Add Front-Desk Inquiry
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowInquiryModal(false)}
              ></button>
            </div>

            <form onSubmit={handleSaveInquiry}>
              <div className="modal-body-custom">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Visitor Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ramesh Chandra"
                      required
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Contact Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+91 98765 43210"
                      required
                      value={inquiryForm.phone}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Inquiry Source</label>
                    <select
                      className="form-select"
                      value={inquiryForm.source}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, source: e.target.value })}
                    >
                      <option value="Walk-in">Showroom Walk-in</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Website">Website Form</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold small">Vehicle Model Interest</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Creta Automatic, Thar Roxx, Safari"
                      value={inquiryForm.model}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, model: e.target.value })}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold small">Notes / Discussion Details</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Color, budget, exchange requirement..."
                      value={inquiryForm.notes}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-light border px-3"
                  onClick={() => setShowInquiryModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white px-4 fw-semibold"
                  style={{ backgroundColor: "#4D5D25" }}
                >
                  Save Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Lead */}
      {showAssignModal && unassignedLead && (
        <div className="modal-backdrop-custom" onClick={() => setShowAssignModal(false)}>
          <div className="modal-dialog-custom modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom" style={{ backgroundColor: "#4D5D25", color: "#fff" }}>
              <h5 className="modal-title-custom text-white mb-0 fs-6">
                <i className="bi bi-person-check-fill me-2"></i> Assign Lead to Sales Executive
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowAssignModal(false)}
              ></button>
            </div>

            <form onSubmit={handleConfirmAssign}>
              <div className="modal-body-custom">
                <div className="p-3 rounded-3 mb-3" style={{ background: "#F8F9FA", border: "1px solid #E5E7EB" }}>
                  <div className="fw-bold text-dark">{unassignedLead.name}</div>
                  <div className="text-secondary small">
                    {unassignedLead.vehicle} • {unassignedLead.source}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Select Available Sales Executive *</label>
                  <select
                    className="form-select"
                    value={selectedExecutive}
                    onChange={(e) => setSelectedExecutive(e.target.value)}
                  >
                    <option value="Rahul Verma">Rahul Verma (Floor Active • 2 Inquiries Today)</option>
                    <option value="Vikram Singh">Vikram Singh (Senior Consultant • Available)</option>
                    <option value="Sneha Joshi">Sneha Joshi (Relationship Manager • Available)</option>
                    <option value="David Miller">David Miller (Sales Executive)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-light border px-3"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white px-4 fw-semibold"
                  style={{ backgroundColor: "#4D5D25" }}
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
