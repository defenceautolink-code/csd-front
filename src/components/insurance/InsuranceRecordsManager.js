"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import insuranceApi, {
  calculateExpireDate,
  calculateReminderDate,
  calculateRenewalDates,
} from "@/services/insuranceApi";
import Pagination from "@/components/common/Pagination";
import { formatIndianCurrency } from "@/utils/numberToWords";

export default function InsuranceRecordsManager({ userRole = "Super Admin" }) {
  const { showToast } = useToast();

  // State: Records & Pagination
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Action States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_city: "",
    model_variant: "",
    vehicle_number: "",
    insurance_company: "",
    policy_number: "",
    insurance_type: "Comprehensive",
    policy_start_date: "",
    policy_expiry_date: "",
    premium_amount: "",
    reminder_days_before: 15,
    reminder_date: "",
    renewal_status: "Pending",
    notes: "",
  });

  // Renew Form State
  const [renewForm, setRenewForm] = useState({
    id: "",
    customer_name: "",
    vehicle_number: "",
    insurance_company: "HDFC ERGO General Insurance",
    policy_number: "",
    insurance_type: "Comprehensive",
    policy_start_date: "",
    policy_expiry_date: "",
    premium_amount: "",
    reminder_days_before: 15,
    reminder_date: "",
    notes: "",
  });

  // Fetch Insurance Records from Dedicated API (GET /api/insurance-records)
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await insuranceApi.getInsuranceRecords(params);
      if (res && res.status) {
        setRecords(Array.isArray(res.data) ? res.data : []);
        if (res.pagination) {
          setPagination({
            current_page: res.pagination.current_page || 1,
            last_page: res.pagination.last_page || 1,
            per_page: res.pagination.per_page || perPage,
            total: res.pagination.total || 0,
            from: res.pagination.from || 0,
            to: res.pagination.to || 0,
          });
        }
      } else {
        setRecords([]);
        if (res && !res.status) {
          setErrorMessage(res.message || "Failed to load insurance records");
        }
      }
    } catch (err) {
      console.error("Failed to fetch insurance records:", err);
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Failed to load insurance records from database"
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, searchTerm, statusFilter, fromDate, toDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Compute KPI Counts
  const stats = useMemo(() => {
    const total = pagination.total || records.length;
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let renewed = 0;

    records.forEach((r) => {
      const s = String(r.status || "").toLowerCase();
      if (s === "renewed" || String(r.renewal_status || "").toLowerCase() === "renewed") {
        renewed++;
      } else if (s === "expired") {
        expired++;
      } else if (s === "expiring_soon") {
        expiringSoon++;
      } else {
        active++;
      }
    });

    return { total, active, expiringSoon, expired, renewed };
  }, [records, pagination.total]);

  // Open Edit Modal
  const handleOpenEdit = (record) => {
    setSelectedRecord(record);
    const startDate = record.policy_start_date || record.delivery_date || "";
    const expiryDate = record.policy_expiry_date || record.insurance_expire_date || "";
    const reminderDays = record.reminder_days_before || 15;
    const reminderDate = record.reminder_date || "";

    setEditForm({
      id: record.id,
      customer_name: record.customer_name || "",
      customer_phone: record.customer_phone || record.customer_number || "",
      customer_email: record.customer_email || "",
      customer_city: record.customer_city || "",
      model_variant: record.model_variant || record.vehicle_name || "",
      vehicle_number: record.vehicle_number || record.registration_number || "",
      insurance_company: record.insurance_company || "HDFC ERGO General Insurance",
      policy_number: record.policy_number || "",
      insurance_type: record.insurance_type || "Comprehensive",
      policy_start_date: startDate,
      policy_expiry_date: expiryDate,
      premium_amount: record.premium_amount || "",
      reminder_days_before: reminderDays,
      reminder_date: reminderDate,
      renewal_status: record.renewal_status || (record.status === "renewed" ? "Renewed" : "Pending"),
      notes: record.notes || "",
    });
    setShowEditModal(true);
  };

  // Submit Edit Form (PUT /api/insurances/{id})
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.id) return;
    setIsSubmitting(true);
    try {
      const payload = {
        vehicle_number: editForm.vehicle_number,
        registration_number: editForm.vehicle_number,
        insurance_company: editForm.insurance_company,
        policy_number: editForm.policy_number,
        insurance_type: editForm.insurance_type,
        policy_start_date: editForm.policy_start_date,
        policy_expiry_date: editForm.policy_expiry_date,
        premium_amount: editForm.premium_amount ? Number(editForm.premium_amount) : 0,
        reminder_days_before: Number(editForm.reminder_days_before || 15),
        reminder_date: editForm.reminder_date,
        renewal_status: editForm.renewal_status,
        notes: editForm.notes,
      };

      const res = await insuranceApi.updateInsurance(editForm.id, payload);
      if (res && res.status) {
        showToast("Insurance record updated successfully!", "success");
        setShowEditModal(false);
        fetchRecords();
      } else {
        showToast(res?.message || "Failed to update record", "error");
      }
    } catch (err) {
      console.error("Update error:", err);
      showToast(err.response?.data?.message || err.message || "Failed to update record", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Renew Modal
  const handleOpenRenew = (record) => {
    setSelectedRecord(record);
    const currExp = record.policy_expiry_date || record.insurance_expire_date || "";
    const calc = calculateRenewalDates(currExp);

    setRenewForm({
      id: record.id,
      customer_name: record.customer_name || "",
      vehicle_number: record.vehicle_number || record.registration_number || "",
      insurance_company: record.insurance_company || "HDFC ERGO General Insurance",
      policy_number: record.policy_number ? `${record.policy_number}-RNW` : "",
      insurance_type: record.insurance_type || "Comprehensive",
      policy_start_date: currExp || new Date().toISOString().split("T")[0],
      policy_expiry_date: calc.newExpireDate,
      premium_amount: record.premium_amount || "",
      reminder_days_before: record.reminder_days_before || 15,
      reminder_date: calc.newReminderDate,
      notes: `Renewed on ${new Date().toLocaleDateString("en-IN")}`,
    });
    setShowRenewModal(true);
  };

  // Submit Renewal
  const handleSaveRenew = async (e) => {
    e.preventDefault();
    if (!renewForm.id) return;
    setIsSubmitting(true);
    try {
      const payload = {
        insurance_company: renewForm.insurance_company,
        policy_number: renewForm.policy_number,
        insurance_type: renewForm.insurance_type,
        policy_start_date: renewForm.policy_start_date,
        policy_expiry_date: renewForm.policy_expiry_date,
        next_insurance_date: renewForm.policy_expiry_date,
        premium_amount: renewForm.premium_amount ? Number(renewForm.premium_amount) : 0,
        reminder_days_before: Number(renewForm.reminder_days_before || 15),
        reminder_date: renewForm.reminder_date,
        renewal_status: "Renewed",
        notes: renewForm.notes,
      };

      const res = await insuranceApi.renewInsurance(renewForm.id, payload);
      if (res && res.status) {
        showToast("Policy renewed successfully!", "success");
        setShowRenewModal(false);
        fetchRecords();
      } else {
        showToast(res?.message || "Failed to renew policy", "error");
      }
    } catch (err) {
      console.error("Renewal error:", err);
      showToast(err.response?.data?.message || err.message || "Failed to renew policy", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open View Modal
  const handleOpenView = (record) => {
    setSelectedRecord(record);
    setShowViewModal(true);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (records.length === 0) {
      showToast("No records to export", "info");
      return;
    }
    const headers = [
      "ID",
      "Customer Name",
      "Phone",
      "Email",
      "City",
      "Vehicle Model",
      "Vehicle Number",
      "Insurance Company",
      "Policy Number",
      "Insurance Type",
      "Policy Start Date",
      "Policy Expiry Date",
      "Premium Amount",
      "Reminder Date",
      "Status",
    ];

    const rows = records.map((r) => [
      r.id,
      `"${r.customer_name || ""}"`,
      `"${r.customer_phone || ""}"`,
      `"${r.customer_email || ""}"`,
      `"${r.customer_city || ""}"`,
      `"${r.model_variant || ""}"`,
      `"${r.vehicle_number || r.registration_number || ""}"`,
      `"${r.insurance_company || ""}"`,
      `"${r.policy_number || ""}"`,
      `"${r.insurance_type || ""}"`,
      r.policy_start_date || r.delivery_date || "",
      r.policy_expiry_date || r.insurance_expire_date || "",
      r.premium_amount || 0,
      r.reminder_date || "",
      r.renewal_status || r.status || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Insurance_Records_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV file exported successfully", "success");
  };

  // Status Badge Helper
  const renderStatusBadge = (record) => {
    const s = String(record.status || "").toLowerCase();
    const renewalStatus = String(record.renewal_status || "").toLowerCase();

    if (renewalStatus === "renewed" || s === "renewed") {
      return (
        <span className="badge bg-success text-white px-2 py-1">
          <i className="bi bi-check-circle-fill me-1"></i>Renewed
        </span>
      );
    }
    if (s === "expired" || renewalStatus === "expired") {
      return (
        <span className="badge bg-danger text-white px-2 py-1">
          <i className="bi bi-x-circle-fill me-1"></i>Expired
        </span>
      );
    }
    if (s === "expiring_soon") {
      return (
        <span className="badge bg-warning text-dark px-2 py-1">
          <i className="bi bi-clock-history me-1"></i>Expiring Soon
        </span>
      );
    }
    return (
      <span className="badge bg-primary text-white px-2 py-1">
        <i className="bi bi-shield-check me-1"></i>Active
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="container-fluid p-3 p-md-4">
        {/* Page Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <h1 className="h4 fw-bold text-dark mb-0">Insurance Records</h1>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1">
                {pagination.total} Total Records
              </span>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Master table data fetched directly from the database <code>insurances</code> table via <code>/api/insurance-records</code>
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={handleExportCSV}
              disabled={isLoading || records.length === 0}
            >
              <i className="bi bi-download"></i>
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm fw-semibold"
              onClick={() => fetchRecords()}
              disabled={isLoading}
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? "spin" : ""}`}></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 bg-white p-3 border-start border-primary border-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-medium">Total In Database</div>
                  <div className="h4 fw-bold text-dark mb-0 mt-1">{stats.total}</div>
                </div>
                <div className="bg-primary-subtle text-primary p-2 rounded-circle">
                  <i className="bi bi-shield-shaded fs-5"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 bg-white p-3 border-start border-success border-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-medium">Active Policies</div>
                  <div className="h4 fw-bold text-success mb-0 mt-1">{stats.active}</div>
                </div>
                <div className="bg-success-subtle text-success p-2 rounded-circle">
                  <i className="bi bi-shield-check fs-5"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 bg-white p-3 border-start border-warning border-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-medium">Expiring Soon</div>
                  <div className="h4 fw-bold text-warning mb-0 mt-1">{stats.expiringSoon}</div>
                </div>
                <div className="bg-warning-subtle text-warning p-2 rounded-circle">
                  <i className="bi bi-bell fs-5"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 bg-white p-3 border-start border-danger border-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-medium">Expired Policies</div>
                  <div className="h4 fw-bold text-danger mb-0 mt-1">{stats.expired}</div>
                </div>
                <div className="bg-danger-subtle text-danger p-2 rounded-circle">
                  <i className="bi bi-exclamation-triangle fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-body p-3">
            <div className="row g-2 align-items-center">
              {/* Search Bar */}
              <div className="col-12 col-md-4">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by customer, phone, vehicle no, policy..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setSearchTerm("")}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter */}
              <div className="col-6 col-md-2">
                <select
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="expiring_soon">Expiring Soon</option>
                  <option value="expired">Expired</option>
                  <option value="renewed">Renewed</option>
                </select>
              </div>

              {/* From Date */}
              <div className="col-6 col-md-2">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  title="Filter From Date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* To Date */}
              <div className="col-6 col-md-2">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  title="Filter To Date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Reset & Per Page */}
              <div className="col-6 col-md-2 d-flex gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: "85px" }}
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value="15">15 / p</option>
                  <option value="25">25 / p</option>
                  <option value="50">50 / p</option>
                  <option value="100">100 / p</option>
                </select>

                {(searchTerm || statusFilter !== "all" || fromDate || toDate) && (
                  <button
                    className="btn btn-outline-danger btn-sm flex-grow-1"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setFromDate("");
                      setToDate("");
                      setCurrentPage(1);
                    }}
                    title="Reset All Filters"
                  >
                    <i className="bi bi-x-circle"></i> Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
            <i className="bi bi-exclamation-octagon-fill fs-5"></i>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Records Table Card */}
        <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ minWidth: "1050px" }}>
              <thead className="table-light">
                <tr className="small text-uppercase text-muted fw-semibold">
                  <th style={{ width: "60px" }}># ID</th>
                  <th>Customer Info</th>
                  <th>Vehicle Details</th>
                  <th>Insurance Details</th>
                  <th>Policy Period</th>
                  <th>Premium</th>
                  <th>Reminder Date</th>
                  <th>Status</th>
                  <th className="text-end pe-3" style={{ width: "160px" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted small">Loading insurance table records...</span>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <i className="bi bi-shield-x text-muted fs-1 d-block mb-2"></i>
                      <div className="fw-semibold text-dark">No Insurance Records Found</div>
                      <p className="text-muted small mb-0 mt-1">
                        There are no records in the <code>insurances</code> table matching your filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const vehicleNo = r.vehicle_number || r.registration_number;
                    const startDate = r.policy_start_date || r.delivery_date;
                    const expiryDate = r.policy_expiry_date || r.insurance_expire_date;

                    return (
                      <tr key={r.id}>
                        {/* ID */}
                        <td>
                          <span className="badge bg-light text-dark border fw-bold">#{r.id}</span>
                        </td>

                        {/* Customer Info */}
                        <td>
                          <div className="fw-semibold text-dark">{r.customer_name || "N/A"}</div>
                          <div className="text-muted small d-flex align-items-center gap-1">
                            <i className="bi bi-telephone"></i>
                            <span>{r.customer_phone || r.customer_number || "-"}</span>
                          </div>
                          {r.customer_city && (
                            <div className="text-muted extra-small" style={{ fontSize: "11px" }}>
                              <i className="bi bi-geo-alt"></i> {r.customer_city}
                            </div>
                          )}
                        </td>

                        {/* Vehicle Details */}
                        <td>
                          <div className="fw-semibold text-dark">{r.model_variant || r.vehicle_name || "Standard"}</div>
                          {vehicleNo ? (
                            <span className="badge bg-dark-subtle text-dark border px-2 py-0 mt-1">
                              {vehicleNo}
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border px-2 py-0 mt-1">
                              Pending Reg.
                            </span>
                          )}
                        </td>

                        {/* Insurance Details */}
                        <td>
                          <div className="fw-semibold text-primary">{r.insurance_company || "HDFC ERGO"}</div>
                          <div className="text-muted small">
                            <code>{r.policy_number || "No Policy #"}</code>
                          </div>
                          <span className="badge bg-secondary-subtle text-secondary extra-small mt-1" style={{ fontSize: "10px" }}>
                            {r.insurance_type || "Comprehensive"}
                          </span>
                        </td>

                        {/* Policy Period */}
                        <td>
                          <div className="small fw-semibold text-dark">
                            <i className="bi bi-calendar-event text-muted me-1"></i>
                            {expiryDate ? new Date(expiryDate).toLocaleDateString("en-IN") : "-"}
                          </div>
                          <div className="text-muted extra-small" style={{ fontSize: "11px" }}>
                            Start: {startDate ? new Date(startDate).toLocaleDateString("en-IN") : "-"}
                          </div>
                        </td>

                        {/* Premium */}
                        <td>
                          <div className="fw-bold text-dark">
                            ₹{formatIndianCurrency(Number(r.premium_amount || 0))}
                          </div>
                        </td>

                        {/* Reminder Date */}
                        <td>
                          <div className="small text-dark fw-medium">
                            {r.reminder_date ? new Date(r.reminder_date).toLocaleDateString("en-IN") : "-"}
                          </div>
                          <div className="text-muted extra-small" style={{ fontSize: "10px" }}>
                            {r.reminder_days_before || 15} days before
                          </div>
                        </td>

                        {/* Status */}
                        <td>{renderStatusBadge(r)}</td>

                        {/* Actions */}
                        <td className="text-end pe-3">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              title="Edit Record"
                              onClick={() => handleOpenEdit(r)}
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-success"
                              title="Renew Policy"
                              onClick={() => handleOpenRenew(r)}
                            >
                              <i className="bi bi-arrow-repeat"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              title="View Details"
                              onClick={() => handleOpenView(r)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!isLoading && records.length > 0 && pagination.last_page > 1 && (
            <div className="card-footer bg-white border-top p-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
              <div className="text-muted small">
                Showing {pagination.from} to {pagination.to} of {pagination.total} records
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.last_page}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
          )}
        </div>

        {/* ===================================================================
            EDIT MODAL (Update Insurance Record)
            =================================================================== */}
        {showEditModal && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1050 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content shadow border-0 rounded-3">
                <form onSubmit={handleSaveEdit}>
                  <div className="modal-header bg-primary text-white py-3 px-4">
                    <h5 className="modal-title fw-bold fs-6 d-flex align-items-center gap-2">
                      <i className="bi bi-pencil-square"></i>
                      <span>Edit Insurance Record #{editForm.id}</span>
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      disabled={isSubmitting}
                      onClick={() => setShowEditModal(false)}
                    ></button>
                  </div>

                  <div className="modal-body p-4">
                    {/* Read-only Context */}
                    <div className="p-3 bg-light rounded-3 mb-3 border">
                      <div className="row g-2">
                        <div className="col-md-6">
                          <span className="text-muted small">Customer Name:</span>
                          <span className="fw-bold text-dark ms-2">{editForm.customer_name || "N/A"}</span>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted small">Vehicle Model:</span>
                          <span className="fw-bold text-dark ms-2">{editForm.model_variant || "Standard"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="row g-3">
                      {/* Vehicle Registration Number */}
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Vehicle Registration Number
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. GJ-01-AB-1234"
                          value={editForm.vehicle_number}
                          onChange={(e) =>
                            setEditForm({ ...editForm, vehicle_number: e.target.value.toUpperCase() })
                          }
                        />
                      </div>

                      {/* Policy Number */}
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Policy Number
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. POL-2026-987654"
                          value={editForm.policy_number}
                          onChange={(e) =>
                            setEditForm({ ...editForm, policy_number: e.target.value })
                          }
                        />
                      </div>

                      {/* Insurance Company */}
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Insurance Company
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          list="modalInsuranceCompanyList"
                          value={editForm.insurance_company}
                          onChange={(e) =>
                            setEditForm({ ...editForm, insurance_company: e.target.value })
                          }
                        />
                        <datalist id="modalInsuranceCompanyList">
                          <option value="HDFC ERGO General Insurance" />
                          <option value="ICICI Lombard General Insurance" />
                          <option value="Tata AIG General Insurance" />
                          <option value="Bajaj Allianz General Insurance" />
                          <option value="New India Assurance" />
                          <option value="Reliance General Insurance" />
                          <option value="National Insurance Company" />
                          <option value="SBI General Insurance" />
                          <option value="Go Digit General Insurance" />
                        </datalist>
                      </div>

                      {/* Insurance Type */}
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Insurance Type
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={editForm.insurance_type}
                          onChange={(e) =>
                            setEditForm({ ...editForm, insurance_type: e.target.value })
                          }
                        >
                          <option value="Comprehensive">Comprehensive (1+3 Years)</option>
                          <option value="Third Party">Third Party</option>
                          <option value="Own Damage">Own Damage (OD)</option>
                          <option value="Zero Depreciation">Zero Depreciation</option>
                        </select>
                      </div>

                      {/* Policy Start Date */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Policy Start Date
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={editForm.policy_start_date}
                          onChange={(e) =>
                            setEditForm({ ...editForm, policy_start_date: e.target.value })
                          }
                        />
                      </div>

                      {/* Policy Expiry Date */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Policy Expiry Date
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={editForm.policy_expiry_date}
                          onChange={(e) => {
                            const val = e.target.value;
                            const rDays = Number(editForm.reminder_days_before || 15);
                            let newRem = editForm.reminder_date;
                            if (val) {
                              const remD = new Date(val);
                              remD.setDate(remD.getDate() - rDays);
                              newRem = remD.toISOString().split("T")[0];
                            }
                            setEditForm({
                              ...editForm,
                              policy_expiry_date: val,
                              reminder_date: newRem,
                            });
                          }}
                        />
                      </div>

                      {/* Premium Amount */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Premium Amount (₹)
                        </label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text bg-light">₹</span>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            value={editForm.premium_amount}
                            onChange={(e) =>
                              setEditForm({ ...editForm, premium_amount: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      {/* Reminder Interval */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Reminder Interval
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={editForm.reminder_days_before}
                          onChange={(e) => {
                            const rDays = Number(e.target.value || 15);
                            let newRem = editForm.reminder_date;
                            if (editForm.policy_expiry_date) {
                              const remD = new Date(editForm.policy_expiry_date);
                              remD.setDate(remD.getDate() - rDays);
                              newRem = remD.toISOString().split("T")[0];
                            }
                            setEditForm({
                              ...editForm,
                              reminder_days_before: rDays,
                              reminder_date: newRem,
                            });
                          }}
                        >
                          <option value="15">15 Days Before</option>
                          <option value="30">30 Days Before</option>
                          <option value="45">45 Days Before</option>
                          <option value="60">60 Days Before</option>
                        </select>
                      </div>

                      {/* Reminder Date */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Calculated Reminder Date
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={editForm.reminder_date}
                          onChange={(e) =>
                            setEditForm({ ...editForm, reminder_date: e.target.value })
                          }
                        />
                      </div>

                      {/* Renewal Status */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Status
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={editForm.renewal_status}
                          onChange={(e) =>
                            setEditForm({ ...editForm, renewal_status: e.target.value })
                          }
                        >
                          <option value="Pending">Pending</option>
                          <option value="Renewed">Renewed</option>
                          <option value="Expired">Expired</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      {/* Notes */}
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Notes / Remarks
                        </label>
                        <textarea
                          className="form-control form-control-sm"
                          rows="2"
                          placeholder="Policy endorsements, IDV details, notes..."
                          value={editForm.notes}
                          onChange={(e) =>
                            setEditForm({ ...editForm, notes: e.target.value })
                          }
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer bg-light py-2 px-4 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      disabled={isSubmitting}
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1 fw-semibold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save"></i>
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            RENEW MODAL (Renew Insurance Policy)
            =================================================================== */}
        {showRenewModal && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1050 }}
          >
            <div className="modal-dialog modal-md modal-dialog-centered">
              <div className="modal-content shadow border-0 rounded-3">
                <form onSubmit={handleSaveRenew}>
                  <div className="modal-header bg-success text-white py-3 px-4">
                    <h5 className="modal-title fw-bold fs-6 d-flex align-items-center gap-2">
                      <i className="bi bi-arrow-repeat"></i>
                      <span>Renew Policy for {renewForm.customer_name}</span>
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      disabled={isSubmitting}
                      onClick={() => setShowRenewModal(false)}
                    ></button>
                  </div>

                  <div className="modal-body p-4">
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Insurance Provider
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={renewForm.insurance_company}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, insurance_company: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          New Policy Number
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={renewForm.policy_number}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, policy_number: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          New Premium (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={renewForm.premium_amount}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, premium_amount: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          New Start Date
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={renewForm.policy_start_date}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, policy_start_date: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          New Expiry Date
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={renewForm.policy_expiry_date}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, policy_expiry_date: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Renewal Notes
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={renewForm.notes}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, notes: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer bg-light py-2 px-4 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      disabled={isSubmitting}
                      onClick={() => setShowRenewModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success btn-sm d-inline-flex align-items-center gap-1 fw-semibold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          Renewing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-circle"></i>
                          Confirm Renewal
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW DETAILS MODAL
            =================================================================== */}
        {showViewModal && selectedRecord && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1050 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content shadow border-0 rounded-3">
                <div className="modal-header bg-dark text-white py-3 px-4">
                  <h5 className="modal-title fw-bold fs-6 d-flex align-items-center gap-2">
                    <i className="bi bi-shield-check"></i>
                    <span>Insurance Details: Record #{selectedRecord.id}</span>
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowViewModal(false)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Customer Info */}
                    <div className="col-md-6">
                      <div className="card h-100 border p-3 bg-light">
                        <div className="fw-bold text-dark mb-2">Customer Information</div>
                        <div className="small mb-1">
                          <span className="text-muted">Name:</span>{" "}
                          <span className="fw-semibold">{selectedRecord.customer_name || "N/A"}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Phone:</span>{" "}
                          <span>{selectedRecord.customer_phone || "-"}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Email:</span>{" "}
                          <span>{selectedRecord.customer_email || "-"}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">City / Address:</span>{" "}
                          <span>{selectedRecord.customer_city || "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="col-md-6">
                      <div className="card h-100 border p-3 bg-light">
                        <div className="fw-bold text-dark mb-2">Vehicle Specification</div>
                        <div className="small mb-1">
                          <span className="text-muted">Model Variant:</span>{" "}
                          <span className="fw-semibold">{selectedRecord.model_variant || "Standard"}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Vehicle / Reg No:</span>{" "}
                          <span className="badge bg-dark-subtle text-dark border ms-1">
                            {selectedRecord.vehicle_number || selectedRecord.registration_number || "Pending"}
                          </span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Deal ID:</span>{" "}
                          <span>#{selectedRecord.deal_id || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Policy Info */}
                    <div className="col-12">
                      <div className="card border p-3">
                        <div className="fw-bold text-dark mb-2">Policy & Coverage Information</div>
                        <div className="row g-2">
                          <div className="col-md-4 small">
                            <span className="text-muted">Company:</span>{" "}
                            <span className="fw-semibold">{selectedRecord.insurance_company}</span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Policy Number:</span>{" "}
                            <code>{selectedRecord.policy_number || "-"}</code>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Coverage Type:</span>{" "}
                            <span className="badge bg-primary-subtle text-primary border ms-1">
                              {selectedRecord.insurance_type}
                            </span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Start Date:</span>{" "}
                            <span>{selectedRecord.policy_start_date || selectedRecord.delivery_date || "-"}</span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Expiry Date:</span>{" "}
                            <span className="fw-bold text-danger">
                              {selectedRecord.policy_expiry_date || selectedRecord.insurance_expire_date || "-"}
                            </span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Premium Amount:</span>{" "}
                            <span className="fw-bold text-success">
                              ₹{formatIndianCurrency(Number(selectedRecord.premium_amount || 0))}
                            </span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Reminder Date:</span>{" "}
                            <span>{selectedRecord.reminder_date || "-"}</span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Reminder Interval:</span>{" "}
                            <span>{selectedRecord.reminder_days_before || 15} days before</span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Status:</span>{" "}
                            {renderStatusBadge(selectedRecord)}
                          </div>
                        </div>

                        {selectedRecord.notes && (
                          <div className="mt-3 pt-2 border-top small">
                            <span className="text-muted">Notes:</span>{" "}
                            <span className="text-dark fst-italic">{selectedRecord.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Previous Policies & Renewal History */}
                    <div className="col-12">
                      <div className="card border p-3 bg-light-subtle">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="fw-bold text-dark d-flex align-items-center gap-2">
                            <i className="bi bi-clock-history text-primary"></i>
                            <span>Previous Policies & Renewal History</span>
                          </div>
                          <span className="badge bg-primary-subtle text-primary border px-2 py-1" style={{ fontSize: "11px" }}>
                            {selectedRecord.renewal_history?.length || 0} Previous Policy Record(s)
                          </span>
                        </div>

                        {selectedRecord.renewal_history && selectedRecord.renewal_history.length > 0 ? (
                          <div className="table-responsive border rounded bg-white">
                            <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: "12px" }}>
                              <thead className="table-light">
                                <tr className="text-muted text-uppercase" style={{ fontSize: "11px" }}>
                                  <th>#</th>
                                  <th>Company</th>
                                  <th>Policy Number</th>
                                  <th>Coverage</th>
                                  <th>Period</th>
                                  <th>Premium</th>
                                  <th>Renewed On</th>
                                  <th>Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedRecord.renewal_history.map((hist, idx) => (
                                  <tr key={hist.id || idx}>
                                    <td className="fw-bold text-muted">#{idx + 1}</td>
                                    <td className="fw-semibold text-dark">{hist.insurance_company}</td>
                                    <td>
                                      <code className="text-primary">{hist.policy_number || "-"}</code>
                                    </td>
                                    <td>
                                      <span className="badge bg-light text-dark border">
                                        {hist.insurance_type}
                                      </span>
                                    </td>
                                    <td>
                                      <span>{hist.policy_start_date || "-"}</span>
                                      <span className="text-muted mx-1">to</span>
                                      <span className="fw-semibold text-danger">{hist.policy_expiry_date || "-"}</span>
                                    </td>
                                    <td className="fw-bold text-dark">
                                      ₹{formatIndianCurrency(Number(hist.premium_amount || 0))}
                                    </td>
                                    <td className="text-muted small">
                                      {hist.renewed_at || "-"}
                                    </td>
                                    <td className="text-muted small fst-italic">
                                      {hist.notes || "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-muted small fst-italic py-3 text-center bg-white rounded border">
                            <i className="bi bi-info-circle me-1"></i>
                            No previous renewal history records yet. (This is the original policy)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2 px-4 border-top">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setShowViewModal(false);
                      handleOpenEdit(selectedRecord);
                    }}
                  >
                    <i className="bi bi-pencil me-1"></i> Edit Record
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
