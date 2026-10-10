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
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Overall Stats for Top Cards
  const [overallStats, setOverallStats] = useState({
    total: 0,
    expiringSoon: 0,
    active: 0,
    expired: 0,
  });

  // Filter States (Clean & Compact: Search + Date Range only)
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Available Deals for 1-Click Auto-Fill
  const [dealsList, setDealsList] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);

  // Modals & Action States
  const [showAddModal, setShowAddModal] = useState(false);
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
    registration_number: "",
    vin_chassis_number: "",
    engine_number: "",
    notes: "",
  });

  // Renewal Form State
  const [renewForm, setRenewForm] = useState({
    notes: "",
  });

  // Computed live expiration and reminder preview for Add modal
  const computedExpiryDate = useMemo(() => {
    return calculateExpireDate(addForm.delivery_date);
  }, [addForm.delivery_date]);

  const computedReminderDate = useMemo(() => {
    return calculateReminderDate(computedExpiryDate);
  }, [computedExpiryDate]);

  // Computed renewal dates preview for Renew modal
  const renewalDatesPreview = useMemo(() => {
    if (!selectedInsurance?.insurance_expire_date) return { newExpireDate: "", newReminderDate: "" };
    return calculateRenewalDates(selectedInsurance.insurance_expire_date);
  }, [selectedInsurance]);

  const [errorMessage, setErrorMessage] = useState("");

  // Load Insurances API (Default 15 records from GET API without status filter)
  const loadInsurances = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
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
          setErrorMessage(res.message || "Failed to load insurance records");
        }
      }
    } catch (err) {
      console.error("Failed to fetch insurances:", err);
      setErrorMessage(err.response?.data?.message || err.message || "Failed to load insurance records");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    perPage,
    searchTerm,
    fromDate,
    toDate,
  ]);

  // Load Overall Stats for Non-Clickable KPI Cards
  const loadOverallStats = useCallback(async () => {
    try {
      const res = await insuranceApi.getInsurances({ per_page: 100 });
      if (res && res.status && Array.isArray(res.data)) {
        let expSoon = 0;
        let act = 0;
        let expd = 0;
        res.data.forEach((item) => {
          const s = String(item.status || "").toLowerCase();
          if (s === "expiring_soon") expSoon += 1;
          else if (s === "expired") expd += 1;
          else act += 1;
        });
        setOverallStats({
          total: res.pagination?.total || res.data.length,
          expiringSoon: expSoon,
          active: act,
          expired: expd,
        });
      }
    } catch (e) {
      console.warn("Failed to load overall stats:", e);
    }
  }, []);

  // Load Deals for 1-Click Auto-Fill Dropdown
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

  // Initial & Filter Data Fetch
  useEffect(() => {
    loadInsurances();
  }, [loadInsurances]);

  // Load deals & overall stats once on component mount
  useEffect(() => {
    loadDeals();
    loadOverallStats();
  }, [loadDeals, loadOverallStats]);

  // Handle Deal Selection in Add Modal (Auto-fill all details including Color from Deals Table)
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
        customer_name: matchedDeal.customer_name || prev.customer_name,
        customer_phone: matchedDeal.customer_phone || prev.customer_phone,
        customer_email: matchedDeal.customer_email || prev.customer_email,
        customer_city: matchedDeal.customer_city || matchedDeal.lead?.city || prev.customer_city,
        model_variant: matchedDeal.model_variant || prev.model_variant,
        // Color dynamically extracted directly from deals table
        color: matchedDeal.color || prev.color || "Standard",
        delivery_date: deliveryDateVal,
        vin_chassis_number: matchedDeal.vin_chassis_number || prev.vin_chassis_number,
        engine_number: matchedDeal.engine_number || prev.engine_number,
        registration_number: matchedDeal.registration_number || prev.registration_number,
        premium_amount: matchedDeal.insurance_amount ? String(matchedDeal.insurance_amount) : prev.premium_amount,
      }));

      showToast(`Auto-filled vehicle, color & details from Deal #${matchedDeal.id}`, "info");
    }
  };

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
      registration_number: "",
      vin_chassis_number: "",
      engine_number: "",
      notes: "",
    });
    setShowAddModal(true);
  };

  // Submit Add Insurance (POST /api/insurances/store)
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
      const msg = err.response?.data?.message || err.message || "Failed to create insurance record";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Quick Renew Modal
  const openRenewModal = (record) => {
    setSelectedInsurance(record);
    setRenewForm({
      notes: `Annual renewal processed for ${record.customer_name}.`,
    });
    setShowRenewModal(true);
  };

  // Submit Renewal (POST /api/insurances/{id}/renew)
  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInsurance) return;

    setIsSubmitting(true);
    try {
      const res = await insuranceApi.renewInsurance(selectedInsurance.id, renewForm);
      showToast(res.message || "Insurance policy renewed successfully for next year!", "success");
      setShowRenewModal(false);
      loadInsurances();
    } catch (err) {
      console.error("Renewal failed:", err);
      const msg = err.response?.data?.message || err.message || "Renewal failed";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Detail Modal
  const openDetailModal = (record) => {
    setSelectedInsurance(record);
    setShowDetailModal(true);
  };

  // Reset Filters (Search and Dates only)
  const handleResetFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  // Helper: Status Badging & Days Left calculation
  const renderStatusBadge = (item) => {
    const status = String(item.status || "").toLowerCase();
    const expireDateStr = item.insurance_expire_date;
    let daysLeft = null;

    if (expireDateStr) {
      const expDate = new Date(expireDateStr);
      const today = new Date();
      const diffTime = expDate.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (status === "expired" || (daysLeft !== null && daysLeft < 0)) {
      return (
        <span className="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1">
          <i className="bi bi-x-circle-fill"></i>
          Expired {daysLeft !== null ? `(${Math.abs(daysLeft)}d ago)` : ""}
        </span>
      );
    }

    if (status === "expiring_soon" || (daysLeft !== null && daysLeft <= 15)) {
      return (
        <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1">
          <i className="bi bi-exclamation-triangle-fill text-warning"></i>
          Expiring Soon {daysLeft !== null ? `(${daysLeft}d left)` : ""}
        </span>
      );
    }

    return (
      <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1">
        <i className="bi bi-shield-check"></i>
        Active {daysLeft !== null ? `(${daysLeft}d)` : ""}
      </span>
    );
  };

  // Helper: WhatsApp Reminder Link Generator
  const generateWhatsAppLink = (item) => {
    const phone = (item.customer_number || item.customer_phone || "").replace(/[^0-9]/g, "");
    const cleanPhone = phone.startsWith("91") ? phone : phone.length === 10 ? `91${phone}` : phone;
    const text = encodeURIComponent(
      `Hello ${item.customer_name},\n\nThis is a polite reminder from Defence Auto Link regarding your vehicle ${item.model_variant || "vehicle"} (${item.color || "Standard"}).\n\nYour vehicle insurance policy is due to expire on ${item.insurance_expire_date}.\n\nPlease contact us today to complete your seamless 1-click renewal and stay covered without any penalty!\n\nBest regards,\nDefence Auto Link Team`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // Dynamic Metrics Calculated from Loaded Insurances
  const metrics = useMemo(() => {
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let activeCount = 0;

    insurances.forEach((item) => {
      const s = String(item.status || "").toLowerCase();
      if (s === "expiring_soon") expiringSoonCount += 1;
      else if (s === "expired") expiredCount += 1;
      else activeCount += 1;
    });

    return {
      total: pagination.total || insurances.length,
      expiringSoon: expiringSoonCount,
      expired: expiredCount,
      active: activeCount,
    };
  }, [insurances, pagination.total]);

  // Export Table to CSV
  const handleExportCSV = () => {
    if (!insurances.length) {
      showToast("No insurance records to export", "info");
      return;
    }

    const headers = [
      "ID",
      "Deal ID",
      "Customer Name",
      "Customer Number",
      "Customer Email",
      "Customer City",
      "Model Variant",
      "Color",
      "Delivery Date",
      "Insurance Expire Date",
      "Reminder Date",
      "Status",
    ];

    const rows = insurances.map((item) => [
      item.id,
      item.deal_id || "-",
      `"${(item.customer_name || "").replace(/"/g, '""')}"`,
      `"${item.customer_number || item.customer_phone || ""}"`,
      item.customer_email || "",
      `"${item.customer_city || ""}"`,
      `"${(item.model_variant || "").replace(/"/g, '""')}"`,
      `"${item.color || "Standard"}"`,
      item.delivery_date || "",
      item.insurance_expire_date || "",
      item.reminder_date || "",
      item.status || "active",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CSD_Insurance_Records_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Insurance records exported to CSV", "success");
  };

  return (
    <AdminLayout>
      <div className="container-fluid px-3 px-md-4 py-3 py-md-4">
        {/* ===================================================================
            1. PAGE HEADER & QUICK ACTIONS
            =================================================================== */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #58632A, #3F4912)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  boxShadow: "0 4px 12px rgba(88, 99, 42, 0.25)",
                }}
              >
                <i className="bi bi-shield-check"></i>
              </span>
              <h3 className="fw-bold mb-0 text-dark" style={{ letterSpacing: "-0.5px" }}>
                Insurance & Renewal Reminders
              </h3>
            </div>
            <p className="text-muted small mb-0 ms-1">
              Automated renewal notifications, 365-day expiry calculation & deal color integration
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm bg-white"
              onClick={() => {
                loadInsurances();
                showToast("Refreshed insurance records", "info");
              }}
              title="Refresh Data"
            >
              <i className="bi bi-arrow-clockwise"></i>
              <span className="d-none d-sm-inline">Refresh</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 shadow-sm bg-white"
              onClick={handleExportCSV}
              title="Export Current Table as CSV"
            >
              <i className="bi bi-file-earmark-excel"></i>
              <span className="d-none d-sm-inline">Export CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-1 shadow-sm"
              style={{
                backgroundColor: "#58632A",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
              }}
              onClick={openAddModal}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Add Insurance Record</span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            2. KPI SUMMARY CARDS
            =================================================================== */}
        {/* ===================================================================
            2. KPI SUMMARY CARDS (Informational, NOT Clickable)
            =================================================================== */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-xl-3">
            <div
              className="card border-0 shadow-sm rounded-3 h-100 p-3 border-start border-4 border-primary"
              style={{
                background: "#ffffff",
                transition: "all 0.2s ease",
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-medium">Total Insurance Records</div>
                  <h3 className="fw-bold text-dark mt-1 mb-0">{overallStats.total || pagination.total || insurances.length}</h3>
                  <div className="text-muted extra-small mt-1">All registered vehicles</div>
                </div>
                <div
                  className="rounded-3 p-3 text-primary bg-primary-subtle"
                  style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <i className="bi bi-shield-shaded fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div
              className="card border-0 shadow-sm rounded-3 h-100 p-3 border-start border-4 border-warning"
              style={{
                background: "#ffffff",
                transition: "all 0.2s ease",
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-medium">Due Reminders (15 Days)</div>
                  <h3 className="fw-bold text-warning-emphasis mt-1 mb-0">{overallStats.expiringSoon}</h3>
                  <div className="text-warning extra-small mt-1 fw-medium">Action Needed for Renewal</div>
                </div>
                <div
                  className="rounded-3 p-3 text-warning-emphasis bg-warning-subtle"
                  style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <i className="bi bi-bell-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div
              className="card border-0 shadow-sm rounded-3 h-100 p-3 border-start border-4 border-success"
              style={{
                background: "#ffffff",
                transition: "all 0.2s ease",
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-medium">Active Policies</div>
                  <h3 className="fw-bold text-success mt-1 mb-0">{overallStats.active}</h3>
                  <div className="text-muted extra-small mt-1">Valid &amp; Protected</div>
                </div>
                <div
                  className="rounded-3 p-3 text-success bg-success-subtle"
                  style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <i className="bi bi-check-circle-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div
              className="card border-0 shadow-sm rounded-3 h-100 p-3 border-start border-4 border-danger"
              style={{
                background: "#ffffff",
                transition: "all 0.2s ease",
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-medium">Expired Policies</div>
                  <h3 className="fw-bold text-danger mt-1 mb-0">{overallStats.expired}</h3>
                  <div className="text-muted extra-small mt-1">Lapsed coverage</div>
                </div>
                <div
                  className="rounded-3 p-3 text-danger bg-danger-subtle"
                  style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <i className="bi bi-exclamation-octagon-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            3. SEARCH & DATE FILTER CONTROLS (SINGLE LINE)
            =================================================================== */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-body p-3">
            <div className="row g-2 align-items-center">
              {/* Global Search Input */}
              <div className="col-12 col-md-5">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-end-0 text-muted">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search name, phone, deal, model, color..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-outline-secondary btn-sm"
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
              <div className="col-6 col-md-3">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white text-muted small">From</span>
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
              </div>

              {/* To Date */}
              <div className="col-6 col-md-3">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white text-muted small">To</span>
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
              </div>

              {/* Reset Button (Compact) */}
              <div className="col-12 col-md-1 d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-2 py-1 w-100"
                  onClick={handleResetFilters}
                  title="Clear search and dates"
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            4. INSURANCE RECORDS TABLE VIEW
            =================================================================== */}
        <div className="card border-0 shadow-sm rounded-3 overflow-hidden">
          <div className="card-header bg-white border-bottom border-light py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-dark">Insurance Records & Expiry Tracker</span>
              <span className="badge bg-secondary-subtle text-secondary rounded-pill">
                {pagination.total} records
              </span>
            </div>
            <div className="text-muted small">
              <i className="bi bi-info-circle me-1 text-primary"></i>
              Calculated exactly: Expire = Delivery + 365 days | Reminder = Expire - 15 days
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ minWidth: "960px" }}>
              <thead className="table-light text-uppercase extra-small text-muted fw-semibold">
                <tr>
                  <th style={{ width: "50px" }} className="text-center">#</th>
                  <th>Customer Info</th>
                  <th>Vehicle & Color</th>
                  <th>Delivery Date</th>
                  <th>Insurance Expire</th>
                  <th>Reminder Date</th>
                  <th>Status</th>
                  <th className="text-end" style={{ width: "180px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      Loading insurance records...
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <div className="py-4">
                        <div
                          className="mx-auto rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center mb-3"
                          style={{ width: 64, height: 64 }}
                        >
                          <i className="bi bi-exclamation-triangle-fill text-danger fs-2"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-1">Could Not Load Insurance Records</h6>
                        <p className="text-muted small mb-3">
                          {errorMessage}
                        </p>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                          onClick={() => loadInsurances()}
                        >
                          <i className="bi bi-arrow-clockwise"></i>
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : insurances.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <div className="py-4">
                        <div
                          className="mx-auto rounded-circle bg-light d-flex align-items-center justify-content-center mb-3"
                          style={{ width: 64, height: 64 }}
                        >
                          <i className="bi bi-shield-x text-muted fs-2"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-1">No Insurance Records Found</h6>
                        <p className="text-muted small mb-3">
                          {searchTerm || fromDate || toDate
                            ? "No records matched your search filters. Try clearing the filters."
                            : "Click 'Add Insurance Record' to create your first vehicle policy."}
                        </p>
                        {searchTerm || fromDate || toDate ? (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={handleResetFilters}
                          >
                            Reset Filters
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ backgroundColor: "#58632A", color: "#fff" }}
                            onClick={openAddModal}
                          >
                            Add Insurance Record
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  insurances.map((item, idx) => {
                    const rowNumber = (pagination.current_page - 1) * pagination.per_page + idx + 1;
                    return (
                      <tr key={`insurance-row-${item.id ?? "item"}-${idx}`}>
                        {/* Row Index */}
                        <td className="text-center text-muted small fw-medium">{rowNumber}</td>

                        {/* Customer Info */}
                        <td>
                          <div>
                            <div className="fw-bold text-dark d-flex align-items-center gap-1">
                              <span>{item.customer_name || "Unknown Customer"}</span>
                              {item.deal_id && (
                                <span className="badge bg-light text-muted border extra-small px-1 py-0">
                                  Deal #{item.deal_id}
                                </span>
                              )}
                            </div>
                            <div className="d-flex align-items-center gap-2 mt-1">
                              <a
                                href={`tel:${item.customer_number || item.customer_phone}`}
                                className="text-muted small text-decoration-none d-flex align-items-center gap-1"
                                title="Call customer"
                              >
                                <i className="bi bi-telephone text-primary"></i>
                                {item.customer_number || item.customer_phone || "No Phone"}
                              </a>
                              {item.customer_city && (
                                <span className="text-muted extra-small">
                                  <i className="bi bi-geo-alt me-1"></i>
                                  {item.customer_city}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Vehicle & Dynamic Color */}
                        <td>
                          <div>
                            <div className="fw-semibold text-dark">
                              {item.model_variant || "Standard Vehicle"}
                            </div>
                            <div className="d-flex align-items-center gap-2 mt-1">
                              <span
                                className="badge bg-light text-dark border px-2 py-1 extra-small fw-normal d-inline-flex align-items-center gap-1"
                              >
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor:
                                      item.color?.toLowerCase() === "white"
                                        ? "#dee2e6"
                                        : item.color?.toLowerCase() === "black"
                                        ? "#212529"
                                        : item.color?.toLowerCase() === "blue"
                                        ? "#0d6efd"
                                        : item.color?.toLowerCase() === "red"
                                        ? "#dc3545"
                                        : item.color?.toLowerCase() === "grey" || item.color?.toLowerCase() === "silver"
                                        ? "#6c757d"
                                        : "#58632A",
                                    border: "1px solid rgba(0,0,0,0.15)",
                                  }}
                                ></span>
                                {item.color || "Standard"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Delivery Date */}
                        <td>
                          <div className="small text-dark fw-medium">
                            {item.delivery_date || "-"}
                          </div>
                          <span className="text-muted extra-small">Vehicle Delivered</span>
                        </td>

                        {/* Insurance Expire Date (+365 days) */}
                        <td>
                          <div className="small fw-bold text-dark">
                            {item.insurance_expire_date || "-"}
                          </div>
                          <span className="text-muted extra-small">+365 days coverage</span>
                        </td>

                        {/* Reminder Date (-15 days before expiry) */}
                        <td>
                          <div className="small fw-semibold text-warning-emphasis">
                            {item.reminder_date || "-"}
                          </div>
                          <span className="text-muted extra-small">15d advance alert</span>
                        </td>

                        {/* Status Badge */}
                        <td>{renderStatusBadge(item)}</td>

                        {/* Action Buttons */}
                        <td className="text-end">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            {/* 1-Click Renew Button */}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success px-2 py-1 d-inline-flex align-items-center gap-1"
                              onClick={() => openRenewModal(item)}
                              title="Renew Policy for 1 Year"
                            >
                              <i className="bi bi-arrow-repeat"></i>
                              <span>Renew</span>
                            </button>

                            {/* WhatsApp Direct Reminder */}
                            {(item.customer_number || item.customer_phone) && (
                              <a
                                href={generateWhatsAppLink(item)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-success px-2 py-1"
                                title="Send WhatsApp Renewal Alert"
                              >
                                <i className="bi bi-whatsapp"></i>
                              </a>
                            )}

                            {/* View Detail Modal */}
                            <button
                              type="button"
                              className="btn btn-sm btn-light border px-2 py-1 text-muted"
                              onClick={() => openDetailModal(item)}
                              title="View Details"
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
          <Pagination
            currentPage={pagination.current_page}
            lastPage={pagination.last_page}
            total={pagination.total}
            perPage={pagination.per_page}
            onPageChange={(p) => setCurrentPage(p)}
            onPerPageChange={(n) => {
              setPerPage(n);
              setCurrentPage(1);
            }}
            perPageOptions={[10, 15, 25, 50]}
            itemName="insurance policies"
          />
        </div>

        {/* ===================================================================
            MODAL 1: STORE / CREATE NEW INSURANCE RECORD
            =================================================================== */}
        {showAddModal && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(2px)", zIndex: 1055 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow-lg rounded-3">
                <div className="modal-header bg-light py-3 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        backgroundColor: "#58632A",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i className="bi bi-shield-plus"></i>
                    </span>
                    <h5 className="modal-title fw-bold text-dark mb-0">Create New Insurance Record</h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    disabled={isSubmitting}
                    onClick={() => setShowAddModal(false)}
                  ></button>
                </div>

                <form onSubmit={handleAddSubmit}>
                  <div className="modal-body p-4">
                    {/* 1-Click Deal Selector */}
                    <div className="card border border-success-subtle bg-success-subtle bg-opacity-25 p-3 rounded-3 mb-4">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="form-label fw-bold text-dark small mb-0 d-flex align-items-center gap-1">
                          <i className="bi bi-magic text-success"></i>
                          1-Click Auto-Fill from Deal (Optional)
                        </label>
                        {isLoadingDeals && (
                          <span className="spinner-border spinner-border-sm text-success" role="status"></span>
                        )}
                      </div>
                      <select
                        className="form-select form-select-sm bg-white"
                        value={addForm.deal_id}
                        onChange={(e) => handleDealSelection(e.target.value)}
                      >
                        <option value="">-- Select an Existing Deal to Auto-Fill Data --</option>
                        {dealsList.map((d) => (
                          <option key={d.id} value={d.id}>
                            Deal #{d.id} - {d.customer_name} ({d.model_variant} • Color: {d.color || "Standard"})
                          </option>
                        ))}
                      </select>
                      <div className="text-muted extra-small mt-1">
                        Selecting a deal automatically populates customer details, delivery date, vehicle, and dynamic color from the deals table.
                      </div>
                    </div>

                    {/* Customer Information */}
                    <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">1. Customer Information</h6>
                    <div className="row g-3 mb-4">
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-dark">
                          Customer Full Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Rahul Sharma"
                          required
                          value={addForm.customer_name}
                          onChange={(e) => setAddForm({ ...addForm, customer_name: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-dark">
                          Mobile Phone Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          className="form-control form-control-sm"
                          placeholder="e.g. 9876543210"
                          required
                          value={addForm.customer_phone}
                          onChange={(e) => setAddForm({ ...addForm, customer_phone: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-dark">Email Address</label>
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          placeholder="e.g. rahul@example.com"
                          value={addForm.customer_email}
                          onChange={(e) => setAddForm({ ...addForm, customer_email: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-dark">Customer City / Location</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Mumbai"
                          value={addForm.customer_city}
                          onChange={(e) => setAddForm({ ...addForm, customer_city: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Vehicle & Calculation Rules */}
                    <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">2. Vehicle & Delivery Calculation Rules</h6>
                    <div className="row g-3 mb-4">
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-dark">Model & Variant Name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Hyundai Creta SX (O)"
                          value={addForm.model_variant}
                          onChange={(e) => setAddForm({ ...addForm, model_variant: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-dark">
                          Vehicle Color (Dynamic from Deals Table)
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Phantom Black"
                          value={addForm.color}
                          onChange={(e) => setAddForm({ ...addForm, color: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-dark">
                          Delivery Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          required
                          value={addForm.delivery_date}
                          onChange={(e) => setAddForm({ ...addForm, delivery_date: e.target.value })}
                        />
                        <div className="text-muted extra-small mt-1">Calculation starting date</div>
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-dark">
                          Insurance Expire Date
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm bg-light"
                          readOnly
                          value={computedExpiryDate}
                        />
                        <div className="text-success extra-small mt-1 fw-medium">
                          <i className="bi bi-check-circle me-1"></i>Exactly 365 days after delivery
                        </div>
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-dark">
                          Reminder Date
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm bg-light"
                          readOnly
                          value={computedReminderDate}
                        />
                        <div className="text-warning-emphasis extra-small mt-1 fw-medium">
                          <i className="bi bi-bell me-1"></i>15 days before expiration
                        </div>
                      </div>
                    </div>

                    {/* Optional Policy & Financial Data */}
                    <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">3. Policy Financials & Identifiers (Optional)</h6>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-dark">Premium Amount (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control form-control-sm"
                          placeholder="e.g. 32500"
                          value={addForm.premium_amount}
                          onChange={(e) => setAddForm({ ...addForm, premium_amount: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-dark">IDV Amount (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control form-control-sm"
                          placeholder="e.g. 1250000"
                          value={addForm.idv_amount}
                          onChange={(e) => setAddForm({ ...addForm, idv_amount: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-dark">Registration No. (RTO)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. MH02CB1234"
                          value={addForm.registration_number}
                          onChange={(e) => setAddForm({ ...addForm, registration_number: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-dark">VIN / Chassis Number</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. MALC1234567890"
                          value={addForm.vin_chassis_number}
                          onChange={(e) => setAddForm({ ...addForm, vin_chassis_number: e.target.value })}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold text-dark">Engine Number</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. ENG9876543"
                          value={addForm.engine_number}
                          onChange={(e) => setAddForm({ ...addForm, engine_number: e.target.value })}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-semibold text-dark">Remarks / Notes</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows="2"
                          placeholder="Any specific insurance endorsements, accessories, or customer notes..."
                          value={addForm.notes}
                          onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                        ></textarea>
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
                      className="btn btn-sm d-inline-flex align-items-center gap-1"
                      style={{ backgroundColor: "#58632A", color: "#fff" }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle"></i>
                          Save Insurance Record
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
            MODAL 2: 1-CLICK RENEW INSURANCE POLICY
            =================================================================== */}
        {showRenewModal && selectedInsurance && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(2px)", zIndex: 1055 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-3">
                <div className="modal-header bg-success-subtle py-3 border-bottom border-success-subtle">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        backgroundColor: "#198754",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i className="bi bi-arrow-repeat"></i>
                    </span>
                    <h5 className="modal-title fw-bold text-success-emphasis mb-0">Renew Policy for Next Year</h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    disabled={isSubmitting}
                    onClick={() => setShowRenewModal(false)}
                  ></button>
                </div>

                <form onSubmit={handleRenewSubmit}>
                  <div className="modal-body p-4">
                    <div className="bg-light p-3 rounded-3 mb-3 border">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-muted small">Customer Name:</span>
                        <strong className="text-dark">{selectedInsurance.customer_name}</strong>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-muted small">Vehicle Model:</span>
                        <span className="fw-semibold text-dark">{selectedInsurance.model_variant || "Standard"}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-muted small">Vehicle Color:</span>
                        <span className="badge bg-white text-dark border extra-small">
                          {selectedInsurance.color || "Standard"}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-muted small">Current Expiration Date:</span>
                        <span className="badge bg-warning-subtle text-warning-emphasis">
                          {selectedInsurance.insurance_expire_date || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="card border-success border-opacity-50 bg-success-subtle bg-opacity-25 p-3 rounded-3 mb-3">
                      <div className="fw-bold text-success mb-2 d-flex align-items-center gap-1 small">
                        <i className="bi bi-calculator"></i>
                        Automated Renewal Calculation
                      </div>
                      <div className="row g-2 text-center">
                        <div className="col-6">
                          <div className="bg-white p-2 rounded border">
                            <div className="text-muted extra-small">New Expiry (+365 Days)</div>
                            <div className="fw-bold text-success fs-6 mt-1">
                              {renewalDatesPreview.newExpireDate || "-"}
                            </div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="bg-white p-2 rounded border">
                            <div className="text-muted extra-small">New Reminder (-15 Days)</div>
                            <div className="fw-bold text-dark fs-6 mt-1">
                              {renewalDatesPreview.newReminderDate || "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="form-label small fw-semibold text-dark">Renewal Remarks / Notes</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows="2"
                        placeholder="Add notes for this renewal..."
                        value={renewForm.notes}
                        onChange={(e) => setRenewForm({ ...renewForm, notes: e.target.value })}
                      ></textarea>
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
                          <i className="bi bi-arrow-repeat"></i>
                          Confirm 1-Year Renewal
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
            MODAL 3: VIEW RECORD DETAILS
            =================================================================== */}
        {showDetailModal && selectedInsurance && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(2px)", zIndex: 1055 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-3">
                <div className="modal-header bg-light py-3 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        backgroundColor: "#58632A",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i className="bi bi-file-earmark-text"></i>
                    </span>
                    <h5 className="modal-title fw-bold text-dark mb-0">Insurance Policy Details</h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDetailModal(false)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="list-group list-group-flush rounded-3 border">
                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Record ID</span>
                      <strong className="text-dark">#{selectedInsurance.id}</strong>
                    </div>

                    {selectedInsurance.deal_id && (
                      <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                        <span className="text-muted small">Associated Deal</span>
                        <span className="badge bg-primary-subtle text-primary fw-bold">
                          Deal #{selectedInsurance.deal_id}
                        </span>
                      </div>
                    )}

                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Customer Name</span>
                      <strong className="text-dark">{selectedInsurance.customer_name}</strong>
                    </div>

                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Phone Number</span>
                      <span className="text-dark">{selectedInsurance.customer_number || selectedInsurance.customer_phone || "-"}</span>
                    </div>

                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Email Address</span>
                      <span className="text-dark">{selectedInsurance.customer_email || "-"}</span>
                    </div>

                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">City</span>
                      <span className="text-dark">{selectedInsurance.customer_city || "-"}</span>
                    </div>

                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Vehicle Model</span>
                      <strong className="text-dark">{selectedInsurance.model_variant || "-"}</strong>
                    </div>

                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Color (from Deals)</span>
                      <span className="badge bg-light text-dark border">
                        {selectedInsurance.color || "Standard"}
                      </span>
                    </div>

                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Vehicle Delivery Date</span>
                      <span className="text-dark">{selectedInsurance.delivery_date || "-"}</span>
                    </div>

                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Insurance Expire Date</span>
                      <strong className="text-dark">{selectedInsurance.insurance_expire_date || "-"}</strong>
                    </div>

                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Reminder Date</span>
                      <span className="text-warning-emphasis fw-semibold">
                        {selectedInsurance.reminder_date || "-"}
                      </span>
                    </div>

                    <div className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <span className="text-muted small">Status</span>
                      <span>{renderStatusBadge(selectedInsurance)}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2 px-4 border-top d-flex justify-content-between">
                  <div>
                    {(selectedInsurance.customer_number || selectedInsurance.customer_phone) && (
                      <a
                        href={generateWhatsAppLink(selectedInsurance)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-1"
                      >
                        <i className="bi bi-whatsapp"></i>
                        <span>WhatsApp Reminder</span>
                      </a>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setShowDetailModal(false)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="btn btn-success btn-sm d-inline-flex align-items-center gap-1"
                      onClick={() => {
                        setShowDetailModal(false);
                        openRenewModal(selectedInsurance);
                      }}
                    >
                      <i className="bi bi-arrow-repeat"></i>
                      <span>Renew Policy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
