"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import ReportsNav from "@/app/admin/reports/ReportsNav";
import { useToast } from "@/app/components/Toast";
import { dealApi, normalizeDeal } from "@/services/dealApi";
import Pagination from "@/components/common/Pagination";

export default function PaymentCollectionReportPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);

  // Filters
  const [period, setPeriod] = useState("all_time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dealApi.getDeals({ per_page: 500 });
      if (res && res.data) {
        const raw = Array.isArray(res.data) ? res.data : [];
        setDeals(raw.map((d) => normalizeDeal(d) || d));
      }
    } catch (err) {
      console.error("Error fetching payment collection data:", err);
      showToast("Failed to load payment collection records", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Date Filtering Helper
  const isDateInPeriod = (dateStr) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    const now = new Date();

    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (d > e) return false;
    }

    if (period === "today") {
      return d.toDateString() === now.toDateString();
    } else if (period === "this_month") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    } else if (period === "last_month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    } else if (period === "this_year") {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Date filter
      const recordDate = deal.booking_date || deal.created_at;
      if (!isDateInPeriod(recordDate)) return false;

      const total = Number(deal.net_amount || deal.total_amount || 0);
      const paid = Number(deal.paid_amount || deal.total_paid || 0);
      const balance = Math.max(0, total - paid);

      // Payment Status Filter
      if (paymentStatusFilter === "balance_due" && balance <= 0) return false;
      if (paymentStatusFilter === "fully_paid" && balance > 0) return false;
      if (paymentStatusFilter === "partial" && (paid === 0 || balance <= 0)) return false;

      // Payment Mode Filter
      if (paymentModeFilter !== "all") {
        const payments = Array.isArray(deal.payments) ? deal.payments : [];
        const matchesMode = payments.some((p) =>
          (p.payment_mode || p.mode || "").toLowerCase().includes(paymentModeFilter.toLowerCase())
        );
        if (!matchesMode) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cName = (deal.customer_name || deal.lead?.name || "").toLowerCase();
        const cPhone = (deal.customer_phone || deal.lead?.phone || "").toLowerCase();
        const model = (deal.model_name || deal.vehicle_model || "").toLowerCase();
        const idStr = String(deal.id || deal.deal_id || "");

        // Search in payments UTR
        const payments = Array.isArray(deal.payments) ? deal.payments : [];
        const matchesUtr = payments.some((p) =>
          (p.transaction_reference || p.bank_name || "").toLowerCase().includes(q)
        );

        return cName.includes(q) || cPhone.includes(q) || model.includes(q) || idStr.includes(q) || matchesUtr;
      }

      return true;
    });
  }, [deals, period, startDate, endDate, paymentStatusFilter, paymentModeFilter, searchQuery]);

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalReceivable = 0;
    let totalCollected = 0;
    let totalPending = 0;

    filteredDeals.forEach((d) => {
      const net = Number(d.net_amount || d.total_amount || 0);
      const paid = Number(d.paid_amount || d.total_paid || 0);
      const bal = Math.max(0, net - paid);

      totalReceivable += net;
      totalCollected += paid;
      totalPending += bal;
    });

    const clearanceRate = totalReceivable > 0 ? Math.round((totalCollected / totalReceivable) * 100) : 0;

    return { totalReceivable, totalCollected, totalPending, clearanceRate };
  }, [filteredDeals]);

  // Pagination Logic
  const totalDeals = filteredDeals.length;
  const lastPage = Math.max(1, Math.ceil(totalDeals / perPage));
  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredDeals.slice(start, start + perPage);
  }, [filteredDeals, currentPage, perPage]);

  // WhatsApp Reminder Sender
  const handleSendWhatsAppReminder = (deal) => {
    const phone = deal.customer_phone || deal.lead?.phone;
    if (!phone) {
      showToast("Customer phone number not available", "error");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const customerName = deal.customer_name || deal.lead?.name || "Sir/Madam";
    const total = Number(deal.net_amount || deal.total_amount || 0).toLocaleString("en-IN");
    const balance = Math.max(0, Number(deal.net_amount || deal.total_amount || 0) - Number(deal.paid_amount || 0)).toLocaleString("en-IN");
    const carModel = `${deal.brand_name || ""} ${deal.model_name || "Vehicle"}`.trim();

    const msg = encodeURIComponent(
      `Jai Hind ${customerName} Ji,\n\nThis is a gentle payment reminder from *Defence Auto Link* regarding your CSD booking for *${carModel}* (Booking #${deal.id || ""}).\n\n• Total Deal Amount: ₹${total}\n• Outstanding Balance: *₹${balance}*\n\nPlease arrange for balance settlement prior to vehicle dispatch / RTO clearance.\n\nThank you for choosing Defence Auto Link!`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
  };

  // Export to CSV
  const handleExportCsv = () => {
    try {
      const headers = [
        "Deal ID",
        "Booking Date",
        "Customer Name",
        "Phone",
        "Car Model & Variant",
        "Total Deal Amount (INR)",
        "Paid Amount (INR)",
        "Pending Balance (INR)",
        "Payment Status",
        "Last Transaction Ref / Bank",
      ];

      const rows = filteredDeals.map((d) => {
        const net = Number(d.net_amount || d.total_amount || 0);
        const paid = Number(d.paid_amount || d.total_paid || 0);
        const bal = Math.max(0, net - paid);
        const lastPayment = Array.isArray(d.payments) && d.payments.length > 0 ? d.payments[d.payments.length - 1] : null;
        const refStr = lastPayment ? `${lastPayment.bank_name || ""} - ${lastPayment.transaction_reference || ""}`.trim() : "-";

        return [
          d.id || `DL-${d.deal_id || 100}`,
          d.booking_date || "-",
          `"${(d.customer_name || "").replace(/"/g, '""')}"`,
          `"${d.customer_phone || ""}"`,
          `"${d.brand_name || ""} ${d.model_name || ""} ${d.variant_name || ""}"`,
          net,
          paid,
          bal,
          `"${bal === 0 && paid > 0 ? "Fully Paid" : paid > 0 ? "Partially Paid" : "Pending"}"`,
          `"${refStr.replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payment_collection_report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Payment collection report exported successfully!", "success");
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
              <li className="breadcrumb-item active">Payment Collection & Balance</li>
            </ul>
            <h1 className="page-title mt-1">Payment Collection & Outstanding Balance Report</h1>
            <p className="text-muted small mb-0">
              Track token advances, bank transfers, cleared receipts, and pending customer dues.
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
              disabled={filteredDeals.length === 0}
            >
              <i className="bi bi-file-earmark-arrow-down me-1"></i>
              Export Excel / CSV
            </button>
          </div>
        </div>

        {/* Reports Navigation Tabs */}
        <ReportsNav />

        {/* KPI Summary Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Receivable Value</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-receipt"></i>
                </div>
              </div>
              <div className="stat-card-value">₹{(kpis.totalReceivable / 100000).toFixed(2)} <span className="fs-6 text-muted fw-normal">Lakhs</span></div>
              <span className="text-muted small">Total value of all filtered deals</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Cash Collected</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-cash-stack"></i>
                </div>
              </div>
              <div className="stat-card-value text-success">₹{(kpis.totalCollected / 100000).toFixed(2)} <span className="fs-6 text-muted fw-normal">Lakhs</span></div>
              <span className="text-success small fw-semibold">
                {kpis.clearanceRate}% Clearance rate
              </span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100" style={{ borderLeft: "4px solid #dc3545" }}>
              <div className="stat-card-header">
                <span className="stat-card-title text-danger">Outstanding Balance</span>
                <div className="stat-icon-box danger">
                  <i className="bi bi-exclamation-octagon-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-danger">₹{(kpis.totalPending / 100000).toFixed(2)} <span className="fs-6 text-muted fw-normal">Lakhs</span></div>
              <span className="text-danger small fw-semibold">Pending before vehicle release</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Deals Requiring Clearance</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-person-lines-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-warning">
                {filteredDeals.filter((d) => (Number(d.net_amount) || 0) > (Number(d.paid_amount) || 0)).length}
                <span className="fs-6 text-muted fw-normal"> Customers</span>
              </div>
              <span className="text-muted small">With outstanding balance</span>
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
                    placeholder="Search customer, phone, UTR..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {/* Quick Status Buttons */}
              <div className="col-lg-4 col-md-6">
                <div className="btn-group btn-group-sm w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${paymentStatusFilter === "all" ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => {
                      setPaymentStatusFilter("all");
                      setCurrentPage(1);
                    }}
                  >
                    All Deals
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentStatusFilter === "balance_due" ? "btn-danger" : "btn-outline-danger"}`}
                    onClick={() => {
                      setPaymentStatusFilter("balance_due");
                      setCurrentPage(1);
                    }}
                  >
                    <i className="bi bi-exclamation-circle me-1"></i>Balance Due Only
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentStatusFilter === "fully_paid" ? "btn-success" : "btn-outline-success"}`}
                    onClick={() => {
                      setPaymentStatusFilter("fully_paid");
                      setCurrentPage(1);
                    }}
                  >
                    Fully Paid
                  </button>
                </div>
              </div>

              {/* From Date */}
              <div className="col-6 col-lg-2 col-md-3">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  title="Filter From Date"
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
                  title="Filter To Date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Period Dropdown */}
              <div className="col-6 col-lg-2 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all_time">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_year">This Financial Year</option>
                </select>
              </div>

              {/* Payment Mode Filter */}
              <div className="col-6 col-lg-2 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={paymentModeFilter}
                  onChange={(e) => {
                    setPaymentModeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Payment Modes</option>
                  <option value="neft">NEFT / RTGS</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online / UPI</option>
                </select>
              </div>

              {/* Reset button */}
              {(searchQuery || startDate || endDate || period !== "all_time" || paymentStatusFilter !== "all" || paymentModeFilter !== "all") && (
                <div className="col-auto">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStartDate("");
                      setEndDate("");
                      setPeriod("all_time");
                      setPaymentStatusFilter("all");
                      setPaymentModeFilter("all");
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

        {/* Payment Collection Table */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="card-title mb-0">Customer Collection & Balance Register</h5>
              <span className="text-muted small">
                Showing {paginatedDeals.length} of {filteredDeals.length} filtered deals
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "80px" }}>Deal #</th>
                  <th>Customer Information</th>
                  <th>Vehicle Details</th>
                  <th className="text-end">Total Deal Amount</th>
                  <th className="text-end">Collected Amount</th>
                  <th className="text-end">Pending Balance</th>
                  <th>Status</th>
                  <th>Last Payment / Bank Reference</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading collection records...
                    </td>
                  </tr>
                ) : paginatedDeals.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="bi bi-check-circle fs-2 d-block mb-2 text-success"></i>
                      No pending payment or balance records match your filter.
                    </td>
                  </tr>
                ) : (
                  paginatedDeals.map((deal, idx) => {
                    const net = Number(deal.net_amount || deal.total_amount || 0);
                    const paid = Number(deal.paid_amount || deal.total_paid || 0);
                    const balance = Math.max(0, net - paid);
                    const hasBalance = balance > 0;
                    const payments = Array.isArray(deal.payments) ? deal.payments : [];
                    const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;

                    return (
                      <tr key={deal.id || idx}>
                        <td>
                          <span className="fw-bold font-monospace text-dark small">
                            #{deal.id || `DL-${idx + 1}`}
                          </span>
                        </td>
                        <td>
                          <div className="fw-bold text-dark small">
                            {deal.customer_name || deal.lead?.name || "Customer"}
                          </div>
                          <div className="text-muted small">
                            <i className="bi bi-telephone me-1"></i>
                            {deal.customer_phone || deal.lead?.phone || "-"}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark small">
                            {deal.brand_name || ""} {deal.model_name || "Vehicle"}
                          </div>
                          <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {deal.variant_name || "Base Variant"}
                          </span>
                        </td>
                        <td className="text-end fw-semibold text-dark">
                          ₹{net.toLocaleString("en-IN")}
                        </td>
                        <td className="text-end fw-semibold text-success">
                          ₹{paid.toLocaleString("en-IN")}
                        </td>
                        <td className="text-end">
                          {hasBalance ? (
                            <span className="badge bg-danger-subtle text-danger fs-6 fw-bold">
                              ₹{balance.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="badge bg-success-subtle text-success">
                              Nil / Cleared
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge rounded-pill px-2 py-1 ${
                              !hasBalance && paid > 0
                                ? "bg-success-subtle text-success"
                                : paid > 0
                                ? "bg-warning-subtle text-warning"
                                : "bg-danger-subtle text-danger"
                            }`}
                          >
                            {!hasBalance && paid > 0
                              ? "Fully Paid"
                              : paid > 0
                              ? "Partially Paid"
                              : "Payment Pending"}
                          </span>
                        </td>
                        <td>
                          {lastPayment ? (
                            <div>
                              <div className="small text-dark fw-semibold">
                                {lastPayment.payment_mode || "Bank Transfer"} {lastPayment.bank_name ? `• ${lastPayment.bank_name}` : ""}
                              </div>
                              <span className="text-muted font-monospace" style={{ fontSize: "0.75rem" }}>
                                {lastPayment.transaction_reference ? `Ref: ${lastPayment.transaction_reference}` : lastPayment.payment_date || ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted small">No payment recorded</span>
                          )}
                        </td>
                        <td className="text-center">
                          {hasBalance && (deal.customer_phone || deal.lead?.phone) ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                              onClick={() => handleSendWhatsAppReminder(deal)}
                              title="Send WhatsApp payment reminder to customer"
                            >
                              <i className="bi bi-whatsapp"></i>
                              <span>Remind</span>
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
          {!loading && filteredDeals.length > 0 && (
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              total={totalDeals}
              perPage={perPage}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
              perPageOptions={[10, 20, 50, 100]}
              itemName="deals"
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
