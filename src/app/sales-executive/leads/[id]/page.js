"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminLayout from "@/app/components/AdminLayout";
import { salesExecutiveApi } from "@/lib/salesExecutiveApi";
import { useToast } from "@/app/components/Toast";

export default function SalesExecutiveLeadDetailsPage({ params }) {
  // Unwrap params in Next.js 15/16
  const unwrappedParams = typeof params?.then === "function" ? use(params) : params;
  const leadId = unwrappedParams?.id;

  const router = useRouter();
  const { showToast } = useToast();

  const [lead, setLead] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Follow-Up Form State
  const todayStr = new Date().toISOString().split("T")[0];
  const currentTimeStr = new Date().toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    follow_up_date: todayStr,
    follow_up_time: currentTimeStr,
    type: "Call",
    notes: "",
    next_follow_up_date: "",
    next_follow_up_time: "11:00",
    status: "Completed",
    lead_status_name: "",
  });

  // Fetch Lead Details & Follow-Ups
  const fetchLeadData = async () => {
    if (!leadId) return;

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        window.location.href = "/login";
        return;
      }
    }

    setIsLoading(true);
    try {
      const [leadRes, historyRes, statusRes] = await Promise.all([
        salesExecutiveApi.getLeadDetails(leadId),
        salesExecutiveApi.getFollowUps(leadId).catch(() => ({ data: [] })),
        salesExecutiveApi.getLeadStatuses().catch(() => ({ data: [] })),
      ]);

      if (leadRes && leadRes.status && leadRes.data) {
        setLead(leadRes.data);
        setFormData((prev) => ({
          ...prev,
          lead_status_name: leadRes.data.status_name || "In Follow-Up",
        }));
      }

      if (historyRes && historyRes.status) {
        setFollowUps(historyRes.data || []);
      }
      if (statusRes && statusRes.data) {
        setLeadStatuses(statusRes.data || []);
      }
    } catch (error) {
      console.log("Error fetching lead details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLeadData();
    }
  }, [leadId]);

  // Handle Form Submit
  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();

    if (!formData.follow_up_date) {
      showToast("Please enter follow-up date.", "error");
      return;
    }
    if (!formData.type) {
      showToast("Please select interaction type.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        follow_up_date: formData.follow_up_date,
        follow_up_time: formData.follow_up_time || null,
        type: formData.type,
        notes: formData.notes || "",
        next_follow_up_date: formData.next_follow_up_date || null,
        next_follow_up_time: formData.next_follow_up_date ? formData.next_follow_up_time : null,
        status: formData.status || "Completed",
        lead_status_name: formData.lead_status_name || null,
      };

      const res = await salesExecutiveApi.createFollowUp(leadId, payload);
      if (res && res.status) {
        showToast("Follow-up interaction recorded successfully!", "success");
        setShowModal(false);
        // Reset dynamic fields
        setFormData((prev) => ({
          ...prev,
          notes: "",
          next_follow_up_date: "",
        }));
        // Refresh data
        fetchLeadData();
      }
    } catch (error) {
      console.error("Error creating follow-up:", error);
      const msg = error.response?.data?.message || "Failed to save follow-up.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case "hot":
        return <span className="badge bg-danger text-white"><i className="bi bi-fire me-1"></i>Hot</span>;
      case "warm":
        return <span className="badge bg-warning text-dark"><i className="bi bi-sun-fill me-1"></i>Warm</span>;
      case "cold":
        return <span className="badge bg-info text-dark"><i className="bi bi-snow me-1"></i>Cold</span>;
      default:
        return <span className="badge bg-secondary">{priority || "Standard"}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "deal won":
      case "converted":
        return <span className="badge bg-success">{status}</span>;
      case "deal lost":
        return <span className="badge bg-danger">{status}</span>;
      case "in follow-up":
      case "in follow up":
        return <span className="badge bg-primary">{status}</span>;
      case "test drive scheduled":
        return <span className="badge bg-info text-dark">{status}</span>;
      case "quotation sent":
      case "negotiation":
        return <span className="badge bg-warning text-dark">{status}</span>;
      default:
        return <span className="badge bg-secondary">{status || "New"}</span>;
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "call":
        return "bi-telephone-fill text-primary";
      case "meeting":
        return "bi-people-fill text-info";
      case "whatsapp":
        return "bi-whatsapp text-success";
      case "email":
        return "bi-envelope-fill text-warning";
      case "visit":
        return "bi-building-fill text-danger";
      default:
        return "bi-chat-dots-fill text-secondary";
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="page-body">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading lead details...</span>
            </div>
            <p className="text-secondary mt-2 small">Loading lead and follow-up history...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!lead) {
    return (
      <AdminLayout>
        <div className="page-body">
          <div className="card p-5 text-center my-4">
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                margin: "0 auto 1rem auto",
              }}
            >
              <i className="bi bi-exclamation-octagon-fill"></i>
            </div>
            <h4 className="fw-bold mb-2">Lead Not Found</h4>
            <p className="text-secondary small mb-3">
              The requested lead does not exist or is not assigned to your account.
            </p>
            <div>
              <Link href="/sales-executive/leads" className="btn btn-primary btn-sm px-4">
                <i className="bi bi-arrow-left me-1"></i> Back to My Assigned Leads
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculate Next Follow-Up summary from lead or latest follow-up
  const nextFollowUpDate =
    lead.latest_follow_up?.next_follow_up_date ||
    (followUps.length > 0 && followUps[0]?.next_follow_up_date);
  const nextFollowUpTime =
    lead.latest_follow_up?.next_follow_up_time ||
    (followUps.length > 0 && followUps[0]?.next_follow_up_time);

  const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");

  return (
    <AdminLayout>
      <div className="page-body pb-5">
        {/* Navigation Breadcrumb & Header Actions */}
        <div className="page-header-wrapper mb-4">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/sales-executive/leads">My Assigned Leads</Link>
              </li>
              <li className="breadcrumb-item active">Lead #{lead.id}</li>
            </ul>
            <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
              <h1 className="page-title mb-0">{lead.name}</h1>
              {getPriorityBadge(lead.priority)}
              {getStatusBadge(lead.status_name)}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {lead.phone && (
              <>
                <a
                  href={`tel:${lead.phone}`}
                  className="btn btn-outline-custom d-flex align-items-center gap-1"
                  title="Direct Call"
                >
                  <i className="bi bi-telephone-fill text-success"></i>
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-custom d-flex align-items-center gap-1"
                  title="Chat on WhatsApp"
                >
                  <i className="bi bi-whatsapp text-success"></i>
                  <span>WhatsApp</span>
                </a>
              </>
            )}

            <Link
              href={`/admin/quotation/create?lead_id=${lead.id}`}
              className="btn btn-outline-custom d-flex align-items-center gap-1 text-warning"
              title="Send Quotation to Customer"
            >
              <i className="bi bi-file-earmark-spreadsheet-fill"></i>
              <span>Send Quotation</span>
            </Link>

            <button
              type="button"
              className="btn btn-primary d-flex align-items-center gap-1 shadow-sm"
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-telephone-plus-fill"></i>
              <span>+ Add Follow Up</span>
            </button>
          </div>
        </div>

        {/* Top KPI Stat-Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid #3b82f6" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Customer</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-person-circle"></i>
                </div>
              </div>
              <div className="stat-card-value fs-5 text-truncate">{lead.name}</div>
              <span className="text-secondary small text-truncate d-block">
                {lead.phone} • {lead.city || "Direct"}
              </span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid #f59e0b" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Vehicle Required</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-car-front-fill"></i>
                </div>
              </div>
              <div className="stat-card-value fs-5 text-truncate">{lead.model_variant || "Not specified"}</div>
              <span className="text-warning small fw-semibold text-truncate d-block">
                {lead.brand_name || lead.brand?.name || "All Brands"} ({lead.vehicle_segment || "4 Wheeler"})
              </span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid #10b981" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Timeline & Priority</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-speedometer2"></i>
                </div>
              </div>
              <div className="stat-card-value fs-5 text-truncate">{lead.purchase_timeline || "1-3 Months"}</div>
              <span className="text-success small fw-semibold">
                Priority: {lead.priority || "Standard"}
              </span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid #8b5cf6" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Follow-Up History</span>
                <div className="stat-icon-box" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}>
                  <i className="bi bi-clock-history"></i>
                </div>
              </div>
              <div className="stat-card-value fs-5">{followUps.length} Recorded</div>
              <span className="text-secondary small">
                {nextFollowUpDate ? `Next due: ${nextFollowUpDate}` : "No scheduled follow-up"}
              </span>
            </div>
          </div>
        </div>

        {/* Scheduled Next Follow-Up Prominent Banner (if scheduled) */}
        {nextFollowUpDate && (
          <div
            className="card mb-4 p-3 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #131C27, #1D2A3A)",
              borderLeft: "5px solid var(--accent-orange)",
            }}
          >
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: "rgba(238, 104, 0, 0.2)",
                    color: "var(--accent-orange)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    flexShrink: 0,
                  }}
                >
                  <i className="bi bi-calendar2-check-fill"></i>
                </div>
                <div>
                  <div className="small fw-bold text-uppercase" style={{ letterSpacing: "0.5px", color: "var(--accent-orange)" }}>
                    Next Scheduled Interaction
                  </div>
                  <div className="text-white fw-bold fs-5">
                    {nextFollowUpDate} {nextFollowUpTime ? `at ${nextFollowUpTime}` : ""}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm fw-bold px-3 shadow-sm"
                onClick={() => setShowModal(true)}
              >
                <i className="bi bi-telephone-plus-fill me-1"></i> Log Outcome
              </button>
            </div>
          </div>
        )}

        {/* Main Content Grid: Left Lead Details, Right Follow-Up Timeline */}
        <div className="row g-4">
          {/* Left Column: Lead Information Cards */}
          <div className="col-12 col-lg-5">
            <div className="d-flex flex-column gap-4">
              {/* Card 1: Customer Contact Information */}
              <div className="card">
                <div className="card-header-custom d-flex align-items-center gap-2">
                  <i className="bi bi-person-badge-fill text-primary fs-5"></i>
                  <h6 className="fw-bold mb-0">Customer Contact Details</h6>
                </div>

                <div className="card-body">
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <span className="text-secondary small d-block">Full Name</span>
                      <span className="fw-semibold fs-6">{lead.name}</span>
                    </div>

                    <div className="row g-3">
                      <div className="col-12 col-sm-6">
                        <span className="text-secondary small d-block">Phone Number</span>
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-primary fw-bold text-decoration-none d-flex align-items-center gap-1 mt-1"
                        >
                          <i className="bi bi-telephone-fill"></i> {lead.phone}
                        </a>
                      </div>
                      <div className="col-12 col-sm-6">
                        <span className="text-secondary small d-block">Email Address</span>
                        {lead.email ? (
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-info text-decoration-none small text-truncate d-block mt-1"
                          >
                            {lead.email}
                          </a>
                        ) : (
                          <span className="text-secondary small mt-1 d-block">Not provided</span>
                        )}
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-6">
                        <span className="text-secondary small d-block">City</span>
                        <span className="small fw-medium">{lead.city || "-"}</span>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary small d-block">State</span>
                        <span className="small fw-medium">{lead.state || "-"}</span>
                      </div>
                    </div>

                    <div className="row g-3 pt-2 border-top border-secondary-subtle">
                      <div className="col-6">
                        <span className="text-secondary small d-block">
                          <i className="bi bi-cake2-fill text-danger me-1"></i> Birthday
                        </span>
                        <span className="small fw-semibold d-flex align-items-center gap-1 mt-1">
                          {lead.birth_date ? new Date(lead.birth_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                          {lead.is_birthday_today && (
                            <span className="badge bg-danger-subtle text-danger px-1 py-0" style={{ fontSize: "9px" }}>
                              🎂 Today!
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary small d-block">
                          <i className="bi bi-heart-fill text-primary me-1"></i> Anniversary
                        </span>
                        <span className="small fw-semibold d-flex align-items-center gap-1 mt-1">
                          {lead.anniversary_date ? new Date(lead.anniversary_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                          {lead.is_anniversary_today && (
                            <span className="badge bg-primary-subtle text-primary px-1 py-0" style={{ fontSize: "9px" }}>
                              💐 Today!
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Vehicle & Requirement */}
              <div className="card">
                <div className="card-header-custom d-flex align-items-center gap-2">
                  <i className="bi bi-car-front-fill text-warning fs-5"></i>
                  <h6 className="fw-bold mb-0">Vehicle Requirement & Timeline</h6>
                </div>

                <div className="card-body">
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <span className="text-secondary small d-block">Desired Model & Variant</span>
                      <span className="fw-bold fs-6">
                        {lead.model_variant || "Not specified"}
                      </span>
                    </div>

                    <div className="row g-3">
                      <div className="col-6">
                        <span className="text-secondary small d-block">Vehicle Segment</span>
                        <span className="small fw-medium">{lead.vehicle_segment || "4 Wheeler"}</span>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary small d-block">Brand</span>
                        <span className="small fw-medium">{lead.brand_name || lead.brand?.name || "-"}</span>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-6">
                        <span className="text-secondary small d-block">Purchase Timeline</span>
                        <span className="text-warning small fw-semibold">
                          {lead.purchase_timeline || "Standard"}
                        </span>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary small d-block">Priority</span>
                        <div className="mt-1">{getPriorityBadge(lead.priority)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Lead Tracking & Assignment Details */}
              <div className="card">
                <div className="card-header-custom d-flex align-items-center gap-2">
                  <i className="bi bi-diagram-3-fill text-success fs-5"></i>
                  <h6 className="fw-bold mb-0">Lead Tracking & Pipeline</h6>
                </div>

                <div className="card-body">
                  <div className="d-flex flex-column gap-3">
                    <div className="row g-3">
                      <div className="col-6">
                        <span className="text-secondary small d-block">Lead Source</span>
                        <span className="small fw-medium">{lead.source_name || lead.source?.title || "Direct"}</span>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary small d-block">Pipeline Status</span>
                        <div className="mt-1">{getStatusBadge(lead.status_name)}</div>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-6">
                        <span className="text-secondary small d-block">Assigned Executive</span>
                        <span className="small fw-semibold">
                          {lead.assigned_user_name || lead.assigned_to_display || "You"}
                        </span>
                      </div>
                      <div className="col-6">
                        <span className="text-secondary small d-block">Created Date</span>
                        <span className="text-secondary small">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Follow-Up History Timeline */}
          <div className="col-12 col-lg-7">
            <div className="card">
              <div className="card-header-custom d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history text-info fs-5"></i>
                  <div>
                    <h6 className="fw-bold mb-0">Follow-Up History</h6>
                    <span className="text-secondary small" style={{ fontSize: "0.8rem" }}>
                      {followUps.length} interaction{followUps.length === 1 ? "" : "s"} logged
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowModal(true)}
                >
                  <i className="bi bi-plus-circle me-1"></i> Add Follow Up
                </button>
              </div>

              <div className="card-body">
                {/* Follow-Up List */}
                {followUps.length === 0 ? (
                  <div className="text-center py-5 text-secondary">
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "rgba(88, 99, 42, 0.12)",
                        color: "var(--primary)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                        marginBottom: "1rem",
                      }}
                    >
                      <i className="bi bi-chat-square-text"></i>
                    </div>
                    <h5 className="fw-semibold">No follow-ups recorded yet</h5>
                    <p className="small text-secondary mb-3" style={{ maxWidth: 380, margin: "0 auto 1rem auto" }}>
                      Start tracking your customer conversations, test drives, quotation discussions, and schedule your next action.
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline-custom btn-sm px-3"
                      onClick={() => setShowModal(true)}
                    >
                      <i className="bi bi-telephone-plus me-1"></i> Log First Follow-Up
                    </button>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {followUps.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3 rounded-3"
                        style={{
                          background: "#F7F7F5",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        {/* Interaction Header */}
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <span
                              className="p-1 px-2 rounded-2 small fw-semibold d-flex align-items-center gap-1"
                              style={{ background: "#EAECE4", border: "1px solid var(--border-color)" }}
                            >
                              <i className={`bi ${getTypeIcon(item.type)}`}></i>
                              <span>{item.type}</span>
                            </span>
                            <span className="text-secondary small">
                              <i className="bi bi-calendar3 me-1"></i>
                              {item.follow_up_date} {item.follow_up_time ? `• ${item.follow_up_time}` : ""}
                            </span>
                          </div>

                          <span
                            className={`badge ${
                              item.status?.toLowerCase() === "completed"
                                ? "bg-success"
                                : item.status?.toLowerCase() === "cancelled"
                                ? "bg-danger"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {item.status || "Completed"}
                          </span>
                        </div>

                        {/* Notes / Conversation details */}
                        {item.notes ? (
                          <p className="small mb-2 lh-base" style={{ whiteSpace: "pre-line", color: "var(--text-primary)" }}>
                            {item.notes}
                          </p>
                        ) : (
                          <p className="text-secondary small fst-italic mb-2">No notes added for this interaction.</p>
                        )}

                        {/* Next follow-up info & Author */}
                        <div
                          className="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2"
                          style={{ borderTop: "1px solid var(--border-color)" }}
                        >
                          {item.next_follow_up_date ? (
                            <span className="text-warning small fw-medium">
                              <i className="bi bi-arrow-return-right me-1"></i>
                              Next: <strong>{item.next_follow_up_date}</strong>
                              {item.next_follow_up_time ? ` (${item.next_follow_up_time})` : ""}
                            </span>
                          ) : (
                            <span className="text-secondary small" style={{ fontSize: "0.75rem" }}>
                              No next date scheduled
                            </span>
                          )}

                          <span className="text-secondary small" style={{ fontSize: "0.75rem" }}>
                            Logged by: <strong>{item.user_name || "Sales Exec"}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            + ADD FOLLOW-UP CUSTOM MODAL
            ------------------------------------------------------------------ */}
        {showModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowModal(false)}>
            <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold" style={{ color: "#FFFFFF" }}>
                  <i className="bi bi-telephone-plus-fill text-primary"></i> Log Follow-Up Interaction
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                ></button>
              </div>

              <form onSubmit={handleFollowUpSubmit}>
                <div className="modal-body-custom">
                  {/* Lead Quick Header in Modal */}
                  <div
                    className="p-3 rounded-2 mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
                    style={{ background: "#F7F7F5", border: "1px solid var(--border-color)" }}
                  >
                    <div>
                      <span className="text-secondary small d-block">Customer</span>
                      <strong>{lead.name}</strong> ({lead.phone})
                    </div>
                    <div className="text-end">
                      <span className="text-secondary small d-block">Vehicle</span>
                      <span className="text-warning small fw-bold">{lead.model_variant}</span>
                    </div>
                  </div>

                  <div className="row g-3">
                    {/* Follow-Up Date */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">
                        Follow-Up Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={formData.follow_up_date}
                        onChange={(e) =>
                          setFormData({ ...formData, follow_up_date: e.target.value })
                        }
                      />
                    </div>

                    {/* Follow-Up Time */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">
                        Follow-Up Time
                      </label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.follow_up_time}
                        onChange={(e) =>
                          setFormData({ ...formData, follow_up_time: e.target.value })
                        }
                      />
                    </div>

                    {/* Interaction Type */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">
                        Follow-Up Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="Call">Call</option>
                        <option value="Meeting">Meeting (Showroom)</option>
                        <option value="WhatsApp">WhatsApp Chat</option>
                        <option value="Email">Email</option>
                        <option value="Visit">Home/Office Visit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Follow-Up Outcome Status */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">
                        Interaction Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="Completed">Completed</option>
                        <option value="Pending">Pending</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Interaction Notes */}
                    <div className="col-12">
                      <label className="form-label fw-semibold small">
                        Discussion Notes / Conversation Summary
                      </label>
                      <textarea
                        rows="3"
                        className="form-control"
                        placeholder="Detail customer discussion, vehicle interest, test drive feedback, discounts discussed, or next steps..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      ></textarea>
                    </div>

                    {/* Next Follow-Up Date */}
                    <div className="col-12 col-md-6">
                      <label className="form-label text-warning fw-semibold small">
                        <i className="bi bi-calendar-event me-1"></i> Next Follow-Up Date (Optional)
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.next_follow_up_date}
                        onChange={(e) =>
                          setFormData({ ...formData, next_follow_up_date: e.target.value })
                        }
                      />
                    </div>

                    {/* Next Follow-Up Time */}
                    <div className="col-12 col-md-6">
                      <label className="form-label text-warning fw-semibold small">
                        <i className="bi bi-clock me-1"></i> Next Follow-Up Time
                      </label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.next_follow_up_time}
                        onChange={(e) =>
                          setFormData({ ...formData, next_follow_up_time: e.target.value })
                        }
                      />
                    </div>

                    {/* Update Lead Pipeline Status */}
                    <div className="col-12">
                      <label className="form-label fw-semibold small">
                        Update Lead Pipeline Status (Optional)
                      </label>
                      <select
                        className="form-select"
                        value={formData.lead_status_name}
                        onChange={(e) =>
                          setFormData({ ...formData, lead_status_name: e.target.value })
                        }
                      >
                        <option value="">-- Keep Current Status ({lead.status_name}) --</option>
                        <option value="In Follow-Up">In Follow-Up</option>
                        <option value="Test Drive Scheduled">Test Drive Scheduled</option>
                        <option value="Quotation Sent">Quotation Sent</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Deal Won">Deal Won</option>
                        <option value="Deal Lost">Deal Lost</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer-custom">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-1"></i> Save Follow-Up
                      </>
                    )}
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
