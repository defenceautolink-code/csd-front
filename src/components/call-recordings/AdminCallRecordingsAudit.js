"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import Pagination from "@/components/common/Pagination";
import callRecordingApi from "@/services/callRecordingApi";
import CallRecordingAudioPlayer from "@/components/call-recordings/CallRecordingAudioPlayer";
import { getRoleDashboardPath, getRoleBadgeClass } from "@/utils/auth";

const formatDateLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getTodayDate = () => formatDateLocal(new Date());

const getYesterdayDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateLocal(d);
};

const formatBytes = (bytes) => {
  const num = Number(bytes || 0);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
};

const getReviewBadge = (status) => {
  switch (status) {
    case "verified":
      return (
        <span className="badge bg-success-subtle text-success border border-success-subtle">
          <i className="bi bi-check-circle-fill me-1"></i>Verified
        </span>
      );
    case "flagged":
      return (
        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
          <i className="bi bi-flag-fill me-1"></i>Flagged
        </span>
      );
    default:
      return (
        <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
          <i className="bi bi-hourglass-split me-1"></i>Pending
        </span>
      );
  }
};

const getComplianceBadge = (row) => {
  if (row.compliance_status === "complete") {
    return (
      <span className="badge bg-success-subtle text-success border border-success-subtle">
        <i className="bi bi-check-circle-fill me-1"></i>
        Complete ({row.recordings_uploaded}/{row.call_follow_ups})
      </span>
    );
  }
  if (row.compliance_status === "missing") {
    return (
      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
        <i className="bi bi-exclamation-triangle-fill me-1"></i>
        {row.missing_count} Missing ({row.recordings_uploaded}/{row.call_follow_ups})
      </span>
    );
  }
  if (row.compliance_status === "uploaded") {
    return (
      <span className="badge bg-info-subtle text-info border border-info-subtle">
        <i className="bi bi-mic-fill me-1"></i>
        {row.recordings_uploaded} Uploaded
      </span>
    );
  }
  return <span className="badge bg-secondary-subtle text-secondary">No Calls Logged</span>;
};

export default function AdminCallRecordingsAudit() {
  const { showToast } = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("summary"); // "summary" | "recordings"

  // Filters
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [roleFilter, setRoleFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("all");
  const [staffOptions, setStaffOptions] = useState([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Summary data
  const [summaryRows, setSummaryRows] = useState([]);
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryPerPage, setSummaryPerPage] = useState(10);
  const [kpis, setKpis] = useState({
    total_staff: 0,
    total_follow_ups: 0,
    total_call_follow_ups: 0,
    total_recordings: 0,
    total_missing: 0,
    staff_with_missing: 0,
    pending_review: 0,
    verified_count: 0,
    flagged_count: 0,
  });
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // All recordings data
  const [recordings, setRecordings] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);

  // Staff Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [staffDetail, setStaffDetail] = useState({
    staff: null,
    follow_ups: [],
    recordings: [],
  });

  // Review Remark Modal
  const [reviewTarget, setReviewTarget] = useState(null); // { recording, nextStatus }
  const [reviewRemark, setReviewRemark] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user");
        if (stored) setCurrentUser(JSON.parse(stored));
      } catch (_) {}
    }
  }, []);

  const buildDateParams = () => {
    const p = {};
    if (fromDate) p.from_date = fromDate;
    if (toDate) p.to_date = toDate;
    return p;
  };

  const loadSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const params = {
        ...buildDateParams(),
        role: roleFilter || "all",
      };
      if (roleFilter && staffFilter && staffFilter !== "all") {
        params.user_id = staffFilter;
      }
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await callRecordingApi.getSummary(params);
      if (res?.status) {
        setSummaryRows(Array.isArray(res.data) ? res.data : []);
        setSummaryPage(1);
        if (Array.isArray(res.staff_options)) {
          setStaffOptions(res.staff_options);
        }
        if (res.kpis) setKpis(res.kpis);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to load daily audit summary.", "error");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const loadRecordings = async (page = currentPage) => {
    setIsLoadingRecordings(true);
    try {
      const params = {
        ...buildDateParams(),
        role: roleFilter || "all",
        review_status: reviewStatusFilter,
        page,
        per_page: perPage,
      };
      if (roleFilter && staffFilter && staffFilter !== "all") {
        params.user_id = staffFilter;
      }
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await callRecordingApi.getRecordings(params);
      if (res?.status) {
        setRecordings(Array.isArray(res.data) ? res.data : []);
        setPagination(res.pagination || { current_page: 1, last_page: 1, total: 0 });
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to load recordings.", "error");
    } finally {
      setIsLoadingRecordings(false);
    }
  };

  useEffect(() => {
    loadSummary();
    if (activeTab === "recordings") {
      loadRecordings(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, roleFilter, staffFilter, activeTab, reviewStatusFilter, currentPage, perPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadSummary();
    if (activeTab === "recordings") {
      loadRecordings(1);
    }
  };

  const handleOpenStaffDetail = async (row) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setStaffDetail({ staff: row, date: row.date || null, follow_ups: [], recordings: [] });
    try {
      const detailParams = row.date ? { date: row.date } : buildDateParams();
      const res = await callRecordingApi.getStaffDetail(row.user_id, detailParams);
      if (res?.status) {
        setStaffDetail({
          staff: res.staff || row,
          date: row.date || null,
          follow_ups: Array.isArray(res.follow_ups) ? res.follow_ups : [],
          recordings: Array.isArray(res.recordings) ? res.recordings : [],
        });
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to load staff detail.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleQuickReview = async (rec, nextStatus, remark = "") => {
    try {
      const res = await callRecordingApi.reviewRecording(rec.id, {
        review_status: nextStatus,
        review_remark: remark,
      });
      if (res?.status) {
        showToast(`Recording marked as ${nextStatus}.`, "success");
        const updated = res.data;
        setRecordings((prev) => prev.map((r) => (r.id === rec.id ? updated : r)));
        setStaffDetail((prev) => ({
          ...prev,
          recordings: prev.recordings.map((r) => (r.id === rec.id ? updated : r)),
        }));
        loadSummary();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update status.", "error");
    }
  };

  const submitReviewModal = async (e) => {
    e.preventDefault();
    if (!reviewTarget) return;
    setIsSubmittingReview(true);
    await handleQuickReview(reviewTarget.recording, reviewTarget.nextStatus, reviewRemark.trim());
    setIsSubmittingReview(false);
    setReviewTarget(null);
    setReviewRemark("");
  };

  const dashboardHref = getRoleDashboardPath(currentUser?.role);

  return (
    <AdminLayout>
      <div className="container-fluid py-3 px-2 px-md-4">
        {/* Header */}
        <div className="page-header-wrapper mb-4">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href={dashboardHref}>Home</Link>
              </li>
              <li className="breadcrumb-item active">Call Recordings Audit</li>
            </ul>
            <h1 className="page-title mt-1">Follow-Up Call Recordings Audit</h1>
            <p className="text-muted small mb-0">
              Monitor Sales Executive &amp; Receptionist daily follow-up calls vs uploaded call recordings.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="row g-3 mb-4 row-cols-2 row-cols-md-4">
          <div className="col">
            <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: "4px solid #2563eb" }}>
              <div className="card-body">
                <div className="text-muted small fw-semibold">Call Follow-Ups Logged</div>
                <div className="fs-3 fw-bold mt-1 text-primary">{kpis.total_call_follow_ups}</div>
                <div className="small text-muted">
                  All Follow-ups: {kpis.total_follow_ups}
                </div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: "4px solid #10b981" }}>
              <div className="card-body">
                <div className="text-muted small fw-semibold">Recordings Uploaded</div>
                <div className="fs-3 fw-bold mt-1 text-success">{kpis.total_recordings}</div>
                <div className="small text-muted">Across {kpis.total_staff} staff</div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: "4px solid #ef4444" }}>
              <div className="card-body">
                <div className="text-muted small fw-semibold">Missing Recordings</div>
                <div className={`fs-3 fw-bold mt-1 ${kpis.total_missing > 0 ? "text-danger" : "text-success"}`}>
                  {kpis.total_missing}
                </div>
                <div className="small text-muted">
                  {kpis.staff_with_missing} staff with gap
                </div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: "4px solid #f59e0b" }}>
              <div className="card-body">
                <div className="text-muted small fw-semibold">Audit Progress</div>
                <div className="mt-2 d-flex flex-wrap gap-1">
                  <span className="badge bg-warning-subtle text-warning">{kpis.pending_review} Pending</span>
                  <span className="badge bg-success-subtle text-success">{kpis.verified_count} Verified</span>
                  <span className="badge bg-danger-subtle text-danger">{kpis.flagged_count} Flagged</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <form onSubmit={handleSearchSubmit} className="row g-3 align-items-end">
              <div className="col-md-2">
                <label className="form-label small fw-semibold mb-1">From Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label small fw-semibold mb-1">To Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label small fw-semibold mb-1">Role</label>
                <select
                  className="form-select form-select-sm"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setStaffFilter("all");
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Select Role</option>
                  <option value="sales_executive">Sales Executive</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="all">All Staff</option>
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label small fw-semibold mb-1">Staff Member</label>
                <select
                  className="form-select form-select-sm"
                  value={staffFilter}
                  disabled={!roleFilter}
                  onChange={(e) => {
                    setStaffFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">
                    {!roleFilter
                      ? "Select Role First"
                      : roleFilter === "sales_executive"
                      ? "All Sales Executives"
                      : roleFilter === "receptionist"
                      ? "All Receptionists"
                      : "All Staff Members"}
                  </option>
                  {roleFilter &&
                    staffOptions.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.name}
                        {roleFilter === "all" && u.role ? ` (${u.role})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              {activeTab === "recordings" && (
                <div className="col-md-2">
                  <label className="form-label small fw-semibold mb-1">Review Status</label>
                  <select
                    className="form-select form-select-sm"
                    value={reviewStatusFilter}
                    onChange={(e) => {
                      setReviewStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </div>
              )}

              <div className={activeTab === "recordings" ? "col-md-2" : "col-md-4"}>
                <label className="form-label small fw-semibold mb-1">Search</label>
                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Staff name, file, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-search"></i>
                  </button>
                </div>
              </div>

              {/* Quick Date Shortcuts below From Date / To Date */}
              <div className="col-12 pt-1 d-flex align-items-center gap-2 flex-wrap">
                <span className="small text-muted fw-semibold">Quick Date:</span>
                <button
                  type="button"
                  className={`btn btn-sm py-0 px-2 ${
                    !fromDate && !toDate ? "btn-primary" : "btn-outline-secondary"
                  }`}
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setCurrentPage(1);
                  }}
                >
                  All (Clear)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm py-0 px-2 ${
                    fromDate === getTodayDate() && toDate === getTodayDate()
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => {
                    const today = getTodayDate();
                    setFromDate(today);
                    setToDate(today);
                    setCurrentPage(1);
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`btn btn-sm py-0 px-2 ${
                    fromDate === getYesterdayDate() && toDate === getYesterdayDate()
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => {
                    const yesterday = getYesterdayDate();
                    setFromDate(yesterday);
                    setToDate(yesterday);
                    setCurrentPage(1);
                  }}
                >
                  Yesterday
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ul className="nav nav-pills mb-3 gap-2">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              <i className="bi bi-people-fill me-2"></i>
              Daily Staff Summary (Follow-Ups vs Recordings)
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === "recordings" ? "active" : ""}`}
              onClick={() => setActiveTab("recordings")}
            >
              <i className="bi bi-soundwave me-2"></i>
              All Uploaded Recordings
            </button>
          </li>
        </ul>

        {/* Tab 1: Daily Staff Audit Table */}
        {activeTab === "summary" && (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              {isLoadingSummary ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="text-muted small mt-2 mb-0">Loading staff audit summary...</p>
                </div>
              ) : summaryRows.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  No Sales Executive or Receptionist records found for the selected filters.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Staff Member</th>
                        <th>Role</th>
                        <th className="text-center">Call Follow-Ups</th>
                        <th className="text-center">Recordings Uploaded</th>
                        <th>Compliance Status</th>
                        <th>Review Breakdown</th>
                        <th className="text-end">Inspect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows
                        .slice((summaryPage - 1) * summaryPerPage, summaryPage * summaryPerPage)
                        .map((row) => (
                        <tr key={`${row.user_id}_${row.date || "none"}`}>
                          <td className="small text-nowrap fw-semibold">
                            {row.date ? (
                              <>
                                <i className="bi bi-calendar3 text-primary me-1"></i>
                                {row.date}
                              </>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <div className="fw-semibold">{row.name}</div>
                            <div className="small text-muted">{row.phone || row.email}</div>
                          </td>
                          <td>
                            <span className={`badge ${getRoleBadgeClass(row.role)}`}>
                              {row.role}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="fw-bold fs-6">{row.call_follow_ups}</span>
                            {row.total_follow_ups !== row.call_follow_ups && (
                              <div className="small text-muted">({row.total_follow_ups} total)</div>
                            )}
                          </td>
                          <td className="text-center">
                            <span className="fw-bold fs-6 text-primary">{row.recordings_uploaded}</span>
                          </td>
                          <td>{getComplianceBadge(row)}</td>
                          <td>
                            <div className="d-flex gap-1 flex-wrap">
                              {row.verified_count > 0 && (
                                <span className="badge bg-success-subtle text-success">{row.verified_count} Verified</span>
                              )}
                              {row.pending_count > 0 && (
                                <span className="badge bg-warning-subtle text-warning">{row.pending_count} Pending</span>
                              )}
                              {row.flagged_count > 0 && (
                                <span className="badge bg-danger-subtle text-danger">{row.flagged_count} Flagged</span>
                              )}
                              {row.recordings_uploaded === 0 && (
                                <span className="small text-muted">-</span>
                              )}
                            </div>
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleOpenStaffDetail(row)}
                            >
                              <i className="bi bi-headphones me-1"></i>
                              View &amp; Listen ({row.recordings_uploaded})
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <Pagination
              currentPage={summaryPage}
              lastPage={Math.max(1, Math.ceil(summaryRows.length / summaryPerPage))}
              total={summaryRows.length}
              perPage={summaryPerPage}
              itemName="records"
              onPageChange={(p) => setSummaryPage(p)}
              onPerPageChange={(n) => {
                setSummaryPerPage(n);
                setSummaryPage(1);
              }}
            />
          </div>
        )}

        {/* Tab 2: All Uploaded Recordings */}
        {activeTab === "recordings" && (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              {isLoadingRecordings ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="text-muted small mt-2 mb-0">Loading uploaded recordings...</p>
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  No call recordings found for the selected filters.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Staff</th>
                        <th>Recording File</th>
                        <th>Date</th>
                        <th>Audio Player</th>
                        <th>Status</th>
                        <th className="text-end">Audit Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recordings.map((rec) => (
                        <tr key={rec.id}>
                          <td>
                            <div className="fw-semibold">{rec.user?.name || "Unknown"}</div>
                            <span className={`badge ${getRoleBadgeClass(rec.user?.role)}`} style={{ fontSize: "0.7rem" }}>
                              {rec.user?.role || "-"}
                            </span>
                          </td>
                          <td>
                            <div className="fw-semibold text-truncate" style={{ maxWidth: "220px" }} title={rec.original_name}>
                              {rec.original_name}
                            </div>
                            <div className="small text-muted">
                              {formatBytes(rec.file_size)}
                              {rec.phone_number ? ` • ${rec.phone_number}` : ""}
                            </div>
                            {rec.notes && (
                              <div className="small text-muted text-truncate" style={{ maxWidth: "220px" }} title={rec.notes}>
                                Note: {rec.notes}
                              </div>
                            )}
                          </td>
                          <td className="small text-nowrap">{rec.recording_date}</td>
                          <td>
                            <CallRecordingAudioPlayer recordingId={rec.id} fileName={rec.original_name} />
                          </td>
                          <td>
                            {getReviewBadge(rec.review_status)}
                            {rec.review_remark && (
                              <div className="small text-muted mt-1">{rec.review_remark}</div>
                            )}
                          </td>
                          <td className="text-end text-nowrap">
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-success"
                                title="Verify Recording"
                                onClick={() => handleQuickReview(rec, "verified")}
                                disabled={rec.review_status === "verified"}
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                title="Flag Recording with Remark"
                                onClick={() => {
                                  setReviewTarget({ recording: rec, nextStatus: "flagged" });
                                  setReviewRemark(rec.review_remark || "");
                                }}
                              >
                                <i className="bi bi-flag-fill"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <Pagination
              currentPage={pagination.current_page || 1}
              lastPage={pagination.last_page || 1}
              total={pagination.total || 0}
              perPage={perPage}
              itemName="recordings"
              onPageChange={(p) => setCurrentPage(p)}
              onPerPageChange={(n) => {
                setPerPage(n);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Staff Detail Modal: Follow-Ups vs Uploaded Recordings */}
      {detailModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1055 }}
        >
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    {staffDetail.staff?.name || "Staff"} — Call Audit
                  </h5>
                  <small className="text-muted">
                    {staffDetail.staff?.role} •{" "}
                    {staffDetail.date
                      ? staffDetail.date
                      : !fromDate && !toDate
                      ? "All Dates"
                      : fromDate === toDate
                      ? fromDate
                      : `${fromDate || "..."} to ${toDate || "..."}`}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDetailModalOpen(false)}
                ></button>
              </div>

              <div className="modal-body">
                {detailLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="text-muted small mt-2 mb-0">Loading follow-ups and recordings...</p>
                  </div>
                ) : (
                  <div className="row g-4">
                    {/* Left: Follow-ups Logged */}
                    <div className="col-lg-5">
                      <div className="border rounded-3 p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="fw-bold mb-0">
                            <i className="bi bi-telephone-outbound-fill text-primary me-2"></i>
                            Follow-Ups Logged
                          </h6>
                          <span className="badge bg-primary">{staffDetail.follow_ups.length}</span>
                        </div>
                        {staffDetail.follow_ups.length === 0 ? (
                          <p className="text-muted small mb-0">No follow-ups logged in this period.</p>
                        ) : (
                          <div className="list-group list-group-flush" style={{ maxHeight: "420px", overflowY: "auto" }}>
                            {staffDetail.follow_ups.map((fu) => (
                              <div key={fu.id} className="list-group-item px-0 py-2">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <div className="fw-semibold small">{fu.lead?.name || "Unknown Lead"}</div>
                                    <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                                      {fu.lead?.phone || "-"} • {fu.type || "Call"} • {fu.follow_up_date}
                                    </div>
                                  </div>
                                  <span className="badge bg-light text-dark border" style={{ fontSize: "0.7rem" }}>
                                    {fu.status}
                                  </span>
                                </div>
                                {fu.notes && <div className="small text-muted mt-1">{fu.notes}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Uploaded Recordings */}
                    <div className="col-lg-7">
                      <div className="border rounded-3 p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="fw-bold mb-0">
                            <i className="bi bi-mic-fill text-success me-2"></i>
                            Uploaded Call Recordings
                          </h6>
                          <span className="badge bg-success">{staffDetail.recordings.length}</span>
                        </div>
                        {staffDetail.recordings.length === 0 ? (
                          <div className="text-center py-4 text-muted small">
                            No recordings uploaded in this period.
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-3" style={{ maxHeight: "420px", overflowY: "auto" }}>
                            {staffDetail.recordings.map((rec) => (
                              <div key={rec.id} className="border rounded-3 p-2 px-3">
                                <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-2">
                                  <div>
                                    <div className="fw-semibold small">{rec.original_name}</div>
                                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                      {rec.recording_date} • {formatBytes(rec.file_size)}
                                      {rec.phone_number ? ` • ${rec.phone_number}` : ""}
                                    </div>
                                  </div>
                                  <div>{getReviewBadge(rec.review_status)}</div>
                                </div>

                                {rec.notes && (
                                  <div className="small text-muted mb-2">Note: {rec.notes}</div>
                                )}
                                {rec.review_remark && (
                                  <div className="small text-danger mb-2">Remark: {rec.review_remark}</div>
                                )}

                                <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                                  <CallRecordingAudioPlayer recordingId={rec.id} fileName={rec.original_name} />
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      type="button"
                                      className="btn btn-outline-success"
                                      onClick={() => handleQuickReview(rec, "verified")}
                                      disabled={rec.review_status === "verified"}
                                    >
                                      <i className="bi bi-check-lg me-1"></i>Verify
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      onClick={() => {
                                        setReviewTarget({ recording: rec, nextStatus: "flagged" });
                                        setReviewRemark(rec.review_remark || "");
                                      }}
                                    >
                                      <i className="bi bi-flag-fill me-1"></i>Flag
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDetailModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flag / Remark Modal */}
      {reviewTarget && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1065 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <form className="modal-content" onSubmit={submitReviewModal}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Flag Call Recording</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setReviewTarget(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-2">
                  File: <strong>{reviewTarget.recording?.original_name}</strong>
                </p>
                <label className="form-label small fw-semibold">Reason / Remark</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="e.g., Audio is blank, wrong call, or incomplete conversation..."
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setReviewTarget(null)}
                  disabled={isSubmittingReview}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={isSubmittingReview}>
                  {isSubmittingReview ? "Saving..." : "Flag Recording"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
