"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import dealApi from "@/services/dealApi";
import { numberToWords, formatIndianCurrency } from "@/utils/numberToWords";

export default function DealsPage() {
  const { showToast } = useToast();

  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDealForPayment, setSelectedDealForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_type: "down_payment",
    payment_mode: "neft_rtgs",
    payment_date: new Date().toISOString().split("T")[0],
    transaction_reference: "",
    bank_name: "HDFC Bank",
    notes: "Customer down payment transfer",
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // View Deal / Payments Details Modal State
  const [viewDeal, setViewDeal] = useState(null);

  // Load Deals
  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      const res = await dealApi.getDeals();
      if (res && res.data) {
        setDeals(res.data);
      }
    } catch (e) {
      console.error(e);
      showToast("Error loading deals.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();

    const handleUpdate = () => fetchDeals();
    window.addEventListener("csd_deals_updated", handleUpdate);
    return () => {
      window.removeEventListener("csd_deals_updated", handleUpdate);
    };
  }, []);

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (statusFilter !== "All" && deal.deal_status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = deal.customer_name?.toLowerCase().includes(q);
        const matchesPhone = deal.customer_phone?.toLowerCase().includes(q);
        const matchesModel = deal.model_variant?.toLowerCase().includes(q);
        const matchesVin = deal.vin_chassis_number?.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesModel || matchesVin;
      }
      return true;
    });
  }, [deals, statusFilter, searchTerm]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, d) => sum + (Number(d.net_amount) || 0), 0);
    const totalCollected = deals.reduce((sum, d) => sum + (Number(d.paid_amount) || 0), 0);
    const pendingBalance = Math.max(0, totalValue - totalCollected);
    return {
      totalDeals,
      totalValue,
      totalCollected,
      pendingBalance,
    };
  }, [deals]);

  // Open Payment Modal
  const handleOpenPayment = (deal) => {
    setSelectedDealForPayment(deal);
    setPaymentForm({
      amount: deal.balance_amount ? String(deal.balance_amount) : "",
      payment_type: "part_payment",
      payment_mode: "upi",
      payment_date: new Date().toISOString().split("T")[0],
      transaction_reference: "",
      bank_name: "",
      notes: "",
    });
    setShowPaymentModal(true);
  };

  // Submit Payment (calls api/payments)
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDealForPayment) return;

    const payAmount = parseFloat(paymentForm.amount) || 0;
    if (payAmount <= 0) {
      showToast("Please enter a valid payment amount.", "error");
      return;
    }

    setIsSubmittingPayment(true);
    const payload = {
      deal_id: selectedDealForPayment.id,
      amount: payAmount,
      payment_type: paymentForm.payment_type,
      payment_mode: paymentForm.payment_mode,
      payment_date: paymentForm.payment_date,
      transaction_reference: paymentForm.transaction_reference.trim(),
      bank_name: paymentForm.bank_name.trim(),
      notes: paymentForm.notes.trim(),
    };

    try {
      const res = await dealApi.addPayment(payload);
      showToast(res.message || `Payment of ₹${formatIndianCurrency(payAmount)} recorded successfully!`, "success");
      setIsSubmittingPayment(false);
      setShowPaymentModal(false);
      fetchDeals();
    } catch (err) {
      console.error(err);
      showToast("Failed to record payment.", "error");
      setIsSubmittingPayment(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredDeals.length === 0) {
      showToast("No deals to export.", "info");
      return;
    }

    const headers = [
      "Deal ID",
      "Customer Name",
      "Phone",
      "Model Variant",
      "Color",
      "VIN / Chassis",
      "Total Amount",
      "Discount",
      "Net Value",
      "Paid Amount",
      "Balance Pending",
      "Status",
      "Expected Delivery",
    ];

    const rows = filteredDeals.map((d) => [
      `"${d.id}"`,
      `"${d.customer_name}"`,
      `"${d.customer_phone}"`,
      `"${d.model_variant}"`,
      `"${d.color || ""}"`,
      `"${d.vin_chassis_number || ""}"`,
      d.total_amount,
      d.discount_amount,
      d.net_amount,
      d.paid_amount,
      d.balance_amount,
      `"${d.deal_status}"`,
      `"${d.expected_delivery_date || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Deals_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Deals report exported successfully!", "success");
  };

  const payAmountNum = parseFloat(paymentForm.amount) || 0;

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
                <Link href="/admin/leads">Leads Pipeline</Link>
              </li>
              <li className="breadcrumb-item active">Deals & Bookings</li>
            </ul>
            <h1 className="page-title mt-1">Vehicle Deals & Bookings</h1>
            <p className="text-muted small mb-0">
              Manage locked deals, vehicle chassis allocations, payment milestones, and delivery schedules.
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">

            <button
              className="btn btn-outline-custom d-flex align-items-center gap-2"
              onClick={handleExportCSV}
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card shadow-sm border-0">
              <div className="stat-card-header">
                <span className="stat-card-title">Active Deals</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-trophy-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{metrics.totalDeals} Deals</div>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card shadow-sm border-0">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Deal Pipeline</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-currency-rupee"></i>
                </div>
              </div>
              <div className="stat-card-value text-dark">
                ₹{formatIndianCurrency(metrics.totalValue)}
              </div>
              {/* <span className="text-muted small fw-semibold fst-italic" style={{ fontSize: "11px" }}>
                {numberToWords(metrics.totalValue)}
              </span> */}
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card shadow-sm border-0">
              <div className="stat-card-header">
                <span className="stat-card-title">Payments Collected</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-check2-circle"></i>
                </div>
              </div>
              <div className="stat-card-value text-success">
                ₹{formatIndianCurrency(metrics.totalCollected)}
              </div>
             
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card shadow-sm border-0">
              <div className="stat-card-header">
                <span className="stat-card-title">Pending Receivables</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-clock-history"></i>
                </div>
              </div>
              <div className="stat-card-value text-warning">
                ₹{formatIndianCurrency(metrics.pendingBalance)}
              </div>
              
            </div>
          </div>
        </div>

        {/* Deals Table Card */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <h5 className="card-title mb-0 fw-bold">Active Vehicle Deals</h5>
                <span className="badge bg-success-subtle text-success rounded-pill px-2">
                  {filteredDeals.length} Deals
                </span>
              </div>

              {/* Filters & Search */}
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="btn-group btn-group-sm" role="group">
                  {["All", "Booked", "Partially Paid", "Fully Paid"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`btn ${statusFilter === st ? "btn-primary" : "btn-outline-secondary"
                        }`}
                      onClick={() => setStatusFilter(st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div style={{ width: "240px" }}>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Search name, phone, VIN..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        className="btn btn-outline-secondary border-start-0"
                        type="button"
                        onClick={() => setSearchTerm("")}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom mb-0">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}># Deal</th>
                  <th>Customer</th>
                  <th>Vehicle & Spec</th>
                  <th>Deal Financials</th>
                  <th>Payment Status</th>
                  <th>Delivery Date</th>
                  <th className="text-end" style={{ width: "160px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading deals...
                    </td>
                  </tr>
                ) : filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <div className="mb-2">
                        <i className="bi bi-trophy fs-1 text-secondary opacity-50"></i>
                      </div>
                      <p className="mb-2 fw-semibold">No active deals found.</p>
                      <Link href="/admin/leads" className="btn btn-sm btn-primary">
                        <i className="bi bi-funnel-fill me-1"></i> Convert Leads from Pipeline
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => {
                    const pctPaid = Math.min(
                      100,
                      Math.round(((deal.paid_amount || 0) / (deal.net_amount || 1)) * 100)
                    );
                    return (
                      <tr key={deal.id}>
                        {/* Deal ID */}
                        <td>
                          <span className="badge bg-light text-dark border font-monospace px-2 py-1">
                            #{deal.id}
                          </span>
                        </td>

                        {/* Customer */}
                        <td>
                          <div>
                            <h6 className="mb-0 text-dark fw-bold">{deal.customer_name}</h6>
                            <div className="small text-muted">
                              <i className="bi bi-telephone me-1"></i>
                              {deal.customer_phone}
                            </div>
                          </div>
                        </td>

                        {/* Vehicle & Spec */}
                        <td>
                          <div>
                            <div className="fw-semibold text-dark">{deal.model_variant}</div>
                            <div className="small text-muted d-flex align-items-center gap-2 mt-1">
                              <span className="badge bg-light text-dark border">
                                <i className="bi bi-palette me-1"></i>
                                {deal.color || "Standard"}
                              </span>
                              {deal.vin_chassis_number && (
                                <span className="font-monospace text-secondary" style={{ fontSize: "11px" }}>
                                  VIN: {deal.vin_chassis_number}
                                </span>
                              )}
                              {deal.quotation_id && (
                                <Link
                                  href={`/admin/quotation/${deal.quotation_id}`}
                                  className="badge bg-primary-subtle text-primary border border-primary-subtle text-decoration-none"
                                  title="View Linked Quotation"
                                >
                                  <i className="bi bi-file-earmark-text me-1"></i>
                                  Quote #{deal.quotation_id}
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Deal Financials */}
                        <td>
                          <div>
                            <div className="fw-bold text-dark fs-6">
                              ₹{formatIndianCurrency(deal.net_amount)}
                            </div>
                            {deal.discount_amount > 0 && (
                              <div className="small text-success">
                                Incl. ₹{formatIndianCurrency(deal.discount_amount)} discount
                              </div>
                            )}
                            <div className="text-muted fst-italic" style={{ fontSize: "10px" }}>
                              {numberToWords(deal.net_amount)}
                            </div>
                          </div>
                        </td>

                        {/* Payment Status & Progress */}
                        <td>
                          <div style={{ minWidth: "160px" }}>
                            <div className="d-flex justify-content-between align-items-center small mb-1">
                              <span className="fw-semibold text-success">
                                Paid: ₹{formatIndianCurrency(deal.paid_amount || 0)}
                              </span>
                              <span className="fw-semibold text-danger">
                                Due: ₹{formatIndianCurrency(deal.balance_amount || 0)}
                              </span>
                            </div>
                            <div className="progress" style={{ height: "6px" }}>
                              <div
                                className={`progress-bar ${pctPaid === 100 ? "bg-success" : "bg-warning"
                                  }`}
                                role="progressbar"
                                style={{ width: `${pctPaid}%` }}
                                aria-valuenow={pctPaid}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-1">
                              <span
                                className={`badge ${deal.deal_status === "Fully Paid"
                                    ? "bg-success-subtle text-success"
                                    : "bg-warning-subtle text-warning"
                                  } px-2`}
                                style={{ fontSize: "10px" }}
                              >
                                {deal.deal_status}
                              </span>
                              <span className="text-muted" style={{ fontSize: "10px" }}>
                                {pctPaid}% Collected
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Delivery Date */}
                        <td>
                          <span className="small text-dark fw-semibold">
                            <i className="bi bi-calendar-event text-primary me-1"></i>
                            {deal.expected_delivery_date
                              ? new Date(deal.expected_delivery_date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                              : "Pending"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-end">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            {deal.balance_amount > 0 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 py-1 px-2"
                                title="Record New Payment"
                                onClick={() => handleOpenPayment(deal)}
                              >
                                <i className="bi bi-cash-stack"></i>
                                <span>Pay</span>
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 py-1 px-2"
                              title="View Deal Voucher & History"
                              onClick={() => setViewDeal(deal)}
                            >
                              <i className="bi bi-receipt"></i>
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
        </div>

        {/* ===================================================================
            MODAL 1: RECORD PAYMENT
            =================================================================== */}
        {showPaymentModal && selectedDealForPayment && (
          <div className="modal-backdrop-custom" onClick={() => setShowPaymentModal(false)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "600px" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      backgroundColor: "#15803D",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i className="bi bi-cash-stack"></i>
                  </div>
                  <div>
                    <h5 className="modal-title-custom text-white mb-0 fw-bold">
                      Record Deal Payment
                    </h5>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowPaymentModal(false)}
                ></button>
              </div>

              <form onSubmit={handlePaymentSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Deal Header Banner */}
                  <div className="p-3 mb-3 bg-light rounded border d-flex justify-content-between align-items-center">
                    <div>
                      <span className="small text-muted text-uppercase fw-bold">Deal Customer</span>
                      <h6 className="mb-0 text-dark fw-bold">{selectedDealForPayment.customer_name}</h6>
                      <div className="small text-muted">{selectedDealForPayment.model_variant}</div>
                    </div>
                    <div className="text-end">
                      <span className="small text-muted text-uppercase fw-bold">Balance Due</span>
                      <h6 className="mb-0 text-danger fw-bold">
                        ₹{formatIndianCurrency(selectedDealForPayment.balance_amount)}
                      </h6>
                      <span className="badge bg-warning-subtle text-warning">
                        {selectedDealForPayment.deal_status}
                      </span>
                    </div>
                  </div>

                  <div className="row g-3">
                    {/* Amount */}
                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Payment Amount (₹) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light fw-bold">₹</span>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          max={selectedDealForPayment.balance_amount || undefined}
                          className="form-control fw-bold fs-5"
                          placeholder="e.g. 350000"
                          required
                          value={paymentForm.amount}
                          onChange={(e) =>
                            setPaymentForm({ ...paymentForm, amount: e.target.value })
                          }
                          autoFocus
                        />
                      </div>

                      {/* Dynamic Formatted Comma & Text in Words */}
                      {payAmountNum > 0 && (
                        <div className="mt-2 p-2 bg-light-subtle border rounded small">
                          <div className="text-dark fw-bold">
                            Formatted: ₹{formatIndianCurrency(payAmountNum)}
                          </div>
                          <div className="text-success fw-semibold fst-italic" style={{ fontSize: "11px" }}>
                            ✍️ In Words: {numberToWords(payAmountNum)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payment Type */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Payment Type
                      </label>
                      <select
                        className="form-select"
                        value={paymentForm.payment_type}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, payment_type: e.target.value })
                        }
                      >
                        <option value="down_payment">Down Payment</option>
                        <option value="token_advance">Token Advance</option>
                        <option value="part_payment">Part Payment</option>
                        <option value="final_payment">Final Settlement</option>
                      </select>
                    </div>

                    {/* Payment Mode */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Payment Mode
                      </label>
                      <select
                        className="form-select"
                        value={paymentForm.payment_mode}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, payment_mode: e.target.value })
                        }
                      >
                        <option value="neft_rtgs">NEFT / RTGS</option>
                        <option value="upi">UPI / QR Code</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque / Demand Draft</option>
                        <option value="card">Debit / Credit Card</option>
                      </select>
                    </div>

                    {/* Payment Date */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Payment Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={paymentForm.payment_date}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, payment_date: e.target.value })
                        }
                      />
                    </div>

                    {/* Conditional: If Cash, hide Transaction Reference, Bank Name and Notes */}
                    {paymentForm.payment_mode === "cash" ? (
                      <div className="col-12">
                        <div className="p-2 px-3 bg-light border border-success-subtle rounded d-flex align-items-center gap-2 text-success small">
                          <i className="bi bi-cash-stack fs-5 text-success"></i>
                          <div>
                            <strong>Cash Payment Mode:</strong> Transaction Reference, Bank Name aur Remarks cash ke liye required nahi hain. Cash counter par directly collect kiya jayega.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Transaction Reference */}
                        <div className="col-md-6">
                          <label className="form-label text-dark fw-bold small mb-1">
                            Transaction Reference / UTR
                          </label>
                          <input
                            type="text"
                            className="form-control font-monospace"
                            placeholder="e.g. UPI/98127391823/HDFC"
                            value={paymentForm.transaction_reference}
                            onChange={(e) =>
                              setPaymentForm({
                                ...paymentForm,
                                transaction_reference: e.target.value,
                              })
                            }
                          />
                        </div>

                        {/* Bank Name */}
                        <div className="col-md-6">
                          <label className="form-label text-dark fw-bold small mb-1">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. HDFC Bank, SBI"
                            value={paymentForm.bank_name}
                            onChange={(e) =>
                              setPaymentForm({ ...paymentForm, bank_name: e.target.value })
                            }
                          />
                        </div>

                        {/* Notes */}
                        <div className="col-12">
                          <label className="form-label text-dark fw-bold small mb-1">
                            Payment Notes / Remarks
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Customer payment transfer"
                            value={paymentForm.notes}
                            onChange={(e) =>
                              setPaymentForm({ ...paymentForm, notes: e.target.value })
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setShowPaymentModal(false)}
                    disabled={isSubmittingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success d-inline-flex align-items-center gap-1"
                    disabled={isSubmittingPayment}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmittingPayment ? "Recording..." : "Record Payment"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODAL 2: VIEW DEAL VOUCHER & PAYMENT HISTORY
            =================================================================== */}
        {viewDeal && (
          <div className="modal-backdrop-custom" onClick={() => setViewDeal(null)}>
            <div
              className="modal-dialog-custom modal-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-receipt text-info fs-5"></i>
                  <h5 className="modal-title-custom text-white mb-0 fw-bold">
                    Deal Order Voucher & Ledger
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setViewDeal(null)}
                ></button>
              </div>

              <div className="modal-body-custom py-3">
                {/* Summary Banner */}
                <div className="p-3 mb-3 bg-light rounded border d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div>
                    <span className="small text-muted text-uppercase fw-bold">Customer</span>
                    <h5 className="mb-0 text-dark fw-bold">{viewDeal.customer_name}</h5>
                    <div className="small text-muted">{viewDeal.customer_phone} • {viewDeal.customer_email || "N/A"}</div>
                  </div>
                  <div>
                    <span className="small text-muted text-uppercase fw-bold">Vehicle Specification</span>
                    <div className="fw-bold text-primary">{viewDeal.model_variant}</div>
                    <div className="small text-muted">
                      Color: {viewDeal.color || "Standard"} • VIN: {viewDeal.vin_chassis_number || "Pending"}
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="small text-muted text-uppercase fw-bold">Deal Value</span>
                    <h5 className="mb-0 text-dark fw-bold">₹{formatIndianCurrency(viewDeal.net_amount)}</h5>
                    <div className="small text-muted fst-italic" style={{ fontSize: "11px" }}>
                      {numberToWords(viewDeal.net_amount)}
                    </div>
                  </div>
                </div>

                {/* Financial Ledger Breakdown */}
                <div className="row g-2 mb-3 text-center">
                  <div className="col-4">
                    <div className="p-2 border rounded bg-white">
                      <span className="small text-muted">Total Net Amount</span>
                      <div className="fw-bold text-dark fs-6">
                        ₹{formatIndianCurrency(viewDeal.net_amount)}
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 border rounded bg-success-subtle">
                      <span className="small text-muted">Total Received</span>
                      <div className="fw-bold text-success fs-6">
                        ₹{formatIndianCurrency(viewDeal.paid_amount || 0)}
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 border rounded bg-danger-subtle">
                      <span className="small text-muted">Balance Due</span>
                      <div className="fw-bold text-danger fs-6">
                        ₹{formatIndianCurrency(viewDeal.balance_amount || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment History Table */}
                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-1 border-bottom pb-1">
                  <i className="bi bi-clock-history text-primary"></i> Payment Receipts Ledger
                </h6>

                {(!viewDeal.payments || viewDeal.payments.length === 0) ? (
                  <p className="text-muted small py-2">No payment transactions recorded yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light small">
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Mode</th>
                          <th>Reference / UTR</th>
                          <th>Bank</th>
                          <th className="text-end">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="small">
                        {viewDeal.payments.map((p, idx) => (
                          <tr key={p.id || idx}>
                            <td>{p.payment_date || new Date().toISOString().split("T")[0]}</td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                {p.payment_type?.replace(/_/g, " ").toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-info-subtle text-info">
                                {p.payment_mode?.toUpperCase()}
                              </span>
                            </td>
                            <td className="font-monospace">{p.transaction_reference || "-"}</td>
                            <td>{p.bank_name || "-"}</td>
                            <td className="text-end fw-bold text-success">
                              ₹{formatIndianCurrency(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer-custom d-flex justify-content-between align-items-center pt-3">
                <button
                  type="button"
                  className="btn btn-outline-custom"
                  onClick={() => setViewDeal(null)}
                >
                  Close
                </button>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    onClick={() => window.print()}
                  >
                    <i className="bi bi-printer"></i>
                    <span>Print Deal Receipt</span>
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
