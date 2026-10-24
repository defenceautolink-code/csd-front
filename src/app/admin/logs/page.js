"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import Pagination from "@/components/common/Pagination";
import axios from "@/lib/axios";

export default function ActivityLogsPage() {
  const { showToast } = useToast();

  // State Management
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  });

  // Filter Dropdown Options
  const [filterUsers, setFilterUsers] = useState([]);
  const [filterModules, setFilterModules] = useState([]);

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch Filter Dropdowns (Users & Modules)
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const res = await axios.get("/activity-logs/filters");
        if (res.data?.status && res.data.data) {
          setFilterUsers(res.data.data.users || []);
          setFilterModules(res.data.data.modules || []);
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    };
    fetchFilterData();
  }, []);

  // Fetch Activity Logs
  const fetchLogs = useCallback(
    async (pageToLoad = currentPage) => {
      setIsLoading(true);
      try {
        const params = {
          page: pageToLoad,
          per_page: perPage,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (selectedUser !== "all") params.user_id = selectedUser;
        if (selectedModule !== "all") params.module = selectedModule;
        if (selectedAction !== "all") params.action = selectedAction;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const res = await axios.get("/activity-logs", { params });
        if (res.data?.status) {
          setLogs(res.data.data || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        console.error("Failed to fetch logs", err);
        showToast("Error fetching activity logs", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, perPage, searchTerm, selectedUser, selectedModule, selectedAction, startDate, endDate, showToast]
  );

  useEffect(() => {
    fetchLogs(currentPage);
  }, [fetchLogs, currentPage]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedUser("all");
    setSelectedModule("all");
    setSelectedAction("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Export to Excel / CSV
  const handleExport = async () => {
    setIsExporting(true);
    showToast("Exporting activity logs as CSV...", "info");
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (selectedUser !== "all") params.append("user_id", selectedUser);
      if (selectedModule !== "all") params.append("module", selectedModule);
      if (selectedAction !== "all") params.append("action", selectedAction);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");

      const response = await fetch(`${API_URL}/activity-logs/export?${params.toString()}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      showToast("Activity logs exported successfully!", "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export activity logs.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Action Badge Helper matching CRM aesthetic
  const getActionBadge = (action, method) => {
    const act = (action || "").toLowerCase();
    switch (act) {
      case "insert":
      case "post":
        return (
          <span className="badge bg-success-subtle text-success small">
            <i className="bi bi-plus-circle me-1"></i>POST / Insert
          </span>
        );
      case "update":
      case "put":
        return (
          <span className="badge bg-warning-subtle text-warning small">
            <i className="bi bi-pencil-square me-1"></i>PUT / Update
          </span>
        );
      case "delete":
        return (
          <span className="badge bg-danger-subtle text-danger small">
            <i className="bi bi-trash3 me-1"></i>DELETE
          </span>
        );
      case "login":
        return (
          <span className="badge bg-primary-subtle text-primary small">
            <i className="bi bi-box-arrow-in-right me-1"></i>Login
          </span>
        );
      case "logout":
        return (
          <span className="badge bg-secondary-subtle text-muted small">
            <i className="bi bi-box-arrow-right me-1"></i>Logout
          </span>
        );
      case "export":
        return (
          <span className="badge bg-info-subtle text-info small">
            <i className="bi bi-file-earmark-arrow-down me-1"></i>Export
          </span>
        );
      default:
        return (
          <span className="badge bg-light text-dark small">
            {method || action || "Action"}
          </span>
        );
    }
  };

  // Format Date and Time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    selectedUser !== "all" ||
    selectedModule !== "all" ||
    selectedAction !== "all" ||
    startDate ||
    endDate
  );

  return (
    <AdminLayout activePage="logs">
      <div className="page-body">
        {/* Page Breadcrumbs & Header Actions - Matching Brand Master */}
        <div className="page-header-wrapper">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <a href="#">Management</a>
              </li>
              <li className="breadcrumb-item active">Activity Logs</li>
            </ul>
            <h1 className="page-title mt-1">Activity & Audit Logs</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-custom"
              onClick={handleExport}
              disabled={isExporting || pagination.total === 0}
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>{isExporting ? "Exporting..." : "Export Excel"}</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => fetchLogs(currentPage)}
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? "spin" : ""}`}></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Activity KPI Counters - Matching Brand Page */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Logs</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-clock-history"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {pagination.total || 0} Logs
              </div>
              <span className="text-primary small fw-semibold">Audit Trail Events</span>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Inserts / Posts</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-plus-circle"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {logs.filter((l) => l.action === "insert").length} Actions
              </div>
              <span className="text-success small fw-semibold">New Data Added</span>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Updates / Puts</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-pencil-square"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {logs.filter((l) => l.action === "update").length} Actions
              </div>
              <span className="text-warning small fw-semibold">Modified Records</span>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Deletes / Logins</span>
                <div className="stat-icon-box danger">
                  <i className="bi bi-shield-lock"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {logs.filter((l) => l.action === "delete" || l.action === "login").length} Actions
              </div>
              <span className="text-danger small fw-semibold">Deletions & Logins</span>
            </div>
          </div>
        </div>

        {/* Activity Logs Table Card - Matching Brand Page Structure */}
        <div className="card">
          {/* Card Header with Title, Count Badge and Filters */}
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <h5 className="card-title mb-0">System Activity Records</h5>
              <span className="badge bg-primary-subtle text-primary rounded-pill px-2">
                {pagination.total} Records
              </span>
            </div>

            {/* Filter Bar Controls */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* User Filter */}
              <select
                className="form-select form-select-sm"
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: "135px" }}
              >
                <option value="all">All Users</option>
                {filterUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (ID: #{u.id})
                  </option>
                ))}
              </select>

              {/* Module Filter */}
              <select
                className="form-select form-select-sm"
                value={selectedModule}
                onChange={(e) => {
                  setSelectedModule(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: "125px" }}
              >
                <option value="all">All Modules</option>
                {filterModules.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>

              {/* Action Filter */}
              <select
                className="form-select form-select-sm"
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: "105px" }}
              >
                <option value="all">All Actions</option>
                <option value="insert">Insert</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="export">Export</option>
              </select>

              {/* Start Date */}
              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                title="Start Date"
                style={{ width: "130px" }}
              />

              {/* End Date */}
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                title="End Date"
                style={{ width: "130px" }}
              />

              {/* Search Box */}
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: "160px" }}
              />

              {/* Reset Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="btn btn-sm btn-outline-danger"
                  title="Clear all filters"
                >
                  <i className="bi bi-x-circle"></i>
                </button>
              )}
            </div>
          </div>

          {/* Table - Using .table-custom matching Brand page */}
          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>No</th>
                  <th style={{ width: "80px" }} className="text-center">Action</th>
                  <th>Title & Activity</th>
                  <th>Module</th>
                  <th>Updated By (User ID)</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading activity logs from API...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No activity logs found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => (
                    <tr key={log.id}>
                      {/* No / ID */}
                      <td>
                        <span className="text-muted small">
                          {(currentPage - 1) * perPage + index + 1}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="text-center">
                        <div className="table-actions justify-content-center">
                          <button
                            className="btn-action btn-view"
                            title="View Log Details"
                            onClick={() => setSelectedLog(log)}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </div>
                      </td>

                      {/* Title & Activity Badge */}
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <span className="fw-semibold text-dark">{log.title}</span>
                          <div>{getActionBadge(log.action, log.method)}</div>
                        </div>
                      </td>

                      {/* Module */}
                      <td>
                        <span className="badge bg-info-subtle text-info small">
                          <i className="bi bi-folder2-open me-1"></i>
                          {log.module}
                        </span>
                      </td>

                      {/* Updated By (User ID & Name) */}
                      <td>
                        {log.user ? (
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                              style={{ width: "30px", height: "30px", fontSize: "11px" }}
                            >
                              {log.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-semibold text-dark lh-sm" style={{ fontSize: "13px" }}>
                                {log.user.name}{" "}
                                <span className="badge bg-light text-muted border ms-1 small" style={{ fontSize: "10px" }}>
                                  ID: #{log.user_id}
                                </span>
                              </div>
                              <span className="text-muted small" style={{ fontSize: "11px" }}>
                                {log.user.email}
                              </span>
                            </div>
                          </div>
                        ) : log.user_id ? (
                          <span className="text-muted small">User ID: #{log.user_id} (Deleted)</span>
                        ) : (
                          <span className="badge bg-light text-secondary border small">System / Anonymous</span>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td>
                        <div className="d-flex flex-column">
                          <span className="text-dark fw-medium small">
                            {formatDateTime(log.created_at)}
                          </span>
                          <span className="text-muted" style={{ fontSize: "11px" }}>
                            IP: {log.ip_address || "127.0.0.1"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - Placed cleanly inside card matching Brand page */}
          {!isLoading && pagination.total > 0 && (
            <Pagination
              currentPage={currentPage}
              lastPage={pagination.last_page}
              total={pagination.total}
              perPage={perPage}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
              perPageOptions={[10, 15, 25, 50, 100]}
              itemName="logs"
            />
          )}
        </div>

        {/* Log Detail Modal */}
        {selectedLog && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
              <div className="modal-content shadow-lg border-0">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-info-circle-fill text-primary"></i>
                    Activity Log Details #{selectedLog.id}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedLog(null)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="text-muted small fw-semibold">Title</label>
                      <div className="fw-bold fs-6">{selectedLog.title}</div>
                    </div>
                    <div className="col-md-6">
                      <label className="text-muted small fw-semibold">Action & Method</label>
                      <div>
                        {getActionBadge(selectedLog.action, selectedLog.method)}
                        <span className="badge bg-dark ms-2">{selectedLog.method}</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="text-muted small fw-semibold">Module</label>
                      <div>
                        <span className="badge bg-info-subtle text-info border px-2 py-1">
                          {selectedLog.module}
                        </span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="text-muted small fw-semibold">Timestamp</label>
                      <div className="text-dark fw-medium">
                        {formatDateTime(selectedLog.created_at)}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="text-muted small fw-semibold">Updated By (User)</label>
                      <div className="fw-semibold">
                        {selectedLog.user ? (
                          <>
                            {selectedLog.user.name} ({selectedLog.user.email}) - Role:{" "}
                            {selectedLog.user.role || "N/A"}
                          </>
                        ) : selectedLog.user_id ? (
                          `User ID: #${selectedLog.user_id}`
                        ) : (
                          "System"
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="text-muted small fw-semibold">IP Address</label>
                      <div className="font-monospace text-dark">
                        {selectedLog.ip_address || "N/A"}
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="text-muted small fw-semibold">Request URL</label>
                      <div className="p-2 bg-light border rounded font-monospace small text-break">
                        {selectedLog.url || "N/A"}
                      </div>
                    </div>
                    {selectedLog.description && (
                      <div className="col-12">
                        <label className="text-muted small fw-semibold">Details / Payload Info</label>
                        <div className="p-3 bg-light border rounded text-dark">
                          {selectedLog.description}
                        </div>
                      </div>
                    )}
                    {selectedLog.user_agent && (
                      <div className="col-12">
                        <label className="text-muted small fw-semibold">User Agent / Browser</label>
                        <div className="text-muted small text-break">
                          {selectedLog.user_agent}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary px-4"
                    onClick={() => setSelectedLog(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
