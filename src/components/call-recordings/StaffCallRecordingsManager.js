"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import Pagination from "@/components/common/Pagination";
import callRecordingApi from "@/services/callRecordingApi";
import CallRecordingAudioPlayer from "@/components/call-recordings/CallRecordingAudioPlayer";
import { getRoleDashboardPath } from "@/utils/auth";

const ALLOWED_EXTENSIONS = [
  "mp3", "wav", "m4a", "aac", "ogg", "oga", "opus",
  "amr", "3gp", "3gpp", "webm", "mp4", "mpeg", "mpga", "flac", "wma",
];

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
          <i className="bi bi-hourglass-split me-1"></i>Pending Review
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

export default function StaffCallRecordingsManager() {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());

  // KPIs + Combined Date-wise Table
  const [summary, setSummary] = useState({
    total_follow_ups: 0,
    call_follow_ups: 0,
    recordings_uploaded: 0,
    pending_review: 0,
    verified_count: 0,
    flagged_count: 0,
    missing_count: 0,
  });
  const [dailyRows, setDailyRows] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Bulk Upload State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchNotes, setBatchNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0, percent: 0 });

  // Day Detail Modal (View & Listen)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDayDate, setActiveDayDate] = useState("");
  const [dayDetail, setDayDetail] = useState({
    follow_ups: [],
    recordings: [],
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user");
        if (stored) setCurrentUser(JSON.parse(stored));
      } catch (_) { }
    }
  }, []);

  const buildDateParams = () => {
    const p = {};
    if (fromDate) p.from_date = fromDate;
    if (toDate) p.to_date = toDate;
    return p;
  };

  const loadData = async (page = currentPage) => {
    setIsLoading(true);
    try {
      const res = await callRecordingApi.getSummary({
        ...buildDateParams(),
        page,
        per_page: perPage,
      });

      if (res?.status) {
        if (res.summary) setSummary(res.summary);
        setDailyRows(Array.isArray(res.daily_rows) ? res.daily_rows : []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to load call recordings.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, currentPage, perPage]);

  const addFilesToQueue = (incomingFiles) => {
    const arr = Array.from(incomingFiles || []);
    if (arr.length === 0) return;

    const valid = [];
    const rejected = [];

    arr.forEach((file) => {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        rejected.push(`${file.name} (unsupported .${ext})`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        rejected.push(`${file.name} (> 50MB)`);
        return;
      }
      valid.push(file);
    });

    if (rejected.length > 0) {
      showToast(`Skipped ${rejected.length} file(s): ${rejected.slice(0, 2).join(", ")}`, "warning");
    }

    if (valid.length > 0) {
      setSelectedFiles((prev) => {
        const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}_${f.lastModified}`));
        const deduped = valid.filter((f) => !existingKeys.has(`${f.name}_${f.size}_${f.lastModified}`));
        return [...prev, ...deduped];
      });
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleBulkUpload = async () => {
    if (selectedFiles.length === 0) {
      showToast("Please select one or more call recording files first.", "warning");
      return;
    }

    setIsUploading(true);
    setUploadProgress({ completed: 0, total: selectedFiles.length, percent: 0 });

    try {
      const todayDate = getTodayDate();
      const result = await callRecordingApi.uploadBatch(
        selectedFiles,
        {
          recording_date: todayDate,
          notes: batchNotes.trim() || null,
        },
        (progress) => setUploadProgress(progress)
      );

      if (result.uploaded_count > 0) {
        showToast(
          `${result.uploaded_count} call recording(s) uploaded successfully for ${todayDate}!`,
          result.partial ? "warning" : "success"
        );
      }

      if (result.errors?.length > 0) {
        showToast(`Some files failed: ${result.errors[0].message}`, "error");
      }

      if (!result.partial && result.errors?.length === 0) {
        setSelectedFiles([]);
        setBatchNotes("");
      }

      setCurrentPage(1);
      await loadData(1);
    } catch (err) {
      showToast(err?.message || "Bulk upload failed.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenDayDetail = async (row) => {
    if (!currentUser?.id) return;
    setActiveDayDate(row.date);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDayDetail({ follow_ups: [], recordings: [] });
    try {
      const res = await callRecordingApi.getStaffDetail(currentUser.id, { date: row.date });
      if (res?.status) {
        setDayDetail({
          follow_ups: Array.isArray(res.follow_ups) ? res.follow_ups : [],
          recordings: Array.isArray(res.recordings) ? res.recordings : [],
        });
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to load day details.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteRecording = async (rec) => {
    if (!window.confirm(`Delete recording "${rec.original_name}"?`)) return;
    try {
      const res = await callRecordingApi.deleteRecording(rec.id);
      if (res?.status) {
        showToast("Recording deleted successfully.", "success");
        setDayDetail((prev) => ({
          ...prev,
          recordings: prev.recordings.filter((r) => r.id !== rec.id),
        }));
        loadData(currentPage);
      } else {
        showToast(res?.message || "Failed to delete recording.", "error");
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Unable to delete recording.", "error");
    }
  };

  const totalSelectedSize = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const dashboardHref = getRoleDashboardPath(currentUser?.role);
  const dateRangeLabel =
    !fromDate && !toDate
      ? "All Dates"
      : fromDate === toDate
        ? fromDate
        : `${fromDate || "..."} to ${toDate || "..."}`;

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
              <li className="breadcrumb-item active">Call Recordings</li>
            </ul>
            <h1 className="page-title mt-1">Daily Call Recordings Upload</h1>
            <p className="text-muted small mb-0">
              Select all your call recordings together at the end of the day and upload them in one click.
            </p>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="row g-3 mb-4 row-cols-2 row-cols-md-4">
          <div className="col">
            <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: "4px solid #2563eb" }}>
              <div className="card-body">
                <div className="text-muted small fw-semibold">Call Follow-Ups Taken</div>
                <div className="fs-3 fw-bold mt-1 text-primary">{summary.call_follow_ups}</div>
                <div className="small text-muted">
                  Total Follow-ups: {summary.total_follow_ups}
                </div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: "4px solid #10b981" }}>
              <div className="card-body">
                <div className="text-muted small fw-semibold">Recordings Uploaded</div>
                <div className="fs-3 fw-bold mt-1 text-success">{summary.recordings_uploaded}</div>
                <div className="small text-muted">{dateRangeLabel}</div>
              </div>
            </div>
          </div>

          <div className="col">
            <div
              className="card h-100 border-0 shadow-sm"
              style={{
                borderLeft: `4px solid ${summary.missing_count > 0 ? "#ef4444" : "#16a34a"}`,
              }}
            >
              <div className="card-body">
                <div className="text-muted small fw-semibold">Pending / Missing</div>
                <div
                  className={`fs-3 fw-bold mt-1 ${summary.missing_count > 0 ? "text-danger" : "text-success"
                    }`}
                >
                  {summary.missing_count}
                </div>
                <div className="small text-muted">
                  {summary.missing_count === 0 && summary.call_follow_ups > 0
                    ? "All calls uploaded!"
                    : "Upload to match calls"}
                </div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="card h-100 border-0 shadow-sm" style={{ borderLeft: "4px solid #f59e0b" }}>
              <div className="card-body">
                <div className="text-muted small fw-semibold">Manager Verification</div>
                <div className="fs-5 fw-bold mt-2 d-flex align-items-center gap-2 flex-wrap">
                  <span className="badge bg-success-subtle text-success">{summary.verified_count} Verified</span>
                  <span className="badge bg-warning-subtle text-warning">{summary.pending_review} Pending</span>
                  {summary.flagged_count > 0 && (
                    <span className="badge bg-danger-subtle text-danger">{summary.flagged_count} Flagged</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Direct Bulk Upload Card */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-transparent border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-cloud-arrow-up-fill text-primary me-2"></i>
                Bulk Upload Call Recordings
              </h5>
              <small className="text-muted">
                No need to link files individually — select all recordings (e.g., 10 files) and upload together for{" "}
                <strong>{getTodayDate()}</strong>.
              </small>
            </div>
            {selectedFiles.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => setSelectedFiles([])}
                disabled={isUploading}
              >
                Clear All ({selectedFiles.length})
              </button>
            )}
          </div>

          <div className="card-body">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                addFilesToQueue(e.dataTransfer.files);
              }}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`rounded-3 p-4 text-center mb-3 ${isDragging ? "border-primary bg-primary-subtle" : "border-secondary-subtle"
                }`}
              style={{
                border: "2px dashed",
                cursor: isUploading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.amr,.3gp,.3gpp,.webm,.mp4,.mpeg,.mpga,.flac,.wma"
                className="d-none"
                onChange={(e) => {
                  addFilesToQueue(e.target.files);
                  e.target.value = "";
                }}
              />
              <i className="bi bi-mic-fill fs-1 text-primary d-block mb-2"></i>
              <h6 className="fw-bold mb-1">
                Click here or Drag &amp; Drop all today&apos;s call recordings
              </h6>
              <p className="text-muted small mb-0">
                Supports multiple files at once (.mp3, .m4a, .mpeg, .wav, .aac, .ogg, .opus, .amr, .3gp, .webm — max 50MB per file)
              </p>
            </div>

            {/* Selected Files Queue */}
            {selectedFiles.length > 0 && (
              <div className="border rounded-3 p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                  <span className="fw-semibold small">
                    Selected Files: <span className="badge bg-primary">{selectedFiles.length}</span>{" "}
                    <span className="text-muted ms-1">({formatBytes(totalSelectedSize)})</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Add More Files
                  </button>
                </div>

                <div className="d-flex flex-wrap gap-2 mb-3" style={{ maxHeight: "180px", overflowY: "auto" }}>
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}_${idx}`}
                      className="d-flex align-items-center gap-2 px-2 py-1 rounded border small"
                      style={{ backgroundColor: "rgba(37, 99, 235, 0.06)" }}
                    >
                      <i className="bi bi-file-earmark-music-fill text-primary"></i>
                      <span className="text-truncate" style={{ maxWidth: "200px" }} title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                        ({formatBytes(file.size)})
                      </span>
                      {!isUploading && (
                        <button
                          type="button"
                          className="btn btn-sm p-0 text-danger border-0 lh-1"
                          onClick={() => handleRemoveFile(idx)}
                          title="Remove file"
                        >
                          <i className="bi bi-x-circle-fill"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="row g-2 align-items-end">
                  <div className="col-md-8">
                    <label className="form-label small fw-semibold mb-1">
                      Optional Note (applies to this batch)
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g., Evening follow-up recordings (10 calls)"
                      value={batchNotes}
                      onChange={(e) => setBatchNotes(e.target.value)}
                      disabled={isUploading}
                    />
                  </div>
                  <div className="col-md-4 d-grid">
                    <button
                      type="button"
                      className="btn btn-primary fw-semibold"
                      onClick={handleBulkUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Uploading {uploadProgress.completed}/{uploadProgress.total}...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-upload me-2"></i>
                          Upload All {selectedFiles.length} Recording{selectedFiles.length > 1 ? "s" : ""}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isUploading && (
                  <div className="progress mt-3" style={{ height: "8px" }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated"
                      role="progressbar"
                      style={{ width: `${uploadProgress.percent}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date Range Filter Bar */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body py-3">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
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
              <div className="col-md-3">
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
              <div className="col-md-6">
                <label className="form-label small fw-semibold mb-1 d-block">Quick Date</label>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    className={`btn btn-sm py-1 px-3 ${!fromDate && !toDate ? "btn-primary" : "btn-outline-secondary"
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
                    className={`btn btn-sm py-1 px-3 ${fromDate === getTodayDate() && toDate === getTodayDate()
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
                    className={`btn btn-sm py-1 px-3 ${fromDate === getYesterdayDate() && toDate === getYesterdayDate()
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
              </div>
            </div>
          </div>
        </div>

        {/* Single Combined Date-Wise Table (Follow-Ups + Recordings) */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-transparent border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-calendar2-check-fill text-primary me-2"></i>
                Daily Follow-Ups &amp; Call Recordings ({dateRangeLabel})
              </h5>
              <span className="badge bg-secondary-subtle text-secondary">{pagination.total || 0} Days</span>
            </div>
          </div>

          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="text-muted small mt-2 mb-0">Loading daily summary...</p>
              </div>
            ) : dailyRows.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-mic-mute fs-1 d-block mb-2 opacity-50"></i>
                <p className="mb-0">
                  No follow-ups or recordings found {!fromDate && !toDate ? "yet" : `for ${dateRangeLabel}`}.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th className="text-center">Call Follow-Ups</th>
                      <th className="text-center">Recordings Uploaded</th>
                      <th>Compliance Status</th>
                      <th>Verification</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRows.map((row) => (
                      <tr key={row.date}>
                        <td className="fw-semibold text-nowrap">
                          <i className="bi bi-calendar3 text-primary me-2"></i>
                          {row.date}
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
                              <span className="badge bg-success-subtle text-success">
                                {row.verified_count} Verified
                              </span>
                            )}
                            {row.pending_count > 0 && (
                              <span className="badge bg-warning-subtle text-warning">
                                {row.pending_count} Pending
                              </span>
                            )}
                            {row.flagged_count > 0 && (
                              <span className="badge bg-danger-subtle text-danger">
                                {row.flagged_count} Flagged
                              </span>
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
                            onClick={() => handleOpenDayDetail(row)}
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
            currentPage={pagination.current_page || 1}
            lastPage={pagination.last_page || 1}
            total={pagination.total || 0}
            perPage={perPage}
            itemName="days"
            onPageChange={(p) => setCurrentPage(p)}
            onPerPageChange={(n) => {
              setPerPage(n);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Day Detail Modal: Follow-Ups + Uploaded Recordings side-by-side */}
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
                    Follow-Ups &amp; Call Recordings — {activeDayDate}
                  </h5>
                  <small className="text-muted">
                    {currentUser?.name || "Staff"} ({currentUser?.role || "Sales Executive"})
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
                    <p className="text-muted small mt-2 mb-0">Loading day details...</p>
                  </div>
                ) : (
                  <div className="row g-4">
                    {/* Left: Follow-ups on this date */}
                    <div className="col-lg-5">
                      <div className="border rounded-3 p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="fw-bold mb-0">
                            <i className="bi bi-telephone-outbound-fill text-primary me-2"></i>
                            Follow-Ups on {activeDayDate}
                          </h6>
                          <span className="badge bg-primary">{dayDetail.follow_ups.length}</span>
                        </div>
                        {dayDetail.follow_ups.length === 0 ? (
                          <p className="text-muted small mb-0">No follow-ups logged on this date.</p>
                        ) : (
                          <div className="list-group list-group-flush" style={{ maxHeight: "420px", overflowY: "auto" }}>
                            {dayDetail.follow_ups.map((fu) => (
                              <div key={fu.id} className="list-group-item px-0 py-2">
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                  <div>
                                    <div className="fw-semibold small">{fu.lead?.name || "Unknown Lead"}</div>
                                    <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                                      {fu.lead?.phone || "-"} • {fu.type || "Call"}
                                      {fu.follow_up_time ? ` • ${fu.follow_up_time}` : ""}
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

                    {/* Right: Uploaded Recordings on this date */}
                    <div className="col-lg-7">
                      <div className="border rounded-3 p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="fw-bold mb-0">
                            <i className="bi bi-mic-fill text-success me-2"></i>
                            Uploaded Recordings on {activeDayDate}
                          </h6>
                          <span className="badge bg-success">{dayDetail.recordings.length}</span>
                        </div>
                        {dayDetail.recordings.length === 0 ? (
                          <div className="text-center py-4 text-muted small">
                            No recordings uploaded on this date.
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-3" style={{ maxHeight: "420px", overflowY: "auto" }}>
                            {dayDetail.recordings.map((rec) => (
                              <div key={rec.id} className="border rounded-3 p-2 px-3">
                                <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-2">
                                  <div>
                                    <div className="fw-semibold small">{rec.original_name}</div>
                                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                      {formatBytes(rec.file_size)}
                                      {rec.phone_number ? ` • ${rec.phone_number}` : ""}
                                    </div>
                                  </div>
                                  <div>{getReviewBadge(rec.review_status)}</div>
                                </div>

                                {rec.notes && (
                                  <div className="small text-muted mb-2">Note: {rec.notes}</div>
                                )}
                                {rec.review_remark && (
                                  <div className="small text-danger mb-2">
                                    Manager Remark: {rec.review_remark}
                                  </div>
                                )}

                                <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                                  <CallRecordingAudioPlayer recordingId={rec.id} fileName={rec.original_name} />
                                  {rec.review_status !== "verified" && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleDeleteRecording(rec)}
                                      title="Delete recording"
                                    >
                                      <i className="bi bi-trash me-1"></i>Delete
                                    </button>
                                  )}
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
    </AdminLayout>
  );
}
