"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import Pagination from "@/components/common/Pagination";
import axios from "@/lib/axios";

/**
 * Reusable Searchable Dropdown Component
 */
function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  searchPlaceholder = "Type to search...",
  width = "180px",
  icon = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Find currently selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Filter options based on search query (search by label, sublabel, or value)
  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const labelMatch = (opt.label || "").toLowerCase().includes(term);
    const sublabelMatch = (opt.sublabel || "").toLowerCase().includes(term);
    const valueMatch = String(opt.value || "").toLowerCase().includes(term);
    return labelMatch || sublabelMatch || valueMatch;
  });

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="position-relative" ref={dropdownRef} style={{ width }}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`form-select form-select-sm text-start d-flex align-items-center justify-content-between text-truncate ${
          isOpen ? "border-primary shadow-sm" : ""
        }`}
        style={{
          cursor: "pointer",
          backgroundColor: "#fff",
          fontSize: "12.5px",
          paddingRight: "28px",
        }}
        onClick={() => setIsOpen((prev) => !prev)}
        title={selectedOption ? selectedOption.label : placeholder}
      >
        <span className="text-truncate">
          {icon && <i className={`${icon} me-1 text-muted`}></i>}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="dropdown-menu show shadow-lg border p-2"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 1050,
            minWidth: width === "100%" ? "100%" : Math.max(parseInt(width, 10) || 200, 240) + "px",
            maxHeight: "320px",
            display: "flex",
            flexDirection: "column",
            marginTop: "4px",
            borderRadius: "8px",
          }}
        >
          {/* Search Input */}
          <div className="p-1 mb-2">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted small"></i>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control form-control-sm border-start-0"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch("");
                    searchInputRef.current?.focus();
                  }}
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-auto flex-grow-1" style={{ maxHeight: "230px" }}>
            {filteredOptions.length === 0 ? (
              <div className="text-muted small text-center py-3">No matching results</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`dropdown-item text-wrap rounded py-1 px-2 d-flex flex-column mb-1 ${
                      isSelected ? "active bg-primary text-white" : ""
                    }`}
                    onClick={() => handleSelect(opt.value)}
                    style={{ fontSize: "12.5px" }}
                  >
                    <div className="d-flex align-items-center justify-content-between w-100">
                      <span className="fw-medium text-truncate">{opt.label}</span>
                      {opt.badge && (
                        <span
                          className={`badge ${
                            isSelected ? "bg-white text-primary" : "bg-light text-muted border"
                          } ms-1 small`}
                          style={{ fontSize: "10px" }}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.sublabel && (
                      <span
                        className={`small text-truncate ${isSelected ? "text-white-50" : "text-muted"}`}
                        style={{ fontSize: "11px" }}
                      >
                        {opt.sublabel}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [filterActions, setFilterActions] = useState([]);

  // Fetch Filter Dropdowns (Users, Modules & Actions)
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const res = await axios.get("/activity-logs/filters");
        if (res.data?.status && res.data.data) {
          setFilterUsers(res.data.data.users || []);
          setFilterModules(res.data.data.modules || []);
          setFilterActions(res.data.data.actions || []);
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

  // Action Badge Helper
  const getActionBadge = (action) => {
    const act = (action || "").toLowerCase();
    switch (act) {
      case "add":
      case "insert":
      case "post":
        return (
          <span className="badge bg-success-subtle text-success px-2 py-1 fw-semibold">
            <i className="bi bi-plus-circle me-1"></i>ADD
          </span>
        );
      case "edit":
      case "update":
      case "put":
      case "patch":
        return (
          <span className="badge bg-warning-subtle text-warning px-2 py-1 fw-semibold">
            <i className="bi bi-pencil-square me-1"></i>EDIT
          </span>
        );
      case "trash":
      case "soft_delete":
        return (
          <span className="badge bg-warning-subtle text-dark border border-warning px-2 py-1 fw-semibold">
            <i className="bi bi-trash me-1 text-warning"></i>TRASH
          </span>
        );
      case "restore":
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-semibold">
            <i className="bi bi-arrow-counterclockwise me-1"></i>RESTORE
          </span>
        );
      case "delete":
        return (
          <span className="badge bg-danger-subtle text-danger px-2 py-1 fw-semibold">
            <i className="bi bi-trash3 me-1"></i>DELETE
          </span>
        );
      case "send":
      case "email":
        return (
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fw-semibold">
            <i className="bi bi-send-fill me-1"></i>SEND
          </span>
        );
      case "print":
      case "printed":
        return (
          <span className="badge bg-secondary-subtle text-dark border px-2 py-1 fw-semibold">
            <i className="bi bi-printer-fill me-1 text-secondary"></i>PRINT
          </span>
        );
      case "login":
        return (
          <span className="badge bg-primary-subtle text-primary px-2 py-1 fw-semibold">
            <i className="bi bi-box-arrow-in-right me-1"></i>LOGIN
          </span>
        );
      case "logout":
        return (
          <span className="badge bg-secondary-subtle text-secondary px-2 py-1 fw-semibold">
            <i className="bi bi-box-arrow-right me-1"></i>LOGOUT
          </span>
        );
      case "export":
        return (
          <span className="badge bg-info-subtle text-info px-2 py-1 fw-semibold">
            <i className="bi bi-file-earmark-arrow-down me-1"></i>EXPORT
          </span>
        );
      default:
        return (
          <span className="badge bg-light text-dark border px-2 py-1 fw-semibold">
            {action ? action.toUpperCase() : "ACTION"}
          </span>
        );
    }
  };

  // Format Date and Time in Indian Standard Time (IST)
  const formatISTDateTime = (dateStr, fallbackStr) => {
    if (fallbackStr && typeof fallbackStr === "string" && fallbackStr.includes("M")) {
      return fallbackStr;
    }
    if (!dateStr) return fallbackStr || "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return fallbackStr || dateStr;
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return fallbackStr || dateStr;
    }
  };

  // Prepare User Options for SearchableSelect
  const userOptions = [
    { value: "all", label: "All Users", sublabel: "Filter by any user" },
    ...filterUsers.map((u) => ({
      value: String(u.id),
      label: u.name,
      badge: `#${u.id}`,
      sublabel: u.phone ? `📞 ${u.phone}` : u.email || "No phone",
    })),
  ];

  // Prepare Module Options for SearchableSelect
  const moduleOptions = [
    { value: "all", label: "All Modules" },
    ...filterModules.map((mod) => ({
      value: mod,
      label: mod,
    })),
  ];

  // Prepare Action Options for SearchableSelect
  const standardActions = [
    { value: "all", label: "All Actions" },
    { value: "add", label: "ADD" },
    { value: "edit", label: "EDIT" },
    { value: "delete", label: "DELETE" },
    { value: "login", label: "LOGIN" },
    { value: "logout", label: "LOGOUT" },
    { value: "export", label: "EXPORT" },
  ];
  const extraActions = filterActions
    .filter((a) => !["add", "edit", "delete", "login", "logout", "export"].includes(a.toLowerCase()))
    .map((act) => ({
      value: act,
      label: act.toUpperCase(),
    }));
  const actionOptions = [...standardActions, ...extraActions];

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
        {/* Page Breadcrumbs & Header Actions */}
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
            <h1 className="page-title mt-1 mb-1">Activity & Audit Logs</h1>
            <p className="text-muted small mb-0">System audit trail of team activities, logins, and database operations.</p>
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

        {/* Action Color Guide Note (Task 3) */}
        <div className="card border-0 shadow-sm mb-3 px-3 py-2.5" style={{ backgroundColor: "#ffffff", borderRadius: "10px" }}>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="text-dark small fw-bold d-flex align-items-center gap-1.5 me-1">
              <i className="bi bi-info-circle-fill text-primary"></i>
              <span>Action Color Guide:</span>
            </span>
            <span className="badge bg-success-subtle text-success px-2 py-1 fw-semibold" title="Record Created / Added">
              <i className="bi bi-plus-circle me-1"></i>Green: ADD (Create)
            </span>
            <span className="badge bg-warning-subtle text-warning px-2 py-1 fw-semibold" title="Record Edited / Updated">
              <i className="bi bi-pencil-square me-1"></i>Yellow: EDIT (Update)
            </span>
            <span className="badge bg-warning-subtle text-dark border border-warning px-2 py-1 fw-semibold" title="Record moved to Trash">
              <i className="bi bi-trash me-1 text-warning"></i>Amber: TRASH (Archive)
            </span>
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-semibold" title="Record Restored">
              <i className="bi bi-arrow-counterclockwise me-1"></i>Light Green: RESTORE
            </span>
            <span className="badge bg-danger-subtle text-danger px-2 py-1 fw-semibold" title="Record Permanently Deleted">
              <i className="bi bi-trash3 me-1"></i>Red: DELETE
            </span>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fw-semibold" title="Quotation / Email Sent or Login">
              <i className="bi bi-send-fill me-1"></i>Blue: SEND / LOGIN
            </span>
            <span className="badge bg-info-subtle text-info px-2 py-1 fw-semibold" title="Data Exported">
              <i className="bi bi-file-earmark-arrow-down me-1"></i>Cyan: EXPORT
            </span>
            <span className="badge bg-secondary-subtle text-secondary px-2 py-1 fw-semibold" title="Logout or Print">
              <i className="bi bi-box-arrow-right me-1"></i>Gray: LOGOUT / PRINT
            </span>
          </div>
        </div>

        {/* Activity Logs Table Card */}
        <div className="card">
          {/* Card Header with Title, Count Badge and Searchable Filters */}
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <h5 className="card-title mb-0">Activity Records</h5>
              <span className="badge bg-primary-subtle text-primary rounded-pill px-2">
                {pagination.total} Records
              </span>
            </div>

            {/* Filter Bar Controls with Searchable Dropdowns */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* 1. Searchable User Filter (User Name, Mobile, ID) */}
              <SearchableSelect
                value={selectedUser}
                onChange={(val) => {
                  setSelectedUser(val);
                  setCurrentPage(1);
                }}
                options={userOptions}
                placeholder="All Users"
                searchPlaceholder="Search name, mobile or ID..."
                width="200px"
                icon="bi bi-person"
              />

              {/* 2. Searchable Module Filter */}
              <SearchableSelect
                value={selectedModule}
                onChange={(val) => {
                  setSelectedModule(val);
                  setCurrentPage(1);
                }}
                options={moduleOptions}
                placeholder="All Modules"
                searchPlaceholder="Search module..."
                width="155px"
                icon="bi bi-folder"
              />

              {/* 3. Searchable Action Filter */}
              <SearchableSelect
                value={selectedAction}
                onChange={(val) => {
                  setSelectedAction(val);
                  setCurrentPage(1);
                }}
                options={actionOptions}
                placeholder="All Actions"
                searchPlaceholder="Search action..."
                width="135px"
                icon="bi bi-lightning-charge"
              />

              {/* 4. Start Date */}
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

              {/* 5. End Date */}
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

              {/* 6. Search Box */}
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search detail, IP..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: "150px" }}
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

          {/* Table: No, User (ID, Name, Mobile), Module, Action, Detail, IP Address, Time (IST) */}
          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>No</th>
                  <th style={{ width: "230px" }}>User</th>
                  <th style={{ width: "140px" }}>Module</th>
                  <th style={{ width: "110px" }}>Action</th>
                  <th>Detail</th>
                  <th style={{ width: "135px" }}>IP Address</th>
                  <th style={{ width: "190px" }}>Date & Time (IST)</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading activity logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No activity logs found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => (
                    <tr key={log.id}>
                      {/* No / Index */}
                      <td>
                        <span className="text-muted small">
                          {(currentPage - 1) * perPage + index + 1}
                        </span>
                      </td>

                      {/* User: Name, ID, Mobile */}
                      <td>
                        {log.user ? (
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: "32px", height: "32px", fontSize: "12px" }}
                            >
                              {log.user.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="d-flex flex-column text-truncate" style={{ maxWidth: "180px" }}>
                              <div className="fw-semibold text-dark lh-sm text-truncate" style={{ fontSize: "13px" }}>
                                {log.user.name}{" "}
                                <span className="badge bg-light text-muted border ms-1 small" style={{ fontSize: "10px" }}>
                                  #{log.user.id}
                                </span>
                              </div>
                              <div className="text-muted d-flex align-items-center gap-1 mt-1 small" style={{ fontSize: "11px" }}>
                                <i className="bi bi-telephone text-secondary" style={{ fontSize: "10px" }}></i>
                                <span>{log.user.phone || log.user_phone || "No Mobile"}</span>
                              </div>
                            </div>
                          </div>
                        ) : log.user_id ? (
                          <div>
                            <span className="fw-medium text-dark small">User #{log.user_id}</span>
                            <div className="text-muted small" style={{ fontSize: "11px" }}>
                              {log.user_phone && log.user_phone !== "-" ? `📞 ${log.user_phone}` : "Deleted User"}
                            </div>
                          </div>
                        ) : (
                          <span className="badge bg-light text-secondary border small">
                            <i className="bi bi-gear me-1"></i>System
                          </span>
                        )}
                      </td>

                      {/* Module */}
                      <td>
                        <span className="badge bg-light text-dark border px-2 py-1 fw-medium" style={{ fontSize: "12px" }}>
                          <i className="bi bi-folder2 me-1 text-primary"></i>
                          {log.module}
                        </span>
                      </td>

                      {/* Action */}
                      <td>
                        {getActionBadge(log.action)}
                      </td>

                      {/* Detail */}
                      <td>
                        <span className="text-dark fw-medium" style={{ fontSize: "13px" }}>
                          {log.detail || "-"}
                        </span>
                      </td>

                      {/* IP Address (IPv4) */}
                      <td>
                        <span className="badge bg-light text-secondary border font-monospace px-2 py-1" style={{ fontSize: "12px" }}>
                          <i className="bi bi-hdd-network me-1 text-muted"></i>
                          {log.ip_address || "127.0.0.1"}
                        </span>
                      </td>

                      {/* Date & Time (IST) */}
                      <td>
                        <div className="d-flex align-items-center gap-1 text-muted small">
                          <i className="bi bi-clock me-1 text-primary"></i>
                          <span>{formatISTDateTime(log.raw_time, log.created_at)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
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
      </div>
    </AdminLayout>
  );
}
