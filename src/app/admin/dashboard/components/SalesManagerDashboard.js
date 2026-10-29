"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useToast } from "@/app/components/Toast";
import discountApprovalApi from "@/services/discountApprovalApi";

export default function SalesManagerDashboard() {
  const { showToast } = useToast();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  // Live Dashboard Statistics (KPIs, Pipeline, Deliveries)
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Action Required State - Loaded dynamically from discountApprovalApi
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(true);

  // Active Requirements (Latest 4 Leads)
  const [recentLeads, setRecentLeads] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);

  // Fetch Dashboard Stats (Same as Admin)
  const fetchDashboardStats = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/dashboard/stats`, { headers });
      if (res.data?.status && res.data?.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard stats:", e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch Pending Approvals
  const fetchPending = async () => {
    try {
      const data = await discountApprovalApi.getPendingApprovals();
      setPendingApprovals(data || []);
    } catch (e) {
      console.error("Failed to load approvals:", e);
    } finally {
      setIsLoadingApprovals(false);
    }
  };

  // Fetch Recent 4 Leads
  const fetchRecentLeads = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/leads`, { headers, params: { per_page: 4 } });
      const list = res.data?.data && Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setRecentLeads(list.slice(0, 4));
    } catch (e) {
      console.error("Failed to fetch leads for dashboard:", e);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchPending();
    fetchRecentLeads();

    const handleUpdate = () => {
      fetchDashboardStats();
      fetchPending();
      fetchRecentLeads();
    };

    window.addEventListener("csd_approvals_updated", handleUpdate);
    return () => window.removeEventListener("csd_approvals_updated", handleUpdate);
  }, []);

  // Handle Approve
  const handleApprove = async (item) => {
    await discountApprovalApi.takeApprovalAction(item.id, "approve");
    showToast(`Approved discount request for ${item.customer_name || "Customer"}!`, "success");
    setPendingApprovals((prev) => prev.filter((a) => a.id !== item.id));
    fetchDashboardStats();
  };

  // Handle Reject
  const handleReject = async (item) => {
    await discountApprovalApi.takeApprovalAction(item.id, "reject");
    showToast(`Rejected discount request for ${item.customer_name || "Customer"}.`, "warning");
    setPendingApprovals((prev) => prev.filter((a) => a.id !== item.id));
    fetchDashboardStats();
  };

  const kpis = stats?.kpis || {};
  const pipeline = stats?.pipeline || {};
  const upcomingDeliveries = stats?.upcoming_deliveries || [];

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
          2. TOP STAT CARDS (Same 5 Cards as Admin Dashboard)
          ---------------------------------------------------- */}
      <div className="row g-3 mb-4 row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5">
        {/* Card 1: TOTAL LEADS */}
        <div className="col">
          <Link
            href="/admin/leads?status=all"
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
            href="/admin/leads?status=Follow-up"
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-decoration-none text-dark"
            style={{ transition: "transform 0.15s ease, box-shadow 0.15s ease", cursor: "pointer" }}
            title="Click to view leads in follow-up"
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
              {isLoadingStats ? "..." : (kpis.total_follow_up ?? kpis.in_follow_up ?? 0)}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <i className="bi bi-telephone text-warning"></i> Call Pipeline
            </div>
          </Link>
        </div>

        {/* Card 3: TOTAL QUOTATION */}
        <div className="col">
          <Link
            href="/admin/leads?status=Quotation Sent"
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-decoration-none text-dark"
            style={{ transition: "transform 0.15s ease, box-shadow 0.15s ease", cursor: "pointer" }}
            title="Click to view quotation sent leads"
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
              {isLoadingStats ? "..." : (kpis.total_quotation ?? kpis.active_quotes ?? 0)}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <i className="bi bi-file-earmark-text text-primary"></i> Proposals
            </div>
          </Link>
        </div>

        {/* Card 4: TOTAL DEAL & BOOKING */}
        <div className="col">
          <Link
            href="/admin/leads?status=Deal & Booking"
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-decoration-none text-dark"
            style={{ transition: "transform 0.15s ease, box-shadow 0.15s ease", cursor: "pointer" }}
            title="Click to view deal won & booked leads"
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}
              >
                TOTAL DEAL & BOOKING
              </span>
              <span
                className="badge fw-bold px-2 py-1 rounded-pill"
                style={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontSize: "0.7rem" }}
              >
                Won
              </span>
            </div>
            <div className="fw-bolder" style={{ fontSize: "1.9rem", lineHeight: "1", color: "#16A34A" }}>
              {isLoadingStats ? "..." : (kpis.total_deal_booking ?? kpis.confirmed ?? 0)}
            </div>
            <div className="text-muted small mt-2 d-flex align-items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <i className="bi bi-trophy text-success"></i> Booked
            </div>
          </Link>
        </div>

        {/* Card 5: TOTAL LOST */}
        <div className="col">
          <Link
            href="/admin/leads?status=Lost"
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
                <span>ACTION REQUIRED ({pendingApprovals.length})</span>
              </div>
              <Link
                href="/admin/leads?status=all"
                className="text-decoration-none text-muted fw-semibold small"
                style={{ fontSize: "0.8rem" }}
              >
                View Leads
              </Link>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="card border rounded-4 p-4 text-center text-muted bg-white">
                <i className="bi bi-check-circle-fill text-success fs-3 mb-2"></i>
                <p className="mb-0 fw-semibold">All customer discount and negotiation requests resolved!</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {pendingApprovals.map((item) => (
                  <div
                    key={item.id}
                    className="card rounded-4 p-3 bg-white shadow-sm"
                    style={{ border: "1.5px solid #FCA5A5" }}
                  >
                    {/* Header Row */}
                    <div className="d-flex align-items-start justify-content-between mb-1">
                      <div>
                        <h5 className="fw-bold text-dark mb-0 fs-6">{item.customer_name}</h5>
                        <div className="text-secondary small d-flex align-items-center gap-1 mt-1">
                          <i className="bi bi-car-front"></i>
                          <span>{item.vehicle_name}</span>
                          {item.customer_phone && <span className="ms-2 text-muted">({item.customer_phone})</span>}
                        </div>
                      </div>
                      <span
                        className="badge fw-bold px-2 py-1 rounded-1"
                        style={{ backgroundColor: "#FEE2E2", color: "#DC2626", fontSize: "0.7rem", letterSpacing: "0.5px" }}
                      >
                        DISCOUNT REQ
                      </span>
                    </div>

                    {/* Subtitle / Rep Meta */}
                    <div className="d-flex align-items-center justify-content-between text-muted small mb-2" style={{ fontSize: "0.78rem" }}>
                      <span>Rep: {item.requested_by_name || "Sales Executive"}</span>
                      <span>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                          : "Today"}
                      </span>
                    </div>

                    {/* Pricing Box (Demanded Discount, Proposed Offer) */}
                    <div
                      className="rounded-3 p-2 px-3 mb-2 d-flex align-items-center justify-content-between text-center"
                      style={{ backgroundColor: "#F9FAFB", border: "1px solid #F3F4F6" }}
                    >
                      <div className={item.proposed_price ? "" : "w-100 text-center"}>
                        <span className="text-muted d-block small" style={{ fontSize: "0.72rem" }}>
                          Demanded Discount
                        </span>
                        <span className="fw-bold text-danger fs-6">
                          ₹{Number(item.discount_amount || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      {item.proposed_price && (
                        <>
                          <div style={{ borderLeft: "1px solid #E5E7EB", height: "24px" }}></div>
                          <div>
                            <span className="text-muted d-block small" style={{ fontSize: "0.72rem" }}>
                              Proposed Offer Price
                            </span>
                            <span className="fw-bolder text-success fs-6">
                              ₹{Number(item.proposed_price).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Reason / Notes */}
                    {item.reason && (
                      <div className="p-2 mb-3 rounded-2 bg-light text-muted small" style={{ fontSize: "0.78rem" }}>
                        <i className="bi bi-chat-left-quote me-1 text-primary"></i>
                        <strong>Reason:</strong> {item.reason}
                      </div>
                    )}

                    {/* Action Buttons: Reject & Approve */}
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn flex-fill bg-white border py-2 fw-semibold shadow-sm"
                        style={{ borderColor: "#E5E7EB", color: "#DC2626", borderRadius: "10px", fontSize: "0.85rem" }}
                        onClick={() => handleReject(item)}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn flex-fill text-white py-2 fw-semibold shadow-sm"
                        style={{ backgroundColor: "#0D1527", borderRadius: "10px", fontSize: "0.85rem", border: "none" }}
                        onClick={() => handleApprove(item)}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: SALES PIPELINE (Matching Admin Pipeline Outcome Stages) */}
          <div className="mb-4">
            <span
              className="text-muted fw-bold text-uppercase small d-block mb-2"
              style={{ fontSize: "0.74rem", letterSpacing: "0.8px" }}
            >
              SALES PIPELINE
            </span>

            <div className="card border rounded-4 p-4 bg-white shadow-sm mb-0">
              <div className="row g-3 text-center">
                {/* 1: Interested */}
                <div className="col-4 col-sm-4 col-md-2">
                  <Link href="/admin/follow-up?outcome=Interested" className="text-decoration-none text-dark d-block">
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
                      {isLoadingStats ? "..." : (pipeline.interested ?? 0)}
                    </div>
                    <span className="fw-bold small text-dark d-block text-truncate" style={{ fontSize: "0.8rem" }}>
                      Interested
                    </span>
                  </Link>
                </div>

                {/* 2: Quotation Requested */}
                <div className="col-4 col-sm-4 col-md-2">
                  <Link href="/admin/follow-up?outcome=Quotation" className="text-decoration-none text-dark d-block">
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
                      {isLoadingStats ? "..." : (pipeline.quotation_requested ?? 0)}
                    </div>
                    <span className="fw-bold small text-secondary d-block text-truncate" style={{ fontSize: "0.8rem" }}>
                      Quote Req.
                    </span>
                  </Link>
                </div>

                {/* 3: Negotiation */}
                <div className="col-4 col-sm-4 col-md-2">
                  <Link href="/admin/follow-up?outcome=Negotiation" className="text-decoration-none text-dark d-block">
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
                      {isLoadingStats ? "..." : (pipeline.negotiation ?? 0)}
                    </div>
                    <span className="fw-bold small text-secondary d-block text-truncate" style={{ fontSize: "0.8rem" }}>
                      Negotiation
                    </span>
                  </Link>
                </div>

                {/* 4: Not Reachable */}
                <div className="col-4 col-sm-4 col-md-2">
                  <Link href="/admin/follow-up?outcome=Not Reachable" className="text-decoration-none text-dark d-block">
                    <div
                      className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                      style={{
                        width: "56px",
                        height: "56px",
                        backgroundColor: "#FEF3C7",
                        borderColor: "#FDE68A",
                        color: "#D97706",
                        borderRadius: "14px",
                        fontSize: "1.15rem",
                      }}
                    >
                      {isLoadingStats ? "..." : (pipeline.not_reachable ?? 0)}
                    </div>
                    <span className="fw-bold small text-secondary d-block text-truncate" style={{ fontSize: "0.8rem" }}>
                      Not Reachable
                    </span>
                  </Link>
                </div>

                {/* 5: Lost Lead */}
                <div className="col-4 col-sm-4 col-md-2">
                  <Link href="/admin/follow-up?outcome=Lost" className="text-decoration-none text-dark d-block">
                    <div
                      className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                      style={{
                        width: "56px",
                        height: "56px",
                        backgroundColor: "#FEE2E2",
                        borderColor: "#FECACA",
                        color: "#DC2626",
                        borderRadius: "14px",
                        fontSize: "1.15rem",
                      }}
                    >
                      {isLoadingStats ? "..." : (pipeline.lost ?? 0)}
                    </div>
                    <span className="fw-bold small text-danger d-block text-truncate" style={{ fontSize: "0.8rem" }}>
                      Lost Lead
                    </span>
                  </Link>
                </div>

                {/* 6: Deal Won */}
                <div className="col-4 col-sm-4 col-md-2">
                  <Link href="/admin/follow-up?outcome=Deal Won" className="text-decoration-none text-dark d-block">
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
                      {isLoadingStats ? "..." : (pipeline.deal_won ?? 0)}
                    </div>
                    <span className="fw-bold small d-block text-truncate" style={{ fontSize: "0.8rem", color: "#16A34A" }}>
                      Deal Won
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: ACTIVE REQUIREMENTS (Latest 4 Leads) */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.74rem", letterSpacing: "0.8px" }}
              >
                ACTIVE REQUIREMENTS
              </span>
              <Link
                href="/admin/leads?status=all"
                className="text-decoration-none text-muted fw-semibold small"
                style={{ fontSize: "0.8rem" }}
              >
                View All
              </Link>
            </div>

            {isLoadingLeads ? (
              <div className="card border rounded-4 p-4 text-center text-muted bg-white">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                Loading latest requirements...
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="card border rounded-4 p-4 text-center text-muted bg-white">
                <p className="mb-0 fw-semibold">No active leads found.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="card border rounded-4 p-3 bg-white shadow-sm">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                        REQ-{lead.id}
                      </span>
                      <span
                        className="badge fw-semibold px-2 py-1 rounded-1"
                        style={{ backgroundColor: "#F1F5F9", color: "#475569", fontSize: "0.7rem", letterSpacing: "0.5px" }}
                      >
                        {lead.status_name ? lead.status_name.toUpperCase() : "NEW LEAD"}
                      </span>
                    </div>

                    <h6 className="fw-bold text-dark mb-1 fs-6">{lead.name}</h6>

                    <div className="d-flex align-items-center gap-2 text-secondary small mb-1" style={{ fontSize: "0.8rem" }}>
                      <i className="bi bi-car-front"></i>
                      <span>{lead.model_variant || lead.model_name || lead.brand_name || "General Inquiry"}</span>
                    </div>

                    <div className="d-flex align-items-center gap-2 text-secondary small mb-2" style={{ fontSize: "0.8rem" }}>
                      <i className="bi bi-geo-alt"></i>
                      <span>{lead.city || lead.state || "Location Pending"}</span>
                      {lead.phone && <span className="text-muted ms-1">• {lead.phone}</span>}
                    </div>

                    <div className="d-flex align-items-center justify-content-between text-muted small pt-2 border-top" style={{ borderColor: "#F1F5F9", fontSize: "0.76rem" }}>
                      <span>Rep: {lead.assigned_user_name || lead.assigned_to_display || "Sales Representative"}</span>
                      <span>
                        {lead.created_at
                          ? new Date(lead.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "Recent"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Desktop: col-lg-5, col-xl-4) */}
        <div className="col-12 col-lg-5 col-xl-4">
          {/* SECTION: UPCOMING DELIVERIES (Dynamic Delivery Data as done in Admin) */}
          <div className="mb-4">
            <span
              className="text-muted fw-bold text-uppercase small d-block mb-2"
              style={{ fontSize: "0.74rem", letterSpacing: "0.8px" }}
            >
              UPCOMING DELIVERIES
            </span>

            <div className="card border rounded-4 p-3 bg-white shadow-sm">
              {isLoadingStats ? (
                <div className="text-center py-3 text-muted small">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                  Loading deliveries...
                </div>
              ) : upcomingDeliveries.length === 0 ? (
                <div className="text-center py-3 text-muted small">
                  No upcoming deliveries scheduled.
                </div>
              ) : (
                upcomingDeliveries.map((item, idx) => (
                  <React.Fragment key={item.id || idx}>
                    <div className="py-2 d-flex align-items-center justify-content-between">
                      <div>
                        <h6 className="fw-bold text-dark mb-0 fs-6">{item.customer_name}</h6>
                        <div className="d-flex align-items-center gap-2 text-secondary small mt-1" style={{ fontSize: "0.8rem" }}>
                          <i className="bi bi-car-front"></i>
                          <span>{item.vehicle || item.detail || "Vehicle"}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2 text-muted small mt-1" style={{ fontSize: "0.78rem" }}>
                          <i className="bi bi-calendar-event"></i>
                          <span>{item.delivery_time || item.detail || "Scheduled Delivery"}</span>
                        </div>
                      </div>
                      <span
                        className="badge fw-bold px-2 py-1 rounded-1"
                        style={{
                          backgroundColor: item.badge_bg || "#ECFDF5",
                          color: item.badge_color || "#16A34A",
                          fontSize: "0.7rem",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {item.status_label || "READY"}
                      </span>
                    </div>
                    {idx < upcomingDeliveries.length - 1 && (
                      <hr className="my-2" style={{ borderColor: "#F1F5F9" }} />
                    )}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>

          {/* SECTION: QUICK ACTIONS (Leads, Follow-Up, Quotation, Deals) */}
          <div className="mb-4">
            <span
              className="text-muted fw-bold text-uppercase small d-block mb-2"
              style={{ fontSize: "0.74rem", letterSpacing: "0.8px" }}
            >
              QUICK ACTIONS
            </span>

            <div className="row g-2">
              {/* Action 1: Leads Page */}
              <div className="col-6">
                <Link
                  href="/admin/leads"
                  className="btn w-100 card border rounded-3 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "85px" }}
                >
                  <i className="bi bi-person-lines-fill fs-5 text-dark"></i>
                  <span className="fw-semibold text-dark small" style={{ fontSize: "0.78rem" }}>
                    Leads Pipeline
                  </span>
                </Link>
              </div>

              {/* Action 2: Follow-Up Page */}
              <div className="col-6">
                <Link
                  href="/admin/follow-up"
                  className="btn w-100 card border rounded-3 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "85px" }}
                >
                  <i className="bi bi-telephone-outbound fs-5 text-dark"></i>
                  <span className="fw-semibold text-dark small" style={{ fontSize: "0.78rem" }}>
                    Follow-Ups
                  </span>
                </Link>
              </div>

              {/* Action 3: Quotation Page */}
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

              {/* Action 4: Deals Page */}
              <div className="col-6">
                <Link
                  href="/admin/deals"
                  className="btn w-100 card border rounded-3 p-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "85px" }}
                >
                  <i className="bi bi-trophy fs-5 text-dark"></i>
                  <span className="fw-semibold text-dark small" style={{ fontSize: "0.78rem" }}>
                    Deals & Bookings
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
