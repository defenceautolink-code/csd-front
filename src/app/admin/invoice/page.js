"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import Pagination from "@/components/common/Pagination";
import dealApi from "@/services/dealApi";
import { formatIndianCurrency, numberToWords } from "@/utils/numberToWords";

// Helper to generate Invoice Number in exact required format: DAL-/YYYY/MM/XXXX
export const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `DAL-/${year}/${month}/${random4}`;
};

// Stage badge styling matching Vehicle Deals & Bookings
export const getStageBadgeClass = (stage) => {
  const s = String(stage || "").toLowerCase();
  if (s.includes("delivered")) return "bg-success text-white";
  if (s.includes("ready")) return "bg-primary text-white";
  if (s.includes("transit")) return "bg-info text-dark";
  if (s.includes("cancel")) return "bg-danger text-white";
  return "bg-secondary text-white";
};

export default function GenerateInvoicePage() {
  const { showToast } = useToast();

  // Active Deals from CRM Vehicle Deals & Bookings API
  const [deals, setDeals] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);

  // Tab State: 'deals' (Customer / Deal Wise) or 'all-invoices' (Date-wise Flat Register)
  const [activeTab, setActiveTab] = useState("deals");

  // Filters & Search (Exact same filters as Deals page)
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination states
  const [dealsPage, setDealsPage] = useState(1);
  const [dealsPerPage, setDealsPerPage] = useState(10);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesPerPage, setInvoicesPerPage] = useState(10);

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedDealForMultiView, setSelectedDealForMultiView] = useState(null);
  const [selectedInvoiceForSingleView, setSelectedInvoiceForSingleView] = useState(null);

  // Deal Selector Dropdown inside "Generate Invoice" Modal
  const [selectedDealId, setSelectedDealId] = useState("");
  const [dealSearchQuery, setDealSearchQuery] = useState("");
  const [isDealDropdownOpen, setIsDealDropdownOpen] = useState(false);
  const dealDropdownRef = useRef(null);
  const [selectedDealObject, setSelectedDealObject] = useState(null);

  // Form State for "Generate / Add Invoice" Modal
  const [formInvoiceNo, setFormInvoiceNo] = useState(generateInvoiceNumber());
  const [formInvoiceDate, setFormInvoiceDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [formInstallmentTitle, setFormInstallmentTitle] = useState("Down Payment");
  const [formPaymentMode, setFormPaymentMode] = useState("UPI / GPay");
  const [formTransactionRef, setFormTransactionRef] = useState("");
  const [formBankName, setFormBankName] = useState("HDFC Bank");
  const [formReceivedBy, setFormReceivedBy] = useState("");
  const [formAmountPaid, setFormAmountPaid] = useState("0");
  const [formRemarks, setFormRemarks] = useState("");
  const [isDealLocked, setIsDealLocked] = useState(false);

  // Dynamic Line Items in Invoice
  const [formLineItems, setFormLineItems] = useState([
    {
      desc: "Token Booking Deposit / Installment Payment",
      hsn: "998313",
      qty: 1,
      rate: "50000",
      amount: "50000",
    },
  ]);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleDocClick = (e) => {
      if (dealDropdownRef.current && !dealDropdownRef.current.contains(e.target)) {
        setIsDealDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  // Reset pagination to page 1 when any filter or tab changes
  useEffect(() => {
    setDealsPage(1);
    setInvoicesPage(1);
  }, [searchQuery, stageFilter, paymentFilter, startDate, endDate, activeTab]);

  // Load Live Deals & Payments from Backend API
  const loadDealsData = useCallback(async () => {
    setIsLoadingDeals(true);
    try {
      const res = await dealApi.getDeals({ per_page: 200 });
      if (res && res.status && Array.isArray(res.data)) {
        setDeals(res.data);
      }
    } catch (err) {
      console.error("Error loading deals for invoice page:", err);
      showToast("Could not load vehicle deals. Please refresh.", "error");
    } finally {
      setIsLoadingDeals(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDealsData();

    // Listen to global CRM deal update events
    const handleUpdate = () => loadDealsData();
    window.addEventListener("csd_deals_updated", handleUpdate);
    return () => window.removeEventListener("csd_deals_updated", handleUpdate);
  }, [loadDealsData]);

  // Enrich deals with formatted invoices from their payments array
  const enrichedDeals = useMemo(() => {
    return deals.map((d) => {
      const rawPayments = Array.isArray(d.payments) ? d.payments : [];

      const dealInvoices = rawPayments
        .filter((p) => p.status !== "rejected")
        .map((p, idx) => {
          const invDate = p.payment_date || (p.created_at ? p.created_at.split("T")[0] : new Date().toISOString().split("T")[0]);
          const invNo = p.invoice_no || `DAL-/${new Date(invDate).getFullYear()}/${String(new Date(invDate).getMonth() + 1).padStart(2, "0")}/${String(1000 + (p.id || idx + 1))}`;

          let installmentTitle = "Installment Payment";
          if (p.payment_type) {
            installmentTitle = p.payment_type
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
          }

          const amt = Number(p.amount) || 0;

          return {
            id: p.id || `INV-${d.id}-${idx + 1}`,
            paymentId: p.id,
            dealId: d.id,
            invoiceNo: invNo,
            date: invDate,
            time: p.created_at ? new Date(p.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "12:00 PM",
            installmentTitle: installmentTitle,
            paymentMode: (p.payment_mode || "UPI").toUpperCase(),
            transactionRef: p.transaction_reference || p.reference_no || "VERIFIED-REF",
            bankName: p.bank_name || "HDFC Bank",
            receivedBy: p.received_by || "Accounts",
            amountPaid: amt,
            items: [
              {
                desc: `${installmentTitle} for ${d.model_variant || "Vehicle"}`,
                hsn: "998313",
                qty: 1,
                rate: amt,
                amount: amt,
              },
            ],
            remarks: p.notes || `Installment payment for Deal ${d.deal_number}.`,
            status: "Paid",
            parentDeal: d,
          };
        });

      const totalPaid = Number(d.paid_amount ?? d.total_paid ?? 0);
      const netAmount = Number(d.net_amount ?? d.total_amount ?? 0);
      const balanceDue = Math.max(0, netAmount - totalPaid);
      const pctPaid = Math.min(100, Math.round(((totalPaid || 0) / (netAmount || 1)) * 100));

      return {
        ...d,
        computedTotalPaid: totalPaid,
        computedBalanceDue: balanceDue,
        computedPercentPaid: pctPaid,
        invoices: dealInvoices,
        invoicesCount: dealInvoices.length,
      };
    });
  }, [deals]);

  // Flattened Master List of ALL Invoices across all deals (Sorted newest first)
  const allInvoicesList = useMemo(() => {
    const list = [];
    enrichedDeals.forEach((d) => {
      (d.invoices || []).forEach((inv) => {
        list.push({
          ...inv,
          dealNumber: d.deal_number,
          customerName: d.customer_name,
          mobile: d.customer_phone,
          email: d.customer_email,
          city: d.customer_city,
          vehicle: d.model_variant,
          color: d.color,
          vin: d.vin_chassis_number,
          regNo: d.registration_number,
          has_insurance: d.has_insurance,
          deal_status: d.deal_status,
          totalDealAmount: d.net_amount || d.total_amount,
          parentDeal: d,
        });
      });
    });
    // Sort newest date first
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [enrichedDeals]);

  // Overall KPI Metrics
  const metrics = useMemo(() => {
    const totalInvoicesCount = allInvoicesList.length;
    const totalCollected = allInvoicesList.reduce((sum, i) => sum + Number(i.amountPaid || 0), 0);
    const totalDealVolume = enrichedDeals.reduce((sum, d) => sum + Number(d.net_amount || d.total_amount || 0), 0);
    const totalPending = Math.max(0, totalDealVolume - totalCollected);
    const totalDealsCount = enrichedDeals.length;

    return {
      totalInvoicesCount,
      totalCollected,
      totalDealVolume,
      totalPending,
      totalDealsCount,
    };
  }, [allInvoicesList, enrichedDeals]);

  // Filtered Deals for Tab 1 (Search + Stage Filter + Payment Filter + Date Range)
  const filteredDeals = useMemo(() => {
    return enrichedDeals.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (d.deal_number && d.deal_number.toLowerCase().includes(q)) ||
        (d.customer_name && d.customer_name.toLowerCase().includes(q)) ||
        (d.customer_phone && d.customer_phone.toLowerCase().includes(q)) ||
        (d.customer_city && d.customer_city.toLowerCase().includes(q)) ||
        (d.vin_chassis_number && d.vin_chassis_number.toLowerCase().includes(q)) ||
        (d.model_variant && d.model_variant.toLowerCase().includes(q));

      const matchStage =
        stageFilter === "All" ||
        (d.deal_status && d.deal_status.toLowerCase() === stageFilter.toLowerCase());

      const matchPayment =
        paymentFilter === "All" ||
        d.payment_status === paymentFilter;

      const matchDate = (() => {
        if (!startDate && !endDate) return true;
        const anyInvMatch = (d.invoices || []).some((inv) => {
          if (startDate && inv.date < startDate) return false;
          if (endDate && inv.date > endDate) return false;
          return true;
        });
        return anyInvMatch;
      })();

      return matchQuery && matchStage && matchPayment && matchDate;
    });
  }, [enrichedDeals, searchQuery, stageFilter, paymentFilter, startDate, endDate]);

  // Filtered All Invoices for Tab 2 (Search + Date Range)
  const filteredAllInvoices = useMemo(() => {
    return allInvoicesList.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(q)) ||
        (inv.dealNumber && inv.dealNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.mobile && inv.mobile.toLowerCase().includes(q)) ||
        (inv.installmentTitle && inv.installmentTitle.toLowerCase().includes(q)) ||
        (inv.vehicle && inv.vehicle.toLowerCase().includes(q));

      const matchDate = (() => {
        if (!startDate && !endDate) return true;
        if (startDate && inv.date < startDate) return false;
        if (endDate && inv.date > endDate) return false;
        return true;
      })();

      return matchQuery && matchDate;
    });
  }, [allInvoicesList, searchQuery, startDate, endDate]);

  // Paginated Data
  const paginatedDeals = useMemo(() => {
    const start = (dealsPage - 1) * dealsPerPage;
    return filteredDeals.slice(start, start + dealsPerPage);
  }, [filteredDeals, dealsPage, dealsPerPage]);

  const paginatedInvoices = useMemo(() => {
    const start = (invoicesPage - 1) * invoicesPerPage;
    return filteredAllInvoices.slice(start, start + invoicesPerPage);
  }, [filteredAllInvoices, invoicesPage, invoicesPerPage]);

  // Handle Deal Selection from Dropdown in Modal
  const handleSelectDeal = (deal) => {
    if (!deal) return;
    setSelectedDealId(String(deal.id));
    setSelectedDealObject(deal);
    setDealSearchQuery(`${deal.customer_name} (${deal.deal_number})`);
    setIsDealDropdownOpen(false);

    const netVal = Number(deal.net_amount || deal.total_amount || 0);
    const totalPaid = Number(deal.paid_amount ?? deal.total_paid ?? (deal.computedTotalPaid || 0));
    const remaining = Math.max(0, netVal - totalPaid);

    const invoicesCount = (deal.invoices || []).length;
    let defaultType = "Down Payment";
    if (invoicesCount === 0) {
      defaultType = "Token Advance";
    } else if (remaining > 0) {
      defaultType = "Part Payment";
    } else {
      defaultType = "Down Payment";
    }

    setFormInstallmentTitle(defaultType);
    setFormAmountPaid(String(remaining));

    setFormLineItems([
      {
        desc: `${defaultType} for ${deal.model_variant || "Vehicle"} (${deal.deal_number})`,
        hsn: "998313",
        qty: 1,
        rate: String(remaining),
        amount: String(remaining),
      },
    ]);
    setFormRemarks(`${defaultType} payment for Deal ${deal.deal_number} - Customer: ${deal.customer_name}`);
  };

  // Open Generate Invoice for an existing Deal (Add Bill button)
  const handleOpenGenerateForDeal = (deal) => {
    setIsDealLocked(true);
    handleSelectDeal(deal);
    setFormInvoiceNo(generateInvoiceNumber());
    setFormInvoiceDate(new Date().toISOString().split("T")[0]);
    setFormPaymentMode("UPI / GPay");
    setFormTransactionRef("");
    setFormBankName("HDFC Bank");
    setFormReceivedBy("");
    setIsGenerateModalOpen(true);
  };

  // Open Generate Modal from top button "Generate New Invoice"
  const handleOpenGenerateModal = () => {
    setIsDealLocked(false);
    setFormInvoiceNo(generateInvoiceNumber());
    setFormInvoiceDate(new Date().toISOString().split("T")[0]);
    setSelectedDealId("");
    setSelectedDealObject(null);
    setDealSearchQuery("");
    setIsDealDropdownOpen(false);

    setFormInstallmentTitle("Token Advance");
    setFormPaymentMode("UPI / GPay");
    setFormAmountPaid("0");
    setFormTransactionRef("");
    setFormBankName("HDFC Bank");
    setFormReceivedBy("");
    setFormRemarks("Token Advance payment recorded.");
    setFormLineItems([
      {
        desc: "Token Advance Payment",
        hsn: "998313",
        qty: 1,
        rate: "0",
        amount: "0",
      },
    ]);
    setIsGenerateModalOpen(true);
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

  // =========================================================================
  // SUBMIT HANDLER: Generate & Save Invoice via dealApi.addPayment
  // =========================================================================
  const handleSaveInvoice = async (e) => {
    e.preventDefault();

    if (!selectedDealId) {
      showToast("Please select a Vehicle Deal from the dropdown.", "warning");
      return;
    }

    const amountNum = Number(formAmountPaid) || 0;
    if (amountNum <= 0) {
      showToast("Please enter a valid amount paid for this invoice.", "warning");
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

    setIsSubmittingInvoice(true);
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
    const lowerTitle = formInstallmentTitle.toLowerCase();
    if (lowerTitle.includes("token") || lowerTitle.includes("advance")) typeSlug = "token_advance";
    else if (lowerTitle.includes("down") || lowerTitle.includes("margin")) typeSlug = "down_payment";
    else typeSlug = "part_payment";

    const payload = {
      deal_id: Number(selectedDealId),
      amount: amountNum,
      payment_type: typeSlug,
      payment_mode: modeSlug,
      payment_date: formInvoiceDate,
      transaction_reference: isCashMode ? "CASH-RECEIPT" : (formTransactionRef || "UTR-VERIFIED"),
      bank_name: isCashMode ? "Cash Counter" : formBankName,
      received_by: formReceivedBy.trim(),
      notes: `${formInstallmentTitle} • ${formRemarks || 'Recorded via Invoice Module'}`,
      invoice_no: finalInvoiceNo,
    };

    try {
      await dealApi.addPayment(payload);
      showToast(`Invoice ${finalInvoiceNo} created and linked to Deal #${selectedDealId}!`, "success");

      setIsGenerateModalOpen(false);

      // Find selected deal to render instant preview voucher
      const targetDeal = enrichedDeals.find((d) => String(d.id) === String(selectedDealId));
      if (targetDeal) {
        setSelectedInvoiceForSingleView({
          invoiceNo: finalInvoiceNo,
          date: formInvoiceDate,
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          dealNumber: targetDeal.deal_number,
          customerName: targetDeal.customer_name,
          mobile: targetDeal.customer_phone,
          email: targetDeal.customer_email,
          city: targetDeal.customer_city,
          vehicle: targetDeal.model_variant,
          color: targetDeal.color,
          vin: targetDeal.vin_chassis_number,
          regNo: targetDeal.registration_number,
          installmentTitle: formInstallmentTitle,
          paymentMode: formPaymentMode,
          transactionRef: isCashMode ? "CASH-RECEIPT" : (formTransactionRef || "UTR-VERIFIED"),
          bankName: isCashMode ? "Cash Counter" : formBankName,
          receivedBy: formReceivedBy.trim(),
          amountPaid: amountNum,
          totalDealAmount: targetDeal.net_amount || targetDeal.total_amount,
          items: formLineItems.map((item) => ({
            desc: item.desc || formInstallmentTitle,
            hsn: item.hsn || "998313",
            qty: Number(item.qty) || 1,
            rate: Number(item.rate) || amountNum,
            amount: Number(item.amount) || amountNum,
          })),
          remarks: formRemarks,
          status: "Paid",
          parentDeal: targetDeal,
        });
      }

      // Reload live data
      loadDealsData();
    } catch (err) {
      console.error("Error saving invoice payment:", err);
      showToast(err.response?.data?.message || "Failed to save invoice. Please try again.", "error");
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Export All Invoices to CSV
  const handleExportAllInvoicesCSV = () => {
    if (allInvoicesList.length === 0) {
      showToast("No invoices available to export.", "warning");
      return;
    }

    const headers = [
      "Invoice No",
      "Date",
      "Deal No",
      "Customer Name",
      "Mobile",
      "Vehicle",
      "Installment Stage",
      "Payment Mode",
      "Transaction Ref",
      "Amount Paid (INR)",
      "Status",
    ];

    const rows = allInvoicesList.map((i) => [
      `"${i.invoiceNo || ""}"`,
      `"${i.date || ""}"`,
      `"${i.dealNumber || ""}"`,
      `"${i.customerName || ""}"`,
      `"${i.mobile || ""}"`,
      `"${i.vehicle || ""}"`,
      `"${i.installmentTitle || ""}"`,
      `"${i.paymentMode || ""}"`,
      `"${i.transactionRef || ""}"`,
      i.amountPaid || 0,
      `"${i.status || "Paid"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DAL_All_Invoices_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("All invoices exported to CSV!", "success");
  };

  // Print Invoice Handler
  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <AdminLayout>
      <div className="container-fluid px-4 py-4" style={{ backgroundColor: "#F7F7F5", minHeight: "100vh" }}>
        {/* Page Top Header */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1" style={{ fontSize: "0.75rem" }}>
                <i className="bi bi-shield-check me-1"></i>Official CSD AFD Billing
              </span>
              <span className="badge bg-success-subtle text-success fw-bold px-2 py-1" style={{ fontSize: "0.75rem" }}>
                <i className="bi bi-link-45deg me-1"></i>Live Deal Sync Active
              </span>
            </div>
            <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-receipt-cutoff text-primary"></i>
              Vehicle Deals & Invoices Register
            </h3>
            <p className="text-muted small mb-0">
              Manage locked deals, generate sequential tax invoices (`DAL-/YYYY/MM/XXXX`), and track payment receipts.
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary d-flex align-items-center gap-1.5 shadow-sm"
              onClick={loadDealsData}
              disabled={isLoadingDeals}
            >
              <i className={`bi bi-arrow-clockwise ${isLoadingDeals ? "spin-animation" : ""}`}></i>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-dark d-flex align-items-center gap-1.5 shadow-sm"
              onClick={handleExportAllInvoicesCSV}
            >
              <i className="bi bi-file-earmark-spreadsheet-fill text-success"></i>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="btn text-white fw-bold shadow d-flex align-items-center gap-2"
              style={{
                backgroundColor: "var(--primary, #58632A)",
                borderColor: "var(--primary, #58632A)",
              }}
              onClick={handleOpenGenerateModal}
            >
              <i className="bi bi-plus-circle-fill"></i>
              <span>Generate New Invoice</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Cards (Exact same metrics as Deals page) */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted text-uppercase fw-bold">Total Deal Pipeline</span>
                <span className="p-2 rounded-circle bg-primary-subtle text-primary">
                  <i className="bi bi-currency-rupee fs-5"></i>
                </span>
              </div>
              <h3 className="fw-bold text-dark mb-1">₹{formatIndianCurrency(metrics.totalDealVolume)}</h3>
              <span className="text-muted small">{metrics.totalDealsCount} Active Deals Booked</span>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted text-uppercase fw-bold">Payments Collected</span>
                <span className="p-2 rounded-circle bg-success-subtle text-success">
                  <i className="bi bi-check2-circle fs-5"></i>
                </span>
              </div>
              <h3 className="fw-bold text-success mb-1">₹{formatIndianCurrency(metrics.totalCollected)}</h3>
              <span className="text-muted small">Cleared via Verified Invoices</span>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted text-uppercase fw-bold">Pending Receivables</span>
                <span className="p-2 rounded-circle bg-warning-subtle text-warning">
                  <i className="bi bi-clock-history fs-5"></i>
                </span>
              </div>
              <h3 className="fw-bold text-danger mb-1">₹{formatIndianCurrency(metrics.totalPending)}</h3>
              <span className="text-muted small">Remaining Balance across Deals</span>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted text-uppercase fw-bold">Sequential Invoices</span>
                <span className="p-2 rounded-circle bg-info-subtle text-info">
                  <i className="bi bi-receipt fs-5"></i>
                </span>
              </div>
              <h3 className="fw-bold text-primary mb-1">{metrics.totalInvoicesCount}</h3>
              <span className="text-muted small">Issued DAL Tax Invoices</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation: Tab 1 (Deals / Customer Wise) vs Tab 2 (Date-wise All Invoices) */}
        <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white">
          <div className="card-header bg-white border-bottom p-0">
            <ul className="nav nav-tabs border-0 px-3 pt-2">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link border-0 py-3 px-4 fw-bold position-relative ${
                    activeTab === "deals" ? "active text-primary" : "text-secondary"
                  }`}
                  style={{
                    backgroundColor: "transparent",
                    borderBottom: activeTab === "deals" ? "3px solid var(--primary, #58632A)" : "none",
                  }}
                  onClick={() => setActiveTab("deals")}
                >
                  <i className="bi bi-people-fill me-2"></i>
                  Customer & Deal Invoices Register
                  <span className="badge bg-primary-subtle text-primary rounded-pill ms-2">
                    {filteredDeals.length} Deals
                  </span>
                </button>
              </li>

              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link border-0 py-3 px-4 fw-bold position-relative ${
                    activeTab === "all-invoices" ? "active text-primary" : "text-secondary"
                  }`}
                  style={{
                    backgroundColor: "transparent",
                    borderBottom: activeTab === "all-invoices" ? "3px solid var(--primary, #58632A)" : "none",
                  }}
                  onClick={() => setActiveTab("all-invoices")}
                >
                  <i className="bi bi-journal-text me-2"></i>
                  All Invoices (Date-wise Master)
                  <span className="badge bg-success-subtle text-success rounded-pill ms-2">
                    {filteredAllInvoices.length} Invoices
                  </span>
                </button>
              </li>
            </ul>
          </div>

          {/* Filters & Search Bar (Exact same filters as Deals page) */}
          <div className="card-body p-3 bg-light border-bottom">
            <div className="d-flex flex-wrap align-items-center gap-2 justify-content-between">
              <div className="d-flex flex-wrap align-items-center gap-2">
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

                {/* Date From */}
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

                {/* Date To */}
                <div className="input-group input-group-sm" style={{ width: "155px" }}>
                  <span className="input-group-text bg-light text-muted px-2">
                    <i className="bi bi-calendar-event me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>To</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                {/* Reset Filters */}
                {(startDate || endDate || stageFilter !== "All" || paymentFilter !== "All" || searchQuery) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-2 d-flex align-items-center gap-1"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setStageFilter("All");
                      setPaymentFilter("All");
                      setSearchQuery("");
                    }}
                    title="Clear Filters"
                  >
                    <i className="bi bi-x-circle"></i>
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Search */}
              <div style={{ width: "230px" }}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search name, phone, VIN, deal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="btn btn-outline-secondary border-start-0 bg-white"
                      type="button"
                      onClick={() => setSearchQuery("")}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              TAB 1 CONTENT: CUSTOMER & DEAL INVOICES REGISTER
              (EXACT SAME COLUMNS AND FIELDS AS VEHICLE DEALS & BOOKINGS PAGE)
              ========================================================================= */}
          {activeTab === "deals" && (
            <>
              <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="px-3" style={{ width: "175px" }}>Actions</th>
                    <th style={{ width: "110px" }}># Deal</th>
                    <th>Customer</th>
                    <th>Vehicle & Spec</th>
                    <th>Deal Financials</th>
                    <th style={{ width: "180px" }}>Payment Status</th>
                    <th>Delivery Stage</th>
                    <th>Delivery Date</th>
                    <th className="text-center" style={{ width: "120px" }}>Invoices</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "0.9rem" }}>
                  {isLoadingDeals ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        Loading vehicle deals & invoices...
                      </td>
                    </tr>
                  ) : filteredDeals.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary opacity-50"></i>
                        No vehicle deals found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedDeals.map((deal) => {
                      const pctPaid = deal.computedPercentPaid || 0;
                      return (
                        <tr key={deal.id || deal.deal_number}>
                          {/* 1. Actions */}
                          <td className="px-3">
                            <div className="d-flex align-items-center gap-2">
                              {deal.computedBalanceDue > 0 && (
                                <button
                                  type="button"
                                  className="btn btn-sm text-white fw-bold d-inline-flex align-items-center gap-1.5 shadow-sm px-2.5 py-1"
                                  style={{
                                    backgroundColor: "var(--primary, #58632A)",
                                    borderColor: "var(--primary, #58632A)",
                                    fontSize: "0.8rem",
                                  }}
                                  onClick={() => handleOpenGenerateForDeal(deal)}
                                  title="Add next invoice installment"
                                >
                                  <i className="bi bi-plus-circle"></i>
                                  <span>Add Bill</span>
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn-sm btn-light border d-inline-flex align-items-center shadow-none px-2.5 py-1"
                                onClick={() => setSelectedDealForMultiView(deal)}
                                title="View Deal Ledger"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            </div>
                          </td>

                          {/* 2. Deal ID Badge */}
                          <td>
                            <span className="badge bg-light text-primary border font-monospace px-2 py-1">
                              {deal.deal_number || `#${deal.id}`}
                            </span>
                          </td>

                          {/* 2. Customer Particulars */}
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

                          {/* 3. Vehicle & Spec Particulars */}
                          <td>
                            <div>
                              <div className="fw-semibold text-dark">{deal.model_variant}</div>
                              <div className="small text-muted d-flex align-items-center gap-1.5 mt-1 flex-wrap">
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

                          {/* 4. Deal Financials */}
                          <td>
                            <div>
                              <div className="fw-bold text-dark fs-6">
                                ₹{formatIndianCurrency(deal.net_amount || deal.total_amount)}
                              </div>
                              {deal.discount_amount > 0 && (
                                <div className="small text-success" style={{ fontSize: "11px" }}>
                                  Incl. ₹{formatIndianCurrency(deal.discount_amount)} disc.
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Payment Status & Progress */}
                          <td>
                            <div style={{ maxWidth: "170px" }}>
                              <div className="d-flex justify-content-between align-items-center small mb-1">
                                <span className="fw-semibold text-success" style={{ fontSize: "11px" }}>
                                  Paid: ₹{formatIndianCurrency(deal.computedTotalPaid || 0)}
                                </span>
                                <span className="fw-semibold text-danger" style={{ fontSize: "11px" }}>
                                  Due: ₹{formatIndianCurrency(deal.computedBalanceDue || 0)}
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
                                    deal.payment_status === "Fully Paid" || deal.computedBalanceDue === 0
                                      ? "bg-success text-white"
                                      : "bg-warning text-dark"
                                  } px-2 py-0.5`}
                                  style={{ fontSize: "10px" }}
                                >
                                  {deal.computedBalanceDue === 0 && deal.computedTotalPaid > 0 ? "Fully Paid" : deal.payment_status || "Partially Paid"}
                                </span>
                                <span className="text-muted" style={{ fontSize: "10px" }}>
                                  {pctPaid}%
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 6. Delivery Stage */}
                          <td>
                            <span className={`badge text-capitalize px-2 py-1 ${getStageBadgeClass(deal.deal_status)}`}>
                              {deal.deal_status?.replace(/_/g, " ") || "Booking Confirmed"}
                            </span>
                          </td>

                          {/* 7. Delivery Date */}
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

                          {/* 8. Invoices Count */}
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary px-2.5 py-1 d-inline-flex align-items-center gap-1 shadow-none"
                              onClick={() => setSelectedDealForMultiView(deal)}
                              title="View all invoices issued for this deal"
                            >
                              <i className="bi bi-receipt"></i>
                              <span className="fw-bold">{deal.invoicesCount} Bills</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

            </div>

            {!isLoadingDeals && filteredDeals.length > 0 && (
              <Pagination
                currentPage={dealsPage}
                lastPage={Math.max(1, Math.ceil(filteredDeals.length / dealsPerPage))}
                total={filteredDeals.length}
                perPage={dealsPerPage}
                onPageChange={(p) => setDealsPage(p)}
                onPerPageChange={(newPerPage) => {
                  setDealsPerPage(newPerPage);
                  setDealsPage(1);
                }}
                perPageOptions={[10, 20, 50, 100]}
                itemName="deals"
              />
            )}
          </>
          )}

          {/* =========================================================================
              TAB 2 CONTENT: ALL INVOICES REGISTER (DATE-WISE FLAT TABLE)
              ========================================================================= */}
          {activeTab === "all-invoices" && (
            <>
              <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="py-3 px-3" style={{ width: "50px" }}>#</th>
                    <th className="py-3 px-3" style={{ width: "130px" }}>Action</th>
                    <th className="py-3">Invoice No</th>
                    <th className="py-3">Date & Time</th>
                    <th className="py-3">Deal Number</th>
                    <th className="py-3">Customer</th>
                    <th className="py-3">Vehicle & Spec</th>
                    <th className="py-3">Payment Type</th>
                    <th className="py-3 text-end">Amount Paid</th>
                    <th className="py-3">Payment Mode & Ref</th>
                    <th className="py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "0.9rem" }}>
                  {filteredAllInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center py-5 text-muted">
                        <i className="bi bi-receipt fs-1 d-block mb-2 text-secondary opacity-50"></i>
                        No invoices found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedInvoices.map((inv, index) => (
                      <tr key={inv.id || inv.invoiceNo}>
                        <td className="px-3 text-muted small">
                          {(invoicesPage - 1) * invoicesPerPage + index + 1}
                        </td>

                        {/* Action */}
                        <td className="px-3">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark d-inline-flex align-items-center gap-1 shadow-sm px-2.5 py-1"
                            onClick={() => setSelectedInvoiceForSingleView(inv)}
                            title="View / Print Tax Invoice Voucher"
                          >
                            <i className="bi bi-file-earmark-text text-primary"></i>
                            <span>View Bill</span>
                          </button>
                        </td>

                        {/* Invoice No */}
                        <td>
                          <span
                            className="badge font-monospace px-2.5 py-1.5"
                            style={{
                              background: "#F7F7F5",
                              color: "#131C27",
                              border: "1px solid #D9DDCC",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                            }}
                          >
                            {inv.invoiceNo}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td>
                          <div className="fw-semibold text-dark">{inv.date}</div>
                          <small className="text-muted">{inv.time}</small>
                        </td>

                        {/* Deal Number */}
                        <td>
                          <span className="badge bg-light text-primary border font-monospace px-2 py-1">
                            {inv.dealNumber || "N/A"}
                          </span>
                        </td>

                        {/* Customer */}
                        <td>
                          <div className="fw-bold text-dark">{inv.customerName}</div>
                          <div className="text-muted small">
                            <i className="bi bi-telephone me-1"></i>
                            {inv.mobile}
                          </div>
                          {inv.city && (
                            <div className="small text-secondary" style={{ fontSize: "11px" }}>
                              <i className="bi bi-geo-alt me-1"></i>{inv.city}
                            </div>
                          )}
                        </td>

                        {/* Vehicle & Spec */}
                        <td>
                          <div className="fw-semibold text-dark">{inv.vehicle}</div>
                          <div className="small text-muted d-flex align-items-center gap-1.5 mt-1">
                            <span className="badge bg-light text-dark border">
                              {inv.color || "Standard"}
                            </span>
                            {inv.vin && (
                              <span className="badge bg-light text-secondary border font-monospace">
                                {inv.vin}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Installment Stage */}
                        <td>
                          <span className="badge bg-light text-dark border fw-semibold">
                            {inv.installmentTitle}
                          </span>
                        </td>

                        {/* Amount Paid */}
                        <td className="text-end fw-bold text-success fs-6">
                          ₹{formatIndianCurrency(inv.amountPaid)}
                        </td>

                        {/* Payment Mode & Ref */}
                        <td>
                          <div className="fw-semibold text-dark">{inv.paymentMode}</div>
                          <div className="font-monospace text-muted small">
                            {inv.paymentMode?.toLowerCase() === "cash" ? "Cash Receipt" : inv.transactionRef}
                          </div>
                          {inv.receivedBy && (
                            <div className="text-muted" style={{ fontSize: "11px" }}>
                              Rec: {inv.receivedBy}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="text-center">
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            <i className="bi bi-check2-circle me-1"></i>Paid
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

            </div>

            {!isLoadingDeals && filteredAllInvoices.length > 0 && (
              <Pagination
                currentPage={invoicesPage}
                lastPage={Math.max(1, Math.ceil(filteredAllInvoices.length / invoicesPerPage))}
                total={filteredAllInvoices.length}
                perPage={invoicesPerPage}
                onPageChange={(p) => setInvoicesPage(p)}
                onPerPageChange={(newPerPage) => {
                  setInvoicesPerPage(newPerPage);
                  setInvoicesPage(1);
                }}
                perPageOptions={[10, 20, 50, 100]}
                itemName="invoices"
              />
            )}
          </>
          )}
        </div>

        {/* =====================================================================
            MODAL 1: GENERATE / ADD INVOICE MODAL
            ===================================================================== */}
        {isGenerateModalOpen && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(19, 28, 39, 0.65)", zIndex: 1050 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <form
                onSubmit={handleSaveInvoice}
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
                    onClick={() => setIsGenerateModalOpen(false)}
                  ></button>
                </div>

                {/* Body */}
                <div className="modal-body px-4 py-3">
                  {/* Deal Selector Dropdown */}
                  <div className="mb-3 position-relative" ref={dealDropdownRef}>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="form-label fw-bold text-dark small mb-0">
                        Select Vehicle Deal <span className="text-danger">*</span>
                      </label>
                      {isDealLocked && (
                        <span className="badge bg-secondary-subtle text-secondary small fw-normal">
                          <i className="bi bi-lock-fill me-1"></i>Deal Locked
                        </span>
                      )}
                    </div>
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        {isDealLocked ? (
                          <i className="bi bi-lock-fill text-muted"></i>
                        ) : (
                          <i className="bi bi-car-front-fill text-primary"></i>
                        )}
                      </span>
                      <input
                        type="text"
                        className={`form-control ${isDealLocked ? "bg-light text-muted" : ""}`}
                        placeholder={
                          isDealLocked
                            ? "Deal locked for this invoice"
                            : "Search & choose deal by customer name or deal number..."
                        }
                        value={dealSearchQuery}
                        disabled={isDealLocked}
                        readOnly={isDealLocked}
                        onChange={(e) => {
                          if (isDealLocked) return;
                          setDealSearchQuery(e.target.value);
                          setIsDealDropdownOpen(true);
                        }}
                        onFocus={() => {
                          if (!isDealLocked) setIsDealDropdownOpen(true);
                        }}
                        required
                      />
                    </div>

                    {!isDealLocked && isDealDropdownOpen && (
                      <div
                        className="dropdown-menu show w-100 shadow-lg border rounded-3 p-1 mt-1 position-absolute"
                        style={{
                          maxHeight: "260px",
                          overflowY: "auto",
                          zIndex: 1100,
                        }}
                      >
                        {enrichedDeals
                          .filter((d) => {
                            if (!dealSearchQuery) return true;
                            const q = dealSearchQuery.toLowerCase();
                            return (
                              d.customer_name?.toLowerCase().includes(q) ||
                              d.deal_number?.toLowerCase().includes(q) ||
                              d.model_variant?.toLowerCase().includes(q) ||
                              d.customer_phone?.toLowerCase().includes(q)
                            );
                          })
                          .slice(0, 15)
                          .map((d) => (
                            <button
                              type="button"
                              key={d.id}
                              className="dropdown-item p-2 rounded-2 text-start d-flex justify-content-between align-items-center"
                              onClick={() => handleSelectDeal(d)}
                            >
                              <div>
                                <strong className="text-dark d-block">
                                  {d.customer_name}{" "}
                                  <span className="text-muted fw-normal">({d.customer_phone})</span>
                                </strong>
                                <small className="text-primary">{d.model_variant} • Color: {d.color || "Std"}</small>
                              </div>
                              <div className="text-end">
                                <span className="badge bg-light text-dark font-monospace border mb-1">
                                  {d.deal_number}
                                </span>
                                {d.computedBalanceDue <= 0 ? (
                                  <div className="small text-success fw-bold">Fully Paid</div>
                                ) : (
                                  <div className="small text-danger fw-bold">
                                    Due: ₹{formatIndianCurrency(d.computedBalanceDue)}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
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

                  {/* Customer & Vehicle Info Snapshot (Exact Deal & Booking Fields) */}
                  {selectedDealObject && (
                    <div className="p-3 bg-light rounded border mb-3">
                      <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                        <span className="fw-bold text-dark small">
                          <i className="bi bi-info-circle-fill text-primary me-1"></i>
                          Selected Deal Particulars ({selectedDealObject.deal_number})
                        </span>
                        <span className={`badge text-capitalize ${getStageBadgeClass(selectedDealObject.deal_status)}`}>
                          Stage: {selectedDealObject.deal_status?.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="row g-2">
                        <div className="col-12 col-md-4">
                          <label className="form-label small mb-0 text-muted">Customer Name</label>
                          <div className="fw-bold text-dark">{selectedDealObject.customer_name}</div>
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label small mb-0 text-muted">Customer Phone</label>
                          <div className="fw-semibold text-dark">{selectedDealObject.customer_phone || "-"}</div>
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label small mb-0 text-muted">City & State</label>
                          <div className="small text-dark">{selectedDealObject.customer_city || "Gujarat"}</div>
                        </div>
                        <div className="col-12 col-md-6 mt-2">
                          <label className="form-label small mb-0 text-muted">Vehicle Model & Variant</label>
                          <div className="fw-bold text-primary">{selectedDealObject.model_variant}</div>
                        </div>
                        <div className="col-12 col-md-3 mt-2">
                          <label className="form-label small mb-0 text-muted">Color</label>
                          <div className="text-dark fw-semibold">{selectedDealObject.color || "Standard"}</div>
                        </div>
                        <div className="col-12 col-md-3 mt-2">
                          <label className="form-label small mb-0 text-muted">Insurance</label>
                          <div>
                            {selectedDealObject.has_insurance === "Yes" ? (
                              <span className="badge bg-success-subtle text-success">Insurance: Yes</span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-muted">Insurance: No</span>
                            )}
                          </div>
                        </div>
                        <div className="col-12 col-md-4 mt-2">
                          <label className="form-label small mb-0 text-muted">Total Deal Net Amount</label>
                          <div className="fw-bold text-dark">₹{formatIndianCurrency(selectedDealObject.net_amount || selectedDealObject.total_amount)}</div>
                        </div>
                        <div className="col-12 col-md-4 mt-2">
                          <label className="form-label small mb-0 text-muted">Already Paid</label>
                          <div className="fw-bold text-success">₹{formatIndianCurrency(selectedDealObject.computedTotalPaid)}</div>
                        </div>
                        <div className="col-12 col-md-4 mt-2">
                          <label className="form-label small mb-0 text-muted">Balance Due</label>
                          <div className="fw-bold text-danger">₹{formatIndianCurrency(selectedDealObject.computedBalanceDue)}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Details */}
                  <div className="row g-2 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small mb-1 fw-bold text-dark">
                        Payment Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={formInstallmentTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormInstallmentTitle(val);
                          setFormLineItems((prev) =>
                            prev.map((item, idx) =>
                              idx === 0
                                ? {
                                    ...item,
                                    desc: selectedDealObject
                                      ? `${val} for ${selectedDealObject.model_variant || "Vehicle"} (${selectedDealObject.deal_number})`
                                      : `${val} Payment`,
                                  }
                                : item
                            )
                          );
                          if (selectedDealObject) {
                            setFormRemarks(`${val} payment for Deal ${selectedDealObject.deal_number} - Customer: ${selectedDealObject.customer_name}`);
                          }
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
                        {selectedDealObject && (
                          <span className="text-muted fw-normal ms-1">
                            (Due: ₹{formatIndianCurrency(selectedDealObject.computedBalanceDue)})
                          </span>
                        )}
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
                    onClick={() => setIsGenerateModalOpen(false)}
                    disabled={isSubmittingInvoice}
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
                    disabled={isSubmittingInvoice}
                  >
                    {isSubmittingInvoice ? (
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

        {/* =====================================================================
            MODAL 2: VIEW ALL INVOICES FOR A SINGLE DEAL
            ===================================================================== */}
        {selectedDealForMultiView && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(19, 28, 39, 0.65)", zIndex: 1050 }}
          >
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "14px", overflow: "hidden" }}>
                {/* Header */}
                <div
                  className="modal-header px-4 py-3"
                  style={{
                    backgroundColor: "#131C27",
                    color: "#DCE9A2",
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "42px",
                        height: "42px",
                        background: "rgba(220, 233, 162, 0.2)",
                        color: "#DCE9A2",
                      }}
                    >
                      <i className="bi bi-collection-fill fs-5"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold text-white mb-0">
                        Deal Ledger & Invoices: {selectedDealForMultiView.deal_number}
                      </h5>
                      <span className="small" style={{ color: "#DCE9A2" }}>
                        Customer: {selectedDealForMultiView.customer_name} • {selectedDealForMultiView.model_variant}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedDealForMultiView(null)}
                  ></button>
                </div>

                {/* Body */}
                <div className="modal-body px-4 py-4">
                  {/* Financial Summary */}
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-4">
                      <div className="card bg-light border-0 p-3 rounded">
                        <span className="small text-muted text-uppercase fw-semibold">Net Deal Amount</span>
                        <h4 className="fw-bold text-dark my-1">
                          ₹{formatIndianCurrency(selectedDealForMultiView.net_amount || selectedDealForMultiView.total_amount)}
                        </h4>
                        <span className="small text-muted">{selectedDealForMultiView.model_variant}</span>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="card bg-success-subtle border-0 p-3 rounded">
                        <span className="small text-success text-uppercase fw-semibold">Total Paid</span>
                        <h4 className="fw-bold text-success my-1">
                          ₹{formatIndianCurrency(selectedDealForMultiView.computedTotalPaid)}
                        </h4>
                        <span className="small text-success">
                          {selectedDealForMultiView.invoicesCount} Invoices Cleared
                        </span>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="card bg-danger-subtle border-0 p-3 rounded">
                        <span className="small text-danger text-uppercase fw-semibold">Balance Due</span>
                        <h4 className="fw-bold text-danger my-1">
                          ₹{formatIndianCurrency(selectedDealForMultiView.computedBalanceDue)}
                        </h4>
                        <span className="small text-danger">Pending Receivables</span>
                      </div>
                    </div>
                  </div>

                  {/* Table of Invoices */}
                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <i className="bi bi-receipt text-primary"></i>
                    All Invoices Issued for this Deal ({selectedDealForMultiView.invoicesCount} Invoices)
                  </h6>

                  <div className="table-responsive border rounded">
                    <table className="table align-middle mb-0 table-hover">
                      <thead className="table-light small text-uppercase">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th>Invoice No</th>
                          <th>Date</th>
                          <th>Payment Type</th>
                          <th>Payment Mode</th>
                          <th>Reference / UTR</th>
                          <th className="text-end">Amount Paid</th>
                          <th className="text-center">Status</th>
                          <th className="text-end px-3">Action</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: "0.88rem" }}>
                        {(selectedDealForMultiView.invoices || []).map((inv, idx) => (
                          <tr key={inv.id || idx}>
                            <td className="px-3 text-muted fw-bold">{idx + 1}</td>
                            <td>
                              <span className="badge font-monospace bg-light text-dark border fw-bold">
                                {inv.invoiceNo}
                              </span>
                            </td>
                            <td>{inv.date}</td>
                            <td className="fw-semibold text-dark">{inv.installmentTitle}</td>
                            <td>{inv.paymentMode}</td>
                            <td className="font-monospace text-muted small">
                              {inv.paymentMode?.toLowerCase() === "cash" ? "Cash Receipt" : inv.transactionRef}
                            </td>
                            <td className="text-end fw-bold text-success">₹{formatIndianCurrency(inv.amountPaid)}</td>
                            <td className="text-center">
                              <span className="badge bg-success-subtle text-success">Paid</span>
                            </td>
                            <td className="text-end px-3">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-dark d-inline-flex align-items-center gap-1"
                                onClick={() => {
                                  setSelectedInvoiceForSingleView({
                                    ...inv,
                                    dealNumber: selectedDealForMultiView.deal_number,
                                    customerName: selectedDealForMultiView.customer_name,
                                    mobile: selectedDealForMultiView.customer_phone,
                                    email: selectedDealForMultiView.customer_email,
                                    city: selectedDealForMultiView.customer_city,
                                    vehicle: selectedDealForMultiView.model_variant,
                                    color: selectedDealForMultiView.color,
                                    vin: selectedDealForMultiView.vin_chassis_number,
                                    regNo: selectedDealForMultiView.registration_number,
                                    totalDealAmount: selectedDealForMultiView.net_amount || selectedDealForMultiView.total_amount,
                                    parentDeal: selectedDealForMultiView,
                                  });
                                }}
                              >
                                <i className="bi bi-file-earmark-text text-primary"></i>
                                <span>View Bill</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div className="modal-footer px-4 py-3 bg-light d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSelectedDealForMultiView(null)}
                  >
                    Close
                  </button>

                  {selectedDealForMultiView.computedBalanceDue > 0 ? (
                    <button
                      type="button"
                      className="btn text-white fw-bold shadow-sm d-flex align-items-center gap-2"
                      style={{
                        backgroundColor: "var(--primary, #58632A)",
                        borderColor: "var(--primary, #58632A)",
                      }}
                      onClick={() => {
                        const d = selectedDealForMultiView;
                        setSelectedDealForMultiView(null);
                        handleOpenGenerateForDeal(d);
                      }}
                    >
                      <i className="bi bi-plus-circle-fill"></i>
                      <span>Add Next Installment Invoice</span>
                    </button>
                  ) : (
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-semibold">
                      <i className="bi bi-check-circle-fill me-1"></i>All Payments Completed (Fully Paid)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODAL 3: VIEW & PRINT OFFICIAL DAL TAX INVOICE VOUCHER
            ===================================================================== */}
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
                      className="btn btn-sm btn-warning fw-bold d-flex align-items-center gap-1 shadow-sm"
                      onClick={handlePrintInvoice}
                    >
                      <i className="bi bi-printer-fill"></i>
                      <span>Print / Export PDF</span>
                    </button>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setSelectedInvoiceForSingleView(null)}
                    ></button>
                  </div>
                </div>

                {/* Printable Invoice Container */}
                <div className="modal-body p-4 bg-white" id="printableInvoiceArea">
                  {/* Invoice Header */}
                  <div className="border-bottom pb-3 mb-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <img
                            src="/image/logo.png"
                            alt="Defence Autolink"
                            style={{ height: "42px", objectFit: "contain" }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <span
                            className="fs-4 fw-bold"
                            style={{ color: "#131C27", letterSpacing: "0.5px" }}
                          >
                            DEFENCE AUTOLINK
                          </span>
                        </div>
                        <div className="small text-muted" style={{ lineHeight: "1.4" }}>
                          Multi-Brand Automotive CSD AFD Assistance Services<br />
                          Main Ring Road Showroom, South Extension Part-II, New Delhi – 110049<br />
                          GSTIN: <strong>07AAAAA0000A1Z5</strong> • Email: contact@defenceautolink.com
                        </div>
                      </div>

                      <div className="text-end">
                        <span
                          className="badge text-uppercase px-3 py-1.5 mb-2 d-inline-block"
                          style={{
                            backgroundColor: "var(--primary, #58632A)",
                            color: "#FFFFFF",
                            fontSize: "0.85rem",
                            letterSpacing: "0.5px",
                          }}
                        >
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

                  {/* Payment Details & Multi-Bill Status */}
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
                      onClick={handlePrintInvoice}
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
