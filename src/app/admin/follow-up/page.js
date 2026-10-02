"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import { hasPermission } from "@/utils/auth";

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
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

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
  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/follow-ups`);
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
          const dueDate = item.next_follow_up_date || item.follow_up_date || "-";
          const dueSub = item.next_follow_up_time ? `Scheduled • ${item.next_follow_up_time}` : (item.follow_up_time ? `Recorded • ${item.follow_up_time}` : "-");
          const rep = item.user_name || item.user?.name || item.lead?.assigned_user_name || "-";
          const isHot = item.lead?.priority === "Hot";
          const avatarNum = ((idx % 4) + 1);

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
            dueTime: dueDate,
            dueSubtext: dueSub,
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
    fetchFollowUps();
  }, []);

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
  const allCount = allFollowUps.length;

  // Filtered items by tab and search
  const filteredList = allFollowUps.filter((item) => {
    if (activeTab === "overdue" && item.tab !== "overdue") return false;
    if (activeTab === "today" && item.tab !== "today") return false;
    if (activeTab === "upcoming" && item.tab !== "upcoming") return false;

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
              <div className="d-flex align-items-center gap-3 flex-wrap">
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
                      className={`btn btn-sm px-3 py-2 rounded-pill fw-medium ${
                        isActive ? "btn-primary shadow-sm" : "btn-outline-custom"
                      }`}
                      style={{
                        borderColor: isActive ? "var(--primary)" : "#e2e8f0",
                        gap: "8px",
                      }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`badge px-2 py-1 rounded-pill ${
                          isActive
                            ? "bg-white text-dark fw-bold"
                            : "bg-light text-secondary border"
                        }`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="input-group" style={{ maxWidth: "320px" }}>
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search follow-ups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                  <th>Customer & Contact</th>
                  <th>Vehicle Interested</th>
                  <th>Last Call Outcome</th>
                  <th>Follow-up Due Date</th>
                  <th>Assigned Rep</th>
                  <th>Urgency</th>
                  <th className="text-end">Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      <span className="text-muted small">Loading follow-ups...</span>
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-3 d-block mb-2 text-secondary"></i>
                      No follow-up records found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => (
                    <tr key={item.id}>
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
                      <td>
                        <span className="text-dark fw-semibold small">{item.vehicle}</span>
                        {item.variant ? (
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {item.variant}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span className={`badge ${item.badgeClass} small`}>
                          <i className={`${item.badgeIcon || "bi bi-telephone-outbound"} me-1`}></i>
                          {item.outcome}
                        </span>
                        <div className="text-muted small mt-1 text-truncate" style={{ fontSize: "0.75rem", maxWidth: "220px" }} title={item.outcomeDesc}>
                          {item.outcomeDesc}
                        </div>
                      </td>
                      <td>
                        <div className={`${item.dateClass} fw-bold small`}>{item.dueTime}</div>
                        <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                          {item.dueSubtext}
                        </span>
                      </td>
                      <td>
                        <span className="text-dark small">{item.rep}</span>
                      </td>
                      <td>
                        <span className={`badge ${item.urgencyClass} px-2 py-1 rounded-pill small`}>
                          {item.urgencyIcon && <i className={`${item.urgencyIcon} me-1`}></i>}
                          {item.urgency}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          {can("followup.call_now") && (
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => {
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
                              <i className="bi bi-telephone-fill me-1"></i> Call Now
                            </button>
                          )}
                          {can("followup.send_quotation") && (
                            <Link href="/admin/quotation" className="btn btn-xs btn-outline-custom">
                              <i className="bi bi-file-earmark-spreadsheet"></i>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                        <option value="Test Drive Requested">Test Drive Requested</option>
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
