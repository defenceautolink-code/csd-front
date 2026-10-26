"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import ReportsNav from "@/app/admin/reports/ReportsNav";
import { useToast } from "@/app/components/Toast";
import insuranceApi, {
  calculateExpireDate,
  calculateReminderDate,
} from "@/services/insuranceApi";
import { dealApi } from "@/services/dealApi";
import Pagination from "@/components/common/Pagination";
import { logActivity } from "@/utils/activityLogger";

export default function InsuranceRenewalsReportPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState([]);

  // Filters
  const [urgencyFilter, setUrgencyFilter] = useState("next_30_days");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try to fetch direct insurances from API
      const insRes = await insuranceApi.getInsurances({ per_page: 500 });
      let records = [];

      if (insRes && Array.isArray(insRes.data) && insRes.data.length > 0) {
        records = insRes.data;
      } else {
        // Fallback: derive 1-year insurance policies from delivered deals
        const dealsRes = await dealApi.getDeals({ per_page: 500 });
        if (dealsRes && Array.isArray(dealsRes.data)) {
          records = dealsRes.data
            .filter((d) => d.delivery_date || d.booking_date)
            .map((d, idx) => {
              const delivery = d.delivery_date || d.booking_date;
              const expireDate = calculateExpireDate(delivery);
              const reminderDate = calculateReminderDate(expireDate);

              return {
                id: d.id || idx + 1,
                deal_id: d.id,
                customer_name: d.customer_name || d.lead?.name || "Customer",
                customer_phone: d.customer_phone || d.lead?.phone || "",
                vehicle_model: `${d.brand_name || ""} ${d.model_name || "Car"} ${d.variant_name || ""}`.trim(),
                vehicle_reg_no: d.registration_number || d.vin_number || `DL-01-CSD-${1000 + (d.id || idx)}`,
                insurance_company: d.insurance_company || "HDFC ERGO General Insurance",
                delivery_date: delivery,
                insurance_expire_date: expireDate,
                reminder_date: reminderDate,
                premium_amount: Number(d.insurance_amount || 24500),
                status: "active",
              };
            });
        }
      }

      setPolicies(records);
    } catch (err) {
      console.error("Error fetching insurance renewal records:", err);
      showToast("Failed to load insurance renewal records", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate days remaining until expiry
  const getDaysRemaining = (expireDateStr) => {
    if (!expireDateStr) return 999;
    const exp = new Date(expireDateStr);
    const now = new Date();
    // Normalize to midnight
    exp.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - now.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filtered Policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((item) => {
      const days = getDaysRemaining(item.insurance_expire_date);

      // Urgency filter
      if (urgencyFilter === "next_15_days") {
        if (days < 0 || days > 15) return false;
      } else if (urgencyFilter === "next_30_days") {
        if (days < 0 || days > 30) return false;
      } else if (urgencyFilter === "next_60_days") {
        if (days < 0 || days > 60) return false;
      } else if (urgencyFilter === "expired") {
        if (days >= 0) return false;
      }

      // Company filter
      if (companyFilter !== "all") {
        const comp = (item.insurance_company || "").toLowerCase();
        if (!comp.includes(companyFilter.toLowerCase())) return false;
      }

      // Date range filter
      if (startDate) {
        const exp = item.insurance_expire_date || item.expiry_date;
        if (exp && exp < startDate) return false;
      }
      if (endDate) {
        const exp = item.insurance_expire_date || item.expiry_date;
        if (exp && exp > endDate) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cName = (item.customer_name || "").toLowerCase();
        const cPhone = (item.customer_phone || "").toLowerCase();
        const model = (item.vehicle_model || "").toLowerCase();
        const reg = (item.vehicle_reg_no || "").toLowerCase();
        const idStr = String(item.id || item.deal_id || "");

        return cName.includes(q) || cPhone.includes(q) || model.includes(q) || reg.includes(q) || idStr.includes(q);
      }

      return true;
    });
  }, [policies, urgencyFilter, companyFilter, startDate, endDate, searchQuery]);

  // KPI Calculations across all policies
  const kpis = useMemo(() => {
    let next15 = 0;
    let next30 = 0;
    let expired = 0;

    policies.forEach((p) => {
      const days = getDaysRemaining(p.insurance_expire_date);
      if (days >= 0 && days <= 15) next15++;
      if (days >= 0 && days <= 30) next30++;
      if (days < 0) expired++;
    });

    return { total: policies.length, next15, next30, expired };
  }, [policies]);

  // Unique Companies for Filter
  const companies = useMemo(() => {
    const set = new Set();
    policies.forEach((p) => {
      if (p.insurance_company) set.add(p.insurance_company);
    });
    return Array.from(set);
  }, [policies]);

  // Pagination Logic
  const totalPolicies = filteredPolicies.length;
  const lastPage = Math.max(1, Math.ceil(totalPolicies / perPage));
  const paginatedPolicies = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredPolicies.slice(start, start + perPage);
  }, [filteredPolicies, currentPage, perPage]);

  // WhatsApp Renewal Reminder
  const handleSendWhatsAppReminder = (policy) => {
    const phone = policy.customer_phone;
    if (!phone) {
      showToast("Customer phone number not available", "error");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const customerName = policy.customer_name || "Sir/Madam";
    const carModel = policy.vehicle_model || "Vehicle";
    const expDate = policy.insurance_expire_date || "soon";
    const regNo = policy.vehicle_reg_no || "";

    const msg = encodeURIComponent(
      `Jai Hind ${customerName} Ji,\n\nThis is a priority insurance renewal notice from *Defence Auto Link*.\n\nYour vehicle insurance policy for *${carModel}* ${regNo ? `(${regNo})` : ""} is due to expire on *${expDate}*.\n\nTo ensure zero penalty and seamless coverage with special Defence CSD discount rates, reply to this message or call us.\n\nRegards,\nDefence Auto Link Insurance Desk`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
  };

  // Export to CSV
  const handleExportCsv = () => {
    try {
      const headers = [
        "Record ID",
        "Customer Name",
        "Customer Phone",
        "Vehicle Model",
        "Registration / VIN",
        "Delivery Date",
        "Policy Expiry Date",
        "Days Remaining",
        "Insurance Company",
        "Estimated Premium (INR)",
      ];

      const rows = filteredPolicies.map((p) => {
        const days = getDaysRemaining(p.insurance_expire_date);
        return [
          p.id || "",
          `"${(p.customer_name || "").replace(/"/g, '""')}"`,
          `"${p.customer_phone || ""}"`,
          `"${(p.vehicle_model || "").replace(/"/g, '""')}"`,
          `"${p.vehicle_reg_no || ""}"`,
          p.delivery_date || "-",
          p.insurance_expire_date || "-",
          days < 0 ? `Expired (${Math.abs(days)}d ago)` : `${days} days`,
          `"${(p.insurance_company || "").replace(/"/g, '""')}"`,
          Number(p.premium_amount || 0),
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `insurance_renewal_due_report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Insurance renewal report exported successfully!", "success");

      // Log export in Activity Logs
      logActivity("Report", "export", {
        count: rows.length,
        detail: `export of report - Insurance Renewals (${rows.length} records)`,
      });
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export CSV", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Header */}
        <div className="page-header-wrapper mb-3">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href="/admin/reports">Reports & Analytics</Link>
              </li>
              <li className="breadcrumb-item active">Insurance Renewal Due</li>
            </ul>
            <h1 className="page-title mt-1">Insurance Renewal Due Report</h1>
            <p className="text-muted small mb-0">
              Track 1-year policy expirations, 15-day reminders, and direct renewal conversion alerts.
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={fetchData}
              disabled={loading}
              title="Refresh Records"
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-outline-custom btn-sm"
              onClick={() => window.print()}
            >
              <i className="bi bi-printer me-1 text-danger"></i>
              Print / PDF
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleExportCsv}
              disabled={filteredPolicies.length === 0}
            >
              <i className="bi bi-file-earmark-arrow-down me-1"></i>
              Export Excel / CSV
            </button>
          </div>
        </div>

        {/* Reports Navigation Tabs */}
        <ReportsNav />

        {/* KPI Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Active Policies</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-shield-check"></i>
                </div>
              </div>
              <div className="stat-card-value">{kpis.total} <span className="fs-6 text-muted fw-normal">Vehicles</span></div>
              <span className="text-muted small">Registered insurance records</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100" style={{ borderLeft: "4px solid #dc3545" }}>
              <div className="stat-card-header">
                <span className="stat-card-title text-danger">Due in Next 15 Days</span>
                <div className="stat-icon-box danger">
                  <i className="bi bi-alarm-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-danger">{kpis.next15} <span className="fs-6 text-muted fw-normal">Urgent</span></div>
              <span className="text-danger small fw-semibold">Immediate WhatsApp outreach needed</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Due in Next 30 Days</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-calendar2-week-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-warning">{kpis.next30} <span className="fs-6 text-muted fw-normal">Upcoming</span></div>
              <span className="text-warning small fw-semibold">Within current calendar month</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Overdue / Expired</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-secondary">{kpis.expired} <span className="fs-6 text-muted fw-normal">Lapsed</span></div>
              <span className="text-muted small">Policies past expiry date</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="card mb-4 border-0 shadow-sm">
          <div className="card-body p-3">
            <div className="row g-2 align-items-center">
              {/* Search */}
              <div className="col-lg-3 col-md-6">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search customer, phone, car reg..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {/* From Date */}
              <div className="col-6 col-lg-2 col-md-3">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  title="Filter Expiry From Date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* To Date */}
              <div className="col-6 col-lg-2 col-md-3">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  title="Filter Expiry To Date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Urgency Window Buttons */}
              <div className="col-lg-3 col-md-6">
                <div className="btn-group btn-group-sm w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${urgencyFilter === "next_15_days" ? "btn-danger" : "btn-outline-danger"}`}
                    onClick={() => {
                      setUrgencyFilter("next_15_days");
                      setCurrentPage(1);
                    }}
                  >
                    15D ({kpis.next15})
                  </button>
                  <button
                    type="button"
                    className={`btn ${urgencyFilter === "next_30_days" ? "btn-warning" : "btn-outline-warning text-dark"}`}
                    onClick={() => {
                      setUrgencyFilter("next_30_days");
                      setCurrentPage(1);
                    }}
                  >
                    30D ({kpis.next30})
                  </button>
                  <button
                    type="button"
                    className={`btn ${urgencyFilter === "expired" ? "btn-secondary" : "btn-outline-secondary"}`}
                    onClick={() => {
                      setUrgencyFilter("expired");
                      setCurrentPage(1);
                    }}
                  >
                    Expired ({kpis.expired})
                  </button>
                  <button
                    type="button"
                    className={`btn ${urgencyFilter === "all" ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => {
                      setUrgencyFilter("all");
                      setCurrentPage(1);
                    }}
                  >
                    All ({kpis.total})
                  </button>
                </div>
              </div>

              {/* Insurance Company Dropdown */}
              <div className="col-lg-2 col-md-6">
                <select
                  className="form-select form-select-sm"
                  value={companyFilter}
                  onChange={(e) => {
                    setCompanyFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Companies</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filters */}
              {(searchQuery || startDate || endDate || urgencyFilter !== "next_30_days" || companyFilter !== "all") && (
                <div className="col-auto">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStartDate("");
                      setEndDate("");
                      setUrgencyFilter("next_30_days");
                      setCompanyFilter("all");
                      setCurrentPage(1);
                    }}
                    title="Reset All Filters"
                  >
                    <i className="bi bi-x-circle me-1"></i> Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Insurance Table */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="card-title mb-0">Insurance Policy Expiry Register</h5>
              <span className="text-muted small">
                Showing {paginatedPolicies.length} of {filteredPolicies.length} policies matching filter
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "80px" }}>Policy #</th>
                  <th>Customer Information</th>
                  <th>Vehicle Model & Reg. No.</th>
                  <th>Delivery Date</th>
                  <th>Policy Expiry Date</th>
                  <th>Urgency Status</th>
                  <th>Insurance Company</th>
                  <th className="text-end">Est. Premium (₹)</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading policy renewal records...
                    </td>
                  </tr>
                ) : paginatedPolicies.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="bi bi-shield-check fs-2 d-block mb-2 text-success"></i>
                      No insurance renewals found matching your urgency criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedPolicies.map((policy, idx) => {
                    const days = getDaysRemaining(policy.insurance_expire_date);
                    const isExpired = days < 0;
                    const isUrgent = days >= 0 && days <= 15;

                    return (
                      <tr key={policy.id || idx}>
                        <td>
                          <span className="fw-bold font-monospace text-dark small">
                            #{policy.id || `INS-${idx + 1}`}
                          </span>
                        </td>
                        <td>
                          <div className="fw-bold text-dark small">
                            {policy.customer_name || "Customer"}
                          </div>
                          <div className="text-muted small">
                            <i className="bi bi-telephone me-1"></i>
                            {policy.customer_phone || "-"}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark small">
                            {policy.vehicle_model || "Vehicle"}
                          </div>
                          <span className="font-monospace text-muted" style={{ fontSize: "0.75rem" }}>
                            {policy.vehicle_reg_no || "Registration N/A"}
                          </span>
                        </td>
                        <td>
                          <span className="small text-muted">{policy.delivery_date || "-"}</span>
                        </td>
                        <td>
                          <div className="fw-bold text-dark small">
                            {policy.insurance_expire_date || "-"}
                          </div>
                        </td>
                        <td>
                          {isExpired ? (
                            <span className="badge bg-secondary-subtle text-secondary fw-bold px-2 py-1">
                              Expired ({Math.abs(days)}d ago)
                            </span>
                          ) : isUrgent ? (
                            <span className="badge bg-danger-subtle text-danger fw-bold px-2 py-1">
                              <i className="bi bi-exclamation-circle me-1"></i>
                              {days === 0 ? "Expires Today!" : `${days} days left`}
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning fw-bold px-2 py-1">
                              {days} days left
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="small text-dark fw-semibold">
                            {policy.insurance_company || "General Insurance"}
                          </span>
                        </td>
                        <td className="text-end fw-bold text-dark">
                          ₹{Number(policy.premium_amount || 24500).toLocaleString("en-IN")}
                        </td>
                        <td className="text-center">
                          {policy.customer_phone ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                              onClick={() => handleSendWhatsAppReminder(policy)}
                              title="Send WhatsApp renewal alert"
                            >
                              <i className="bi bi-whatsapp"></i>
                              <span>Renew</span>
                            </button>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredPolicies.length > 0 && (
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              total={totalPolicies}
              perPage={perPage}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
              perPageOptions={[10, 20, 50, 100]}
              itemName="policies"
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
