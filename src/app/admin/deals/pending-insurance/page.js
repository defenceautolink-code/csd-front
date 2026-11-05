"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import dealApi from "@/services/dealApi";
import { formatIndianCurrency } from "@/utils/numberToWords";
import Pagination from "@/components/common/Pagination";

const INSURANCE_COMPANIES = [
  "ICICI Lombard",
  "HDFC ERGO",
  "Bajaj Allianz",
  "Tata AIG",
  "New India Assurance",
  "Oriental Insurance",
  "National Insurance",
  "SBI General",
  "Reliance General",
  "Go Digit",
  "Other",
];

const INSURANCE_TYPES = [
  "Comprehensive",
  "Zero Depreciation (B2B)",
  "Third Party",
  "Own Damage",
  "Standard",
];

export default function PendingInsuranceDealsPage() {
  const { showToast } = useToast();

  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    insurance_company: "ICICI Lombard",
    custom_company: "",
    policy_number: "",
    insurance_type: "Comprehensive",
    policy_start_date: new Date().toISOString().split("T")[0],
    policy_expiry_date: "",
    premium_amount: "",
    reminder_days_before: 15,
    reminder_date: "",
    vehicle_number: "",
    notes: "",
  });

  // Calculate default expiry date (+1 year)
  const calculateDefaultDates = (startDateStr, reminderDays = 15) => {
    if (!startDateStr) return { expiryDate: "", reminderDate: "" };
    try {
      const start = new Date(startDateStr);
      const expiry = new Date(start);
      expiry.setFullYear(expiry.getFullYear() + 1);
      expiry.setDate(expiry.getDate() - 1);
      const expStr = expiry.toISOString().split("T")[0];

      const rem = new Date(expiry);
      rem.setDate(rem.getDate() - Number(reminderDays));
      const remStr = rem.toISOString().split("T")[0];

      return { expiryDate: expStr, reminderDate: remStr };
    } catch {
      return { expiryDate: "", reminderDate: "" };
    }
  };

  // Fetch Deals where has_insurance = 'no'
  const fetchPendingDeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await dealApi.getDeals({ has_insurance: "no", per_page: 100 });
      let records = [];
      if (res && res.data && Array.isArray(res.data)) {
        records = res.data;
      } else if (Array.isArray(res)) {
        records = res;
      }
      setDeals(records);
    } catch (err) {
      console.error("Failed to fetch pending insurance deals:", err);
      showToast("Could not load deals without insurance.", "danger");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPendingDeals();

    const handleUpdate = () => fetchPendingDeals();
    window.addEventListener("csd_deals_updated", handleUpdate);
    return () => window.removeEventListener("csd_deals_updated", handleUpdate);
  }, [fetchPendingDeals]);

  // Open Add Insurance Modal for a deal
  const handleOpenAddInsurance = (deal) => {
    setSelectedDeal(deal);
    const today = new Date().toISOString().split("T")[0];
    const { expiryDate, reminderDate } = calculateDefaultDates(today, 15);

    setFormData({
      insurance_company: "ICICI Lombard",
      custom_company: "",
      policy_number: "",
      insurance_type: "Comprehensive",
      policy_start_date: today,
      policy_expiry_date: expiryDate,
      premium_amount: deal.insurance_amount || deal.insurance_estimate || "",
      reminder_days_before: 15,
      reminder_date: reminderDate,
      vehicle_number: deal.registration_number || deal.vin_chassis_number || deal.chassis_no || "",
      notes: `Insurance added post deal conversion for deal #${deal.deal_number || deal.id}`,
    });
    setShowModal(true);
  };

  // Handle start date or reminder days change
  const handleDateChange = (field, val) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      if (field === "policy_start_date" || field === "reminder_days_before") {
        const { expiryDate, reminderDate } = calculateDefaultDates(
          field === "policy_start_date" ? val : updated.policy_start_date,
          field === "reminder_days_before" ? val : updated.reminder_days_before
        );
        updated.policy_expiry_date = expiryDate;
        updated.reminder_date = reminderDate;
      } else if (field === "policy_expiry_date" && val) {
        try {
          const rem = new Date(val);
          rem.setDate(rem.getDate() - Number(updated.reminder_days_before || 15));
          updated.reminder_date = rem.toISOString().split("T")[0];
        } catch {}
      }
      return updated;
    });
  };

  // Submit Insurance Form
  const handleSubmitInsurance = async (e) => {
    e.preventDefault();
    if (!selectedDeal) return;

    if (!formData.policy_number?.trim()) {
      showToast("Please enter a valid Policy Number.", "warning");
      return;
    }

    const company =
      formData.insurance_company === "Other"
        ? formData.custom_company?.trim() || "Other"
        : formData.insurance_company;

    setIsSubmitting(true);
    try {
      const computedDates = calculateDefaultDates(
        formData.policy_start_date,
        formData.reminder_days_before
      );

      const payload = {
        insurance_company: company,
        policy_number: formData.policy_number.trim(),
        insurance_type: formData.insurance_type || "Comprehensive",
        policy_start_date: formData.policy_start_date,
        policy_expiry_date: formData.policy_expiry_date || computedDates.expiryDate,
        premium_amount: parseFloat(formData.premium_amount) || 0,
        reminder_days_before: parseInt(formData.reminder_days_before, 10) || 15,
        reminder_date: formData.reminder_date || computedDates.reminderDate,
        vehicle_number:
          formData.vehicle_number?.trim() ||
          selectedDeal.registration_number ||
          selectedDeal.vin_chassis_number ||
          selectedDeal.chassis_no ||
          "PENDING",
        notes: formData.notes?.trim() || `Insurance policy added for Deal #${selectedDeal.deal_number || selectedDeal.id}`,
      };

      await dealApi.addInsurance(selectedDeal.id, payload);
      showToast(
        `Insurance policy #${payload.policy_number} linked to Deal #${selectedDeal.deal_number || selectedDeal.id} successfully!`,
        "success"
      );
      setShowModal(false);
      setSelectedDeal(null);
      fetchPendingDeals();
    } catch (err) {
      console.error("Failed to add insurance:", err);
      showToast(err.response?.data?.message || "Failed to record insurance policy.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    if (!searchTerm.trim()) return deals;
    const q = searchTerm.toLowerCase();
    return deals.filter(
      (d) =>
        (d.customer_name && d.customer_name.toLowerCase().includes(q)) ||
        (d.customer_mobile && d.customer_mobile.includes(q)) ||
        (d.deal_number && d.deal_number.toLowerCase().includes(q)) ||
        (d.model_variant && d.model_variant.toLowerCase().includes(q)) ||
        (d.brand_name && d.brand_name.toLowerCase().includes(q)) ||
        (d.customer_city && d.customer_city.toLowerCase().includes(q))
    );
  }, [deals, searchTerm]);

  // Pagination calculation
  const totalItems = filteredDeals.length;
  const lastPage = Math.max(1, Math.ceil(totalItems / perPage));
  const paginatedDeals = useMemo(() => {
    return filteredDeals.slice((currentPage - 1) * perPage, currentPage * perPage);
  }, [filteredDeals, currentPage, perPage]);

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Breadcrumbs & Header Actions */}
        <div className="page-header-wrapper">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href="/admin/deals">Deals & Bookings</Link>
              </li>
              <li className="breadcrumb-item active">Pending Insurance</li>
            </ul>
            <h1 className="page-title mt-1">Pending Insurance Deals</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2 flex-wrap">
            <Link href="/admin/deals" className="btn btn-outline-custom">
              <i className="bi bi-trophy-fill text-primary"></i>
              <span>All Deals</span>
            </Link>
            <Link href="/admin/insurance-records" className="btn btn-outline-custom">
              <i className="bi bi-shield-check text-success"></i>
              <span>Insurance Records</span>
            </Link>
            <button
              type="button"
              className="btn btn-outline-custom"
              onClick={fetchPendingDeals}
              title="Refresh deals list"
            >
              <i className="bi bi-arrow-clockwise text-muted"></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-6 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Pending Insurance</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-shield-exclamation"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {isLoading ? "..." : deals.length} Deals
              </div>
              <span className="text-warning small fw-semibold">Action Required (Uninsured)</span>
            </div>
          </div>

          <div className="col-md-6 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Portfolio Exposure</span>
                <div className="stat-icon-box danger">
                  <i className="bi bi-currency-rupee"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {formatIndianCurrency(
                  deals.reduce(
                    (sum, d) => sum + (parseFloat(d.net_amount || d.total_amount) || 0),
                    0
                  )
                )}
              </div>
              <span className="text-danger small fw-semibold">Uninsured Vehicles Value</span>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="card">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h5 className="card-title mb-0">Deals Awaiting Insurance</h5>
              <span className="badge bg-primary-subtle text-white rounded-pill px-2">
                {filteredDeals.length} Deals
              </span>
              {searchTerm && (
                <span className="badge bg-info-subtle text-info border border-info rounded-pill px-2 small">
                  <i className="bi bi-search me-1"></i> Filter: &ldquo;{searchTerm}&rdquo;
                </span>
              )}
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Search Bar */}
              <div className="position-relative" style={{ width: "260px" }}>
                <input
                  type="text"
                  className="form-control form-control-sm pe-4"
                  placeholder="Search customer, phone, deal #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-link position-absolute end-0 top-50 translate-middle-y text-muted pe-2 text-decoration-none"
                    onClick={() => setSearchTerm("")}
                    title="Clear search"
                  >
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                ) : (
                  <i
                    className="bi bi-search position-absolute end-0 top-50 translate-middle-y text-muted pe-2"
                    style={{ pointerEvents: "none" }}
                  ></i>
                )}
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom align-middle">
              <thead>
                <tr>
                  <th style={{ width: "45px" }}>No</th>
                  <th style={{ width: "135px" }}>Deal No</th>
                  <th>Customer</th>
                  <th>Vehicle Details</th>
                  <th>Booking Date</th>
                  <th>Deal Total</th>
                  <th className="text-center" style={{ width: "140px" }}>Insurance Status</th>
                  <th className="text-end" style={{ width: "140px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading deals awaiting insurance...
                    </td>
                  </tr>
                ) : filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      <div className="d-flex flex-column align-items-center justify-content-center py-4">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                          style={{ width: "64px", height: "64px", backgroundColor: "#ECFDF5", color: "#10B981" }}
                        >
                          <i className="bi bi-shield-check fs-2"></i>
                        </div>
                        <h6 className="fw-bold text-dark mb-1">No Deals Pending Insurance</h6>
                        <p className="text-muted small mb-0">
                          {searchTerm
                            ? "No matching deals found for your search query."
                            : "All converted deals already have insurance policy linked."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDeals.map((deal, idx) => (
                    <tr key={deal.id}>
                      <td className="text-muted fw-semibold">{(currentPage - 1) * perPage + idx + 1}</td>
                      <td>
                        <span className="badge bg-light text-primary border font-monospace px-2 py-1">
                          {deal.deal_number || `DAL-D${deal.id}`}
                        </span>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{deal.customer_name || "—"}</div>
                        <div className="d-flex align-items-center gap-2 small text-muted mt-1">
                          {deal.customer_mobile && (
                            <span>
                              <i className="bi bi-telephone text-primary me-1"></i>
                              {deal.customer_mobile}
                            </span>
                          )}
                          {deal.customer_city && (
                            <span>
                              <i className="bi bi-geo-alt text-danger me-1"></i>
                              {deal.customer_city}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">
                          {deal.model_variant || deal.model_name || deal.brand_name || "—"}
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-1 small">
                          {deal.brand_name && (
                            <span className="badge bg-light text-dark border">
                              {deal.brand_name}
                            </span>
                          )}
                          {(deal.vin_chassis_number || deal.chassis_no) && (
                            <span className="text-muted font-monospace" style={{ fontSize: "11px" }}>
                              Chassis: {deal.vin_chassis_number || deal.chassis_no}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-muted small">
                        {deal.booking_date
                          ? new Date(deal.booking_date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="fw-bold text-dark">
                        {formatIndianCurrency(deal.net_amount || deal.total_amount || 0)}
                      </td>
                      <td className="text-center">
                        <span
                          className="badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold"
                          style={{ fontSize: "11px", padding: "4px 9px" }}
                        >
                          <i className="bi bi-shield-x me-1"></i> No Insurance
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 px-3 py-1 fw-semibold shadow-sm"
                          onClick={() => handleOpenAddInsurance(deal)}
                        >
                          <i className="bi bi-shield-plus"></i>
                          <span>Add Insurance</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Custom Pagination Component */}
          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            total={totalItems}
            perPage={perPage}
            onPageChange={setCurrentPage}
            onPerPageChange={(newVal) => {
              setPerPage(newVal);
              setCurrentPage(1);
            }}
            itemName="deals"
          />
        </div>

        {/* Add Insurance Modal */}
        {showModal && selectedDeal && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content rounded-4 border-0 shadow">
                {/* Modal Header */}
                <div
                  className="modal-header text-white px-4 py-3"
                  style={{ backgroundColor: "#0D1554", borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem" }}
                >
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      <i className="bi bi-shield-plus me-2"></i> Add Insurance Policy
                    </h5>
                    <div className="small opacity-75 mt-1">
                      Deal: #{selectedDeal.deal_number || selectedDeal.id} • Customer: {selectedDeal.customer_name}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => {
                      if (!isSubmitting) setShowModal(false);
                    }}
                    disabled={isSubmitting}
                  ></button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSubmitInsurance}>
                  <div className="modal-body p-4">
                    {/* Customer & Vehicle Snapshot */}
                    <div className="card bg-light border-0 rounded-3 p-3 mb-4">
                      <div className="row g-2 small">
                        <div className="col-12 col-md-4">
                          <span className="text-muted">Customer:</span>{" "}
                          <strong className="text-dark">{selectedDeal.customer_name}</strong>
                        </div>
                        <div className="col-12 col-md-4">
                          <span className="text-muted">Mobile:</span>{" "}
                          <strong className="text-dark">{selectedDeal.customer_phone || selectedDeal.customer_mobile || "—"}</strong>
                        </div>
                        <div className="col-12 col-md-4">
                          <span className="text-muted">City:</span>{" "}
                          <strong className="text-dark">{selectedDeal.customer_city || "—"}</strong>
                        </div>
                        <div className="col-12 col-md-8">
                          <span className="text-muted">Vehicle:</span>{" "}
                          <strong className="text-dark">
                            {selectedDeal.model_variant || selectedDeal.brand_name || "—"}
                          </strong>
                        </div>
                        <div className="col-12 col-md-4">
                          <span className="text-muted">Chassis / Reg:</span>{" "}
                          <strong className="text-dark">
                            {selectedDeal.registration_number || selectedDeal.vin_chassis_number || selectedDeal.chassis_no || "—"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="row g-3">
                      {/* Insurance Company */}
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold text-dark">
                          Insurance Provider / Company <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={formData.insurance_company}
                          onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                          required
                        >
                          {INSURANCE_COMPANIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* If Other Company */}
                      {formData.insurance_company === "Other" && (
                        <div className="col-12 col-md-6">
                          <label className="form-label small fw-bold text-dark">
                            Specify Company Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. United India Insurance"
                            value={formData.custom_company}
                            onChange={(e) => setFormData({ ...formData, custom_company: e.target.value })}
                            required
                          />
                        </div>
                      )}

                      {/* Policy Number */}
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold text-dark">
                          Policy Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. POL-2026-987654"
                          value={formData.policy_number}
                          onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                          required
                        />
                      </div>

                      {/* Insurance Type */}
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold text-dark">
                          Insurance Plan / Type
                        </label>
                        <select
                          className="form-select"
                          value={formData.insurance_type}
                          onChange={(e) => setFormData({ ...formData, insurance_type: e.target.value })}
                        >
                          {INSURANCE_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Vehicle Reg / Chassis No */}
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold text-dark">
                          Vehicle Reg / Chassis No
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. GJ01AB1234 or Chassis"
                          value={formData.vehicle_number}
                          onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                        />
                      </div>

                      {/* Policy Start Date */}
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold text-dark">
                          Policy Start Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.policy_start_date}
                          onChange={(e) => handleDateChange("policy_start_date", e.target.value)}
                          required
                        />
                      </div>

                      {/* Policy Expiry Date */}
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold text-dark">
                          Policy Expiry Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.policy_expiry_date}
                          onChange={(e) => handleDateChange("policy_expiry_date", e.target.value)}
                          required
                        />
                      </div>

                      {/* Premium Amount */}
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold text-dark">
                          Premium Amount (₹)
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="e.g. 28500"
                          value={formData.premium_amount}
                          onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                        />
                      </div>

                      {/* Reminder Days Before Expiry */}
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold text-dark">
                          Reminder Notification (Days Before)
                        </label>
                        <select
                          className="form-select"
                          value={formData.reminder_days_before}
                          onChange={(e) => handleDateChange("reminder_days_before", e.target.value)}
                        >
                          <option value={7}>7 Days Before</option>
                          <option value={15}>15 Days Before (Default)</option>
                          <option value={30}>30 Days Before</option>
                          <option value={45}>45 Days Before</option>
                        </select>
                      </div>

                      {/* Notes / Remarks */}
                      <div className="col-12">
                        <label className="form-label small fw-bold text-dark">
                          Notes / Remarks
                        </label>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Any specific endorsements or coverage notes..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="modal-footer bg-light px-4 py-3 rounded-bottom-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4 fw-semibold"
                      onClick={() => setShowModal(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-4 fw-semibold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Saving Policy...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-1"></i> Save & Link Insurance
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
