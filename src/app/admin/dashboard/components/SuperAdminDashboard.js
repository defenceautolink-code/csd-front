"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useToast } from "@/app/components/Toast";
import discountApprovalApi from "@/services/discountApprovalApi";

export default function SuperAdminDashboard({ onAddLead }) {
  const { showToast } = useToast();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  // Dashboard Live Stats State
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Approvals State (Dynamic from discountApprovalApi)
  const [approvals, setApprovals] = useState([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(true);

  // Fetch Live Dashboard Statistics (KPIs, Pipeline, Deliveries, Activities)
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
  const fetchApprovals = async () => {
    try {
      const data = await discountApprovalApi.getPendingApprovals();
      const mapped = (data || []).map((item) => ({
        id: item.id,
        name: item.customer_name || item.name || "Customer",
        badge: item.badge || "DISCOUNT",
        badgeBg: item.badge === "SOURCING" ? "#FEF3C7" : "#FEE2E2",
        badgeColor: item.badge === "SOURCING" ? "#D97706" : "#DC2626",
        borderAccent: item.badge === "SOURCING" ? "#F59E0B" : "#DC2626",
        vehicle: item.vehicle_name || item.vehicle || "Vehicle",
        detail:
          item.detail ||
          `Demanded Disc: ₹${Number(item.discount_amount || 0).toLocaleString("en-IN")}${
            item.proposed_price ? ` • Offer: ₹${Number(item.proposed_price).toLocaleString("en-IN")}` : ""
          }${item.reason ? ` • "${item.reason}"` : ""}${item.requested_by_name ? ` (By: ${item.requested_by_name})` : ""}`,
        status: item.status || "pending",
      }));
      setApprovals(mapped);
    } catch (e) {
      console.error("Failed to fetch approvals:", e);
    } finally {
      setIsLoadingApprovals(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchApprovals();

    const handleUpdate = () => {
      fetchDashboardStats();
      fetchApprovals();
    };

    window.addEventListener("csd_approvals_updated", handleUpdate);
    return () => window.removeEventListener("csd_approvals_updated", handleUpdate);
  }, []);

  // Handle Approve / Reject
  const handleApprovalAction = async (id, action) => {
    const item = approvals.find((a) => a.id === id);
    const actionLower = action.toLowerCase();
    await discountApprovalApi.takeApprovalAction(id, actionLower);

    if (action === "Approve") {
      showToast(`Approved ${item ? item.badge : "discount"} request for ${item ? item.name : "Customer"}!`, "success");
    } else {
      showToast(`Rejected ${item ? item.badge : "discount"} request for ${item ? item.name : "Customer"}.`, "warning");
    }

    setApprovals((prev) => prev.filter((a) => a.id !== id));
    fetchDashboardStats();
  };

  const currentDateDisplay = stats?.date_display || new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const kpis = stats?.kpis || {};
  const pipeline = stats?.pipeline || {};
  const upcomingDeliveries = stats?.upcoming_deliveries || [];
  const recentActivities = stats?.recent_activities || [];

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
          <p className="text-secondary small mb-0">Here&apos;s your live business overview for today</p>
        </div>

        {/* Dynamic Date Pill */}
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
            {currentDateDisplay}
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. QUICK ACTION BUTTONS ROW (Direct Page Navigation)
          ---------------------------------------------------- */}
      <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-4" style={{ whiteSpace: "nowrap" }}>
        {/* Lead (Solid Navy Button) - Redirects to Leads Page */}
        <Link
          href="/admin/leads"
          className="btn text-white d-inline-flex align-items-center justify-content-center gap-2 px-3 py-2 fw-semibold shadow-sm text-decoration-none"
          style={{
            backgroundColor: "#0D1554",
            borderRadius: "14px",
            minWidth: "105px",
            height: "44px",
            fontSize: "0.86rem",
            border: "none",
          }}
        >
          <i className="bi bi-funnel fs-6"></i>
          <span>Lead</span>
        </Link>

        {/* Quote - Redirects to Quotation Page */}
        <Link
          href="/admin/quotation"
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
          <span>Quote</span>
        </Link>

        {/* Follow-Ups Hub - Redirects to Follow-Up Page */}
        <Link
          href="/admin/follow-up"
          className="btn bg-white border d-inline-flex align-items-center justify-content-center gap-2 px-3 py-2 fw-semibold text-dark shadow-sm text-decoration-none"
          style={{
            borderColor: "#E5E7EB",
            borderRadius: "14px",
            minWidth: "125px",
            height: "44px",
            fontSize: "0.86rem",
          }}
        >
          <i className="bi bi-telephone-outbound text-secondary fs-6"></i>
          <span>Follow-Ups</span>
        </Link>

        {/* Booking & Deals - Redirects to Booking & Deals Page */}
        <Link
          href="/admin/deals"
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
          <span>Bookings</span>
        </Link>
      </div>

      {/* ----------------------------------------------------
          3. 5 CORE KPI STAT CARDS (Filtered Navigation on Click)
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
          4. MAIN SECTION: 2 COLUMNS
          ---------------------------------------------------- */}
      <div className="row g-4">
        {/* Left Column (Desktop: col-lg-7, col-xl-8) */}
        <div className="col-12 col-lg-7 col-xl-8">
          {/* SECTION: FOLLOW-UP PIPELINE / OUTCOMES (Screenshot 3 Statuses) */}
          <div className="card border rounded-4 p-4 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-graph-up-arrow text-dark fs-5"></i>
                <h5 className="fw-bold text-dark mb-0 fs-6">Follow-Up Pipeline</h5>
              </div>
              <Link href="/admin/follow-up" className="btn btn-sm btn-link text-decoration-none p-0 text-muted small">
                View All <i className="bi bi-arrow-right"></i>
              </Link>
            </div>

            {/* Pipeline Stage Pills (6 Follow-Up Outcome Statuses from Screenshot 3 with Short Names) */}
            <div className="row g-2 text-center">
              {/* 1: Interested / Call Back -> Interested */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href="/admin/follow-up?outcome=Interested" className="text-decoration-none text-dark d-block">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 text-white fw-bold shadow-sm"
                    style={{
                      width: "54px",
                      height: "54px",
                      backgroundColor: "#0D1554",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    {isLoadingStats ? "..." : (pipeline.interested ?? 0)}
                  </div>
                  <span className="fw-bold small text-dark d-block text-truncate" style={{ fontSize: "0.8rem" }} title="Interested / Call Back">
                    Interested
                  </span>
                </Link>
              </div>

              {/* 2: Quotation Requested -> Quote Req. */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href="/admin/follow-up?outcome=Quotation" className="text-decoration-none text-dark d-block">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                    style={{
                      width: "54px",
                      height: "54px",
                      backgroundColor: "#F3F4F6",
                      borderColor: "#E5E7EB",
                      color: "#1E293B",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    {isLoadingStats ? "..." : (pipeline.quotation_requested ?? 0)}
                  </div>
                  <span className="fw-bold small text-secondary d-block text-truncate" style={{ fontSize: "0.8rem" }} title="Quotation Requested">
                    Quote Req.
                  </span>
                </Link>
              </div>

              {/* 3: Negotiation / Price Discussion -> Negotiation */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href="/admin/follow-up?outcome=Negotiation" className="text-decoration-none text-dark d-block">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                    style={{
                      width: "54px",
                      height: "54px",
                      backgroundColor: "#F3F4F6",
                      borderColor: "#E5E7EB",
                      color: "#1E293B",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    {isLoadingStats ? "..." : (pipeline.negotiation ?? 0)}
                  </div>
                  <span className="fw-bold small text-secondary d-block text-truncate" style={{ fontSize: "0.8rem" }} title="Negotiation / Price Discussion">
                    Negotiation
                  </span>
                </Link>
              </div>

              {/* 4: Not Reachable / Busy -> Not Reachable */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href="/admin/follow-up?outcome=Not Reachable" className="text-decoration-none text-dark d-block">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                    style={{
                      width: "54px",
                      height: "54px",
                      backgroundColor: "#FEF3C7",
                      borderColor: "#FDE68A",
                      color: "#D97706",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    {isLoadingStats ? "..." : (pipeline.not_reachable ?? 0)}
                  </div>
                  <span className="fw-bold small text-secondary d-block text-truncate" style={{ fontSize: "0.8rem" }} title="Not Reachable / Busy">
                    Not Reachable
                  </span>
                </Link>
              </div>

              {/* 5: Lost to Competitor / Lost of Lead -> Lost Lead */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href="/admin/follow-up?outcome=Lost" className="text-decoration-none text-dark d-block">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                    style={{
                      width: "54px",
                      height: "54px",
                      backgroundColor: "#FEE2E2",
                      borderColor: "#FECACA",
                      color: "#DC2626",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    {isLoadingStats ? "..." : (pipeline.lost ?? 0)}
                  </div>
                  <span className="fw-bold small text-danger d-block text-truncate" style={{ fontSize: "0.8rem" }} title="Lost to Competitor / Lost of Lead">
                    Lost Lead
                  </span>
                </Link>
              </div>

              {/* 6: Deal Won / Booking -> Deal Won */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href="/admin/follow-up?outcome=Deal Won" className="text-decoration-none text-dark d-block">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 border fw-bold shadow-sm"
                    style={{
                      width: "54px",
                      height: "54px",
                      backgroundColor: "#DCFCE7",
                      borderColor: "#BBF7D0",
                      color: "#16A34A",
                      borderRadius: "14px",
                      fontSize: "1.15rem",
                    }}
                  >
                    {isLoadingStats ? "..." : (pipeline.deal_won ?? 0)}
                  </div>
                  <span className="fw-bold small d-block text-truncate" style={{ fontSize: "0.8rem", color: "#16A34A" }} title="Deal Won / Booking">
                    Deal Won
                  </span>
                </Link>
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

            {isLoadingApprovals ? (
              <div className="card border rounded-4 p-4 text-center text-muted bg-white">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                <span>Loading pending approval requests...</span>
              </div>
            ) : approvals.length === 0 ? (
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
          {/* SECTION: UPCOMING DELIVERIES (Dynamic from Deals) */}
          <div className="card border rounded-4 p-3 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-truck text-dark fs-5"></i>
              <h5 className="fw-bold text-dark mb-0 fs-6">Upcoming Deliveries</h5>
            </div>

            <div className="d-flex flex-column">
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
                        <h6 className="fw-bold text-dark mb-0 small">{item.customer_name}</h6>
                        <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                          {item.detail} {item.vehicle ? `• ${item.vehicle}` : ""}
                        </span>
                      </div>
                      <span
                        className="badge fw-bold px-2 py-1 rounded-2"
                        style={{
                          backgroundColor: item.badge_bg || "#DCFCE7",
                          color: item.badge_color || "#16A34A",
                          fontSize: "0.72rem",
                        }}
                      >
                        {item.status_label || "Scheduled"}
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

          {/* SECTION: RECENT ACTIVITY (Dynamic from Activity Logs) */}
          <div className="card border rounded-4 p-3 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-clock-history text-dark fs-5"></i>
              <h5 className="fw-bold text-dark mb-0 fs-6">Recent Activity</h5>
            </div>

            {/* Vertical Activity Timeline */}
            <div className="position-relative ps-3">
              {isLoadingStats ? (
                <div className="text-muted small py-2">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                  Loading activity...
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-muted small py-2">No recent activities recorded.</div>
              ) : (
                recentActivities.map((act, idx) => (
                  <div key={act.id || idx} className={`position-relative ${idx < recentActivities.length - 1 ? "mb-4" : ""}`}>
                    {/* Circle Bullet */}
                    <span
                      className="position-absolute rounded-circle"
                      style={{
                        width: "10px",
                        height: "10px",
                        backgroundColor: act.dot_color || "#2563EB",
                        left: "-18px",
                        top: "4px",
                      }}
                    ></span>

                    {/* Connecting Line */}
                    {idx < recentActivities.length - 1 && (
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
                    )}

                    <div className="fw-semibold text-dark small">{act.text}</div>
                    <span className="text-muted" style={{ fontSize: "0.74rem" }}>
                      {act.time_ago}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
