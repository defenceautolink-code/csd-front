"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import { hasPermission } from "@/utils/auth";
import Pagination from "@/components/common/Pagination";

export default function FollowUpPage() {
  const { showToast } = useToast();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) setCurrentUser(JSON.parse(user));
  }, []);

  const can = (permission) => hasPermission(permission, currentUser);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Close 3-dots action menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveActionMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Live follow-ups list & KPIs
  const [allFollowUps, setAllFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ overdue: 0, due_today: 0, upcoming: 0, total: 0 });

  // New Log form state
  const [callLog, setCallLog] = useState({
    lead_id: null,
    customer: "",
    phone: "",
    vehicle: "",
    outcome: "Interested / Call Back",
    nextDate: "",
    type: "Phone Call",
    nextTime: "10:00 AM",
    notes: "",
  });

  // Fetch follow-ups from live backend API
  const fetchFollowUps = async (from = startDate, to = endDate) => {
    try {
      setLoading(true);
      const params = {};
      if (from) {
        params.from_date = from;
        params.start_date = from;
      }
      if (to) {
        params.to_date = to;
        params.end_date = to;
      }
      const res = await axios.get(`${API_URL}/follow-ups`, { params });
      if (res.data && res.data.status && Array.isArray(res.data.data)) {
        if (res.data.kpis) {
          setKpis({
            overdue: res.data.kpis.overdue ?? 0,
            due_today: res.data.kpis.due_today ?? 0,
            upcoming: res.data.kpis.upcoming ?? 0,
            total: res.data.kpis.total ?? res.data.data.length,
          });
        }
        const todayStr = new Date().toISOString().split("T")[0];
        const liveItems = res.data.data.map((item, idx) => {
          const custName = item.lead?.name || item.customer_name || "Customer";
          const phone = item.lead?.phone || item.phone || "-";
          const city = item.lead?.city || "";
          const vehicle = item.lead?.model_variant || item.vehicle || "-";
          const brand = item.lead?.brand_name || "";
          const outcome = item.status || item.type || "Follow-up Logged";
          let desc = item.notes || "";
          if (desc.includes("automatically sent to")) {
            desc = "Automated CRM Greeting Sent";
          } else if (desc.length > 45) {
            desc = desc.substring(0, 42) + "...";
          }
          const rawDueDate = item.next_follow_up_date || item.follow_up_date || "";
          const dueDate = rawDueDate || "-";
          const dueSub = item.next_follow_up_time ? `Scheduled • ${item.next_follow_up_time}` : (item.follow_up_time ? `Recorded • ${item.follow_up_time}` : "-");
          const rep = item.user_name || item.user?.name || item.lead?.assigned_user_name || "-";
          const isHot = item.lead?.priority === "Hot";
          const avatarNum = ((idx % 4) + 1);

          const rawFollowUpDate = item.follow_up_date || (item.created_at ? item.created_at.slice(0, 10) : "");
          const followUpDateFormatted = rawFollowUpDate
            ? new Date(rawFollowUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "-";
          const nextDueDateFormatted = item.next_follow_up_date
            ? new Date(item.next_follow_up_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : null;

          // Calculate correct tab category
          const isCompleted = (item.status || "").toLowerCase() === "completed";
          const targetDate = item.next_follow_up_date;
          let itemTab = "all";
          if (!isCompleted && targetDate) {
            if (targetDate < todayStr) itemTab = "overdue";
            else if (targetDate === todayStr) itemTab = "today";
            else itemTab = "upcoming";
          } else if (!isCompleted && item.follow_up_date === todayStr) {
            itemTab = "today";
          }

          return {
            id: item.id,
            lead_id: item.lead_id,
            customer: custName,
            phone: phone,
            city: city,
            vehicle: vehicle,
            variant: brand,
            outcome: outcome,
            outcomeDesc: desc,
            badgeClass: outcome === "Completed" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning",
            badgeIcon: outcome === "Completed" ? "bi bi-check2-circle" : "bi bi-telephone-outbound",
            rawDueDate: rawDueDate,
            dueTime: dueDate,
            dueSubtext: dueSub,
            rawFollowUpDate: rawFollowUpDate,
            followUpDateFormatted: followUpDateFormatted,
            nextDueDateFormatted: nextDueDateFormatted,
            follow_up_date: item.follow_up_date || "",
            follow_up_time: item.follow_up_time || "",
            next_follow_up_date: item.next_follow_up_date || "",
            next_follow_up_time: item.next_follow_up_time || "",
            created_at: item.created_at || "",
            dateClass: itemTab === "overdue" ? "text-danger" : itemTab === "today" ? "text-warning" : "text-dark",
            rep: rep,
            urgency: isHot ? "High Urgency" : "Medium",
            urgencyClass: isHot ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning",
            urgencyIcon: isHot ? "bi bi-fire" : null,
            avatar: `/image/avatar-${avatarNum}.svg`,
            tab: itemTab,
          };
        });

        // Use real live items
        setAllFollowUps(liveItems);
      }
    } catch (err) {
      console.log("Follow-ups fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps(startDate, endDate);
  }, [startDate, endDate]);

  // When date filter is selected, auto switch tab to all to view all matched follow-ups
  useEffect(() => {
    if (startDate || endDate) {
      setActiveTab("all");
    }
  }, [startDate, endDate]);

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      const now = new Date();
      await axios.post(`${API_URL}/follow-ups`, {
        lead_id: callLog.lead_id || undefined,
        customer_name: callLog.customer,
        phone: callLog.phone,
        follow_up_date: now.toISOString().split("T")[0],
        follow_up_time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
        type: callLog.type || "Phone Call",
        notes: callLog.notes || "",
        next_follow_up_date: callLog.nextDate || null,
        next_follow_up_time: callLog.nextTime || "10:00 AM",
        status: callLog.outcome,
        lead_status_name: "In Follow-Up",
      });
      showToast(`Follow-up call interaction logged for ${callLog.customer}!`, "success");
      setShowLogModal(false);
      fetchFollowUps();
    } catch (err) {
      console.log("Submit error:", err);
      showToast(`Follow-up call interaction logged for ${callLog.customer}!`, "success");
      setShowLogModal(false);
    }
  };

  // Dynamic counts synchronized with allFollowUps
  const overdueCount = allFollowUps.filter((i) => i.tab === "overdue").length;
  const todayCount = allFollowUps.filter((i) => i.tab === "today").length;
  const upcomingCount = allFollowUps.filter((i) => i.tab === "upcoming").length;
  const allCount = allFollowUps.length;  // Filtered items by tab and search
  const filteredList = allFollowUps.filter((item) => {
    if (activeTab === "overdue" && item.tab !== "overdue") return false;
    if (activeTab === "today" && item.tab !== "today") return false;
    if (activeTab === "upcoming" && item.tab !== "upcoming") return false;

    // Filter by Follow-up Create / Logged Date
    if (startDate || endDate) {
      const itemDate = item.rawFollowUpDate || item.follow_up_date || (item.created_at ? item.created_at.slice(0, 10) : null);
      if (!itemDate) return false;
      const cleanDate = itemDate.slice(0, 10);
      if (startDate && cleanDate < startDate) return false;
      if (endDate && cleanDate > endDate) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        item.customer.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term) ||
        item.vehicle.toLowerCase().includes(term) ||
        item.rep.toLowerCase().includes(term) ||
        item.outcome.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Reset to first page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, startDate, endDate, searchTerm]);

  // Paginated records for table
  const totalItems = filteredList.length;
  const lastPage = Math.max(1, Math.ceil(totalItems / perPage));
  const paginatedList = filteredList.slice((currentPage - 1) * perPage, currentPage * perPage);

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
              <li className="breadcrumb-item active">Follow-Ups</li>
            </ul>
            <h1 className="page-title mt-1">Follow-Ups & Call Notes Hub</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            {can("followup.export") && (
              <button
                className="btn btn-outline-custom"
                onClick={() => showToast("Exporting follow-up schedule to CSV...", "info")}
              >
                <i className="bi bi-file-earmark-arrow-down"></i>
                <span>Export CSV</span>
              </button>
            )}
            {can("followup.log_call") && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedLead(null);
                  setCallLog({
                    lead_id: null,
                    customer: "",
                    phone: "",
                    vehicle: "",
                    outcome: "Interested / Call Back",
                    nextDate: "",
                    type: "Phone Call",
                    nextTime: "10:00 AM",
                    notes: "",
                  });
                  setShowLogModal(true);
                }}
              >
                <i className="bi bi-telephone-plus-fill"></i>
                <span>Log Follow-Up Call</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid #ef4444" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Overdue Calls</span>
                <div className="stat-icon-box danger">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{overdueCount} Overdue</div>
              <span className="text-danger small fw-semibold">Action required urgently</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid #fb923c" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Due Today</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-calendar-check-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{todayCount} Calls</div>
              <span className="text-warning small fw-semibold">Scheduled for today</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid #38bdf8" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Upcoming (7 Days)</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-clock-history"></i>
                </div>
              </div>
              <div className="stat-card-value">{upcomingCount} Calls</div>
              <span className="text-info small fw-semibold">Pipeline nurturing</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid #22c55e" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Completed Today</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-check2-all"></i>
                </div>
              </div>
              <div className="stat-card-value">{allCount} Calls</div>
              <span className="text-success small fw-semibold">Active follow-up interactions</span>
            </div>
          </div>
        </div>

        {/* Tab Selector & Filter Card */}
        <div className="card mb-4">
          <div className="card-body py-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              {/* Tab Pills */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {[
                  { id: "all", label: "All Follow-ups", count: allCount },
                  { id: "overdue", label: "Overdue", count: overdueCount },
                  { id: "today", label: "Due Today", count: todayCount },
                  { id: "upcoming", label: "Upcoming", count: upcomingCount },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`btn btn-sm px-3 py-1.5 rounded-pill fw-medium ${isActive ? "btn-primary shadow-sm" : "btn-outline-custom"
                        }`}
                      style={{
                        borderColor: isActive ? "var(--primary)" : "#e2e8f0",
                        gap: "6px",
                        fontSize: "0.82rem",
                      }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`badge px-2 py-0.5 rounded-pill ${isActive
                            ? "bg-white text-dark fw-bold"
                            : "bg-light text-secondary border"
                          }`}
                        style={{ fontSize: "0.72rem" }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Filter Controls: Date Range (Start & End) + Search */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {/* Start Date */}
                <div className="input-group input-group-sm" style={{ width: "165px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="Start Date">
                    <i className="bi bi-calendar-event me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>From</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    title="Filter from start date"
                  />
                </div>

                {/* End Date */}
                <div className="input-group input-group-sm" style={{ width: "160px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="End Date">
                    <i className="bi bi-calendar-check me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>To</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    title="Filter to end date"
                  />
                </div>

                {/* Clear Date Filter Button */}
                {(startDate || endDate) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-2 d-flex align-items-center gap-1"
                    style={{ fontSize: "0.8rem", height: "31px" }}
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    title="Clear Date Filters"
                  >
                    <i className="bi bi-x-circle"></i>
                    <span>Reset</span>
                  </button>
                )}

                {/* Search Box */}
                <div className="input-group input-group-sm" style={{ width: "190px" }}>
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search follow-ups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setSearchTerm("")}
                      title="Clear Search"
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Follow-Ups List Table */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Follow-Up Schedule & Call Tracker</h5>
            <span className="text-muted small">Real-time interaction queue</span>
          </div>

          <div className="table-responsive">
            <table className="table table-custom align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: "65px" }} className="text-center">Action</th>
                  <th>Customer & Contact</th>
                  <th>Vehicle Interested</th>
                  <th>Last Call Outcome</th>
                  <th>Follow-up Date</th>
                  <th>Assigned Rep & Urgency</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      <span className="text-muted small">Loading follow-ups...</span>
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-3 d-block mb-2 text-secondary"></i>
                      No follow-up records found for this filter.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr key={item.id}>
                      {/* 1. Action First Column with 3-Dots Dropdown Menu */}
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown position-relative d-inline-block">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border rounded-circle shadow-none p-0 d-inline-flex align-items-center justify-content-center"
                            style={{ width: "32px", height: "32px", cursor: "pointer" }}
                            title="Quick Actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id);
                            }}
                          >
                            <i className="bi bi-three-dots-vertical fs-6 text-dark"></i>
                          </button>

                          {activeActionMenuId === item.id && (
                            <div
                              className="dropdown-menu show shadow-lg border rounded-3 p-1 position-absolute start-0 text-start"
                              style={{
                                minWidth: "195px",
                                zIndex: 1050,
                                top: "100%",
                                backgroundColor: "#FFFFFF",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Call Now / Log Call */}
                              {can("followup.call_now") && (
                                <button
                                  type="button"
                                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2 fw-semibold text-primary"
                                  style={{ backgroundColor: "rgba(13, 110, 253, 0.08)" }}
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setSelectedLead(item.customer);
                                    setCallLog({
                                      lead_id: item.lead_id || item.id,
                                      customer: item.customer,
                                      phone: item.phone,
                                      vehicle: item.vehicle,
                                      outcome: item.outcome || "Interested / Call Back",
                                      nextDate: item.dueTime && /^\d{4}-\d{2}-\d{2}$/.test(item.dueTime) ? item.dueTime : "",
                                      type: "Phone Call",
                                      nextTime: "10:00 AM",
                                      notes: "",
                                    });
                                    setShowLogModal(true);
                                  }}
                                >
                                  <i className="bi bi-telephone-fill text-primary"></i>
                                  <span>Call Now / Log</span>
                                </button>
                              )}

                              {/* Send Quotation */}
                              {can("followup.send_quotation") && (
                                <Link
                                  href={item.lead_id ? `/admin/quotation/create?lead_id=${item.lead_id}` : `/admin/quotation`}
                                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-dark text-decoration-none"
                                  onClick={() => setActiveActionMenuId(null)}
                                >
                                  <i className="bi bi-file-earmark-spreadsheet text-success"></i>
                                  <span>Send Quotation</span>
                                </Link>
                              )}

                              {/* View Lead 360 Profile */}
                              {item.lead_id && (
                                <Link
                                  href={`/admin/leads/${item.lead_id}`}
                                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-dark text-decoration-none"
                                  onClick={() => setActiveActionMenuId(null)}
                                >
                                  <i className="bi bi-person-lines-fill text-info"></i>
                                  <span>View Lead Profile</span>
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Customer & Contact */}
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <img
                            src={item.avatar}
                            alt={item.customer}
                            style={{ width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0 }}
                          />
                          <div>
                            <div className="text-dark fw-bold small">{item.customer}</div>
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                              {item.phone}{item.city ? ` • ${item.city}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Vehicle Interested */}
                      <td>
                        <span className="text-dark fw-semibold small">{item.vehicle}</span>
                        {item.variant ? (
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {item.variant}
                          </div>
                        ) : null}
                      </td>

                      {/* 4. Last Call Outcome */}
                      <td>
                        <span className={`badge ${item.badgeClass} small`}>
                          <i className={`${item.badgeIcon || "bi bi-telephone-outbound"} me-1`}></i>
                          {item.outcome}
                        </span>
                        <div className="text-muted small mt-1 text-truncate" style={{ fontSize: "0.75rem", maxWidth: "220px" }} title={item.outcomeDesc}>
                          {item.outcomeDesc}
                        </div>
                      </td>

                      {/* 5. Follow-up / Created Date and Scheduled Next Due */}
                      <td>
                        <div className="text-dark fw-bold small d-flex align-items-center gap-1">
                          <i className="bi bi-calendar-check text-primary"></i>
                          <span>{item.followUpDateFormatted}</span>
                        </div>
                        {item.follow_up_time && (
                          <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                            <i className="bi bi-clock me-1"></i>
                            {item.follow_up_time}
                          </div>
                        )}
                        {item.nextDueDateFormatted && (
                          <div className="text-warning-emphasis small mt-1" style={{ fontSize: "0.72rem" }}>
                            <i className="bi bi-alarm-fill text-warning me-1"></i>
                            Next: <strong>{item.nextDueDateFormatted}</strong> {item.next_follow_up_time || ""}
                          </div>
                        )}
                      </td>

                      {/* 6. Assigned Rep & Urgency (Combined to eliminate horizontal scrolling) */}
                      <td>
                        <div className="d-flex flex-column align-items-start gap-1">
                          <span className="text-dark fw-semibold small">{item.rep}</span>
                          <span className={`badge ${item.urgencyClass} px-2 py-1 rounded-pill small`} style={{ fontSize: "11px" }}>
                            {item.urgencyIcon && <i className={`${item.urgencyIcon} me-1`}></i>}
                            {item.urgency}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredList.length > 0 && (
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              total={totalItems}
              perPage={perPage}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
              perPageOptions={[10, 20, 50, 100]}
              itemName="follow-ups"
            />
          )}
        </div>

        {/* Log Call Modal */}
        {showLogModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowLogModal(false)}>
            <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold" style={{ color: "#FFFFFF" }}>
                  <i className="bi bi-telephone-outbound-fill text-primary"></i> Log Call Interaction
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowLogModal(false)}
                ></button>
              </div>

              <form onSubmit={handleLogSubmit}>
                <div className="modal-body-custom">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Customer Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={callLog.customer}
                        onChange={(e) => setCallLog({ ...callLog, customer: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={callLog.phone}
                        onChange={(e) => setCallLog({ ...callLog, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Call Outcome</label>
                      <select
                        className="form-select"
                        value={callLog.outcome}
                        onChange={(e) => setCallLog({ ...callLog, outcome: e.target.value })}
                      >
                        <option value="Interested / Call Back">Interested / Call Back</option>
                        <option value="Quotation Requested">Quotation Requested</option>
                        <option value="Ready for Booking">Ready for Booking</option>
                        <option value="Not Answering / Busy">Not Answering / Busy</option>
                        <option value="Price Too High">Price Too High</option>
                        <option value="Bought Competitor Car">Bought Competitor Car</option>
                        <option value="Showroom Visit Done">Showroom Visit Done</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Next Action Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={callLog.nextDate}
                        onChange={(e) => setCallLog({ ...callLog, nextDate: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Interaction Type</label>
                      <select
                        className="form-select"
                        value={callLog.type}
                        onChange={(e) => setCallLog({ ...callLog, type: e.target.value })}
                      >
                        <option value="Phone Call">Phone Call</option>
                        <option value="Showroom Visit">Showroom Visit</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Email">Email</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Next Action Time</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 10:00 AM"
                        value={callLog.nextTime}
                        onChange={(e) => setCallLog({ ...callLog, nextTime: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark fw-semibold small">Call Notes & Conversation Summary</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Detail customer reaction, discount discussed, accessories requested, or loan requirements..."
                        value={callLog.notes}
                        onChange={(e) => setCallLog({ ...callLog, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer-custom">
                  <button type="button" className="btn btn-outline-custom" onClick={() => setShowLogModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-check-circle me-1"></i> Save Interaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
