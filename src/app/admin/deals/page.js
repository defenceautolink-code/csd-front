"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import dealApi from "@/services/dealApi";
import { numberToWords, formatIndianCurrency } from "@/utils/numberToWords";
import Pagination from "@/components/common/Pagination";

// Helper to generate Invoice Number in exact required format: DAL-/YYYY/MM/XXXX
export const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `DAL-/${year}/${month}/${random4}`;
};

export default function DealsPage() {
  const { showToast } = useToast();

  const [deals, setDeals] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const currentPage = pagination.current_page || 1;
  const perPage = pagination.per_page || 10;

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  // Live Database KPI Metrics
  const [metrics, setMetrics] = useState({
    totalDeals: 0,
    totalValue: 0,
    totalCollected: 0,
    pendingBalance: 0,
  });

  // Payment / Add Bill Modal State (Exact same as Invoice Page)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDealForPayment, setSelectedDealForPayment] = useState(null);
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formInvoiceDate, setFormInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formPaymentType, setFormPaymentType] = useState("Down Payment");
  const [formPaymentMode, setFormPaymentMode] = useState("UPI / GPay");
  const [formAmountPaid, setFormAmountPaid] = useState("0");
  const [formReceivedBy, setFormReceivedBy] = useState("");
  const [formTransactionRef, setFormTransactionRef] = useState("");
  const [formBankName, setFormBankName] = useState("HDFC Bank");
  const [formRemarks, setFormRemarks] = useState("");
  const [formLineItems, setFormLineItems] = useState([]);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [selectedInvoiceForSingleView, setSelectedInvoiceForSingleView] = useState(null);

  // Update Deal Modal State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedDealForUpdate, setSelectedDealForUpdate] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    deal_status: "booking_confirmed",
    color: "",
    vin_chassis_number: "",
    engine_number: "",
    registration_number: "",
    expected_delivery_date: "",
    actual_delivery_date: "",
    notes: "",
  });
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Delete Deal Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getTodayDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // View Deal / Ledger Modal State
  const [viewDeal, setViewDeal] = useState(null);
  const [isVerifyingPaymentId, setIsVerifyingPaymentId] = useState(null);

  // Close 3-dots action menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveActionMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Fetch Live KPI Metrics from Backend Analytics API
  const fetchMetrics = async (from = startDate, to = endDate) => {
    try {
      const params = {};
      if (from) params.start_date = from;
      if (to) params.end_date = to;
      const statsRes = await dealApi.getDealStats(params);
      if (statsRes && statsRes.status && statsRes.data) {
        const s = statsRes.data;
        setMetrics({
          totalDeals: Number(s.total_deals) || 0,
          totalValue: Number(s.total_gross_value) || 0,
          totalCollected: Number(s.total_collected) || 0,
          pendingBalance: Number(s.total_pending_balance) || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching deal metrics:", err);
    }
  };

  // Fetch Deals with Server-Side Pagination & Filtering
  const fetchDeals = async (
    page = 1,
    search = searchTerm,
    stage = stageFilter,
    from = startDate,
    to = endDate,
    customPerPage = pagination.per_page || 10
  ) => {
    setIsLoading(true);
    try {
      const params = {
        page,
        per_page: customPerPage,
      };

      if (search && search.trim()) {
        params.search = search.trim();
      }

      if (stage && stage !== "All") {
        params.deal_status = stage;
      }

      if (from) {
        params.from_date = from;
      }

      if (to) {
        params.to_date = to;
      }

      const res = await dealApi.getDeals(params);
      if (res && res.status && Array.isArray(res.data)) {
        let list = res.data;

        // Apply payment status client filter if requested
        if (paymentFilter !== "All") {
          list = list.filter((d) => d.payment_status === paymentFilter);
        }

        setDeals(list);

        if (res.pagination) {
          setPagination({
            current_page: Number(res.pagination.current_page) || page,
            last_page: Number(res.pagination.last_page) || 1,
            per_page: Number(res.pagination.per_page) || customPerPage,
            total: Number(res.pagination.total) || list.length,
          });
        }
      }
    } catch (e) {
      console.error("Error loading deals:", e);
      showToast("Error loading deals from server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced auto-fetch on search or filter change
  useEffect(() => {
    fetchMetrics(startDate, endDate);
    const timer = setTimeout(() => {
      fetchDeals(1, searchTerm, stageFilter, startDate, endDate, pagination.per_page);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, stageFilter, paymentFilter, startDate, endDate]);

  // Listener for deal events
  useEffect(() => {
    const handleUpdate = () => {
      fetchMetrics();
      fetchDeals(pagination.current_page, searchTerm, stageFilter, startDate, endDate, pagination.per_page);
    };

    window.addEventListener("csd_deals_updated", handleUpdate);
    return () => {
      window.removeEventListener("csd_deals_updated", handleUpdate);
    };
  }, [pagination.current_page, searchTerm, stageFilter, startDate, endDate, pagination.per_page]);

  // Open Add Bill / Payment Modal
  const handleOpenPayment = (deal) => {
    let currentUserName = "";
    if (typeof window !== "undefined") {
      try {
        const userObj = JSON.parse(localStorage.getItem("user") || "{}");
        currentUserName = userObj?.name || "";
      } catch (e) {}
    }

    const netVal = Number(deal.net_amount || deal.total_amount || 0);
    const totalPaid = Number(deal.paid_amount ?? deal.total_paid ?? 0);
    const remaining = Math.max(0, netVal - totalPaid);

    // Pick appropriate default payment type
    const invoicesCount = Array.isArray(deal.payments) ? deal.payments.length : 0;
    let defaultType = "Down Payment";
    if (invoicesCount === 0) {
      defaultType = "Token Advance";
    } else if (remaining > 0) {
      defaultType = "Part Payment";
    } else {
      defaultType = "Down Payment";
    }

    setSelectedDealForPayment(deal);
    setFormInvoiceNo(generateInvoiceNumber());
    setFormInvoiceDate(new Date().toISOString().split("T")[0]);
    setFormPaymentType(defaultType);
    setFormPaymentMode("UPI / GPay");
    setFormAmountPaid(String(remaining));
    setFormReceivedBy(currentUserName || "Accounts");
    setFormTransactionRef("");
    setFormBankName("HDFC Bank");
    setFormRemarks(`${defaultType} payment for Deal ${deal.deal_number} - Customer: ${deal.customer_name}`);
    setFormLineItems([
      {
        desc: `${defaultType} for ${deal.model_variant || "Vehicle"} (${deal.deal_number})`,
        hsn: "998313",
        qty: 1,
        rate: String(remaining),
        amount: String(remaining),
      },
    ]);
    setShowPaymentModal(true);
  };

  // Line item helpers
  const handleAddLineItem = () => {
    setFormLineItems((prev) => [
      ...prev,
      { desc: "", hsn: "998313", qty: 1, rate: "", amount: "" },
    ]);
  };

  const handleRemoveLineItem = (index) => {
    if (formLineItems.length <= 1) return;
    setFormLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...formLineItems];
    updated[index][field] = value;
    if (field === "qty" || field === "rate") {
      const q = Number(updated[index].qty) || 0;
      const r = Number(updated[index].rate) || 0;
      updated[index].amount = q * r;
    }
    setFormLineItems(updated);

    const totalFromItems = updated.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    if (totalFromItems > 0) {
      setFormAmountPaid(String(totalFromItems));
    }
  };

  // Submit Payment & Save Invoice
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDealForPayment) return;

    const amountNum = Number(formAmountPaid) || 0;
    if (amountNum <= 0) {
      showToast("Please enter a valid amount paid for this invoice.", "error");
      return;
    }

    const isCashMode = formPaymentMode === "Cash" || formPaymentMode.toLowerCase().includes("cash");

    if (!formReceivedBy || !formReceivedBy.trim()) {
      showToast("Please enter the Received By person name.", "warning");
      return;
    }

    if (!isCashMode && !formTransactionRef.trim()) {
      showToast("Please enter the UTR / Transaction Reference number.", "warning");
      return;
    }

    setIsSubmittingPayment(true);
    const finalInvoiceNo = formInvoiceNo || generateInvoiceNumber();

    // Map payment mode into standard slug
    let modeSlug = "upi";
    const lowerMode = formPaymentMode.toLowerCase();
    if (lowerMode.includes("cash")) modeSlug = "cash";
    else if (lowerMode.includes("cheque")) modeSlug = "cheque";
    else if (lowerMode.includes("neft") || lowerMode.includes("rtgs")) modeSlug = "neft_rtgs";
    else modeSlug = "upi";

    // Map payment type into standard slug
    let typeSlug = "part_payment";
    const lowerTitle = formPaymentType.toLowerCase();
    if (lowerTitle.includes("token") || lowerTitle.includes("advance")) typeSlug = "token_advance";
    else if (lowerTitle.includes("down") || lowerTitle.includes("margin")) typeSlug = "down_payment";
    else typeSlug = "part_payment";

    const payload = {
      deal_id: Number(selectedDealForPayment.id),
      amount: amountNum,
      payment_type: typeSlug,
      payment_mode: modeSlug,
      payment_date: formInvoiceDate,
      transaction_reference: isCashMode ? "CASH-RECEIPT" : (formTransactionRef || "UTR-VERIFIED"),
      bank_name: isCashMode ? "Cash Counter" : formBankName,
      received_by: formReceivedBy.trim(),
      notes: `${formPaymentType} • ${formRemarks || 'Recorded via Deals Module'}`,
      invoice_no: finalInvoiceNo,
    };

    try {
      const res = await dealApi.addPayment(payload);
      showToast(res.message || `Invoice ${finalInvoiceNo} created and linked to Deal #${selectedDealForPayment.deal_number}!`, "success");
      setShowPaymentModal(false);

      // Render instant preview voucher
      const d = selectedDealForPayment;
      setSelectedInvoiceForSingleView({
        invoiceNo: finalInvoiceNo,
        date: formInvoiceDate,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        dealNumber: d.deal_number,
        customerName: d.customer_name,
        mobile: d.customer_phone,
        email: d.customer_email,
        city: d.customer_city,
        vehicle: d.model_variant,
        color: d.color,
        vin: d.vin_chassis_number,
        regNo: d.registration_number,
        installmentTitle: formPaymentType,
        paymentMode: formPaymentMode,
        transactionRef: isCashMode ? "CASH-RECEIPT" : (formTransactionRef || "UTR-VERIFIED"),
        bankName: isCashMode ? "Cash Counter" : formBankName,
        receivedBy: formReceivedBy.trim(),
        amountPaid: amountNum,
        totalDealAmount: d.net_amount || d.total_amount,
        items: formLineItems.map((item) => ({
          desc: item.desc || formPaymentType,
          hsn: item.hsn || "998313",
          qty: Number(item.qty) || 1,
          rate: Number(item.rate) || amountNum,
          amount: Number(item.amount) || amountNum,
        })),
        remarks: formRemarks,
        status: "Paid",
        parentDeal: d,
      });

      fetchMetrics();
      fetchDeals(pagination.current_page, searchTerm, stageFilter, startDate, endDate, pagination.per_page);
    } catch (err) {
      console.error("Payment error:", err);
      showToast(err.response?.data?.message || "Failed to record payment.", "error");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Update Deal Modal
  const handleOpenUpdateDeal = (deal) => {
    setSelectedDealForUpdate(deal);
    setUpdateForm({
      deal_status: deal.raw_status || deal.deal_status || "booking_confirmed",
      color: deal.color || "",
      vin_chassis_number: deal.vin_chassis_number || "",
      engine_number: deal.engine_number || "",
      registration_number: deal.registration_number || "",
      expected_delivery_date: deal.expected_delivery_date ? deal.expected_delivery_date.split("T")[0] : "",
      actual_delivery_date: deal.actual_delivery_date ? deal.actual_delivery_date.split("T")[0] : "",
      notes: deal.notes || "",
    });
    setShowUpdateModal(true);
  };

  // Submit Deal Update
  const handleUpdateDealSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDealForUpdate) return;

    setIsSubmittingUpdate(true);
    try {
      const res = await dealApi.updateDeal(selectedDealForUpdate.id, updateForm);
      showToast(res.message || "Deal details and delivery stage updated!", "success");
      setShowUpdateModal(false);
      fetchMetrics();
      fetchDeals(pagination.current_page, searchTerm, stageFilter, startDate, endDate, pagination.per_page);
    } catch (err) {
      console.error("Update deal error:", err);
      showToast(err.response?.data?.message || "Failed to update deal details.", "error");
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Delete Deal
  const handleDeleteDeal = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await dealApi.deleteDeal(deleteTarget.id);
      showToast(res.message || "Deal deleted successfully!", "success");
      setDeleteTarget(null);
      fetchMetrics();
      fetchDeals(pagination.current_page, searchTerm, stageFilter, startDate, endDate, pagination.per_page);
    } catch (err) {
      console.error("Delete deal error:", err);
      showToast(err.response?.data?.message || "Failed to delete deal.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Verify / Clear Payment in Ledger Modal
  const handleVerifyPayment = async (paymentId) => {
    setIsVerifyingPaymentId(paymentId);
    try {
      const res = await dealApi.verifyPayment(paymentId, "clear");
      showToast(res.message || "Payment verified and cleared successfully!", "success");

      // Update in viewDeal modal
      if (viewDeal && viewDeal.payments) {
        const updatedPayments = viewDeal.payments.map((p) =>
          p.id === paymentId ? { ...p, status: "cleared" } : p
        );
        setViewDeal({ ...viewDeal, payments: updatedPayments });
      }

      fetchMetrics();
      fetchDeals(pagination.current_page, searchTerm, stageFilter, startDate, endDate, pagination.per_page);
    } catch (err) {
      console.error("Verify payment error:", err);
      showToast(err.response?.data?.message || "Failed to verify payment.", "error");
    } finally {
      setIsVerifyingPaymentId(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (deals.length === 0) {
      showToast("No deals available to export.", "info");
      return;
    }

    const headers = [
      "Deal ID",
      "Deal Number",
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
      "Deal Stage",
      "Payment Status",
      "Expected Delivery",
    ];

    const rows = deals.map((d) => [
      `"${d.id}"`,
      `"${d.deal_number}"`,
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
      `"${d.payment_status}"`,
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

  const getStageBadgeClass = (stage) => {
    const s = String(stage || "").toLowerCase();
    if (s.includes("delivered")) return "bg-success text-white";
    if (s.includes("ready")) return "bg-primary text-white";
    if (s.includes("transit")) return "bg-info text-dark";
    if (s.includes("cancel")) return "bg-danger text-white";
    return "bg-secondary text-white";
  };

  const payAmountNum = parseFloat(formAmountPaid) || 0;

  return (
    <AdminLayout>
      {/* =========================================================================
          PRINT-ONLY STYLESHEET: Clean Official Deal Voucher Receipt Format
          ========================================================================= */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-deal-ledger,
          #printable-deal-ledger * {
            visibility: visible !important;
          }
          #printable-deal-ledger {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
            color: #0f172a !important;
          }
          .modal-backdrop-custom {
            background: transparent !important;
            position: static !important;
            padding: 0 !important;
          }
          .modal-dialog-custom {
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .modal-header-custom,
          .modal-footer-custom,
          .btn-close,
          .no-print {
            display: none !important;
          }
          .print-only-block {
            display: block !important;
          }
          .print-only-flex {
            display: flex !important;
          }
        }
      `}</style>

      <div className="page-body">
        {/* Page Breadcrumbs & Header Actions */}
        <div className="page-header-wrapper mb-3 no-print">
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
            <h1 className="page-title mt-1 fs-3 fw-bold text-dark">Vehicle Deals & Bookings</h1>
            <p className="text-secondary small mb-0">
              Manage locked deals, vehicle chassis allocations, payment milestones, and delivery schedules.
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <Link href="/admin/leads" className="btn btn-outline-primary d-flex align-items-center gap-1">
              <i className="bi bi-funnel-fill"></i>
              <span>Convert Lead</span>
            </Link>
            <button
              className="btn btn-outline-custom d-flex align-items-center gap-2"
              onClick={handleExportCSV}
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards (Powered by Backend Analytics API) */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card shadow-sm border-0">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Active Deals</span>
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
              <div className="stat-card-value text-danger">
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
                  {pagination.total || deals.length} Records
                </span>
              </div>

              {/* Filters & Search */}
              <div className="d-flex flex-wrap align-items-center gap-2 ms-auto">
                {/* Stage Filter */}
                <div className="input-group input-group-sm" style={{ width: "165px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="Delivery Stage">
                    <i className="bi bi-truck me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>Stage</span>
                  </span>
                  <select
                    className="form-select form-select-sm px-1"
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                  >
                    <option value="All">All Stages</option>
                    <option value="booking_confirmed">Booked</option>
                    <option value="in_transit">In Transit</option>
                    <option value="ready_for_delivery">Ready for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Payment Status Filter */}
                <div className="input-group input-group-sm" style={{ width: "160px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="Payment Status">
                    <i className="bi bi-credit-card me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>Payment</span>
                  </span>
                  <select
                    className="form-select form-select-sm px-1"
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                  >
                    <option value="All">All Payments</option>
                    <option value="Fully Paid">Fully Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                {/* Booking Date From */}
                <div className="input-group input-group-sm" style={{ width: "155px" }}>
                  <span className="input-group-text bg-light text-muted px-2">
                    <i className="bi bi-calendar-event me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>From</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* Booking Date To */}
                <div className="input-group input-group-sm" style={{ width: "150px" }}>
                  <span className="input-group-text bg-light text-muted px-2">
                    <i className="bi bi-calendar-check me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>To</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                {/* Clear Filters Button */}
                {(startDate || endDate || stageFilter !== "All" || paymentFilter !== "All" || searchTerm) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-2 d-flex align-items-center gap-1"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setStageFilter("All");
                      setPaymentFilter("All");
                      setSearchTerm("");
                    }}
                    title="Clear Filters"
                  >
                    <i className="bi bi-x-circle"></i>
                    <span>Reset</span>
                  </button>
                )}

                {/* Search */}
                <div style={{ width: "200px" }}>
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
            <table className="table table-custom align-middle mb-0">
              <thead className="border-bottom border-secondary border-opacity-25 text-secondary small text-uppercase">
                <tr>
                  <th style={{ width: "50px" }} className="text-center">No</th>
                  <th style={{ width: "70px" }} className="text-center">Action</th>
                  <th style={{ width: "100px" }}>Deal No</th>
                  <th>Customer</th>
                  <th>Vehicle & Spec</th>
                  <th>Deal Financials</th>
                  <th>Payment Status</th>
                  <th>Delivery Stage</th>
                  <th>Delivery Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading deals from database...
                    </td>
                  </tr>
                ) : deals.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <div className="mb-2">
                        <i className="bi bi-trophy fs-1 text-secondary opacity-50"></i>
                      </div>
                      <p className="mb-2 fw-semibold">No active deals found matching your criteria.</p>
                      <Link href="/admin/leads" className="btn btn-sm btn-primary">
                        <i className="bi bi-funnel-fill me-1"></i> Convert Leads from Pipeline
                      </Link>
                    </td>
                  </tr>
                ) : (
                  deals.map((deal, index) => {
                    const pctPaid = Math.min(
                      100,
                      Math.round(((deal.paid_amount || 0) / (deal.net_amount || 1)) * 100)
                    );
                    return (
                      <tr key={deal.id}>
                        <td className="text-center">
                          <span className="text-muted small fw-semibold">
                            {(currentPage - 1) * perPage + index + 1}
                          </span>
                        </td>
                        {/* 1. Action First Column with 3-Dots Menu */}
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="dropdown position-relative d-inline-block">
                            <button
                              type="button"
                              className="btn btn-sm btn-light border rounded-circle shadow-none p-0 d-inline-flex align-items-center justify-content-center"
                              style={{ width: "32px", height: "32px", cursor: "pointer" }}
                              title="Actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === deal.id ? null : deal.id);
                              }}
                            >
                              <i className="bi bi-three-dots-vertical fs-6 text-dark"></i>
                            </button>

                              {activeActionMenuId === deal.id && (
                                <div
                                  className="dropdown-menu show shadow-lg border rounded-3 p-1 position-absolute start-0 text-start"
                                  style={{
                                    minWidth: "210px",
                                    zIndex: 1050,
                                    top: "100%",
                                    backgroundColor: "#FFFFFF",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Add Bill */}
                                  {deal.balance_amount > 0 && (
                                    <button
                                      type="button"
                                      className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2 fw-semibold text-success"
                                      style={{ backgroundColor: "rgba(21, 128, 61, 0.08)" }}
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleOpenPayment(deal);
                                      }}
                                    >
                                      <i className="bi bi-plus-circle text-success"></i>
                                      <span>Add Bill</span>
                                    </button>
                                  )}

                                {/* Update Deal & Stage */}
                                <button
                                  type="button"
                                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-dark"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    handleOpenUpdateDeal(deal);
                                  }}
                                >
                                  <i className="bi bi-pencil-square text-warning"></i>
                                  <span>Update Deal & Stage</span>
                                </button>

                                {/* View Voucher & History */}
                                <button
                                  type="button"
                                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-dark"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setViewDeal(deal);
                                  }}
                                >
                                  <i className="bi bi-receipt text-primary"></i>
                                  <span>View Voucher & Ledger</span>
                                </button>

                                {/* Linked Quotation */}
                                {deal.quotation_id && (
                                  <Link
                                    href={`/admin/quotation/${deal.quotation_id}`}
                                    className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-dark text-decoration-none"
                                    onClick={() => setActiveActionMenuId(null)}
                                  >
                                    <i className="bi bi-file-earmark-text text-info"></i>
                                    <span>View Quotation #{deal.quotation_id}</span>
                                  </Link>
                                )}

                                <div className="dropdown-divider my-1"></div>

                                {/* Delete Deal */}
                                <button
                                  type="button"
                                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-danger"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setDeleteTarget(deal);
                                  }}
                                >
                                  <i className="bi bi-trash-fill text-danger"></i>
                                  <span>Delete Deal</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. Deal ID */}
                        <td>
                          <span className="badge bg-light text-primary border font-monospace px-2 py-1">
                            {deal.deal_number || `#${deal.id}`}
                          </span>
                        </td>

                        {/* 3. Customer */}
                        <td>
                          <div>
                            <h6 className="mb-0 text-dark fw-bold">{deal.customer_name}</h6>
                            <div className="small text-muted">
                              <i className="bi bi-telephone me-1"></i>
                              {deal.customer_phone || "-"}
                            </div>
                            {deal.customer_city && (
                              <div className="small text-secondary" style={{ fontSize: "11px" }}>
                                <i className="bi bi-geo-alt me-1"></i>{deal.customer_city}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 4. Vehicle & Spec */}
                        <td>
                          <div>
                            <div className="fw-semibold text-dark">{deal.model_variant}</div>
                            <div className="small text-muted d-flex align-items-center gap-2 mt-1 flex-wrap">
                              <span className="badge bg-light text-dark border">
                                <i className="bi bi-palette me-1"></i>
                                {deal.color || "Standard"}
                              </span>
                              {deal.vin_chassis_number && (
                                <span className="badge bg-light text-secondary border font-monospace" title="VIN/Chassis">
                                  {deal.vin_chassis_number}
                                </span>
                              )}
                              {deal.has_insurance === "Yes" ? (
                                <span className="badge bg-success-subtle text-success border border-success-subtle" title="Insurance Included">
                                  <i className="bi bi-shield-check me-1"></i>Insurance: Yes
                                </span>
                              ) : (
                                <span className="badge bg-light text-muted border" title="Insurance Not Included">
                                  Insurance: No
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 5. Deal Financials */}
                        <td>
                          <div>
                            <div className="fw-bold text-dark fs-6">
                              ₹{formatIndianCurrency(deal.net_amount)}
                            </div>
                            {deal.discount_amount > 0 && (
                              <div className="small text-success" style={{ fontSize: "11px" }}>
                                Incl. ₹{formatIndianCurrency(deal.discount_amount)} disc.
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 6. Payment Status & Progress */}
                        <td>
                          <div style={{ maxWidth: "170px" }}>
                            <div className="d-flex justify-content-between align-items-center small mb-1">
                              <span className="fw-semibold text-success" style={{ fontSize: "11px" }}>
                                Paid: ₹{formatIndianCurrency(deal.paid_amount || 0)}
                              </span>
                              <span className="fw-semibold text-danger" style={{ fontSize: "11px" }}>
                                Due: ₹{formatIndianCurrency(deal.balance_amount || 0)}
                              </span>
                            </div>
                            <div className="progress" style={{ height: "5px" }}>
                              <div
                                className={`progress-bar ${pctPaid === 100 ? "bg-success" : "bg-warning"}`}
                                role="progressbar"
                                style={{ width: `${pctPaid}%` }}
                                aria-valuenow={pctPaid}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-1">
                              <span
                                className={`badge ${
                                  deal.payment_status === "Fully Paid"
                                    ? "bg-success text-white"
                                    : "bg-warning text-dark"
                                } px-2 py-0.5`}
                                style={{ fontSize: "10px" }}
                              >
                                {deal.payment_status}
                              </span>
                              <span className="text-muted" style={{ fontSize: "10px" }}>
                                {pctPaid}%
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 7. Delivery Stage */}
                        <td>
                          <span className={`badge text-capitalize px-2 py-1 ${getStageBadgeClass(deal.deal_status)}`}>
                            {deal.deal_status?.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* 8. Delivery Date */}
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Controls */}
          {!isLoading && pagination.total > 0 && (
            <Pagination
              currentPage={pagination.current_page || 1}
              lastPage={pagination.last_page || 1}
              total={pagination.total || deals.length}
              perPage={pagination.per_page || 10}
              onPageChange={(page) => fetchDeals(page, searchTerm, stageFilter, startDate, endDate, pagination.per_page)}
              onPerPageChange={(newPerPage) => {
                setPagination((prev) => ({ ...prev, per_page: newPerPage }));
                fetchDeals(1, searchTerm, stageFilter, startDate, endDate, newPerPage);
              }}
              perPageOptions={[10, 20, 50, 100]}
              itemName="deals"
            />
          )}
        </div>

        {/* ===================================================================
            MODAL 1: GENERATE TAX INVOICE & RECORD PAYMENT (ADD BILL)
            =================================================================== */}
        {showPaymentModal && selectedDealForPayment && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(19, 28, 39, 0.65)", zIndex: 1050 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <form
                onSubmit={handlePaymentSubmit}
                className="modal-content border-0 shadow-lg"
                style={{ borderRadius: "14px", overflow: "hidden" }}
              >
                {/* Header */}
                <div
                  className="modal-header px-4 py-3"
                  style={{
                    backgroundColor: "#131C27",
                    color: "#DCE9A2",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-receipt fs-4 text-warning"></i>
                    <div>
                      <h5 className="modal-title fw-bold text-white mb-0">
                        Generate Tax Invoice & Record Payment
                      </h5>
                      <span className="small" style={{ color: "#DCE9A2" }}>
                        Links directly to Vehicle Deals & Bookings Database
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowPaymentModal(false)}
                  ></button>
                </div>

                {/* Body */}
                <div className="modal-body px-4 py-3">
                  {/* Deal Selector (Locked for this deal) */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="form-label fw-bold text-dark small mb-0">
                        Select Vehicle Deal <span className="text-danger">*</span>
                      </label>
                      <span className="badge bg-secondary-subtle text-secondary small fw-normal">
                        <i className="bi bi-lock-fill me-1"></i>Deal Locked
                      </span>
                    </div>
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-lock-fill text-muted"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control bg-light text-muted"
                        value={`${selectedDealForPayment.customer_name} (${selectedDealForPayment.deal_number})`}
                        disabled
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Top Bar: Invoice Number & Date */}
                  <div className="row g-2 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small mb-1 fw-bold text-dark">
                        Invoice Number (DAL-/)
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm font-monospace fw-bold bg-light"
                        value={formInvoiceNo}
                        readOnly
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small mb-1 fw-bold text-dark">
                        Invoice Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={formInvoiceDate}
                        onChange={(e) => setFormInvoiceDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Customer & Vehicle Info Snapshot */}
                  <div className="p-3 bg-light rounded border mb-3">
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                      <span className="fw-bold text-dark small">
                        <i className="bi bi-info-circle-fill text-primary me-1"></i>
                        Selected Deal Particulars ({selectedDealForPayment.deal_number})
                      </span>
                      <span className="badge bg-primary text-white text-capitalize">
                        Stage: {selectedDealForPayment.deal_status?.replace(/_/g, " ") || "Booking Confirmed"}
                      </span>
                    </div>

                    <div className="row g-2">
                      <div className="col-12 col-md-4">
                        <label className="form-label small mb-0 text-muted">Customer Name</label>
                        <div className="fw-bold text-dark">{selectedDealForPayment.customer_name}</div>
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label small mb-0 text-muted">Customer Phone</label>
                        <div className="fw-semibold text-dark">{selectedDealForPayment.customer_phone || "-"}</div>
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label small mb-0 text-muted">City & State</label>
                        <div className="small text-dark">{selectedDealForPayment.customer_city || "Gujarat"}</div>
                      </div>
                      <div className="col-12 col-md-6 mt-2">
                        <label className="form-label small mb-0 text-muted">Vehicle Model & Variant</label>
                        <div className="fw-bold text-primary">{selectedDealForPayment.model_variant}</div>
                      </div>
                      <div className="col-12 col-md-3 mt-2">
                        <label className="form-label small mb-0 text-muted">Color</label>
                        <div className="text-dark fw-semibold">{selectedDealForPayment.color || "Standard"}</div>
                      </div>
                      <div className="col-12 col-md-3 mt-2">
                        <label className="form-label small mb-0 text-muted">Insurance</label>
                        <div>
                          {selectedDealForPayment.has_insurance === "Yes" ? (
                            <span className="badge bg-success-subtle text-success">Insurance: Yes</span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-muted">Insurance: No</span>
                          )}
                        </div>
                      </div>
                      <div className="col-12 col-md-4 mt-2">
                        <label className="form-label small mb-0 text-muted">Total Deal Net Amount</label>
                        <div className="fw-bold text-dark">
                          ₹{formatIndianCurrency(selectedDealForPayment.net_amount || selectedDealForPayment.total_amount)}
                        </div>
                      </div>
                      <div className="col-12 col-md-4 mt-2">
                        <label className="form-label small mb-0 text-muted">Already Paid</label>
                        <div className="fw-bold text-success">
                          ₹{formatIndianCurrency(selectedDealForPayment.paid_amount || selectedDealForPayment.total_paid || 0)}
                        </div>
                      </div>
                      <div className="col-12 col-md-4 mt-2">
                        <label className="form-label small mb-0 text-muted">Balance Due</label>
                        <div className="fw-bold text-danger">
                          ₹{formatIndianCurrency(selectedDealForPayment.balance_amount || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="row g-2 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small mb-1 fw-bold text-dark">
                        Payment Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={formPaymentType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormPaymentType(val);
                          setFormLineItems((prev) =>
                            prev.map((item, idx) =>
                              idx === 0
                                ? {
                                    ...item,
                                    desc: `${val} for ${selectedDealForPayment.model_variant || "Vehicle"} (${selectedDealForPayment.deal_number})`,
                                  }
                                : item
                            )
                          );
                          setFormRemarks(`${val} payment for Deal ${selectedDealForPayment.deal_number} - Customer: ${selectedDealForPayment.customer_name}`);
                        }}
                      >
                        <option value="Down Payment">Down Payment</option>
                        <option value="Token Advance">Token Advance</option>
                        <option value="Part Payment">Part Payment</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small mb-1 fw-bold text-dark">
                        Amount Paid (₹) <span className="text-danger">*</span>
                        <span className="text-muted fw-normal ms-1">
                          (Due: ₹{formatIndianCurrency(selectedDealForPayment.balance_amount || 0)})
                        </span>
                      </label>
                      <input
                        type="number"
                        className="form-control form-control-sm fw-bold text-success"
                        value={formAmountPaid}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormAmountPaid(val);
                          setFormLineItems((prev) =>
                            prev.map((item, idx) =>
                              idx === 0
                                ? { ...item, rate: val, amount: (Number(item.qty) || 1) * (Number(val) || 0) }
                                : item
                            )
                          );
                        }}
                        required
                      />
                    </div>

                    <div className={formPaymentMode === "Cash" ? "col-12 col-md-6" : "col-12 col-md-4"}>
                      <label className="form-label small mb-1 fw-bold text-dark">
                        Payment Mode <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={formPaymentMode}
                        onChange={(e) => setFormPaymentMode(e.target.value)}
                      >
                        <option value="UPI / GPay">UPI / GPay / QR</option>
                        <option value="NEFT / RTGS">NEFT / RTGS Bank Transfer</option>
                        <option value="Cheque / DD">Cheque / Demand Draft</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>

                    <div className={formPaymentMode === "Cash" ? "col-12 col-md-6" : "col-12 col-md-4"}>
                      <label className="form-label small mb-1 fw-bold text-dark">
                        Received By <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Cashier / Staff Name"
                        value={formReceivedBy}
                        onChange={(e) => setFormReceivedBy(e.target.value)}
                        required
                      />
                    </div>

                    {formPaymentMode !== "Cash" && (
                      <>
                        <div className="col-12 col-md-4">
                          <label className="form-label small mb-1 fw-bold text-dark">
                            UTR / Transaction Reference <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm font-monospace"
                            placeholder="e.g. UTR192837482"
                            value={formTransactionRef}
                            onChange={(e) => setFormTransactionRef(e.target.value)}
                            required
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label small mb-1 fw-bold text-dark">Bank Name</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g. HDFC Bank, SBI"
                            value={formBankName}
                            onChange={(e) => setFormBankName(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {formPaymentMode === "Cash" && (
                      <div className="col-12">
                        <div className="p-2 px-3 bg-light border border-success-subtle rounded d-flex align-items-center gap-2 text-success small">
                          <i className="bi bi-cash-stack fs-5 text-success"></i>
                          <div>
                            <strong>Cash Receipt Mode:</strong> Direct counter cash collection. Received by: <strong>{formReceivedBy || "Accounts"}</strong>.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remarks / Internal Notes */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark mb-1">
                      Remarks / Internal Notes
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      rows="2"
                      placeholder="Add payment notes or remarks..."
                      value={formRemarks}
                      onChange={(e) => setFormRemarks(e.target.value)}
                    ></textarea>
                  </div>

                  {/* Line Items Table */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="form-label small fw-bold text-dark mb-0">Invoice Item Details</label>
                      <button
                        type="button"
                        className="btn btn-sm btn-link p-0 text-primary small text-decoration-none"
                        onClick={handleAddLineItem}
                      >
                        <i className="bi bi-plus-circle me-1"></i>Add Item
                      </button>
                    </div>

                    <div className="table-responsive border rounded">
                      <table className="table table-sm table-bordered align-middle mb-0">
                        <thead className="table-light small">
                          <tr>
                            <th>Description</th>
                            <th style={{ width: "90px" }}>HSN</th>
                            <th style={{ width: "65px" }}>Qty</th>
                            <th style={{ width: "110px" }}>Rate (₹)</th>
                            <th style={{ width: "120px" }}>Amount (₹)</th>
                            <th style={{ width: "35px" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formLineItems.map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.desc}
                                  onChange={(e) => handleLineItemChange(idx, "desc", e.target.value)}
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.hsn}
                                  onChange={(e) => handleLineItemChange(idx, "hsn", e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.qty}
                                  onChange={(e) => handleLineItemChange(idx, "qty", e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.rate}
                                  onChange={(e) => handleLineItemChange(idx, "rate", e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm fw-bold text-success"
                                  value={item.amount}
                                  onChange={(e) => handleLineItemChange(idx, "amount", e.target.value)}
                                />
                              </td>
                              <td className="text-center">
                                {formLineItems.length > 1 && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link text-danger p-0"
                                    onClick={() => handleRemoveLineItem(idx)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="modal-footer px-4 py-3 bg-light d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPaymentModal(false)}
                    disabled={isSubmittingPayment}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn text-white px-4 fw-bold shadow d-flex align-items-center gap-2"
                    style={{
                      backgroundColor: "var(--primary, #58632A)",
                      borderColor: "var(--primary, #58632A)",
                    }}
                    disabled={isSubmittingPayment}
                  >
                    {isSubmittingPayment ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle fs-5"></i>
                        <span>Generate & Save Invoice</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODAL 2: UPDATE DEAL STAGE & DETAILS
            =================================================================== */}
        {showUpdateModal && selectedDealForUpdate && (
          <div className="modal-backdrop-custom">
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "600px" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-pencil-square text-warning fs-5"></i>
                  <h5 className="modal-title-custom text-white mb-0 fw-bold">
                    Update Deal & Delivery Stage
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowUpdateModal(false)}
                ></button>
              </div>

              <form onSubmit={handleUpdateDealSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Deal Header */}
                  <div className="p-3 mb-3 bg-light rounded border d-flex justify-content-between align-items-center">
                    <div>
                      <span className="small text-muted text-uppercase fw-bold">Deal Reference</span>
                      <h6 className="mb-0 text-dark fw-bold">{selectedDealForUpdate.deal_number}</h6>
                      <div className="small text-muted">{selectedDealForUpdate.customer_name} ({selectedDealForUpdate.model_variant})</div>
                    </div>
                  </div>

                  <div className="row g-3">
                    {/* Deal Status / Delivery Stage */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Delivery Stage <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={updateForm.deal_status}
                        onChange={(e) => setUpdateForm({ ...updateForm, deal_status: e.target.value })}
                        required
                      >
                        <option value="booking_confirmed">Booking Confirmed</option>
                        <option value="in_transit">In Transit</option>
                        <option value="ready_for_delivery">Ready for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Color */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">Vehicle Color</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Polar White, Phantom Black"
                        value={updateForm.color}
                        onChange={(e) => setUpdateForm({ ...updateForm, color: e.target.value })}
                      />
                    </div>

                    {/* VIN / Chassis Number */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">VIN / Chassis Number</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. MALBA81CLNM123456"
                        value={updateForm.vin_chassis_number}
                        onChange={(e) => setUpdateForm({ ...updateForm, vin_chassis_number: e.target.value })}
                      />
                    </div>

                    {/* Expected Delivery Date */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">Expected Delivery Date</label>
                      <input
                        type="date"
                        className="form-control"
                        min={getTodayDate()}
                        onClick={(e) => {
                          try {
                            e.target.showPicker?.();
                          } catch (err) {}
                        }}
                        value={updateForm.expected_delivery_date}
                        onChange={(e) => {
                          const val = e.target.value;
                          const today = getTodayDate();
                          if (val && val < today) {
                            setUpdateForm({ ...updateForm, expected_delivery_date: today });
                            return;
                          }
                          setUpdateForm({ ...updateForm, expected_delivery_date: val });
                        }}
                      />
                    </div>

                    {/* Engine Number */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">Engine Number</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. K15C123456"
                        value={updateForm.engine_number}
                        onChange={(e) => setUpdateForm({ ...updateForm, engine_number: e.target.value })}
                      />
                    </div>

                    {/* Registration Number */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">Registration / RTO No.</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. GJ-01-AB-1234"
                        value={updateForm.registration_number}
                        onChange={(e) => setUpdateForm({ ...updateForm, registration_number: e.target.value })}
                      />
                    </div>

                    {/* Notes */}
                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small mb-1">Deal Notes / Remarks</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Enter any notes or special requirements..."
                        value={updateForm.notes}
                        onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setShowUpdateModal(false)}
                    disabled={isSubmittingUpdate}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmittingUpdate}
                  >
                    <i className="bi bi-check-circle"></i>
                    <span>{isSubmittingUpdate ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODAL 3: DELETE CONFIRMATION
            =================================================================== */}
        {deleteTarget && (
          <div className="modal-backdrop-custom">
            <div className="modal-dialog-custom modal-sm" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
              <div className="modal-header-custom bg-danger text-white">
                <h5 className="modal-title-custom text-white mb-0 fs-6 fw-bold">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i> Delete Deal
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => !isDeleting && setDeleteTarget(null)}
                  disabled={isDeleting}
                ></button>
              </div>
              <div className="modal-body-custom p-4 text-center">
                <p className="mb-2 text-dark">
                  Are you sure you want to delete deal <strong>{deleteTarget.deal_number}</strong>?
                </p>
                <div className="text-secondary small">Customer: {deleteTarget.customer_name}</div>
                <div className="text-danger small mt-2">This action cannot be undone.</div>
              </div>
              <div className="modal-footer-custom d-flex justify-content-between p-3">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                  onClick={handleDeleteDeal}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash-fill"></i>
                      <span>Yes, Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODAL 4: VIEW DEAL VOUCHER & PAYMENT HISTORY
            =================================================================== */}
        {viewDeal && (
          <div className="modal-backdrop-custom">
            <div
              className="modal-dialog-custom modal-lg"
              onClick={(e) => e.stopPropagation()}
              id="printable-deal-ledger"
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
                {/* Official Dealership Header (Visible on Print) */}
                <div className="d-none print-only-block text-center border-bottom pb-3 mb-3">
                  <div style={{ fontSize: "24px", fontWeight: "800", color: "#1e3a8a", letterSpacing: "0.5px" }}>
                    DEFENCE AUTOLINK
                  </div>
                  <div style={{ fontSize: "11px", color: "#475569", fontWeight: "600", textTransform: "uppercase" }}>
                    OFFICIAL MULTI-BRAND AUTOMOTIVE DEALERSHIP • SALES & SERVICES
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Main Ring Road Showroom, South Extension Part-II, New Delhi – 110049 • GSTIN: 07AAAAA0000A1Z5
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "14px", fontWeight: "700", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", textDecoration: "underline" }}>
                    OFFICIAL VEHICLE DEAL ORDER VOUCHER & PAYMENT RECEIPT
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-3 small text-muted px-2" style={{ fontSize: "12px" }}>
                    <span><strong>Deal Reference:</strong> <span className="font-monospace text-dark fw-bold">{viewDeal.deal_number}</span></span>
                    <span><strong>Booking Date:</strong> <span className="text-dark fw-semibold">{viewDeal.created_at ? viewDeal.created_at.split("T")[0] : new Date().toISOString().split("T")[0]}</span></span>
                    <span><strong>Status:</strong> <span className="text-success fw-bold">Booking Confirmed</span></span>
                  </div>
                </div>

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
                    <div className="mt-1">
                      {viewDeal.has_insurance === "Yes" ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: "11px" }}>
                          <i className="bi bi-shield-check me-1"></i>Insurance: Yes
                        </span>
                      ) : (
                        <span className="badge bg-secondary-subtle text-muted border" style={{ fontSize: "11px" }}>
                          Insurance: No
                        </span>
                      )}
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
                {(() => {
                  const netVal = Number(viewDeal.net_amount || viewDeal.total_amount || 0);
                  const paymentsList = Array.isArray(viewDeal.payments) ? viewDeal.payments : [];
                  const recVal = Math.max(
                    Number(viewDeal.paid_amount || viewDeal.total_paid || 0),
                    paymentsList.filter((p) => p.status !== "rejected").reduce((s, p) => s + (Number(p.amount) || 0), 0)
                  );
                  const dueVal = Math.max(0, netVal - recVal);

                  return (
                    <div className="row g-2 mb-3 text-center">
                      <div className="col-4">
                        <div className="p-2 border rounded bg-white">
                          <span className="small text-muted">Total Net Amount</span>
                          <div className="fw-bold text-dark fs-6">
                            ₹{formatIndianCurrency(netVal)}
                          </div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="p-2 border rounded bg-success-subtle">
                          <span className="small text-muted">Total Received</span>
                          <div className="fw-bold text-success fs-6">
                            ₹{formatIndianCurrency(recVal)}
                          </div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="p-2 border rounded bg-danger-subtle">
                          <span className="small text-muted">Balance Due</span>
                          <div className="fw-bold text-danger fs-6">
                            ₹{formatIndianCurrency(dueVal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Payment History Table */}
                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-1 border-bottom pb-1">
                  <i className="bi bi-clock-history text-primary"></i> Payment Receipts Ledger
                </h6>

                {(!viewDeal.payments || viewDeal.payments.length === 0) ? (
                  <p className="text-muted small py-2">No payment transactions recorded yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered align-middle mb-0">
                      <thead className="table-light small">
                        <tr>
                          <th>Date</th>
                          <th>Receipt #</th>
                          <th>Type</th>
                          <th>Mode</th>
                          <th>Reference / UTR</th>
                          <th>Bank</th>
                          <th>Received By</th>
                          <th className="text-end">Amount</th>
                          <th className="text-center">Status</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="small">
                        {viewDeal.payments.map((p, idx) => (
                          <tr key={p.id || idx}>
                            <td>{p.payment_date || new Date().toISOString().split("T")[0]}</td>
                            <td className="font-monospace text-primary fw-bold">
                              {p.receipt_number || `#REC-${p.id}`}
                            </td>
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
                            <td className="fw-semibold text-dark">
                              {p.received_by || p.recorded_by_name || p.recorded_by?.name || "-"}
                            </td>
                            <td className="text-end fw-bold text-success">
                              ₹{formatIndianCurrency(p.amount)}
                            </td>
                            <td className="text-center">
                              <span className={`badge px-2 py-1 ${p.status === "rejected" ? "bg-danger text-white" : "bg-success text-white"}`}>
                                {p.status === "rejected" ? "Rejected" : "Cleared"}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-success-subtle text-success border border-success border-opacity-25 px-2 py-1">
                                <i className="bi bi-check-circle-fill me-1"></i>Cleared
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Official Signatures & Seal (Visible on Print) */}
                <div className="d-none print-only-flex justify-content-between align-items-end mt-5 pt-4 border-top">
                  <div className="text-center" style={{ minWidth: "220px" }}>
                    <div style={{ borderBottom: "1px dashed #64748b", height: "45px" }}></div>
                    <div className="small fw-semibold mt-1 text-dark">Customer Signature</div>
                  </div>
                  <div className="text-center" style={{ minWidth: "160px" }}>
                    <div className="border border-secondary border-dashed text-secondary p-2 rounded mb-1" style={{ fontSize: "10px", letterSpacing: "1px" }}>
                      OFFICIAL DEALERSHIP STAMP
                    </div>
                  </div>
                  <div className="text-center" style={{ minWidth: "220px" }}>
                    <div style={{ borderBottom: "1px dashed #64748b", height: "45px" }}></div>
                    <div className="small fw-semibold mt-1 text-dark">Authorized Signatory</div>
                  </div>
                </div>
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
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.print();
                      }
                    }}
                  >
                    <i className="bi bi-printer"></i>
                    <span>Print Deal Receipt</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ===================================================================
            MODAL 5: VIEW & PRINT OFFICIAL DAL TAX INVOICE VOUCHER PREVIEW
            =================================================================== */}
        {selectedInvoiceForSingleView && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(19, 28, 39, 0.75)", zIndex: 1060 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "14px", overflow: "hidden" }}>
                {/* Modal Top Control Bar (Hidden on print) */}
                <div
                  className="modal-header px-4 py-3 no-print"
                  style={{
                    backgroundColor: "#131C27",
                    color: "#DCE9A2",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-receipt fs-4 text-warning"></i>
                    <h5 className="modal-title fw-bold text-white mb-0">
                      Tax Invoice Voucher Preview
                    </h5>
                    <span className="badge bg-light text-dark font-monospace ms-2">
                      {selectedInvoiceForSingleView.invoiceNo}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-light d-flex align-items-center gap-1"
                      onClick={() => {
                        if (typeof window !== "undefined") window.print();
                      }}
                    >
                      <i className="bi bi-printer-fill"></i>
                      <span>Print Voucher</span>
                    </button>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setSelectedInvoiceForSingleView(null)}
                    ></button>
                  </div>
                </div>

                {/* Printable Invoice Voucher Body */}
                <div className="modal-body p-4 bg-white" id="printable-single-invoice-voucher">
                  {/* Voucher Header */}
                  <div className="row pb-3 mb-3 border-bottom align-items-center">
                    <div className="col-7">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="px-2.5 py-1 fw-bold text-white rounded font-monospace"
                          style={{ backgroundColor: "var(--primary, #58632A)", letterSpacing: "1px", fontSize: "14px" }}
                        >
                          DAL
                        </span>
                        <div>
                          <h4 className="fw-bold mb-0 text-dark" style={{ letterSpacing: "0.5px" }}>
                            DEFENCE AUTOLINK
                          </h4>
                          <span className="small text-muted" style={{ fontSize: "11px" }}>
                            Official Multi-Brand Automotive Showroom • CSD AFD Invoicing
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-5 text-end">
                      <div className="p-2 rounded bg-light border text-end d-inline-block">
                        <span className="badge bg-success-subtle text-success text-uppercase mb-1 d-block">
                          OFFICIAL TAX INVOICE
                        </span>
                        <div className="small">
                          Invoice No:{" "}
                          <strong className="font-monospace text-dark">
                            {selectedInvoiceForSingleView.invoiceNo}
                          </strong>
                        </div>
                        <div className="small text-muted">
                          Date: <strong>{selectedInvoiceForSingleView.date}</strong>
                        </div>
                        <div className="small text-muted">
                          Deal Ref:{" "}
                          <strong className="font-monospace text-dark">
                            {selectedInvoiceForSingleView.dealNumber || "DEAL-CSD"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Vehicle Grid */}
                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <div className="border rounded p-3 h-100 bg-light">
                        <span className="small text-uppercase fw-bold text-muted d-block mb-1">
                          Billed To (Customer Particulars):
                        </span>
                        <div className="fw-bold text-dark fs-6 mb-1">
                          {selectedInvoiceForSingleView.customerName}
                        </div>
                        <div className="small text-muted">
                          Mobile: <strong>{selectedInvoiceForSingleView.mobile}</strong>
                        </div>
                        {selectedInvoiceForSingleView.email && (
                          <div className="small text-muted">
                            Email: {selectedInvoiceForSingleView.email}
                          </div>
                        )}
                        <div className="small text-muted">
                          City: {selectedInvoiceForSingleView.city || "Ahmedabad, Gujarat"}
                        </div>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="border rounded p-3 h-100 bg-light">
                        <span className="small text-uppercase fw-bold text-muted d-block mb-1">
                          Vehicle Booking Details:
                        </span>
                        <div className="fw-bold text-primary fs-6 mb-1">
                          {selectedInvoiceForSingleView.vehicle}
                        </div>
                        <div className="small text-muted">
                          Color: <strong>{selectedInvoiceForSingleView.color || "Standard"}</strong>
                        </div>
                        {selectedInvoiceForSingleView.vin && (
                          <div className="small text-muted font-monospace">
                            VIN / Chassis: {selectedInvoiceForSingleView.vin}
                          </div>
                        )}
                        <div className="small text-muted">
                          Payment Type: <strong>{selectedInvoiceForSingleView.installmentTitle}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="table-responsive mb-3">
                    <table className="table table-bordered align-middle mb-0">
                      <thead className="table-light small text-uppercase">
                        <tr>
                          <th style={{ width: "40px" }} className="text-center">#</th>
                          <th>Item Description</th>
                          <th style={{ width: "90px" }} className="text-center">HSN/SAC</th>
                          <th style={{ width: "70px" }} className="text-center">Qty</th>
                          <th style={{ width: "130px" }} className="text-end">Rate (₹)</th>
                          <th style={{ width: "140px" }} className="text-end">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: "0.88rem" }}>
                        {(selectedInvoiceForSingleView.items || []).map((it, idx) => (
                          <tr key={idx}>
                            <td className="text-center text-muted">{idx + 1}</td>
                            <td className="fw-semibold text-dark">{it.desc}</td>
                            <td className="text-center font-monospace">{it.hsn || "998313"}</td>
                            <td className="text-center">{it.qty || 1}</td>
                            <td className="text-end">₹{formatIndianCurrency(it.rate || it.amount)}</td>
                            <td className="text-end fw-bold text-dark">₹{formatIndianCurrency(it.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="5" className="text-end fw-bold text-dark pt-3">
                            Invoice Total:
                          </td>
                          <td className="text-end fw-bold fs-6 text-success pt-3">
                            ₹{formatIndianCurrency(selectedInvoiceForSingleView.amountPaid)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Payment Details */}
                  <div className="row g-3 mb-4">
                    <div className="col-7">
                      <div className="border rounded p-3 bg-light">
                        <span className="small text-uppercase fw-bold text-muted d-block mb-1">
                          Payment Mode & Verification:
                        </span>
                        <div className="small">
                          <div>
                            Payment Method: <strong>{selectedInvoiceForSingleView.paymentMode}</strong>
                          </div>
                          {selectedInvoiceForSingleView.paymentMode?.toLowerCase() !== "cash" && (
                            <div>
                              UTR / Transaction Ref:{" "}
                              <strong className="font-monospace text-dark">
                                {selectedInvoiceForSingleView.transactionRef || "Verified"}
                              </strong>
                            </div>
                          )}
                          {selectedInvoiceForSingleView.receivedBy && (
                            <div>
                              Received By: <strong>{selectedInvoiceForSingleView.receivedBy}</strong>
                            </div>
                          )}
                          {selectedInvoiceForSingleView.remarks && (
                            <div className="mt-1 text-muted">
                              Remarks: {selectedInvoiceForSingleView.remarks}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-5">
                      <div className="border rounded p-3 bg-light text-end">
                        <div className="d-flex justify-content-between small text-muted mb-1">
                          <span>Total Agreed Deal Value:</span>
                          <strong className="text-dark">
                            ₹{formatIndianCurrency(selectedInvoiceForSingleView.totalDealAmount)}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between small text-muted mb-1">
                          <span>Paid in this Invoice:</span>
                          <strong className="text-success">
                            ₹{formatIndianCurrency(selectedInvoiceForSingleView.amountPaid)}
                          </strong>
                        </div>
                        <hr className="my-2" />
                        <div className="d-flex justify-content-between fw-bold">
                          <span>Invoice Status:</span>
                          <span className="text-success">RECEIVED / PAID</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Signatures & Terms */}
                  <div className="row pt-4 mt-2 border-top align-items-end">
                    <div className="col-7">
                      <span className="small fw-bold text-dark d-block mb-1">
                        Terms & Conditions:
                      </span>
                      <ol className="small text-muted ps-3 mb-0" style={{ fontSize: "0.72rem", lineHeight: "1.4" }}>
                        <li>This is an official computer-generated receipt for CSD AFD portal documentation.</li>
                        <li>Token booking amounts are adjusted against final vehicle invoice upon delivery.</li>
                        <li>Vehicle allocation is subject to availability and Army CSD AFD portal approval.</li>
                      </ol>
                    </div>

                    <div className="col-5 text-center">
                      <div
                        className="mb-1 d-inline-block px-3 py-1 rounded"
                        style={{
                          border: "2px dashed #58632A",
                          color: "#58632A",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                        }}
                      >
                        DEFENCE AUTOLINK AUTHORIZED
                      </div>
                      <div
                        className="small fw-bold text-dark pt-3 border-top mx-auto"
                        style={{ maxWidth: "180px" }}
                      >
                        Authorized Signatory
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="modal-footer px-4 py-3 bg-light no-print d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSelectedInvoiceForSingleView(null)}
                  >
                    Close Preview
                  </button>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-primary d-flex align-items-center gap-1 fw-bold"
                      style={{
                        backgroundColor: "var(--primary, #58632A)",
                        borderColor: "var(--primary, #58632A)",
                      }}
                      onClick={() => {
                        if (typeof window !== "undefined") window.print();
                      }}
                    >
                      <i className="bi bi-printer-fill me-1"></i>
                      <span>Print Invoice</span>
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
