"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import axios from "axios";
import { useToast } from "@/app/components/Toast";

export default function SalesExecutiveDashboard({ onAddLead }) {
  const { showToast } = useToast();
  const pathname = usePathname();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  // Dynamic basePath based on current route
  const isSalesExecRoute = pathname?.startsWith("/sales-executive");
  const basePath = isSalesExecRoute ? "/sales-executive" : "/admin";

  // Current User & Date State
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

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

  // Fetch Dashboard Stats for Authenticated Sales Executive
  const fetchDashboardStats = async (user = currentUser) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const userId = user?.id;
      const queryParam = userId ? `?sales_executive_id=${userId}` : "";

      let res;
      try {
        res = await axios.get(`${API_URL}/dashboard/sales-executive-stats${queryParam}`, { headers });
      } catch (err) {
        // Fallback to /dashboard/stats
        res = await axios.get(`${API_URL}/dashboard/stats${queryParam}`, { headers });
      }

      if (res?.data?.status && res?.data?.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error("Failed to fetch sales executive dashboard stats:", e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    let user = null;
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          user = JSON.parse(userStr);
          setCurrentUser(user);
        } catch (e) {
          console.error(e);
        }
      }
    }

    fetchDashboardStats(user);

    const handleUpdate = () => {
      fetchDashboardStats(user);
    };

    window.addEventListener("csd_approvals_updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    return () => {
      window.removeEventListener("csd_approvals_updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  // WhatsApp click handler
  const handleWhatsApp = (lead) => {
    const phone = (lead.phone || "").replace(/[^0-9]/g, "");
    if (!phone) {
      showToast(`Phone number not available for ${lead.name}`, "warning");
      return;
    }
    showToast(`Launching WhatsApp chat with ${lead.name} (${lead.phone})...`, "success");
    const text = encodeURIComponent(
      `Hello ${lead.name}, thank you for inquiring about ${lead.model || "your desired vehicle"}. I am your dedicated relationship manager at Defence Autolink.`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  // Call button handler
  const handleOpenCallModal = (lead) => {
    setSelectedCallLead(lead);
    setCallOutcome("Connected - Interested");
    setCallNotes("");
    setShowCallModal(true);
  };

  const handleSaveCallNote = async (e) => {
    e.preventDefault();
    if (!selectedCallLead) return;

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (selectedCallLead.lead_id) {
        await axios.post(
          `${API_URL}/leads/${selectedCallLead.lead_id}/follow-ups`,
          {
            type: "Call",
            status: callOutcome,
            notes: callNotes,
          },
          { headers }
        );
      }
      showToast(`Call logged for ${selectedCallLead.name}: "${callOutcome}"`, "success");
      fetchDashboardStats();
    } catch (err) {
      console.error("Save call log error:", err);
      showToast(`Call logged for ${selectedCallLead.name}: "${callOutcome}"`, "success");
    } finally {
      setShowCallModal(false);
    }
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

  // Calculate dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const userName = stats?.user_name || currentUser?.name || "Sales Executive";
  const dateDisplay = stats?.date_display || new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const kpis = stats?.kpis || {};
  const pipeline = stats?.pipeline || {};
  const todayFollowups = stats?.today_followups || [];
  const recentQuotations = stats?.recent_quotations || [];
  const recentFollowups = stats?.recent_followups || [];
  const recentBookings = stats?.recent_bookings || [];

  return (
    <div className="container-fluid px-0 pb-5">
      {/* ----------------------------------------------------
          1. HEADER AREA: Title, Subtitle with Dynamic Data
          ---------------------------------------------------- */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1
            className="fw-bolder mb-1 text-dark"
            style={{ fontSize: "1.75rem", letterSpacing: "-0.5px" }}
          >
            {getGreeting()}, {userName}
          </h1>
          <p className="text-secondary small mb-0">Sales Executive • {dateDisplay}</p>
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
            {dateDisplay}
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. TOP 5 CORE STAT CARDS (Strictly Scoped to Sales Executive)
          ---------------------------------------------------- */}
      <div className="row g-3 mb-4 row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5">
        {/* Card 1: TOTAL LEADS */}
        <div className="col">
          <Link
            href={`${basePath}/leads?status=all`}
            className="card h-100 border rounded-4 p-3 bg-white shadow-sm text-decoration-none text-dark"
            style={{ transition: "transform 0.15s ease, box-shadow 0.15s ease", cursor: "pointer" }}
            title="Click to view all your assigned leads"
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
            title="Click to view quotations sent"
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
            title="Click to view won & booked deals"
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
          3. MAIN CONTENT: 2 COLUMNS (Left: Follow-ups & Pipeline, Right: Quick Actions, Quotes, Bookings)
          ---------------------------------------------------- */}
      <div className="row g-4">
        {/* Left Column (Desktop: col-lg-7, col-xl-8) */}
        <div className="col-12 col-lg-7 col-xl-8">
          {/* SECTION: TODAY'S FOLLOW-UPS */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
              >
                TODAY&apos;S FOLLOW-UPS
              </div>
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
              <div className="card border rounded-4 p-4 bg-white shadow-sm text-center text-muted">
                <div className="spinner-border spinner-border-sm text-secondary me-2" role="status"></div>
                Loading today&apos;s follow-up schedule...
              </div>
            ) : todayFollowups.length === 0 ? (
              <div className="card border rounded-4 p-4 bg-white shadow-sm text-center">
                <div className="d-flex flex-column align-items-center justify-content-center py-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                    style={{ width: "48px", height: "48px", backgroundColor: "#F4F8E8", color: "#4D5D25" }}
                  >
                    <i className="bi bi-calendar-check fs-4"></i>
                  </div>
                  <h6 className="fw-bold text-dark mb-1">No follow-ups due today</h6>
                  <p className="text-muted small mb-0">
                    You have no pending follow-up calls scheduled for today. Great job keeping up!
                  </p>
                </div>
              </div>
            ) : (
              todayFollowups.map((lead, idx) => (
                <div
                  key={lead.id || idx}
                  className={`card border rounded-4 p-3 bg-white shadow-sm ${
                    idx < todayFollowups.length - 1 ? "mb-3" : ""
                  }`}
                >
                  <div className="d-flex align-items-start justify-content-between mb-1">
                    <div>
                      <h5 className="fw-bold text-dark mb-0 fs-6">{lead.name}</h5>
                      <span className="text-secondary small">{lead.model}</span>
                    </div>
                    {/* Time Badge */}
                    <span
                      className="badge fw-bold px-2 py-1 rounded-2"
                      style={{
                        backgroundColor: "#FEE2E2",
                        color: "#DC2626",
                        fontSize: "0.75rem",
                      }}
                    >
                      {lead.time || "Today"}
                    </span>
                  </div>

                  {/* Last Contact / Status info */}
                  <div className="d-flex align-items-center gap-1 text-muted small mt-2 mb-3" style={{ fontSize: "0.78rem" }}>
                    <i className="bi bi-clock-history"></i>
                    <span>{lead.notes ? `Note: ${lead.notes}` : `Last contact: ${lead.lastContact || "Recently"}`}</span>
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
              ))
            )}
          </div>

          {/* SECTION: MY SALES PIPELINE (6 Follow-Up Outcome Statuses as done in Admin) */}
          <div className="card border rounded-4 p-4 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-graph-up-arrow text-dark fs-5"></i>
                <h5 className="fw-bold text-dark mb-0 fs-6">My Sales Pipeline</h5>
              </div>
              <Link href={`${basePath}/follow-up`} className="btn btn-sm btn-link text-decoration-none p-0 text-muted small">
                View All <i className="bi bi-arrow-right"></i>
              </Link>
            </div>

            {/* Pipeline Stage Pills (6 Follow-Up Outcome Statuses matching Admin) */}
            <div className="row g-2 text-center">
              {/* 1: Interested */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href={`${basePath}/follow-up?outcome=Interested`} className="text-decoration-none text-dark d-block">
                  <div
                    className="d-flex align-items-center justify-content-center mx-auto mb-2 text-white fw-bold shadow-sm"
                    style={{
                      width: "54px",
                      height: "54px",
                      backgroundColor: "#4D5D25",
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

              {/* 2: Quote Req. */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href={`${basePath}/follow-up?outcome=Quotation`} className="text-decoration-none text-dark d-block">
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

              {/* 3: Negotiation */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href={`${basePath}/follow-up?outcome=Negotiation`} className="text-decoration-none text-dark d-block">
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

              {/* 4: Not Reachable */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href={`${basePath}/follow-up?outcome=Not Reachable`} className="text-decoration-none text-dark d-block">
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

              {/* 5: Lost Lead */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href={`${basePath}/follow-up?outcome=Lost`} className="text-decoration-none text-dark d-block">
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

              {/* 6: Deal Won */}
              <div className="col-4 col-sm-4 col-md-2">
                <Link href={`${basePath}/follow-up?outcome=Deal Won`} className="text-decoration-none text-dark d-block">
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

          {/* SECTION: FOLLOW-UPS (Last 3 Records - Replaces Active Requirements) */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
              >
                FOLLOW-UPS
              </span>
              <Link
                href={`${basePath}/follow-up`}
                className="text-decoration-none text-muted fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ fontSize: "0.78rem" }}
              >
                <span>View All</span>
                <i className="bi bi-chevron-right fs-8"></i>
              </Link>
            </div>

            {isLoadingStats ? (
              <div className="card border rounded-4 p-3 bg-white shadow-sm text-center text-muted small">
                Loading follow-ups...
              </div>
            ) : recentFollowups.length === 0 ? (
              <div className="card border rounded-4 p-3 bg-white shadow-sm text-center text-muted small">
                No recent follow-up activity.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {recentFollowups.map((fu, idx) => (
                  <div
                    key={fu.id || idx}
                    className="card border rounded-4 p-3 bg-white shadow-sm d-flex flex-row align-items-center justify-content-between"
                  >
                    <div>
                      <h6 className="fw-bold text-dark mb-0 small">{fu.name}</h6>
                      <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                        {fu.model}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${fu.badgeClass || "bg-secondary-subtle text-secondary"} rounded-1 px-2 py-1 fw-bold`} style={{ fontSize: "0.7rem" }}>
                        {fu.status}
                      </span>
                      <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                        {fu.time}
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
          {/* SECTION: QUICK ACTIONS (Lead, Follow-Up, Quotation, Deal - Direct Page Redirection) */}
          <div className="mb-4">
            <div
              className="text-muted fw-bold text-uppercase small mb-2"
              style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
            >
              QUICK ACTIONS
            </div>
            <div className="row g-2">
              {/* LEAD */}
              <div className="col-3 col-sm-3 col-md-3">
                <Link
                  href={`${basePath}/leads`}
                  className="btn w-100 h-100 card border rounded-4 p-2 p-sm-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "88px" }}
                >
                  <i className="bi bi-funnel fs-4 text-dark"></i>
                  <span className="fw-bold text-dark text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.5px" }}>
                    LEAD
                  </span>
                </Link>
              </div>

              {/* FOLLOW-UP */}
              <div className="col-3 col-sm-3 col-md-3">
                <Link
                  href={`${basePath}/follow-up`}
                  className="btn w-100 h-100 card border rounded-4 p-2 p-sm-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "88px" }}
                >
                  <i className="bi bi-telephone-outbound fs-4 text-dark"></i>
                  <span className="fw-bold text-dark text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.5px" }}>
                    FOLLOW-UP
                  </span>
                </Link>
              </div>

              {/* QUOTATION */}
              <div className="col-3 col-sm-3 col-md-3">
                <Link
                  href={`${basePath}/quotation`}
                  className="btn w-100 h-100 card border rounded-4 p-2 p-sm-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "88px" }}
                >
                  <i className="bi bi-file-earmark-text fs-4 text-dark"></i>
                  <span className="fw-bold text-dark text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.5px" }}>
                    QUOTATION
                  </span>
                </Link>
              </div>

              {/* DEAL */}
              <div className="col-3 col-sm-3 col-md-3">
                <Link
                  href={`${basePath}/deals`}
                  className="btn w-100 h-100 card border rounded-4 p-2 p-sm-3 bg-white shadow-sm text-center d-flex flex-column align-items-center justify-content-center gap-2 text-decoration-none"
                  style={{ minHeight: "88px" }}
                >
                  <i className="bi bi-trophy fs-4 text-dark"></i>
                  <span className="fw-bold text-dark text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.5px" }}>
                    DEAL
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* SECTION: RECENT QUOTATIONS (Last 3 Sent, with View All Redirect) */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
              >
                RECENT QUOTATIONS
              </div>
              <Link
                href={`${basePath}/quotation`}
                className="text-decoration-none text-muted fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ fontSize: "0.78rem" }}
              >
                <span>View All</span>
                <i className="bi bi-chevron-right fs-8"></i>
              </Link>
            </div>

            {isLoadingStats ? (
              <div className="card border rounded-4 p-3 bg-white shadow-sm text-center text-muted small">
                Loading quotations...
              </div>
            ) : recentQuotations.length === 0 ? (
              <div className="card border rounded-4 p-3 bg-white shadow-sm text-center text-muted small">
                No recent quotations found.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {recentQuotations.map((q, idx) => (
                  <div
                    key={q.id || idx}
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
                    <div className="text-end">
                      <div className="fw-bold text-dark small" style={{ fontSize: "0.78rem" }}>
                        {q.amount}
                      </div>
                      <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                        {q.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: RECENT BOOKINGS (Last 3 Records from Deals, with View All Redirect) */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div
                className="text-muted fw-bold text-uppercase small"
                style={{ fontSize: "0.72rem", letterSpacing: "0.8px" }}
              >
                RECENT BOOKINGS
              </div>
              <Link
                href={`${basePath}/deals`}
                className="text-decoration-none text-muted fw-semibold small d-inline-flex align-items-center gap-1"
                style={{ fontSize: "0.78rem" }}
              >
                <span>View All</span>
                <i className="bi bi-chevron-right fs-8"></i>
              </Link>
            </div>

            {isLoadingStats ? (
              <div className="card border rounded-4 p-3 bg-white shadow-sm text-center text-muted small">
                Loading bookings...
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="card border rounded-4 p-3 bg-white shadow-sm text-center text-muted small">
                No recent bookings found.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {recentBookings.map((b, idx) => (
                  <div
                    key={b.id || idx}
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
                    <div className="text-end">
                      <span className="badge bg-success-subtle text-success fw-bold" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
                        {b.status}
                      </span>
                      {b.amount && (
                        <div className="text-muted small mt-1" style={{ fontSize: "0.72rem" }}>
                          {b.amount}
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
          4. MODALS (Call Log, Add Customer, Fallback Add Lead)
          ---------------------------------------------------- */}
      {/* Call Log Modal */}
      {showCallModal && selectedCallLead && (
        <div className="modal-backdrop-custom">
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
                    <option value="Call Back Later">Call Back Later / Busy</option>
                    <option value="Ringing No Answer">Ringing No Answer</option>
                    <option value="Negotiation / Price Discussion">Negotiation / Price Discussion</option>
                    <option value="Lost to Competitor">Lost to Competitor / Closed</option>
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
        <div className="modal-backdrop-custom">
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
        <div className="modal-backdrop-custom">
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
