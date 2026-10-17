"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import insuranceApi, {
  calculateExpireDate,
  calculateReminderDate,
  calculateRenewalDates,
} from "@/services/insuranceApi";
import { dealApi } from "@/services/dealApi";
import Pagination from "@/components/common/Pagination";
import { formatIndianCurrency } from "@/utils/numberToWords";

export default function InsuranceManager({ userRole = "Super Admin" }) {
  const { showToast } = useToast();

  // State: Insurance List & Pagination
  const [insurances, setInsurances] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters (Default: Next 15 Days Reminders)
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Available Deals for 1-Click Auto-Fill (Add Modal)
  const [dealsList, setDealsList] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);

  // Modals & Action States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Insurance Form State
  const todayStr = new Date().toISOString().split("T")[0];
  const [addForm, setAddForm] = useState({
    deal_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_city: "",
    model_variant: "",
    color: "Standard",
    delivery_date: todayStr,
    premium_amount: "",
    idv_amount: "",
    vehicle_number: "",
    registration_number: "",
    insurance_company: "HDFC ERGO General Insurance",
    policy_number: "",
    insurance_type: "Comprehensive",
    reminder_days_before: 15,
    vin_chassis_number: "",
    engine_number: "",
    notes: "",
  });

  // Comprehensive Renew Form State (Opens popup with all policy fields)
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

  // Computed live expiration and reminder preview for Add modal
  const computedExpiryDate = useMemo(() => {
    return calculateExpireDate(addForm.delivery_date);
  }, [addForm.delivery_date]);

  const computedReminderDate = useMemo(() => {
    return calculateReminderDate(computedExpiryDate);
  }, [computedExpiryDate]);

  // Load Insurances API (ONLY brings records where 15 days or less are remaining)
  const loadInsurances = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
        days: 15, // Specifically filter for next 15 days renewal due
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await insuranceApi.getInsurances(params);
      if (res && res.status) {
        setErrorMessage("");
        setInsurances(Array.isArray(res.data) ? res.data : []);
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
        setInsurances([]);
        if (res && !res.status) {
          setErrorMessage(res.message || "Failed to load reminder records");
        }
      }
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
      setErrorMessage(
        err.response?.data?.message ||
        err.message ||
        "Failed to load insurance renewal reminders"
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, searchTerm, fromDate, toDate]);

  // Load Deals for 1-Click Auto-Fill Dropdown in Add modal
  const loadDeals = useCallback(async () => {
    setIsLoadingDeals(true);
    try {
      const res = await dealApi.getDeals({ per_page: 50 });
      if (res && Array.isArray(res.data)) {
        setDealsList(res.data);
      }
    } catch (err) {
      console.warn("Could not load deals for autofill:", err);
    } finally {
      setIsLoadingDeals(false);
    }
  }, []);

  useEffect(() => {
    loadInsurances();
  }, [loadInsurances]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Compute stats for 15-day reminder dashboard
  const reminderStats = useMemo(() => {
    const total = pagination.total || insurances.length;
    let dueIn7Days = 0;
    let dueIn15Days = 0;
    let expired = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    insurances.forEach((item) => {
      const expStr = item.policy_expiry_date || item.insurance_expire_date;
      if (!expStr) return;
      const expDate = new Date(expStr);
      expDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expired++;
      } else if (diffDays <= 7) {
        dueIn7Days++;
        dueIn15Days++;
      } else if (diffDays <= 15) {
        dueIn15Days++;
      }
    });

    return { total, dueIn7Days, dueIn15Days, expired };
  }, [insurances, pagination.total]);

  // Open Add Insurance Modal
  const openAddModal = () => {
    setAddForm({
      deal_id: "",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      customer_city: "",
      model_variant: "",
      color: "Standard",
      delivery_date: todayStr,
      premium_amount: "",
      idv_amount: "",
      vehicle_number: "",
      registration_number: "",
      insurance_company: "HDFC ERGO General Insurance",
      policy_number: "",
      insurance_type: "Comprehensive",
      reminder_days_before: 15,
      vin_chassis_number: "",
      engine_number: "",
      notes: "",
    });
    setShowAddModal(true);
  };

  // Handle Deal Selection in Add Modal
  const handleDealSelection = (selectedDealId) => {
    if (!selectedDealId) {
      setAddForm((prev) => ({
        ...prev,
        deal_id: "",
      }));
      return;
    }

    const matchedDeal = dealsList.find((d) => String(d.id) === String(selectedDealId));
    if (matchedDeal) {
      const deliveryDateVal =
        matchedDeal.actual_delivery_date ||
        matchedDeal.expected_delivery_date ||
        todayStr;

      setAddForm((prev) => ({
        ...prev,
        deal_id: matchedDeal.id,
        customer_name: matchedDeal.customer_name || "",
        customer_phone: matchedDeal.customer_phone || "",
        customer_email: matchedDeal.customer_email || "",
        customer_city: matchedDeal.customer_city || "",
        model_variant: matchedDeal.model_variant || "",
        color: matchedDeal.color || "Standard",
        delivery_date: deliveryDateVal,
        registration_number: matchedDeal.registration_number || "",
        vehicle_number: matchedDeal.registration_number || "",
        vin_chassis_number: matchedDeal.vin_chassis_number || "",
        engine_number: matchedDeal.engine_number || "",
      }));
    }
  };

  // Submit Add Insurance
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.customer_name?.trim()) {
      showToast("Customer Name is required", "error");
      return;
    }
    if (!addForm.customer_phone?.trim()) {
      showToast("Customer Phone Number is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await insuranceApi.createInsurance(addForm);
      showToast(res.message || "Insurance record created successfully", "success");
      setShowAddModal(false);
      loadInsurances();
    } catch (err) {
      console.error("Store insurance failed:", err);
      showToast(
        err.response?.data?.message || err.message || "Failed to create insurance record",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Full Renewal Modal (Opens popup with all fields)
  const openRenewModal = (record) => {
    setSelectedInsurance(record);
    const currExp = record.policy_expiry_date || record.insurance_expire_date || "";
    const calc = calculateRenewalDates(currExp);

    setRenewForm({
      id: record.id,
      customer_name: record.customer_name || "",
      vehicle_number: record.vehicle_number || record.registration_number || "",
      insurance_company: record.insurance_company || "HDFC ERGO General Insurance",
      policy_number: record.policy_number ? `${record.policy_number}-RNW` : "",
      insurance_type: record.insurance_type || "Comprehensive",
      policy_start_date: currExp || todayStr,
      policy_expiry_date: calc.newExpireDate,
      premium_amount: record.premium_amount || "",
      reminder_days_before: record.reminder_days_before || 15,
      reminder_date: calc.newReminderDate,
      notes: `Renewed on ${new Date().toLocaleDateString("en-IN")}`,
    });
    setShowRenewModal(true);
  };

  // Submit Full Renewal Form
  const handleRenewSubmit = async (e) => {
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
        vehicle_number: renewForm.vehicle_number,
        renewal_status: "Renewed",
        notes: renewForm.notes,
      };

      const res = await insuranceApi.renewInsurance(renewForm.id, payload);
      showToast(res.message || "Insurance policy renewed successfully!", "success");
      setShowRenewModal(false);
      loadInsurances();
    } catch (err) {
      console.error("Renewal failed:", err);
      showToast(err.response?.data?.message || err.message || "Renewal failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (record) => {
    setSelectedInsurance(record);
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
      renewal_status: record.renewal_status || "Pending",
      notes: record.notes || "",
    });
    setShowEditModal(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
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
        loadInsurances();
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

  // Open Detail Modal
  const openDetailModal = (record) => {
    setSelectedInsurance(record);
    setShowDetailModal(true);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  // Status & Days Left Badge Helper
  const renderStatusBadge = (item) => {
    const expireDateStr = item.policy_expiry_date || item.insurance_expire_date;
    let daysLeft = null;

    if (expireDateStr) {
      const expDate = new Date(expireDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);
      daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    }

    if (daysLeft !== null && daysLeft < 0) {
      return (
        <div>
          <span className="badge bg-danger text-white px-2 py-1">
            <i className="bi bi-x-circle me-1"></i>Expired
          </span>
          <div className="text-danger extra-small fw-semibold mt-1" style={{ fontSize: "11px" }}>
            {Math.abs(daysLeft)}d overdue
          </div>
        </div>
      );
    }

    if (daysLeft !== null && daysLeft <= 15) {
      return (
        <div>
          <span className="badge bg-warning text-dark px-2 py-1 fw-bold">
            <i className="bi bi-clock-history me-1"></i>Due Soon
          </span>
          <div className="text-warning-emphasis extra-small fw-bold mt-1" style={{ fontSize: "11px" }}>
            {daysLeft === 0 ? "Expires Today" : `${daysLeft} days left`}
          </div>
        </div>
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
              <h1 className="h4 fw-bold text-dark mb-0">Insurance & Renewal Reminders</h1>
              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1 fw-semibold">
                15 Days Expiry Window ({pagination.total})
              </span>
            </div>
            <p className="text-muted small mb-0 mt-1">
              Vehicle policies expiring within the next 15 days requiring customer renewal reminders.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm fw-semibold"
              onClick={openAddModal}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Add Insurance</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={() => loadInsurances()}
              disabled={isLoading}
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? "spin" : ""}`}></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Row (15-Day Reminder View) */}
        {/* <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 bg-white p-3 border-start border-warning border-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-medium">Due in Next 15 Days</div>
                  <div className="h4 fw-bold text-warning mb-0 mt-1">{reminderStats.dueIn15Days}</div>
                </div>
                <div className="bg-warning-subtle text-warning p-2 rounded-circle">
                  <i className="bi bi-bell-fill fs-5"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 bg-white p-3 border-start border-danger border-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-medium">Expiring This Week (&lt;7d)</div>
                  <div className="h4 fw-bold text-danger mb-0 mt-1">{reminderStats.dueIn7Days}</div>
                </div>
                <div className="bg-danger-subtle text-danger p-2 rounded-circle">
                  <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 bg-white p-3 border-start border-secondary border-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-medium">Already Expired</div>
                  <div className="h4 fw-bold text-secondary mb-0 mt-1">{reminderStats.expired}</div>
                </div>
                <div className="bg-secondary-subtle text-secondary p-2 rounded-circle">
                  <i className="bi bi-shield-x fs-5"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 bg-white p-3 border-start border-primary border-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-medium">Total Reminder Queue</div>
                  <div className="h4 fw-bold text-primary mb-0 mt-1">{pagination.total}</div>
                </div>
                <div className="bg-primary-subtle text-primary p-2 rounded-circle">
                  <i className="bi bi-shield-check fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div> */}

        {/* Filters Card */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-body p-3">
            <div className="row g-2 align-items-center">
              {/* Search */}
              <div className="col-12 col-md-5">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by customer, phone, vehicle no, policy no..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setCurrentPage(1);
                      }}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* From Date */}
              <div className="col-6 col-md-2">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  title="Filter Start Date"
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
                  title="Filter Expiry Date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Reset Filters */}
              {(searchTerm || fromDate || toDate) && (
                <div className="col-12 col-md-3">
                  <button
                    className="btn btn-outline-danger btn-sm w-100"
                    onClick={() => {
                      setSearchTerm("");
                      setFromDate("");
                      setToDate("");
                      setCurrentPage(1);
                    }}
                    title="Reset Filters"
                  >
                    <i className="bi bi-x-circle me-1"></i> Reset Filters
                  </button>
                </div>
              )}
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

        {/* Table Card (Same fields as Insurance Records) */}
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
                      <span className="text-muted small">Loading renewal reminders due within 15 days...</span>
                    </td>
                  </tr>
                ) : insurances.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <i className="bi bi-shield-check text-success fs-1 d-block mb-2"></i>
                      <div className="fw-semibold text-dark">No Renewal Reminders Due in Next 15 Days</div>
                      <p className="text-muted small mb-0 mt-1">
                        All vehicle insurance policies are up to date!
                      </p>
                    </td>
                  </tr>
                ) : (
                  insurances.map((item) => {
                    const vehicleNo = item.vehicle_number || item.registration_number;
                    const startDate = item.policy_start_date || item.delivery_date;
                    const expiryDate = item.policy_expiry_date || item.insurance_expire_date;

                    return (
                      <tr key={item.id}>
                        {/* ID */}
                        <td>
                          <span className="badge bg-light text-dark border fw-bold">#{item.id}</span>
                        </td>

                        {/* Customer Info */}
                        <td>
                          <div className="fw-semibold text-dark">{item.customer_name || "N/A"}</div>
                          <div className="text-muted small d-flex align-items-center gap-1">
                            <i className="bi bi-telephone"></i>
                            <a
                              href={`tel:${item.customer_number || item.customer_phone}`}
                              className="text-decoration-none text-muted"
                            >
                              {item.customer_number || item.customer_phone || "-"}
                            </a>
                          </div>
                          {item.customer_city && (
                            <div className="text-muted extra-small" style={{ fontSize: "11px" }}>
                              <i className="bi bi-geo-alt"></i> {item.customer_city}
                            </div>
                          )}
                        </td>

                        {/* Vehicle Details */}
                        <td>
                          <div className="fw-semibold text-dark">{item.model_variant || item.vehicle_name || "Standard"}</div>
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
                          <div className="fw-semibold text-primary">{item.insurance_company || "HDFC ERGO"}</div>
                          <div className="text-muted small">
                            <code>{item.policy_number || "No Policy #"}</code>
                          </div>
                          <span className="badge bg-secondary-subtle text-secondary extra-small mt-1" style={{ fontSize: "10px" }}>
                            {item.insurance_type || "Comprehensive"}
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
                            ₹{formatIndianCurrency(Number(item.premium_amount || 0))}
                          </div>
                        </td>

                        {/* Reminder Date */}
                        <td>
                          <div className="small text-dark fw-medium">
                            {item.reminder_date ? new Date(item.reminder_date).toLocaleDateString("en-IN") : "-"}
                          </div>
                          <div className="text-muted extra-small" style={{ fontSize: "10px" }}>
                            {item.reminder_days_before || 15} days before
                          </div>
                        </td>

                        {/* Status */}
                        <td>{renderStatusBadge(item)}</td>

                        {/* Actions */}
                        <td className="text-end pe-3">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-success"
                              title="Renew Policy with Details Popup"
                              onClick={() => openRenewModal(item)}
                            >
                              <i className="bi bi-arrow-repeat me-1"></i>
                              <span>Renew</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              title="Edit Record"
                              onClick={() => openEditModal(item)}
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              title="View Details"
                              onClick={() => openDetailModal(item)}
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

          {/* Pagination Controls */}
          {!isLoading && insurances.length > 0 && (
            <Pagination
              currentPage={currentPage}
              lastPage={pagination.last_page || 1}
              total={pagination.total || insurances.length}
              perPage={perPage}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
              perPageOptions={[10, 20, 50, 100]}
              itemName="reminders"
            />
          )}
        </div>

        {/* ===================================================================
            MODAL 1: COMPREHENSIVE RENEWAL POPUP (User Enters All Policy Fields)
            =================================================================== */}
        {showRenewModal && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", zIndex: 1055 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-3">
                <form onSubmit={handleRenewSubmit}>
                  <div className="modal-header bg-success text-white py-3 px-4">
                    <h5 className="modal-title fw-bold fs-6 d-flex align-items-center gap-2">
                      <i className="bi bi-arrow-repeat"></i>
                      <span>Renew Insurance Policy for {renewForm.customer_name}</span>
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      disabled={isSubmitting}
                      onClick={() => setShowRenewModal(false)}
                    ></button>
                  </div>

                  <div className="modal-body p-4">
                    {/* Readonly Context */}
                    <div className="p-3 bg-light rounded-3 mb-3 border">
                      <div className="row g-2">
                        <div className="col-md-6">
                          <span className="text-muted small">Customer Name:</span>
                          <span className="fw-bold text-dark ms-2">{renewForm.customer_name}</span>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted small">Vehicle / Reg No:</span>
                          <span className="badge bg-dark-subtle text-dark border ms-2">
                            {renewForm.vehicle_number || "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="row g-3">
                      {/* Insurance Company */}
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Insurance Provider / Company <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          list="renewCompanyList"
                          value={renewForm.insurance_company}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, insurance_company: e.target.value })
                          }
                          required
                        />
                        <datalist id="renewCompanyList">
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

                      {/* New Policy Number */}
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          New Policy Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. POL-2027-123456"
                          value={renewForm.policy_number}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, policy_number: e.target.value })
                          }
                          required
                        />
                      </div>

                      {/* Insurance Type */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Coverage Type
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={renewForm.insurance_type}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, insurance_type: e.target.value })
                          }
                        >
                          <option value="Comprehensive">Comprehensive (1+3 Years)</option>
                          <option value="Third Party">Third Party</option>
                          <option value="Own Damage">Own Damage (OD)</option>
                          <option value="Zero Depreciation">Zero Depreciation</option>
                        </select>
                      </div>

                      {/* Premium Amount */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Renewal Premium (₹) <span className="text-danger">*</span>
                        </label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text bg-light">₹</span>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            placeholder="e.g. 24500"
                            value={renewForm.premium_amount}
                            onChange={(e) =>
                              setRenewForm({ ...renewForm, premium_amount: e.target.value })
                            }
                            required
                          />
                        </div>
                      </div>

                      {/* Vehicle Number (Editable) */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Vehicle Number
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. GJ-01-AB-1234"
                          value={renewForm.vehicle_number}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, vehicle_number: e.target.value.toUpperCase() })
                          }
                        />
                      </div>

                      {/* New Start Date */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          New Policy Start Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={renewForm.policy_start_date}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            const newExp = calculateExpireDate(newStart);
                            const rDays = Number(renewForm.reminder_days_before || 15);
                            let newRem = renewForm.reminder_date;
                            if (newExp) {
                              const remD = new Date(newExp);
                              remD.setDate(remD.getDate() - rDays);
                              newRem = remD.toISOString().split("T")[0];
                            }
                            setRenewForm({
                              ...renewForm,
                              policy_start_date: newStart,
                              policy_expiry_date: newExp,
                              reminder_date: newRem,
                            });
                          }}
                          required
                        />
                      </div>

                      {/* New Expiry Date (+1 Year) */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          New Expiry Date (+1 Year) <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={renewForm.policy_expiry_date}
                          onChange={(e) => {
                            const val = e.target.value;
                            const rDays = Number(renewForm.reminder_days_before || 15);
                            let newRem = renewForm.reminder_date;
                            if (val) {
                              const remD = new Date(val);
                              remD.setDate(remD.getDate() - rDays);
                              newRem = remD.toISOString().split("T")[0];
                            }
                            setRenewForm({
                              ...renewForm,
                              policy_expiry_date: val,
                              reminder_date: newRem,
                            });
                          }}
                          required
                        />
                      </div>

                      {/* Reminder Interval */}
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Reminder Interval
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={renewForm.reminder_days_before}
                          onChange={(e) => {
                            const rDays = Number(e.target.value || 15);
                            let newRem = renewForm.reminder_date;
                            if (renewForm.policy_expiry_date) {
                              const remD = new Date(renewForm.policy_expiry_date);
                              remD.setDate(remD.getDate() - rDays);
                              newRem = remD.toISOString().split("T")[0];
                            }
                            setRenewForm({
                              ...renewForm,
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

                      {/* Calculated Reminder Date Preview */}
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Calculated Reminder Date
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={renewForm.reminder_date}
                          onChange={(e) =>
                            setRenewForm({ ...renewForm, reminder_date: e.target.value })
                          }
                        />
                      </div>

                      {/* Remarks */}
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Renewal Remarks
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Paid online, NCB 20%, Policy document attached"
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
                          Saving Renewal...
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
            MODAL 2: EDIT INSURANCE RECORD
            =================================================================== */}
        {showEditModal && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1055 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content shadow border-0 rounded-3">
                <form onSubmit={handleEditSubmit}>
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
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Vehicle Registration Number
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editForm.vehicle_number}
                          onChange={(e) =>
                            setEditForm({ ...editForm, vehicle_number: e.target.value.toUpperCase() })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Policy Number
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editForm.policy_number}
                          onChange={(e) =>
                            setEditForm({ ...editForm, policy_number: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Insurance Company
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={editForm.insurance_company}
                          onChange={(e) =>
                            setEditForm({ ...editForm, insurance_company: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Premium Amount (₹)
                        </label>
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
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Reminder Date
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
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Notes / Remarks
                        </label>
                        <textarea
                          className="form-control form-control-sm"
                          rows="2"
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
            MODAL 3: ADD INSURANCE RECORD
            =================================================================== */}
        {showAddModal && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(2px)", zIndex: 1055 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-3">
                <form onSubmit={handleAddSubmit}>
                  <div className="modal-header bg-light py-3 border-bottom">
                    <h5 className="modal-title fw-bold text-dark mb-0">Add Vehicle Insurance Record</h5>
                    <button
                      type="button"
                      className="btn-close"
                      disabled={isSubmitting}
                      onClick={() => setShowAddModal(false)}
                    ></button>
                  </div>

                  <div className="modal-body p-4">
                    {/* Auto-fill from Existing Deal */}
                    <div className="p-3 bg-light rounded-3 mb-3 border">
                      <label className="form-label small fw-bold text-dark mb-1">
                        Select Converted Deal (Optional Auto-Fill)
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={addForm.deal_id}
                        onChange={(e) => handleDealSelection(e.target.value)}
                        disabled={isLoadingDeals}
                      >
                        <option value="">-- Choose Deal to Autofill Customer & Vehicle --</option>
                        {dealsList.map((deal) => (
                          <option key={deal.id} value={deal.id}>
                            Deal #{deal.deal_number || deal.id} - {deal.customer_name} ({deal.model_variant || "Car"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Customer Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={addForm.customer_name}
                          onChange={(e) => setAddForm({ ...addForm, customer_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Customer Phone <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={addForm.customer_phone}
                          onChange={(e) => setAddForm({ ...addForm, customer_phone: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Vehicle Model
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={addForm.model_variant}
                          onChange={(e) => setAddForm({ ...addForm, model_variant: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Vehicle Registration Number
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. GJ-01-AB-1234"
                          value={addForm.vehicle_number}
                          onChange={(e) =>
                            setAddForm({
                              ...addForm,
                              vehicle_number: e.target.value.toUpperCase(),
                              registration_number: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Insurance Company
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={addForm.insurance_company}
                          onChange={(e) => setAddForm({ ...addForm, insurance_company: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Policy Number
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={addForm.policy_number}
                          onChange={(e) => setAddForm({ ...addForm, policy_number: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Delivery / Start Date
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={addForm.delivery_date}
                          onChange={(e) => setAddForm({ ...addForm, delivery_date: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Expiry Date (1 Year)
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm bg-light"
                          value={computedExpiryDate}
                          readOnly
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Premium Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={addForm.premium_amount}
                          onChange={(e) => setAddForm({ ...addForm, premium_amount: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer bg-light py-2 px-4 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      disabled={isSubmitting}
                      onClick={() => setShowAddModal(false)}
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
                          Save Insurance
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
            MODAL 4: VIEW POLICY DETAILS
            =================================================================== */}
        {showDetailModal && selectedInsurance && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", zIndex: 1055 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-3">
                <div className="modal-header bg-dark text-white py-3 px-4">
                  <h5 className="modal-title fw-bold fs-6 d-flex align-items-center gap-2">
                    <i className="bi bi-shield-check"></i>
                    <span>Insurance Reminder Details #{selectedInsurance.id}</span>
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowDetailModal(false)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="card h-100 border p-3 bg-light">
                        <div className="fw-bold text-dark mb-2">Customer Information</div>
                        <div className="small mb-1">
                          <span className="text-muted">Name:</span>{" "}
                          <span className="fw-semibold">{selectedInsurance.customer_name || "N/A"}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Phone:</span>{" "}
                          <span>{selectedInsurance.customer_phone || selectedInsurance.customer_number || "-"}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Email:</span>{" "}
                          <span>{selectedInsurance.customer_email || "-"}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">City:</span>{" "}
                          <span>{selectedInsurance.customer_city || "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="card h-100 border p-3 bg-light">
                        <div className="fw-bold text-dark mb-2">Vehicle Specification</div>
                        <div className="small mb-1">
                          <span className="text-muted">Model:</span>{" "}
                          <span className="fw-semibold">{selectedInsurance.model_variant || selectedInsurance.vehicle_name || "Standard"}</span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Vehicle Reg No:</span>{" "}
                          <span className="badge bg-dark-subtle text-dark border ms-1">
                            {selectedInsurance.vehicle_number || selectedInsurance.registration_number || "Pending"}
                          </span>
                        </div>
                        <div className="small mb-1">
                          <span className="text-muted">Color:</span>{" "}
                          <span>{selectedInsurance.color || "Standard"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="card border p-3">
                        <div className="fw-bold text-dark mb-2">Policy & Expiry Information</div>
                        <div className="row g-2">
                          <div className="col-md-4 small">
                            <span className="text-muted">Provider:</span>{" "}
                            <span className="fw-semibold">{selectedInsurance.insurance_company || "HDFC ERGO"}</span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Policy Number:</span>{" "}
                            <code>{selectedInsurance.policy_number || "-"}</code>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Type:</span>{" "}
                            <span className="badge bg-primary-subtle text-primary border ms-1">
                              {selectedInsurance.insurance_type || "Comprehensive"}
                            </span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Start Date:</span>{" "}
                            <span>{selectedInsurance.policy_start_date || selectedInsurance.delivery_date || "-"}</span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Expiry Date:</span>{" "}
                            <span className="fw-bold text-danger">
                              {selectedInsurance.policy_expiry_date || selectedInsurance.insurance_expire_date || "-"}
                            </span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Premium:</span>{" "}
                            <span className="fw-bold text-success">
                              ₹{formatIndianCurrency(Number(selectedInsurance.premium_amount || 0))}
                            </span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Reminder Date:</span>{" "}
                            <span>{selectedInsurance.reminder_date || "-"}</span>
                          </div>
                          <div className="col-md-4 small">
                            <span className="text-muted">Status:</span>{" "}
                            {renderStatusBadge(selectedInsurance)}
                          </div>
                        </div>

                        {selectedInsurance.notes && (
                          <div className="mt-3 pt-2 border-top small">
                            <span className="text-muted">Notes:</span>{" "}
                            <span className="text-dark fst-italic">{selectedInsurance.notes}</span>
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
                            {selectedInsurance.renewal_history?.length || 0} Previous Policy Record(s)
                          </span>
                        </div>

                        {selectedInsurance.renewal_history && selectedInsurance.renewal_history.length > 0 ? (
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
                                {selectedInsurance.renewal_history.map((hist, idx) => (
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
                    onClick={() => setShowDetailModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => {
                      setShowDetailModal(false);
                      openRenewModal(selectedInsurance);
                    }}
                  >
                    <i className="bi bi-arrow-repeat me-1"></i> Renew Policy
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
