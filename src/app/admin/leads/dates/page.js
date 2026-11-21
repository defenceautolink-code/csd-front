"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import Pagination from "@/components/common/Pagination";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

const formatDateForInput = (d) => {
  if (!d) return "";
  try {
    const str = String(d).split("T")[0];
    return str.length === 10 ? str : "";
  } catch {
    return "";
  }
};

const formatDisplayDate = (d) => {
  if (!d) return null;
  try {
    const raw = String(d).split("T")[0];
    const parts = raw.split("-");
    if (parts.length === 3) {
      const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
    return raw;
  } catch {
    return String(d);
  }
};

// Check if a date matches today (day & month)
const isDateToday = (d) => {
  if (!d) return false;
  try {
    const raw = String(d).split("T")[0];
    const parts = raw.split("-");
    if (parts.length === 3) {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      return parseInt(parts[1], 10) === month && parseInt(parts[2], 10) === day;
    }
  } catch {
    return false;
  }
  return false;
};

export default function LeadDatesPage() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  // dateFilter options: "all" | "missing_birth_date" | "missing_anniversary_date" | "missing_both" | "has_both"
  const [dateFilter, setDateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateRangeTarget, setDateRangeTarget] = useState("any"); // "any" | "birth_date" | "anniversary_date"
  const [segmentFilter, setSegmentFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // In-line Edit Tracking: { [leadId]: { birth_date: string, anniversary_date: string, isDirty: boolean, isSaving: boolean, isSaved: boolean } }
  const [rowEdits, setRowEdits] = useState({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          setCurrentUser(JSON.parse(user));
        } catch (e) {
          console.error("Failed to parse user:", e);
        }
      }
    }
  }, []);

  const getAuthHeaders = useCallback(() => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch Leads
  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/leads`, {
        headers: getAuthHeaders(),
      });
      if (res.data && res.data.status) {
        const data = res.data.data || [];
        setLeads(data);

        // Prepopulate row edits with current values
        const initialEdits = {};
        data.forEach((lead) => {
          initialEdits[lead.id] = {
            birth_date: formatDateForInput(lead.birth_date),
            anniversary_date: formatDateForInput(lead.anniversary_date),
            isDirty: false,
            isSaving: false,
            isSaved: false,
          };
        });
        setRowEdits(initialEdits);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      showToast("Unable to fetch leads records.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle local date input change
  const handleDateChange = (leadId, field, val) => {
    setRowEdits((prev) => {
      const current = prev[leadId] || {
        birth_date: "",
        anniversary_date: "",
        isDirty: false,
        isSaving: false,
        isSaved: false,
      };

      const updated = {
        ...current,
        [field]: val,
        isDirty: true,
        isSaved: false,
      };

      return {
        ...prev,
        [leadId]: updated,
      };
    });
  };

  // Quick clear single date
  const handleClearDate = (leadId, field) => {
    handleDateChange(leadId, field, "");
  };

  // Save single lead dates
  const handleSaveDates = async (leadId) => {
    const edit = rowEdits[leadId];
    if (!edit) return;

    setRowEdits((prev) => ({
      ...prev,
      [leadId]: { ...prev[leadId], isSaving: true },
    }));

    try {
      const payload = {
        birth_date: edit.birth_date || null,
        anniversary_date: edit.anniversary_date || null,
      };

      let response;
      try {
        // Try dedicated dates endpoint
        response = await axios.patch(`${API_URL}/leads/${leadId}/dates`, payload, {
          headers: getAuthHeaders(),
        });
      } catch (err) {
        // Fallback to standard lead update
        response = await axios.put(`${API_URL}/leads/${leadId}`, payload, {
          headers: getAuthHeaders(),
        });
      }

      if (response && response.data && response.data.status) {
        const updatedLead = response.data.data;
        // Update leads state
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                ...l,
                birth_date: updatedLead?.birth_date ?? payload.birth_date,
                anniversary_date: updatedLead?.anniversary_date ?? payload.anniversary_date,
                is_birthday_today: isDateToday(payload.birth_date),
                is_anniversary_today: isDateToday(payload.anniversary_date),
              }
              : l
          )
        );

        setRowEdits((prev) => ({
          ...prev,
          [leadId]: {
            ...prev[leadId],
            isDirty: false,
            isSaving: false,
            isSaved: true,
          },
        }));

        showToast("Dates updated successfully", "success");

        // Clear saved checkmark after 3 seconds
        setTimeout(() => {
          setRowEdits((prev) => {
            if (prev[leadId]?.isSaved) {
              return { ...prev, [leadId]: { ...prev[leadId], isSaved: false } };
            }
            return prev;
          });
        }, 3000);
      } else {
        throw new Error(response?.data?.message || "Failed to update dates");
      }
    } catch (err) {
      console.error("Save dates error:", err);
      showToast(err.response?.data?.message || err.message || "Failed to save dates", "error");
      setRowEdits((prev) => ({
        ...prev,
        [leadId]: { ...prev[leadId], isSaving: false },
      }));
    }
  };

  // Save all modified rows
  const handleSaveAllDirty = async () => {
    const dirtyIds = Object.keys(rowEdits).filter((id) => rowEdits[id]?.isDirty);
    if (dirtyIds.length === 0) {
      showToast("No unsaved changes detected.", "info");
      return;
    }

    let successCount = 0;
    for (const id of dirtyIds) {
      try {
        const edit = rowEdits[id];
        const payload = {
          birth_date: edit.birth_date || null,
          anniversary_date: edit.anniversary_date || null,
        };
        await axios.patch(`${API_URL}/leads/${id}/dates`, payload, {
          headers: getAuthHeaders(),
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to save lead ${id}:`, err);
      }
    }

    showToast(`Saved dates for ${successCount} leads successfully`, "success");
    fetchLeads();
  };

  // KPI Calculations based on all active leads
  const kpiStats = useMemo(() => {
    const total = leads.length;
    let missingBirth = 0;
    let missingAnniv = 0;
    let missingBoth = 0;
    let hasBoth = 0;

    leads.forEach((l) => {
      const hasB = !!l.birth_date && String(l.birth_date).trim() !== "";
      const hasA = !!l.anniversary_date && String(l.anniversary_date).trim() !== "";

      if (!hasB) missingBirth++;
      if (!hasA) missingAnniv++;
      if (!hasB && !hasA) missingBoth++;
      if (hasB && hasA) hasBoth++;
    });

    return { total, missingBirth, missingAnniv, missingBoth, hasBoth };
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Date filter
      const hasB = !!lead.birth_date && String(lead.birth_date).trim() !== "";
      const hasA = !!lead.anniversary_date && String(lead.anniversary_date).trim() !== "";

      if (dateFilter === "missing_birth_date" && hasB) return false;
      if (dateFilter === "missing_anniversary_date" && hasA) return false;
      if (dateFilter === "missing_both" && (hasB || hasA)) return false;
      if (dateFilter === "has_both" && (!hasB || !hasA)) return false;

      // Date Range Filter (startDate & endDate)
      if (startDate || endDate) {
        const edit = rowEdits[lead.id];
        const bDate = edit?.birth_date || formatDateForInput(lead.birth_date);
        const aDate = edit?.anniversary_date || formatDateForInput(lead.anniversary_date);

        const checkDate = (dVal) => {
          if (!dVal || String(dVal).trim() === "") return false;
          const d = formatDateForInput(dVal);
          if (!d) return false;

          // 1. Direct YYYY-MM-DD check
          let matchesExact = true;
          if (startDate && d < startDate) matchesExact = false;
          if (endDate && d > endDate) matchesExact = false;
          if (matchesExact) return true;

          // 2. Month-Day (MM-DD) check for recurring annual birthdays/anniversaries
          try {
            const dMMDD = d.slice(5);
            if (startDate && endDate) {
              const startMMDD = startDate.slice(5);
              const endMMDD = endDate.slice(5);
              if (startMMDD <= endMMDD) {
                if (dMMDD >= startMMDD && dMMDD <= endMMDD) return true;
              } else {
                if (dMMDD >= startMMDD || dMMDD <= endMMDD) return true;
              }
            } else if (startDate) {
              const startMMDD = startDate.slice(5);
              if (dMMDD >= startMMDD) return true;
            } else if (endDate) {
              const endMMDD = endDate.slice(5);
              if (dMMDD <= endMMDD) return true;
            }
          } catch (e) {
            // ignore
          }

          return false;
        };

        if (dateRangeTarget === "birth_date") {
          if (!checkDate(bDate)) return false;
        } else if (dateRangeTarget === "anniversary_date") {
          if (!checkDate(aDate)) return false;
        } else {
          // "any": matches if either birth_date OR anniversary_date falls in the range
          if (!checkDate(bDate) && !checkDate(aDate)) return false;
        }
      }

      // Segment filter
      if (segmentFilter) {
        const seg = String(lead.vehicle_segment || "").toLowerCase();
        if (segmentFilter.toLowerCase() === "4 wheeler" && !seg.includes("4")) return false;
        if (segmentFilter.toLowerCase() === "2 wheeler" && !seg.includes("2")) return false;
      }

      // Priority filter
      if (priorityFilter && String(lead.priority).toLowerCase() !== priorityFilter.toLowerCase()) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const nameMatch = lead.name && lead.name.toLowerCase().includes(term);
        const phoneMatch = lead.phone && lead.phone.toLowerCase().includes(term);
        const emailMatch = lead.email && lead.email.toLowerCase().includes(term);
        const cityMatch = lead.city && lead.city.toLowerCase().includes(term);
        const postingMatch = lead.posting && lead.posting.toLowerCase().includes(term);
        const brandMatch = lead.brand_name && lead.brand_name.toLowerCase().includes(term);
        const modelMatch = lead.model_variant && lead.model_variant.toLowerCase().includes(term);
        const assignedMatch = lead.assigned_user_name && lead.assigned_user_name.toLowerCase().includes(term);

        if (!nameMatch && !phoneMatch && !emailMatch && !cityMatch && !postingMatch && !brandMatch && !modelMatch && !assignedMatch) {
          return false;
        }
      }

      return true;
    });
  }, [leads, rowEdits, dateFilter, startDate, endDate, dateRangeTarget, segmentFilter, priorityFilter, searchTerm]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, searchTerm, startDate, endDate, dateRangeTarget, segmentFilter, priorityFilter]);

  // Pagination Slice
  const totalItems = filteredLeads.length;
  const lastPage = Math.max(1, Math.ceil(totalItems / perPage));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredLeads.slice(start, start + perPage);
  }, [filteredLeads, currentPage, perPage]);

  // Count unsaved changes
  const unsavedCount = useMemo(() => {
    return Object.values(rowEdits).filter((e) => e.isDirty).length;
  }, [rowEdits]);

  // Export current view to CSV
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      showToast("No records to export.", "info");
      return;
    }

    const headers = [
      "ID",
      "Customer Name",
      "Phone",
      "Email",
      "City/Posting",
      "Vehicle Segment",
      "Model/Variant",
      "Birth Date",
      "Anniversary Date",
      "Assigned To",
      "Priority",
      "Status",
    ];

    const rows = filteredLeads.map((l) => {
      const edit = rowEdits[l.id] || {};
      const bDate = edit.birth_date || formatDateForInput(l.birth_date) || "Not Set";
      const aDate = edit.anniversary_date || formatDateForInput(l.anniversary_date) || "Not Set";

      return [
        l.id,
        `"${(l.name || "").replace(/"/g, '""')}"`,
        `"${l.phone || ""}"`,
        `"${l.email || ""}"`,
        `"${(l.city || l.posting || "").replace(/"/g, '""')}"`,
        `"${l.vehicle_segment || ""}"`,
        `"${(l.model_variant || l.brand_name || "").replace(/"/g, '""')}"`,
        `"${bDate}"`,
        `"${aDate}"`,
        `"${(l.assigned_user_name || "").replace(/"/g, '""')}"`,
        `"${l.priority || ""}"`,
        `"${l.status_name || "New"}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lead_Dates_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Export completed successfully", "success");
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Top Header with Standard Breadcrumbs */}
        <div className="page-header-wrapper mb-3">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href="/admin/leads">Leads Pipeline</Link>
              </li>
              <li className="breadcrumb-item active">Lead Dates Manager</li>
            </ul>
            <h1 className="page-title mt-1 d-flex align-items-center gap-2">
              <i className="bi bi-calendar2-heart-fill text-danger"></i>
              <span>Customer Birth &amp; Anniversary Dates</span>
            </h1>
            <p className="text-muted small mb-0 mt-1">
              Directly edit and update customer Birthday and Anniversary dates inline without opening separate forms.
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2 flex-wrap">
            {unsavedCount > 0 && (
              <button
                className="btn btn-warning btn-sm d-flex align-items-center gap-2 shadow-sm animate__animated animate__pulse animate__infinite fw-semibold"
                onClick={handleSaveAllDirty}
                title="Save all edited dates at once"
              >
                <i className="bi bi-cloud-arrow-up-fill"></i>
                <span>Save All ({unsavedCount})</span>
              </button>
            )}

            <button
              className="btn btn-outline-custom btn-sm d-flex align-items-center gap-1"
              onClick={handleExportCSV}
              title="Export current filtered view to CSV"
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export CSV</span>
            </button>

            <button
              className="btn btn-outline-custom btn-sm d-flex align-items-center gap-1"
              onClick={fetchLeads}
              disabled={isLoading}
              title="Refresh lead records"
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? "spin" : ""}`}></i>
              <span>Refresh</span>
            </button>

            <Link
              href="/admin/leads"
              className="btn btn-primary btn-sm d-flex align-items-center gap-1"
              title="Back to Leads Pipeline"
            >
              <i className="bi bi-funnel-fill"></i>
              <span>Leads Pipeline</span>
            </Link>
          </div>
        </div>

        {/* 4 Interactive KPI Stat Cards */}
        <div className="row g-3 mb-4">
          {/* 1. All Leads */}
          <div className="col-xl-3 col-sm-6">
            <div
              className={`card stat-card h-100 ${dateFilter === "all" ? "border-primary shadow" : ""}`}
              style={{
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: "#FFFFFF",
                border: dateFilter === "all" ? "2px solid #58632A !important" : undefined,
              }}
              onClick={() => setDateFilter("all")}
              title="Click to view all leads"
            >
              <div className="stat-card-header">
                <span className="stat-card-title text-truncate">All Customer Leads</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-people-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{kpiStats.total} Leads</div>
              <span className="text-primary small fw-semibold">
                {dateFilter === "all" ? "✓ Currently Active Filter" : "Click to view All records"}
              </span>
            </div>
          </div>

          {/* 2. Missing Birth Date */}
          <div className="col-xl-3 col-sm-6">
            <div
              className={`card stat-card h-100 ${dateFilter === "missing_birth_date" ? "border-danger shadow" : ""}`}
              style={{
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: "#FFFFFF",
                border: dateFilter === "missing_birth_date" ? "2px solid #dc3545 !important" : undefined,
              }}
              onClick={() => setDateFilter("missing_birth_date")}
              title="Click to view leads missing Birth Date"
            >
              <div className="stat-card-header">
                <span className="stat-card-title text-truncate">Missing Birth Date</span>
                <div className="stat-icon-box danger">
                  <i className="bi bi-cake2"></i>
                </div>
              </div>
              <div className="stat-card-value text-danger">{kpiStats.missingBirth} Leads</div>
              <span className="text-danger small fw-semibold">
                {dateFilter === "missing_birth_date" ? "✓ Currently Active Filter" : "DOB not entered yet"}
              </span>
            </div>
          </div>

          {/* 3. Missing Anniversary Date */}
          <div className="col-xl-3 col-sm-6">
            <div
              className={`card stat-card h-100 ${dateFilter === "missing_anniversary_date" ? "border-info shadow" : ""}`}
              style={{
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: "#FFFFFF",
                border: dateFilter === "missing_anniversary_date" ? "2px solid #0dcaf0 !important" : undefined,
              }}
              onClick={() => setDateFilter("missing_anniversary_date")}
              title="Click to view leads missing Anniversary Date"
            >
              <div className="stat-card-header">
                <span className="stat-card-title text-truncate">Missing Anniversary</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-heart-half"></i>
                </div>
              </div>
              <div className="stat-card-value text-info">{kpiStats.missingAnniv} Leads</div>
              <span className="text-info small fw-semibold">
                {dateFilter === "missing_anniversary_date" ? "✓ Currently Active Filter" : "Anniversary not entered yet"}
              </span>
            </div>
          </div>

          {/* 4. Missing Both Dates */}
          <div className="col-xl-3 col-sm-6">
            <div
              className={`card stat-card h-100 ${dateFilter === "missing_both" ? "border-dark shadow" : ""}`}
              style={{
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: "#FFFFFF",
                border: dateFilter === "missing_both" ? "2px solid #212529 !important" : undefined,
              }}
              onClick={() => setDateFilter("missing_both")}
              title="Click to view leads missing Both Dates"
            >
              <div className="stat-card-header">
                <span className="stat-card-title text-truncate">Missing Both Dates</span>
                <div className="stat-icon-box danger">
                  <i className="bi bi-calendar-x"></i>
                </div>
              </div>
              <div className="stat-card-value text-danger">{kpiStats.missingBoth} Leads</div>
              <span className="text-danger small fw-semibold">
                {dateFilter === "missing_both" ? "✓ Currently Active Filter" : "Neither Date Set"}
              </span>
            </div>
          </div>
        </div>

        {/* Main Records Table Card - Contained & Never Overflows */}
        <div className="card shadow-sm border" style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
          {/* Card Header Toolbar - Single Row Alignment with Date Range */}
          <div className="card-header bg-white border-bottom py-2 px-3">
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              {/* Left Side: Single Dropdown for Date Status Filter, Date Range (From - To), Target selector, and Records Count */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-muted small fw-semibold d-flex align-items-center gap-1 text-nowrap">
                  <i className="bi bi-funnel-fill text-primary"></i> Filter:
                </span>
                <select
                  className="form-select form-select-sm fw-semibold shadow-sm"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{ width: "190px" }}
                >
                  <option value="all">All Leads ({kpiStats.total})</option>
                  <option value="missing_birth_date">No Birth Date ({kpiStats.missingBirth})</option>
                  <option value="missing_anniversary_date">No Anniversary ({kpiStats.missingAnniv})</option>
                  <option value="missing_both">Missing Both Dates ({kpiStats.missingBoth})</option>
                  <option value="has_both">Complete ({kpiStats.hasBoth})</option>
                </select>

                {/* Date Range: From & To */}
                <div className="d-flex align-items-center gap-1">
                  <div className="input-group input-group-sm" style={{ width: "140px" }}>
                    <span className="input-group-text bg-light text-muted px-2 py-0" style={{ fontSize: "11px", fontWeight: "600" }}>
                      From
                    </span>
                    <input
                      type="date"
                      className="form-control form-control-sm px-1"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      title="Filter records by date from"
                    />
                  </div>

                  <div className="input-group input-group-sm" style={{ width: "140px" }}>
                    <span className="input-group-text bg-light text-muted px-2 py-0" style={{ fontSize: "11px", fontWeight: "600" }}>
                      To
                    </span>
                    <input
                      type="date"
                      className="form-control form-control-sm px-1"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      title="Filter records by date to"
                    />
                  </div>

                  <select
                    className="form-select form-select-sm shadow-sm"
                    value={dateRangeTarget}
                    onChange={(e) => setDateRangeTarget(e.target.value)}
                    style={{ width: "120px", fontSize: "12px" }}
                    title="Choose date target to filter (Any Date / Birth Date / Anniversary)"
                  >
                    <option value="any">Any Date</option>
                    <option value="birth_date">Birth Date</option>
                    <option value="anniversary_date">Anniversary</option>
                  </select>
                </div>

                <span className="badge bg-secondary-subtle text-dark border px-2 py-1 text-nowrap">
                  {filteredLeads.length} Records
                </span>
              </div>

              {/* Right Side: Search Bar & Reset */}
              <div className="d-flex align-items-center gap-2 ms-auto">
                {/* Search Bar */}
                <div className="position-relative" style={{ width: "230px" }}>
                  <input
                    type="text"
                    className="form-control form-control-sm pe-4"
                    placeholder="Search name, phone, city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    title="Search leads by customer name, phone, email, city, posting"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="btn btn-link p-0 position-absolute end-0 top-50 translate-middle-y me-2 text-muted text-decoration-none"
                      onClick={() => setSearchTerm("")}
                      style={{ fontSize: "12px", border: "none", background: "transparent" }}
                      title="Clear search"
                    >
                      <i className="bi bi-x-circle-fill"></i>
                    </button>
                  )}
                </div>

                {/* Reset Filters Button */}
                {(dateFilter !== "all" || startDate || endDate || dateRangeTarget !== "any" || searchTerm) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger px-2 d-flex align-items-center gap-1 text-nowrap"
                    onClick={() => {
                      setDateFilter("all");
                      setStartDate("");
                      setEndDate("");
                      setDateRangeTarget("any");
                      setSearchTerm("");
                    }}
                    title="Reset all filters"
                  >
                    <i className="bi bi-x-circle"></i>
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Container - Strict Horizontal Fit with Balanced Proportions */}
          <div className="table-responsive" style={{ width: "100%", minHeight: "360px" }}>
            <table className="table table-custom align-middle mb-0" style={{ width: "100%", tableLayout: "fixed" }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: "55px" }} className="text-center">NO.</th>
                  <th style={{ width: "32%" }}>CUSTOMER DETAILS</th>
                  <th style={{ width: "29%" }}>
                    <div className="d-flex align-items-center gap-1 text-danger">
                      <i className="bi bi-cake2"></i>
                      <span>BIRTH DATE (DOB)</span>
                    </div>
                  </th>
                  <th style={{ width: "29%" }}>
                    <div className="d-flex align-items-center gap-1 text-info">
                      <i className="bi bi-heart-fill"></i>
                      <span>ANNIVERSARY DATE</span>
                    </div>
                  </th>
                  <th style={{ width: "95px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading records...</span>
                      </div>
                      <div className="mt-2 text-muted small">Loading customer records...</div>
                    </td>
                  </tr>
                ) : paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary opacity-50"></i>
                      <div className="fw-semibold">No lead records found matching current criteria.</div>
                      <div className="small mt-1">Try clearing search or switching filter tabs above.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead, index) => {
                    const rowNumber = (currentPage - 1) * perPage + index + 1;
                    const edit = rowEdits[lead.id] || {
                      birth_date: formatDateForInput(lead.birth_date),
                      anniversary_date: formatDateForInput(lead.anniversary_date),
                      isDirty: false,
                      isSaving: false,
                      isSaved: false,
                    };

                    const bDateValue = edit.birth_date;
                    const aDateValue = edit.anniversary_date;

                    const isBDayToday = isDateToday(bDateValue);
                    const isAnnivToday = isDateToday(aDateValue);

                    return (
                      <tr
                        key={lead.id}
                        className={edit.isDirty ? "table-warning bg-opacity-25" : ""}
                        style={{ transition: "background-color 0.2s" }}
                      >
                        {/* 1. Row Index */}
                        <td className="text-center text-muted fw-semibold small">
                          {rowNumber}
                        </td>

                        {/* 2. Customer Details */}
                        <td>
                          <div className="lh-sm">
                            <Link
                              href={`/admin/leads/${lead.id}`}
                              className="fw-bold text-dark text-decoration-none hover-primary d-inline-block text-truncate"
                              style={{ maxWidth: "90%" }}
                              title="Click to view full lead details"
                            >
                              {lead.name || "Unnamed Prospect"}
                            </Link>
                            <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                              {lead.phone && (
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="text-muted text-decoration-none small d-flex align-items-center gap-1"
                                  title="Call Customer"
                                >
                                  <i className="bi bi-telephone text-primary" style={{ fontSize: "11px" }}></i>
                                  <span>{lead.phone}</span>
                                </a>
                              )}
                              {(lead.city || lead.posting) && (
                                <span className="text-muted small text-truncate" style={{ fontSize: "11px", maxWidth: "160px" }}>
                                  <i className="bi bi-geo-alt me-1 text-secondary"></i>
                                  {lead.posting || lead.city}
                                </span>
                              )}
                            </div>
                            {(lead.model_variant || lead.brand_name) && (
                              <div className="text-muted mt-1 small text-truncate" style={{ fontSize: "11px", maxWidth: "90%" }}>
                                <i className="bi bi-car-front text-secondary me-1"></i>
                                <span>{lead.brand_name ? `${lead.brand_name} ` : ""}{lead.model_variant || ""}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Birth Date (Direct Inline Edit Input) */}
                        <td>
                          <div className="d-flex flex-column gap-1" style={{ maxWidth: "215px" }}>
                            <div className="input-group input-group-sm">
                              <input
                                type="date"
                                className={`form-control form-control-sm px-2 ${!bDateValue ? "border-danger border-opacity-50 bg-danger bg-opacity-10" : ""
                                  }`}
                                value={bDateValue}
                                onChange={(e) => handleDateChange(lead.id, "birth_date", e.target.value)}
                                title="Directly select or change customer Birth Date"
                                max={new Date().toISOString().split("T")[0]}
                              />
                              {bDateValue && (
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary px-2"
                                  onClick={() => handleClearDate(lead.id, "birth_date")}
                                  title="Clear Birth Date"
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              )}
                            </div>

                            {/* Status Tag */}
                            <div className="d-flex align-items-center gap-1" style={{ minHeight: "18px" }}>
                              {isBDayToday ? (
                                <span className="badge bg-danger text-white small" style={{ fontSize: "10px" }}>
                                  🎉 Birthday Today!
                                </span>
                              ) : bDateValue ? (
                                <span className="text-muted small" style={{ fontSize: "11px" }}>
                                  <i className="bi bi-calendar2-check text-success me-1"></i>
                                  {formatDisplayDate(bDateValue)}
                                </span>
                              ) : (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: "10px" }}>
                                  <i className="bi bi-exclamation-circle me-1"></i>
                                  Not Set
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 4. Anniversary Date (Direct Inline Edit Input) */}
                        <td>
                          <div className="d-flex flex-column gap-1" style={{ maxWidth: "215px" }}>
                            <div className="input-group input-group-sm">
                              <input
                                type="date"
                                className={`form-control form-control-sm px-2 ${!aDateValue ? "border-info border-opacity-50 bg-info bg-opacity-10" : ""
                                  }`}
                                value={aDateValue}
                                onChange={(e) => handleDateChange(lead.id, "anniversary_date", e.target.value)}
                                title="Directly select or change customer Anniversary Date"
                                max={new Date().toISOString().split("T")[0]}
                              />
                              {aDateValue && (
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary px-2"
                                  onClick={() => handleClearDate(lead.id, "anniversary_date")}
                                  title="Clear Anniversary Date"
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              )}
                            </div>

                            {/* Status Tag */}
                            <div className="d-flex align-items-center gap-1" style={{ minHeight: "18px" }}>
                              {isAnnivToday ? (
                                <span className="badge bg-info text-white small" style={{ fontSize: "10px" }}>
                                  💍 Anniversary Today!
                                </span>
                              ) : aDateValue ? (
                                <span className="text-muted small" style={{ fontSize: "11px" }}>
                                  <i className="bi bi-heart text-danger me-1"></i>
                                  {formatDisplayDate(aDateValue)}
                                </span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-muted border" style={{ fontSize: "10px" }}>
                                  <i className="bi bi-dash-circle me-1"></i>
                                  Not Set
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 5. Action (Save / Saved Checkmark) */}
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            {edit.isSaving ? (
                              <button className="btn btn-sm btn-outline-primary p-1" disabled title="Saving changes...">
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                              </button>
                            ) : edit.isSaved ? (
                              <span className="badge bg-success-subtle text-success border border-success p-1" title="Saved!">
                                <i className="bi bi-check-lg fw-bold"></i> Saved
                              </span>
                            ) : edit.isDirty ? (
                              <button
                                className="btn btn-sm btn-success shadow-sm fw-semibold p-1 px-2"
                                onClick={() => handleSaveDates(lead.id)}
                                title="Save changed dates for this customer"
                              >
                                <i className="bi bi-check2"></i> Save
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-secondary p-1"
                                onClick={() => handleSaveDates(lead.id)}
                                title="Save or re-confirm dates"
                              >
                                <i className="bi bi-floppy"></i>
                              </button>
                            )}

                            <Link
                              href={`/admin/leads/${lead.id}`}
                              className="btn btn-sm btn-outline-custom text-decoration-none p-1"
                              title="View Lead Details"
                            >
                              <i className="bi bi-eye"></i>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!isLoading && filteredLeads.length > 0 && (
            <div className="border-top p-2 bg-light">
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
                perPageOptions={[10, 15, 25, 50, 100]}
                itemName="leads"
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
