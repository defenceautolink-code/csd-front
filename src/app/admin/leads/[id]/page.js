"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import api from "@/lib/axios";
import quotationApi from "@/lib/quotationApi";
import ConvertDealModal from "../ConvertDealModal";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const leadId = params?.id;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  const [lead, setLead] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Collapsible sections state (All 3 open by default as requested)
  const [openSections, setOpenSections] = useState({
    followups: true,
    quotations: true,
    assignments: true,
  });

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Follow-up state
  const [followUps, setFollowUps] = useState([]);
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    outcome: "Interested / Call Back",
    type: "Phone Call",
    follow_up_date: new Date().toISOString().split("T")[0],
    follow_up_time: "02:30 PM",
    next_follow_up_date: "",
    next_follow_up_time: "10:00 AM",
    notes: "",
  });

  // Quotations state
  const [quotations, setQuotations] = useState([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);

  // Unified Follow-Up & Quotation History Timeline
  const combinedHistory = useMemo(() => {
    const list = (followUps || []).map((fu) => {
      const isQuote =
        fu.type?.toLowerCase().includes("quotation") ||
        fu.outcome?.toLowerCase().includes("quotation") ||
        Boolean(fu.quotation_id);

      return {
        ...fu,
        _isQuotation: isQuote,
        _quotationId: fu.quotation_id,
        _sortDate: new Date(fu.follow_up_date || fu.created_at || 0).getTime(),
      };
    });

    // Merge quotations from quotations list if not already logged as follow-up
    (quotations || []).forEach((q) => {
      const alreadyLogged = list.some(
        (item) =>
          String(item._quotationId) === String(q.id) ||
          (item.notes && q.quotation_number && item.notes.includes(q.quotation_number))
      );

      if (!alreadyLogged) {
        list.push({
          id: `quote-${q.id}`,
          type: "Quotation Sent",
          status: q.status || "Sent",
          outcome: q.status || "Sent",
          follow_up_date:
            q.quotation_date ||
            (q.created_at ? new Date(q.created_at).toISOString().split("T")[0] : ""),
          follow_up_time: q.created_at
            ? new Date(q.created_at).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          notes: `Official Quotation #${q.quotation_number || `#Q-${q.id}`} generated for ${
            q.variant_name || q.model_name || lead?.model_variant || "Vehicle"
          }. Total Amount: ₹${Number(q.total_amount || q.final_price || 0).toLocaleString("en-IN")}`,
          user_name: q.created_by_name || q.user?.name || "Admin User (Super Admin)",
          _isQuotation: true,
          _quotationId: q.id,
          _sortDate: new Date(q.quotation_date || q.created_at || 0).getTime(),
        });
      }
    });

    return list.sort((a, b) => (b._sortDate || 0) - (a._sortDate || 0));
  }, [followUps, quotations, lead]);

  // Assignment history state
  const [assignments, setAssignments] = useState([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Convert Deal Modal state
  const [showConvertModal, setShowConvertModal] = useState(false);

  // 1. Fetch Lead Details
  const fetchLeadDetails = async () => {
    if (!leadId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/leads/${leadId}`);
      if (res.data && res.data.status && res.data.data) {
        setLead(res.data.data);
      } else if (res.data && res.data.data) {
        setLead(res.data.data);
      } else if (res.data) {
        setLead(res.data);
      }
    } catch (err) {
      console.error("Error fetching lead detail:", err);
      // Fallback: try fetching all leads and find this one
      try {
        const fallbackRes = await api.get("/leads");
        if (fallbackRes.data && fallbackRes.data.data) {
          const found = fallbackRes.data.data.find((item) => String(item.id) === String(leadId));
          if (found) {
            setLead(found);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
      showToast("Unable to load lead details.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Follow-ups
  const fetchFollowUps = async () => {
    if (!leadId) return;
    setIsLoadingFollowUps(true);
    try {
      let res;
      try {
        res = await api.get(`/leads/${leadId}/follow-ups`);
      } catch {
        res = await api.get(`/sales-executive/leads/${leadId}/follow-ups`).catch(() => null);
      }

      if (res && res.data && res.data.data) {
        setFollowUps(res.data.data);
      } else {
        // Check global follow-ups filtered
        const allFu = await api.get("/follow-ups").catch(() => null);
        if (allFu && allFu.data && allFu.data.data) {
          const filtered = allFu.data.data.filter(
            (fu) => String(fu.lead_id) === String(leadId) || (fu.lead && String(fu.lead.id) === String(leadId))
          );
          setFollowUps(filtered);
        }
      }
    } catch (err) {
      console.error("Error fetching followups:", err);
    } finally {
      setIsLoadingFollowUps(false);
    }
  };

  // 3. Fetch Quotations
  const fetchQuotations = async () => {
    if (!leadId) return;
    setIsLoadingQuotations(true);
    try {
      const res = await quotationApi.getQuotations({ lead_id: leadId });
      if (res && res.data) {
        setQuotations(Array.isArray(res.data) ? res.data : res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching quotations:", err);
    } finally {
      setIsLoadingQuotations(false);
    }
  };

  // 4. Fetch Assignments History
  const fetchAssignments = async () => {
    if (!leadId) return;
    setIsLoadingAssignments(true);
    try {
      const res = await api.get(`/leads/${leadId}/assignments`).catch(() => null);
      if (res && res.data && res.data.data) {
        setAssignments(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeadDetails();
    fetchFollowUps();
    fetchQuotations();
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  // Submit Follow-up Log
  const handleSubmitFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpForm.notes.trim()) {
      showToast("Please enter interaction notes / remarks.", "error");
      return;
    }

    setIsSubmittingFollowUp(true);
    try {
      const payload = {
        lead_id: leadId,
        type: followUpForm.type,
        status: followUpForm.outcome,
        outcome: followUpForm.outcome,
        follow_up_date: followUpForm.follow_up_date,
        follow_up_time: followUpForm.follow_up_time,
        next_follow_up_date: followUpForm.next_follow_up_date || null,
        next_follow_up_time: followUpForm.next_follow_up_time || null,
        notes: followUpForm.notes.trim(),
        remarks: followUpForm.notes.trim(),
      };

      try {
        await api.post("/follow-ups", payload);
      } catch {
        await api.post(`/leads/${leadId}/follow-ups`, payload);
      }

      showToast("Follow-up call interaction recorded!", "success");
      setShowFollowUpModal(false);
      setFollowUpForm({
        outcome: "Interested / Call Back",
        type: "Phone Call",
        follow_up_date: new Date().toISOString().split("T")[0],
        follow_up_time: "02:30 PM",
        next_follow_up_date: "",
        next_follow_up_time: "10:00 AM",
        notes: "",
      });
      fetchFollowUps();
      fetchLeadDetails();
    } catch (err) {
      console.error("Error creating follow-up:", err);
      showToast("Failed to record follow-up interaction.", "error");
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container-fluid py-5 text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 text-muted">Loading complete customer lead 360 profile...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!lead) {
    return (
      <AdminLayout>
        <div className="container-fluid py-5 text-center">
          <i className="bi bi-exclamation-triangle text-warning display-4"></i>
          <h4 className="mt-3 text-dark">Lead Record Not Found</h4>
          <p className="text-muted">The requested lead ID #{leadId} does not exist or has been deleted.</p>
          <Link href="/admin/leads" className="btn btn-primary mt-2">
            <i className="bi bi-arrow-left me-1"></i> Back to Leads Pipeline
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="lead-detail-page container-fluid px-3 px-md-4 py-3">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <Link href="/admin/leads" className="btn btn-sm btn-outline-secondary py-1 px-2 text-decoration-none">
                <i className="bi bi-arrow-left me-1"></i> Leads Pipeline
              </Link>
              <span className="text-muted">/</span>
              <span className="badge bg-secondary-subtle text-dark border px-2 py-1">Lead #{lead.id}</span>
            </div>
            <h3 className="mb-0 text-dark fw-bold d-flex align-items-center gap-2 flex-wrap">
              {lead.name}
              {lead.is_birthday_today && (
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle fs-6">
                  🎂 Birthday Today!
                </span>
              )}
              {lead.is_anniversary_today && (
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-6">
                  💐 Anniversary Today!
                </span>
              )}
            </h3>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-success d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={() => setShowFollowUpModal(true)}
            >
              <i className="bi bi-telephone-plus-fill me-1"></i>
              <span>Log Follow-Up</span>
            </button>
            <Link
              href={`/admin/quotation/create?lead_id=${lead.id}`}
              className="btn btn-primary d-inline-flex align-items-center gap-1 shadow-sm"
            >
              <i className="bi bi-file-earmark-spreadsheet-fill me-1"></i>
              <span>Create Quotation</span>
            </Link>
            <button
              type="button"
              className="btn btn-success d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={() => setShowConvertModal(true)}
            >
              <i className="bi bi-trophy-fill me-1"></i>
              <span>Convert Deal</span>
            </button>
          </div>
        </div>

        {/* Lead Summary Overview Cards */}
        <div className="row g-3 mb-4">
          {/* Card 1: Customer Profile */}
          <div className="col-lg-6">
            <div className="card h-100 shadow-sm border-0" style={{ background: "#ffffff" }}>
              <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-3">
                <h5 className="card-title mb-0 text-dark fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-person-circle text-primary"></i> Customer Information
                </h5>
                <span
                  className={`badge ${
                    lead.priority === "Hot"
                      ? "bg-danger text-white"
                      : lead.priority === "Warm"
                        ? "bg-warning text-dark"
                        : "bg-info text-white"
                  } px-3 py-1 fw-bold`}
                >
                  {lead.priority === "Hot" ? "🔥 Hot Priority" : lead.priority === "Warm" ? "☀️ Warm Priority" : "❄️ Cold Priority"}
                </span>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Phone Number</span>
                    <strong className="text-dark fs-6 d-flex align-items-center gap-1 mt-1">
                      <i className="bi bi-telephone-fill text-success"></i>
                      <a href={`tel:${lead.phone}`} className="text-decoration-none text-dark">
                        {lead.phone}
                      </a>
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Email Address</span>
                    <strong className="text-dark d-flex align-items-center gap-1 mt-1">
                      <i className="bi bi-envelope-fill text-primary"></i>
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-decoration-none text-dark">
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-muted">Not Provided</span>
                      )}
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Location / City</span>
                    <div className="text-dark fw-medium mt-1">
                      <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                      {lead.city ? `${lead.city}, ${lead.state || ""}` : "Not Specified"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Lead Source</span>
                    <div className="mt-1">
                      <span className="badge bg-dark text-light border px-2 py-1">
                        <i className="bi bi-broadcast me-1 text-warning"></i>
                        {lead.source?.title || lead.source_name || "Direct"}
                      </span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Birthday</span>
                    <div className="text-dark fw-medium mt-1">
                      <i className="bi bi-cake2-fill text-danger me-1"></i>
                      {lead.birth_date
                        ? new Date(lead.birth_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Not Recorded"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Anniversary</span>
                    <div className="text-dark fw-medium mt-1">
                      <i className="bi bi-flower1 text-info me-1"></i>
                      {lead.anniversary_date
                        ? new Date(lead.anniversary_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Not Recorded"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Assigned Representative</span>
                    <div className="text-dark fw-bold mt-1">
                      <i className="bi bi-person-badge-fill text-secondary me-1"></i>
                      {lead.assigned_to_display || lead.assigned_user?.name || lead.assigned_user_name || "Unassigned"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Created On</span>
                    <div className="text-muted mt-1" style={{ fontSize: "13px" }}>
                      <i className="bi bi-clock-history me-1 text-primary"></i>
                      {lead.created_at
                        ? new Date(lead.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Vehicle Requirement & Pipeline Stage */}
          <div className="col-lg-6">
            <div className="card h-100 shadow-sm border-0" style={{ background: "#ffffff" }}>
              <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-3">
                <h5 className="card-title mb-0 text-dark fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-car-front-fill text-primary"></i> Vehicle & Requirements
                </h5>
                <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1 fw-bold fs-6">
                  {lead.status?.name || lead.status_name || "New Prospect"}
                </span>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Vehicle Segment</span>
                    <div className="text-dark fw-bold mt-1">
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                        {lead.vehicle_segment || "4 Wheeler"}
                      </span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Brand</span>
                    <div className="text-dark fw-bold fs-6 mt-1">
                      {lead.brand?.name || lead.brand_name || "All Brands"}
                    </div>
                  </div>
                  <div className="col-12">
                    <span className="text-muted small d-block">Vehicle Model / Desired Variant</span>
                    <div className="p-3 rounded-2 mt-1 bg-light border">
                      <div className="text-dark fw-bold fs-5">
                        {lead.model_variant || (lead.variant ? `${lead.model?.name ? lead.model.name + " " : ""}${lead.variant.name}` : lead.model?.name || "Not specified")}
                      </div>
                      <div className="text-muted small mt-1 d-flex gap-3 flex-wrap">
                        {lead.brand?.name && <span><strong>Brand:</strong> {lead.brand.name}</span>}
                        {lead.model?.name && <span><strong>Model:</strong> {lead.model.name}</span>}
                        {lead.variant?.name && <span><strong>Variant:</strong> {lead.variant.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Purchase Timeline</span>
                    <div className="text-dark fw-semibold mt-1">
                      <i className="bi bi-calendar-check text-info me-1"></i>
                      {lead.purchase_timeline || "Immediate"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Expected Budget</span>
                    <div className="text-success fw-bold fs-6 mt-1">
                      <i className="bi bi-currency-rupee"></i>
                      {lead.budget ? Number(lead.budget).toLocaleString("en-IN") : "Not Specified"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Collapsible Activity & History Sections (Reference UI as per Screenshot) */}
        {/* ========================================================================= */}
        <div className="d-flex flex-column gap-3 mb-4">
          {/* 1. Follow-Up History Section */}
          <div className="card shadow-sm border-0" style={{ borderRadius: "16px", overflow: "hidden", background: "#ffffff" }}>
            <div
              className="d-flex align-items-center justify-content-between px-4 py-3"
              style={{
                backgroundColor: "#F1F3ED",
                borderBottom: openSections.followups ? "1px solid #DFE2D6" : "none",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => toggleSection("followups")}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-telephone-outbound-fill text-primary fs-5"></i>
                <h6 className="mb-0 fw-bold text-dark fs-6">
                  Follow-Up History ({combinedHistory.length})
                </h6>
              </div>

              <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 py-1 px-2.5"
                  style={{ fontSize: "0.8rem" }}
                  onClick={() => setShowFollowUpModal(true)}
                >
                  <i className="bi bi-plus-lg"></i>
                  <span>Log Call / Interaction</span>
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-light border-0 rounded-circle p-1 d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px", background: "rgba(0,0,0,0.05)" }}
                  onClick={() => toggleSection("followups")}
                  title={openSections.followups ? "Hide / Collapse" : "Show / Expand"}
                >
                  <i className={`bi ${openSections.followups ? "bi-chevron-up" : "bi-chevron-down"} fw-bold text-dark`}></i>
                </button>
              </div>
            </div>

            {openSections.followups && (
              <div className="card-body p-4">
                {isLoadingFollowUps ? (
                  <div className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Loading follow-up interactions...
                  </div>
                ) : combinedHistory.length === 0 ? (
                  <div className="text-center py-5 border rounded-3 bg-light">
                    <i className="bi bi-telephone-x text-muted display-6"></i>
                    <p className="mt-2 text-muted mb-3">No follow-up interaction logged yet for this lead.</p>
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={() => setShowFollowUpModal(true)}
                    >
                      <i className="bi bi-telephone-plus-fill me-1"></i> Log First Interaction
                    </button>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {combinedHistory.map((fu, idx) => (
                      <div
                        key={fu.id || idx}
                        className={`p-3 border rounded-3 ${
                          fu._isQuotation
                            ? "bg-white shadow-sm"
                            : "bg-light"
                        }`}
                        style={{
                          cursor: fu._quotationId ? "pointer" : "default",
                          transition: "all 0.15s ease",
                          borderColor: fu._isQuotation ? "#3F4912" : "#e2e8f0",
                          borderLeftWidth: fu._isQuotation ? "4px" : "1px",
                        }}
                        onClick={() => {
                          if (fu._quotationId) {
                            router.push(`/admin/quotation/${fu._quotationId}`);
                          }
                        }}
                        title={fu._quotationId ? "Click to view full quotation details" : undefined}
                      >
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                          <div className="d-flex align-items-center gap-2">
                            {fu._isQuotation ? (
                              <>
                                <span
                                  className="badge text-white d-inline-flex align-items-center gap-1"
                                  style={{ backgroundColor: "#3F4912" }}
                                >
                                  <i className="bi bi-file-earmark-spreadsheet-fill"></i>
                                  {fu.type || "Quotation Sent"}
                                </span>
                                <span className="badge bg-success-subtle text-success border">
                                  {fu.status || fu.outcome || "Sent"}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="badge bg-primary text-white">
                                  <i className="bi bi-telephone-fill me-1"></i>
                                  {fu.type || "Phone Call"}
                                </span>
                                <span className="badge bg-info-subtle text-info border">
                                  {fu.status || fu.outcome || "Call Back"}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="d-flex align-items-center gap-2">
                            <span className="text-muted small">
                              <i className="bi bi-calendar3 me-1"></i>
                              {fu.follow_up_date} {fu.follow_up_time ? `at ${fu.follow_up_time}` : ""}
                            </span>
                            {fu._quotationId && (
                              <Link
                                href={`/admin/quotation/${fu._quotationId}`}
                                className="btn btn-sm btn-outline-primary py-0 px-2 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: "0.78rem" }}
                                onClick={(e) => e.stopPropagation()}
                                title="Open Quotation View"
                              >
                                <i className="bi bi-eye"></i>
                                <span>View Quotation</span>
                              </Link>
                            )}
                          </div>
                        </div>

                        {fu.notes && (
                          <p
                            className="text-dark mb-2 small"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {fu.notes}
                          </p>
                        )}

                        <div className="d-flex justify-content-between align-items-center text-muted small border-top pt-2">
                          <span>
                            Logged By: <strong className="text-dark">{fu.user_name || fu.user?.name || "Representative"}</strong>
                          </span>
                          {fu._isQuotation && fu._quotationId ? (
                            <span className="text-primary fw-semibold small d-inline-flex align-items-center gap-1">
                              <i className="bi bi-box-arrow-up-right"></i>
                              Click to open quotation
                            </span>
                          ) : fu.next_follow_up_date ? (
                            <span className="text-warning fw-semibold">
                              <i className="bi bi-alarm-fill me-1"></i>
                              Next: {fu.next_follow_up_date} {fu.next_follow_up_time || ""}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Quotations Sent Section */}
          <div className="card shadow-sm border-0" style={{ borderRadius: "16px", overflow: "hidden", background: "#ffffff" }}>
            <div
              className="d-flex align-items-center justify-content-between px-4 py-3"
              style={{
                backgroundColor: "#F1F3ED",
                borderBottom: openSections.quotations ? "1px solid #DFE2D6" : "none",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => toggleSection("quotations")}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-spreadsheet-fill text-primary fs-5"></i>
                <h6 className="mb-0 fw-bold text-dark fs-6">
                  Quotations Sent ({quotations.length})
                </h6>
              </div>

              <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Link
                  href={`/admin/quotation/create?lead_id=${lead.id}`}
                  className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 py-1 px-2.5"
                  style={{ fontSize: "0.8rem" }}
                >
                  <i className="bi bi-plus-lg"></i>
                  <span>Generate New Quotation</span>
                </Link>
                <button
                  type="button"
                  className="btn btn-sm btn-light border-0 rounded-circle p-1 d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px", background: "rgba(0,0,0,0.05)" }}
                  onClick={() => toggleSection("quotations")}
                  title={openSections.quotations ? "Hide / Collapse" : "Show / Expand"}
                >
                  <i className={`bi ${openSections.quotations ? "bi-chevron-up" : "bi-chevron-down"} fw-bold text-dark`}></i>
                </button>
              </div>
            </div>

            {openSections.quotations && (
              <div className="card-body p-4">
                {isLoadingQuotations ? (
                  <div className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Loading quotations...
                  </div>
                ) : quotations.length === 0 ? (
                  <div className="text-center py-5 border rounded-3 bg-light">
                    <i className="bi bi-file-earmark-spreadsheet text-muted display-6"></i>
                    <p className="mt-2 text-muted mb-3">No quotation has been generated for this lead yet.</p>
                    <Link
                      href={`/admin/quotation/create?lead_id=${lead.id}`}
                      className="btn btn-sm btn-primary"
                    >
                      <i className="bi bi-calculator me-1"></i> Create First Quotation
                    </Link>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: "50px" }}>#</th>
                          <th style={{ width: "95px" }} className="text-center">Actions</th>
                          <th>Quotation #</th>
                          <th>Date</th>
                          <th>Vehicle / Variant</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotations.map((q, idx) => (
                          <tr key={q.id}>
                            <td className="text-muted small">{idx + 1}</td>
                            <td className="text-center">
                              <div className="d-flex align-items-center justify-content-center gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => quotationApi.downloadPdf(q.id, q.quotation_number)}
                                  title="Download PDF"
                                >
                                  <i className="bi bi-file-earmark-pdf text-danger"></i>
                                </button>
                                <Link
                                  href={`/admin/quotation/${q.id}`}
                                  className="btn btn-sm btn-outline-primary"
                                  title="View Quotation Details"
                                >
                                  <i className="bi bi-eye"></i>
                                </Link>
                              </div>
                            </td>
                            <td className="fw-bold text-primary">{q.quotation_number || `#Q-${q.id}`}</td>
                            <td className="text-muted small">
                              {q.quotation_date || (q.created_at ? new Date(q.created_at).toLocaleDateString("en-IN") : "-")}
                            </td>
                            <td>
                              <span className="text-dark fw-medium">
                                {q.variant_name || q.model_name || lead.model_variant || "-"}
                              </span>
                            </td>
                            <td className="fw-bold text-success">
                              ₹{Number(q.total_amount || q.final_price || 0).toLocaleString("en-IN")}
                            </td>
                            <td>
                              <span className="badge bg-secondary-subtle text-dark border">
                                {q.status || "Draft"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Assignment History Section */}
          <div className="card shadow-sm border-0" style={{ borderRadius: "16px", overflow: "hidden", background: "#ffffff" }}>
            <div
              className="d-flex align-items-center justify-content-between px-4 py-3"
              style={{
                backgroundColor: "#F1F3ED",
                borderBottom: openSections.assignments ? "1px solid #DFE2D6" : "none",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => toggleSection("assignments")}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-clock-history text-primary fs-5"></i>
                <h6 className="mb-0 fw-bold text-dark fs-6">
                  Assignment History ({assignments.length})
                </h6>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light border-0 rounded-circle p-1 d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px", background: "rgba(0,0,0,0.05)" }}
                  onClick={() => toggleSection("assignments")}
                  title={openSections.assignments ? "Hide / Collapse" : "Show / Expand"}
                >
                  <i className={`bi ${openSections.assignments ? "bi-chevron-up" : "bi-chevron-down"} fw-bold text-dark`}></i>
                </button>
              </div>
            </div>

            {openSections.assignments && (
              <div className="card-body p-4">
                <h6 className="text-dark fw-bold mb-3">Executive Re-assignment Timeline</h6>
                {isLoadingAssignments ? (
                  <div className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Loading assignment records...
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-muted p-4 text-center border rounded-3 bg-light">
                    No reassignment records found. Currently assigned to:{" "}
                    <strong>{lead.assigned_to_display || lead.assigned_user?.name || "Initial Executive"}</strong>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {assignments.map((hist) => (
                      <div key={hist.id} className="p-3 border rounded-3 bg-light">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-dark fw-bold">
                            <i className="bi bi-person-check-fill text-success me-1"></i>
                            Assigned To: {hist.assign_to_name || "Executive"}
                          </span>
                          <span className="text-muted small">
                            {new Date(hist.created_at).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center text-muted small mt-2">
                          <span>
                            Assigned By: <strong className="text-dark">{hist.assign_by_name || "Super Admin"}</strong>
                          </span>
                          {hist.remarks && (
                            <span className="badge bg-dark border text-light">{hist.remarks}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Log Follow-Up Call */}
        {showFollowUpModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowFollowUpModal(false)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-telephone-outbound-fill text-success me-2"></i> Log Follow-Up Interaction
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowFollowUpModal(false)}></button>
              </div>

              <form onSubmit={handleSubmitFollowUp}>
                <div className="modal-body-custom py-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Interaction Type</label>
                      <select
                        className="form-select"
                        value={followUpForm.type}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })}
                      >
                        <option value="Phone Call">📞 Phone Call</option>
                        <option value="WhatsApp">💬 WhatsApp</option>
                        <option value="Showroom Visit">🏢 Showroom Walk-in</option>
                        <option value="Email">✉️ Email</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Call Outcome</label>
                      <select
                        className="form-select"
                        value={followUpForm.outcome}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, outcome: e.target.value })}
                      >
                        <option value="Interested / Call Back">Interested / Call Back</option>
                        <option value="Quotation Requested">Quotation Requested</option>
                        <option value="Test Drive Scheduled">Test Drive Scheduled</option>
                        <option value="Negotiation / Price Discussion">Negotiation / Price Discussion</option>
                        <option value="Not Reachable / Busy">Not Reachable / Busy</option>
                        <option value="Lost to Competitor">Lost to Competitor</option>
                        <option value="Deal Won / Booking">Deal Won / Booking</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Interaction Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={followUpForm.follow_up_date}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Interaction Time</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 02:30 PM"
                        value={followUpForm.follow_up_time}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_time: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small">
                        Discussion Notes / Feedback <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="What did the customer say? What are the next steps?"
                        required
                        value={followUpForm.notes}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                      ></textarea>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Next Follow-Up Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={followUpForm.next_follow_up_date}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up_date: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Next Follow-Up Time</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 11:00 AM"
                        value={followUpForm.next_follow_up_time}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up_time: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-custom" onClick={() => setShowFollowUpModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={isSubmittingFollowUp}>
                    {isSubmittingFollowUp ? "Saving..." : "Record Interaction"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Convert Deal */}
        {showConvertModal && lead && (
          <ConvertDealModal
            lead={lead}
            onClose={() => setShowConvertModal(false)}
            onSuccess={() => {
              setShowConvertModal(false);
              showToast("Lead successfully converted to Deal!", "success");
              fetchLeadDetails();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
