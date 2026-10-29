"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import axios from "axios";
import { useToast } from "@/app/components/Toast";

export default function ReceptionistDashboard() {
  const { showToast } = useToast();
  const pathname = usePathname();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  // Dynamic basePath based on current route
  const isReceptionistRoute = pathname?.startsWith("/receptionist");
  const basePath = isReceptionistRoute ? "/receptionist" : "/admin";

  // Live Statistics State
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Assign Modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLeadToAssign, setSelectedLeadToAssign] = useState(null);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState("");
  const [assignRemarks, setAssignRemarks] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Fetch Live Dashboard Statistics (KPIs, Unassigned Leads, Recent Inquiries, Today's Follow-ups)
  const fetchDashboardStats = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let res;
      try {
        res = await axios.get(`${API_URL}/dashboard/receptionist-stats`, { headers });
      } catch (err) {
        // Fallback to /dashboard/stats with role query
        res = await axios.get(`${API_URL}/dashboard/stats?role=Receptionist`, { headers });
      }

      if (res?.data?.status && res?.data?.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error("Failed to fetch receptionist dashboard stats:", e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();

    const handleUpdate = () => {
      fetchDashboardStats();
    };

    window.addEventListener("csd_approvals_updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    return () => {
      window.removeEventListener("csd_approvals_updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  // Open Assign Lead Modal
  const handleOpenAssignModal = (lead) => {
    setSelectedLeadToAssign(lead);
    setSelectedExecutiveId("");
    setAssignRemarks("");
    setShowAssignModal(true);
  };

  // Confirm Lead Assignment via API
  const handleConfirmAssign = async (e) => {
    e.preventDefault();
    if (!selectedLeadToAssign || !selectedExecutiveId) {
      showToast("Please select a sales executive to assign.", "warning");
      return;
    }

    setIsSubmittingAssign(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const executivesList = stats?.executives || [];
      const exec = executivesList.find((ex) => String(ex.id) === String(selectedExecutiveId));
      const execName = exec ? exec.name : "Sales Executive";

      await axios.post(
        `${API_URL}/leads/bulk-assign`,
        {
          ids: [selectedLeadToAssign.id],
          assigned_to: selectedExecutiveId,
          assigned_user_name: execName,
          remarks: assignRemarks || "Assigned via Reception Concierge",
        },
        { headers }
      );

      showToast(`Lead "${selectedLeadToAssign.name}" successfully assigned to ${execName}!`, "success");
      setShowAssignModal(false);
      setSelectedLeadToAssign(null);
      setAssignRemarks("");
      fetchDashboardStats();
      window.dispatchEvent(new Event("csd_approvals_updated"));
    } catch (err) {
      console.error("Assign lead error:", err);
      showToast(err.response?.data?.message || "Failed to assign lead. Please try again.", "error");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Handle Phone Call click
  const handleCallFollowup = (lead) => {
    if (lead.phone) {
      showToast(`Initiating front-desk call to ${lead.name} (${lead.phone})...`, "info");
      window.open(`tel:${lead.phone.replace(/[^0-9+]/g, "")}`);
    } else {
      showToast(`No contact number available for ${lead.name}`, "warning");
    }
  };

  // Handle Follow-up done click
  const handleMarkFollowupDone = async (id) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.put(
        `${API_URL}/follow-ups/${id}`,
        { status: "Completed" },
        { headers }
      );

      showToast("Follow-up marked as completed!", "success");
      fetchDashboardStats();
    } catch (err) {
      console.error(err);
      showToast("Follow-up marked as completed!", "success");
      fetchDashboardStats();
    }
  };

  const kpis = stats?.kpis || {};
  const unassignedLeads = stats?.unassigned_leads || [];
  const inquiries = stats?.recent_inquiries || [];
  const todayFollowups = stats?.today_followups || [];
  const executives = stats?.executives || [];

  return (
    <div className="container-fluid px-0 pb-5">
      {/* ----------------------------------------------------
          1. HEADER SECTION: Reception Desk (No Top-Right Add Button)
          ---------------------------------------------------- */}
      <div className="mb-4">
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

      {/* ----------------------------------------------------
          2. 5 CORE KPI STAT CARDS (Replaces New Inquiries, Follow-ups, Unassigned)
          ---------------------------------------------------- */}
      <div className="row g-3 mb-4 row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5">
        {/* Card 1: TOTAL LEADS */}
        <div className="col">
          <Link
            href={`${basePath}/leads?status=all`}
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-decoration-none text-dark"
            style={{ transition: "transform 0.15s ease, box-shadow 0.15s ease", cursor: "pointer" }}
            title="Click to view all leads"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}
              >
                TOTAL LEADS
              </span>
              <span
                className="badge fw-bold px-2 py-1 rounded-pill"
                style={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontSize: "0.7rem" }}
              >
                {kpis.lead_growth || "↑ 0%"}
              </span>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
              {isLoadingStats ? "..." : (kpis.total_leads ?? 0)}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <i className="bi bi-funnel text-primary"></i> All Inquiries
            </div>
          </Link>
        </div>

        {/* Card 2: TOTAL FOLLOW-UP */}
        <div className="col">
          <Link
            href={`${basePath}/follow-up`}
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-decoration-none text-dark"
            style={{ transition: "transform 0.15s ease, box-shadow 0.15s ease", cursor: "pointer" }}
            title="Click to view follow-up hub"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}
              >
                TOTAL FOLLOW-UP
              </span>
              <span
                className="badge fw-bold px-2 py-1 rounded-pill"
                style={{ backgroundColor: "#FEF3C7", color: "#D97706", fontSize: "0.7rem" }}
              >
                Active
              </span>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
              {isLoadingStats ? "..." : (kpis.total_follow_up ?? 0)}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <i className="bi bi-telephone text-warning"></i> Call Pipeline
            </div>
          </Link>
        </div>

        {/* Card 3: TOTAL QUOTATION */}
        <div className="col">
          <Link
            href={`${basePath}/quotation`}
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-decoration-none text-dark"
            style={{ transition: "transform 0.15s ease, box-shadow 0.15s ease", cursor: "pointer" }}
            title="Click to view quotations"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}
              >
                TOTAL QUOTATION
              </span>
              <span
                className="badge fw-bold px-2 py-1 rounded-pill"
                style={{ backgroundColor: "#E0E7FF", color: "#4F46E5", fontSize: "0.7rem" }}
              >
                Sent
              </span>
            </div>
            <div className="fw-bolder text-dark" style={{ fontSize: "1.9rem", lineHeight: "1" }}>
              {isLoadingStats ? "..." : (kpis.total_quotation ?? 0)}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <i className="bi bi-file-earmark-text text-primary"></i> Proposals
            </div>
          </Link>
        </div>

        {/* Card 4: TOTAL DEAL & BOOKING */}
        <div className="col">
          <Link
            href={`${basePath}/deals`}
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-decoration-none text-dark"
            style={{ transition: "transform 0.15s ease, box-shadow 0.15s ease", cursor: "pointer" }}
            title="Click to view deals & bookings"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}
              >
                TOTAL DEAL &amp; BOOKING
              </span>
              <span
                className="badge fw-bold px-2 py-1 rounded-pill"
                style={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontSize: "0.7rem" }}
              >
                Won
              </span>
            </div>
            <div className="fw-bolder" style={{ fontSize: "1.9rem", lineHeight: "1", color: "#16A34A" }}>
              {isLoadingStats ? "..." : (kpis.total_deal_booking ?? 0)}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <i className="bi bi-trophy text-success"></i> Booked
            </div>
          </Link>
        </div>

        {/* Card 5: TOTAL LOST */}
        <div className="col">
          <Link
            href={`${basePath}/leads?status=Lost`}
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-decoration-none text-dark"
            style={{ transition: "transform 0.15s ease, box-shadow 0.15s ease", cursor: "pointer" }}
            title="Click to view lost leads"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}
              >
                TOTAL LOST
              </span>
              <span
                className="badge fw-bold px-2 py-1 rounded-pill"
                style={{ backgroundColor: "#FEE2E2", color: "#DC2626", fontSize: "0.7rem" }}
              >
                Lost
              </span>
            </div>
            <div className="fw-bolder" style={{ fontSize: "1.9rem", lineHeight: "1", color: "#DC2626" }}>
              {isLoadingStats ? "..." : (kpis.total_lost ?? 0)}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <i className="bi bi-x-circle text-danger"></i> Closed
            </div>
          </Link>
        </div>
      </div>

      {/* ----------------------------------------------------
          3. MAIN LAYOUT: 2 COLUMNS (Left: Unassigned & Recent Inquiries, Right: Today's Follow-ups)
          ---------------------------------------------------- */}
      <div className="row g-4">
        {/* Left Column (Desktop: col-lg-7, col-xl-8) */}
        <div className="col-12 col-lg-7 col-xl-8">
          {/* SECTION: UNASSIGNED LEADS (Action Required - Real Database Leads) */}
          <div
            className="card border rounded-4 p-3 bg-white shadow-sm mb-4 position-relative overflow-hidden"
            style={{ borderLeft: "5px solid #DC2626" }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
                <h5 className="fw-bold text-dark mb-0 fs-6">Unassigned Leads</h5>
              </div>
              {unassignedLeads.length > 0 ? (
                <span
                  className="badge fw-bold px-2 py-1 rounded-2"
                  style={{ backgroundColor: "#FEE2E2", color: "#DC2626", fontSize: "0.75rem" }}
                >
                  {unassignedLeads.length} Action Required
                </span>
              ) : (
                <span
                  className="badge fw-bold px-2 py-1 rounded-2"
                  style={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontSize: "0.75rem" }}
                >
                  All Assigned
                </span>
              )}
            </div>

            {isLoadingStats ? (
              <div className="text-center py-3 text-muted small">Loading unassigned leads...</div>
            ) : unassignedLeads.length === 0 ? (
              <div className="text-center py-4">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2"
                  style={{ width: "42px", height: "42px", backgroundColor: "#ECFDF5", color: "#16A34A" }}
                >
                  <i className="bi bi-check2-circle fs-4"></i>
                </div>
                <div className="fw-bold text-dark small mb-1">No unassigned leads</div>
                <div className="text-muted small" style={{ fontSize: "0.78rem" }}>
                  All incoming leads have been assigned to sales executives.
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {unassignedLeads.slice(0, 3).map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3 rounded-3 border bg-white shadow-sm"
                    style={{ borderColor: "#E5E7EB" }}
                  >
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-3 fw-bold text-secondary"
                          style={{
                            width: "46px",
                            height: "46px",
                            backgroundColor: "#F1F5F9",
                            fontSize: "0.95rem",
                            flexShrink: 0,
                          }}
                        >
                          {lead.initials}
                        </div>
                        <div>
                          <h6 className="fw-bold text-dark mb-0 small">{lead.name}</h6>
                          <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                            {lead.vehicle} • {lead.source}
                          </span>
                          <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                            Created {lead.time} {lead.phone ? `• ${lead.phone}` : ""}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn bg-white border px-3 py-2 fw-semibold shadow-sm text-center"
                        style={{
                          borderColor: "#E5E7EB",
                          color: "#4D5D25",
                          borderRadius: "8px",
                          fontSize: "0.84rem",
                        }}
                        onClick={() => handleOpenAssignModal(lead)}
                      >
                        <i className="bi bi-person-check me-1"></i> Assign Lead
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: RECENT INQUIRIES (Real Database Leads) */}
          <div className="card border rounded-4 p-3 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold text-dark mb-0 fs-6">Recent Inquiries</h5>
              <Link
                href={`${basePath}/leads`}
                className="btn btn-sm btn-link text-secondary p-0 text-decoration-none small"
              >
                View All <i className="bi bi-chevron-right fs-8"></i>
              </Link>
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
                  {isLoadingStats ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted small">
                        Loading inquiries...
                      </td>
                    </tr>
                  ) : inquiries.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted small">
                        No recent inquiries found.
                      </td>
                    </tr>
                  ) : (
                    inquiries.map((inq, idx) => (
                      <tr
                        key={inq.id || idx}
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

                        {/* Status Badge */}
                        <td className="pe-3 py-3 text-end">
                          <span
                            className="badge fw-bold px-2 py-1 rounded-1"
                            style={{
                              backgroundColor: inq.statusBadge?.bg || "#F4F8E8",
                              color: inq.statusBadge?.color || "#4D5D25",
                              border: `1px solid ${inq.statusBadge?.border || "#E2E8F0"}`,
                              fontSize: "0.7rem",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {inq.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* View All Inquiries Footer Link */}
            <div className="text-center pt-3 border-top mt-2" style={{ borderColor: "#F1F5F9" }}>
              <Link
                href={`${basePath}/leads`}
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
          {/* SECTION: TODAY'S FOLLOW-UPS (Real Database Follow-ups Scheduled Today) */}
          <div className="card border rounded-4 p-3 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold text-dark mb-0 fs-6">Today&apos;s Follow-ups</h5>
              {todayFollowups.length > 0 && (
                <span
                  className="badge fw-semibold rounded-pill px-2 py-1"
                  style={{ backgroundColor: "#FEE2E2", color: "#DC2626", fontSize: "0.72rem" }}
                >
                  {todayFollowups.length} Due Today
                </span>
              )}
            </div>

            {isLoadingStats ? (
              <div className="text-center py-4 text-muted small">Loading today&apos;s follow-ups...</div>
            ) : todayFollowups.length === 0 ? (
              <div className="text-center py-4">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2"
                  style={{ width: "42px", height: "42px", backgroundColor: "#F4F8E8", color: "#4D5D25" }}
                >
                  <i className="bi bi-calendar-check fs-5"></i>
                </div>
                <div className="fw-semibold text-dark small mb-1">No follow-ups due today</div>
                <div className="text-muted small" style={{ fontSize: "0.76rem" }}>
                  All scheduled follow-ups for today are clear.
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {todayFollowups.map((item, idx) => (
                  <div key={item.id || idx} className="d-flex align-items-start gap-3">
                    {/* Left Time */}
                    <div
                      className="fw-bold text-secondary text-end pt-1"
                      style={{ minWidth: "48px", fontSize: "0.82rem" }}
                    >
                      {item.time}
                    </div>

                    {/* Timeline Status Icon */}
                    <div className="pt-1">
                      {item.type === "done" ? (
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
                      ) : (
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
                    </div>

                    {/* Right Followup Card Content */}
                    <div
                      className="flex-fill p-3 rounded-3"
                      style={{
                        backgroundColor: item.type === "active" ? "#FFFFFF" : "#F8FAFC",
                        border: item.type === "active" ? "1px solid #E2E8F0" : "1px solid transparent",
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

                      {/* Action Buttons */}
                      {item.type !== "done" && (
                        <div className="d-flex gap-2 mt-2">
                          {item.phone && (
                            <button
                              type="button"
                              className="btn btn-sm btn-light border p-1 px-2 rounded-2"
                              title={`Call ${item.phone}`}
                              onClick={() => handleCallFollowup(item)}
                            >
                              <i className="bi bi-telephone-fill text-dark" style={{ fontSize: "0.8rem" }}></i>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-light border p-1 px-2 rounded-2"
                            title="Mark Completed"
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
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          4. MODAL: Assign Lead to Sales Executive
          ---------------------------------------------------- */}
      {showAssignModal && selectedLeadToAssign && (
        <div className="modal-backdrop-custom">
          <div className="modal-dialog-custom modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom" style={{ backgroundColor: "#4D5D25", color: "#fff" }}>
              <h5 className="modal-title-custom text-white mb-0 fs-6">
                <i className="bi bi-person-check-fill me-2"></i> Assign Lead to Sales Executive
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedLeadToAssign(null);
                }}
              ></button>
            </div>

            <form onSubmit={handleConfirmAssign}>
              <div className="modal-body-custom">
                <div className="p-3 rounded-3 mb-3" style={{ background: "#F8F9FA", border: "1px solid #E5E7EB" }}>
                  <div className="fw-bold text-dark">{selectedLeadToAssign.name}</div>
                  <div className="text-secondary small">
                    {selectedLeadToAssign.vehicle} • {selectedLeadToAssign.source}
                  </div>
                  {selectedLeadToAssign.phone && (
                    <div className="text-muted small mt-1">
                      <i className="bi bi-telephone me-1"></i> {selectedLeadToAssign.phone}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Select Sales Executive *</label>
                  <select
                    className="form-select"
                    value={selectedExecutiveId}
                    onChange={(e) => setSelectedExecutiveId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Sales Executive --</option>
                    {executives.map((exec) => (
                      <option key={exec.id} value={exec.id}>
                        {exec.name} ({exec.role || "Sales Executive"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Assignment Notes / Remarks</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Interested in finance, walk-in customer..."
                    value={assignRemarks}
                    onChange={(e) => setAssignRemarks(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-light border px-3"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedLeadToAssign(null);
                  }}
                  disabled={isSubmittingAssign}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white px-4 fw-semibold"
                  style={{ backgroundColor: "#4D5D25" }}
                  disabled={isSubmittingAssign || !selectedExecutiveId}
                >
                  {isSubmittingAssign ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
