"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import api from "@/lib/axios";
import quotationApi from "@/lib/quotationApi";
import ConvertDealModal from "../ConvertDealModal";
import discountApprovalApi from "@/services/discountApprovalApi";
import { formatIndianCurrency } from "@/utils/numberToWords";

export const renderLeadStatusBadge = (statusName, extraClasses = "") => {
  const s = (statusName || "New").trim();
  const sLower = s.toLowerCase();
  if (sLower === "new") {
    return (
      <span
        className={`badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold ${extraClasses}`}
        style={{ fontSize: "12px", padding: "4px 10px" }}
      >
        <i className="bi bi-stars me-1"></i>New
      </span>
    );
  }
  if (sLower.includes("follow") || sLower.includes("discount")) {
    return (
      <span
        className={`badge bg-warning-subtle text-dark border border-warning-subtle fw-semibold ${extraClasses}`}
        style={{ fontSize: "12px", padding: "4px 10px" }}
      >
        <i className="bi bi-telephone-forward me-1"></i>Follow-up
      </span>
    );
  }
  if (sLower.includes("quotation") || sLower.includes("quote")) {
    return (
      <span
        className={`badge bg-info-subtle text-dark border border-info-subtle fw-semibold ${extraClasses}`}
        style={{ fontSize: "12px", padding: "4px 10px" }}
      >
        <i className="bi bi-file-earmark-spreadsheet me-1"></i>Quotation Sent
      </span>
    );
  }
  if (sLower.includes("deal") || sLower.includes("booking") || sLower.includes("won")) {
    return (
      <span
        className={`badge bg-success-subtle text-success border border-success-subtle fw-semibold ${extraClasses}`}
        style={{ fontSize: "12px", padding: "4px 10px" }}
      >
        <i className="bi bi-trophy-fill me-1"></i>Deal & Booking
      </span>
    );
  }
  if (sLower.includes("lost")) {
    return (
      <span
        className={`badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold ${extraClasses}`}
        style={{ fontSize: "12px", padding: "4px 10px" }}
      >
        <i className="bi bi-x-circle-fill me-1"></i>Lost
      </span>
    );
  }
  return (
    <span
      className={`badge bg-secondary-subtle text-dark border border-secondary fw-semibold ${extraClasses}`}
      style={{ fontSize: "12px", padding: "4px 10px" }}
    >
      {s}
    </span>
  );
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const leadId = params?.id;
  const searchParams = useSearchParams();
  const fromParam = searchParams ? searchParams.get("from") : null;

  // Resolve dynamic Back destination & label based on where user came from (Task 2)
  const backDestination = useMemo(() => {
    if (fromParam) {
      const f = fromParam.toLowerCase();
      if (f.includes("follow")) return { label: "Follow-Ups", path: "/admin/follow-up" };
      if (f.includes("quote") || f.includes("quotation")) return { label: "Quotations", path: "/admin/quotation" };
      if (f.includes("deal")) return { label: "Deals & Bookings", path: "/admin/deals" };
      if (f.includes("invoice")) return { label: "Invoices", path: "/admin/invoice" };
      if (fromParam.startsWith("/")) return { label: "Previous Page", path: fromParam };
    }
    if (typeof window !== "undefined" && document.referrer) {
      const ref = document.referrer.toLowerCase();
      if (ref.includes("/follow-up")) return { label: "Follow-Ups", path: "/admin/follow-up" };
      if (ref.includes("/quotation")) return { label: "Quotations", path: "/admin/quotation" };
      if (ref.includes("/deals")) return { label: "Deals & Bookings", path: "/admin/deals" };
      if (ref.includes("/invoice")) return { label: "Invoices", path: "/admin/invoice" };
    }
    return { label: "Leads Pipeline", path: "/admin/leads" };
  }, [fromParam]);

  const handleGoBack = () => {
    if (fromParam) {
      router.push(backDestination.path);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1 && document.referrer && !document.referrer.includes(`/admin/leads/${leadId}`)) {
      window.history.back();
      return;
    }
    router.push(backDestination.path);
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  const [lead, setLead] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Collapsible sections state (All open by default)
  const [openSections, setOpenSections] = useState({
    followups: true,
    quotations: true,
    assignments: true,
    insurance: true,
    invoices: true,
  });

  // Single Invoice Preview State
  const [selectedInvoiceForSingleView, setSelectedInvoiceForSingleView] = useState(null);

  // Print Lead 360 Handler
  const handlePrintLeadProfile = () => {
    // Open all collapsible sections so entire 360 content is visible in print
    setOpenSections({
      followups: true,
      quotations: true,
      assignments: true,
      insurance: true,
      invoices: true,
    });
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print();
      }
    }, 350);
  };

  // Derive primary deal and all invoices for this lead (Task 2)
  const { primaryDeal, leadInvoices } = useMemo(() => {
    if (!lead) return { primaryDeal: null, leadInvoices: [] };

    // Find deal: from lead.deals array or lead.latestDeal / lead.latest_deal
    const dealList = Array.isArray(lead.deals) && lead.deals.length > 0
      ? lead.deals
      : (lead.latestDeal ? [lead.latestDeal] : (lead.latest_deal ? [lead.latest_deal] : []));

    const deal = dealList[0] || null;

    // Collect payments from deal.payments or lead.payments
    let payments = [];
    if (deal && Array.isArray(deal.payments) && deal.payments.length > 0) {
      payments = deal.payments;
    } else if (Array.isArray(lead.payments) && lead.payments.length > 0) {
      payments = lead.payments;
    }

    const formattedInvoices = payments
      .filter((p) => p.status !== "rejected")
      .map((p, idx) => {
        const invDate = p.payment_date || (p.created_at ? p.created_at.split("T")[0] : new Date().toISOString().split("T")[0]);
        const invNo = p.invoice_no || `DAL-/${new Date(invDate).getFullYear()}/${String(new Date(invDate).getMonth() + 1).padStart(2, "0")}/${String(1000 + (p.id || idx + 1))}`;
        let installmentTitle = "Installment Payment";
        if (p.payment_type) {
          installmentTitle = p.payment_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        }
        const amt = Number(p.amount) || 0;

        return {
          id: p.id || idx + 1,
          invoiceNo: invNo,
          date: invDate,
          time: p.created_at ? new Date(p.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "12:00 PM",
          installmentTitle,
          paymentMode: (p.payment_mode || "UPI").toUpperCase(),
          transactionRef: p.transaction_reference || p.reference_no || (p.payment_mode?.toLowerCase() === "cash" ? "Cash Receipt" : "VERIFIED-REF"),
          bankName: p.bank_name || "HDFC Bank",
          receivedBy: p.received_by || p.recorded_by_name || "Accounts",
          amountPaid: amt,
          status: p.payment_type === "refund" ? "Refunded" : "Paid",
          dealNumber: deal?.deal_number || "DEAL-PENDING",
          customerName: lead.name,
          mobile: lead.phone,
          email: lead.email,
          city: lead.city,
          vehicle: deal?.model_variant || lead.model_variant || "Vehicle",
          color: deal?.color || "Standard",
          vin: deal?.vin_chassis_number || "—",
          regNo: deal?.registration_number || "—",
          totalDealAmount: deal ? (deal.net_amount || deal.total_amount) : (lead.budget || 0),
          items: [
            {
              desc: `${installmentTitle} for ${deal?.model_variant || lead.model_variant || "Vehicle"}`,
              hsn: "998313",
              qty: 1,
              rate: amt,
              amount: amt,
            },
          ],
          remarks: p.notes || `Installment payment for ${lead.name}`,
        };
      });

    return { primaryDeal: deal, leadInvoices: formattedInvoices };
  }, [lead]);

  // Insurance history state
  const [insurances, setInsurances] = useState([]);
  const [isLoadingInsurance, setIsLoadingInsurance] = useState(false);

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Follow-up state
  const [followUps, setFollowUps] = useState([]);
  const getTodayDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getCurrentTimeFormatted = () => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    outcome: "Interested / Call Back",
    type: "Phone Call",
    follow_up_date: "",
    follow_up_time: "",
    next_follow_up_date: "",
    next_follow_up_time: "10:00 AM",
    notes: "",
    request_discount: false,
    discount_amount: "",
    proposed_price: "",
    discount_reason: "",
  });

  const handleOpenFollowUpModal = () => {
    const today = getTodayDate();
    const nowTime = getCurrentTimeFormatted();
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3);
    const nextDateStr = nextDate.toISOString().split("T")[0];

    setFollowUpForm({
      outcome: "Interested / Call Back",
      type: "Phone Call",
      follow_up_date: today,
      follow_up_time: nowTime,
      next_follow_up_date: nextDateStr,
      next_follow_up_time: "10:00 AM",
      notes: "",
      request_discount: false,
      discount_amount: "",
      proposed_price: "",
      discount_reason: "",
    });
    setShowFollowUpModal(true);
  };

  // Quotations state
  const [quotations, setQuotations] = useState([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);

  // Safe resolver for quotation grand total across all backend response variations
  const getQuotationAmount = (q) => {
    if (!q) return 0;
    const directAmt = Number(
      q.grand_total ||
      q.total_amount ||
      q.final_price ||
      q.total ||
      q.subtotal ||
      0
    );
    if (directAmt > 0) return directAmt;
    if (Array.isArray(q.items) && q.items.length > 0) {
      const itemsSum = q.items.reduce(
        (sum, it) =>
          sum +
          (Number(it.total) ||
            Number(it.unit_price || 0) * Number(it.quantity || 1) -
            Number(it.discount || 0)),
        0
      );
      if (itemsSum > 0) return itemsSum;
    }
    return 0;
  };

  // Delete Confirmation Target: { type: 'lead' | 'followup' | 'quotation', id, title }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Unified Follow-Up & Quotation History Timeline -> Pure Follow-Up History only (Task 1)
  const pureFollowUps = useMemo(() => {
    const list = [...(followUps || [])].sort((a, b) => {
      const dateA = new Date(a.follow_up_date || a.created_at || 0).getTime();
      const dateB = new Date(b.follow_up_date || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    const seenQuotes = new Set();
    return list.filter((fu) => {
      const isQuote =
        (fu.type || "").toLowerCase().includes("quotation") ||
        (fu.status || "").toLowerCase().includes("quotation") ||
        (fu.outcome || "").toLowerCase().includes("quotation") ||
        Boolean(fu.quotation_id);

      if (isQuote) {
        const match = fu.notes ? fu.notes.match(/#[A-Za-z0-9-]+/) : null;
        const key = fu.quotation_id ? String(fu.quotation_id) : (match ? match[0] : `${fu.follow_up_date}_quote`);
        if (seenQuotes.has(key)) {
          return false;
        }
        seenQuotes.add(key);
      }
      return true;
    });
  }, [followUps]);

  // Assignment history state
  const [assignments, setAssignments] = useState([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Convert Deal Modal state
  const [showConvertModal, setShowConvertModal] = useState(false);

  // 1. Fetch Lead Details
  const fetchLeadDetails = async () => {
    if (!leadId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/leads/${leadId}`).catch((e) => {
        if (e.response?.status === 403) {
          return api.get(`/sales-executive/leads/${leadId}`).catch(() => null);
        }
        return null;
      });
      const rawLead = res?.data?.data || res?.data;
      if (rawLead) {
        const localPostings = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("csd_lead_postings_cache") || "{}") : {};
        const populatedLead = {
          ...rawLead,
          posting: rawLead.posting || localPostings[rawLead.id] || "",
          home_town: rawLead.home_town || rawLead.city || "",
        };
        setLead(populatedLead);
        fetchInsurances(populatedLead);
      }
    } catch (err) {
      console.error("Error fetching lead detail:", err);
      // Fallback: try fetching all leads and find this one
      try {
        const fallbackRes = await api.get("/leads");
        if (fallbackRes.data && fallbackRes.data.data) {
          const found = fallbackRes.data.data.find((item) => String(item.id) === String(leadId));
          if (found) {
            const localPostings = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("csd_lead_postings_cache") || "{}") : {};
            const populatedFound = {
              ...found,
              posting: found.posting || localPostings[found.id] || "",
              home_town: found.home_town || found.city || "",
            };
            setLead(populatedFound);
            fetchInsurances(populatedFound);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
      showToast("Unable to load lead details.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Follow-ups
  const fetchFollowUps = async () => {
    if (!leadId) return;
    setIsLoadingFollowUps(true);
    try {
      let res;
      try {
        res = await api.get(`/leads/${leadId}/follow-ups`);
      } catch {
        res = await api.get(`/sales-executive/leads/${leadId}/follow-ups`).catch(() => null);
      }

      if (res && res.data && res.data.data) {
        setFollowUps(res.data.data);
      } else {
        // Check global follow-ups filtered
        const allFu = await api.get("/follow-ups").catch(() => null);
        if (allFu && allFu.data && allFu.data.data) {
          const filtered = allFu.data.data.filter(
            (fu) => String(fu.lead_id) === String(leadId) || (fu.lead && String(fu.lead.id) === String(leadId))
          );
          setFollowUps(filtered);
        }
      }
    } catch (err) {
      console.error("Error fetching followups:", err);
    } finally {
      setIsLoadingFollowUps(false);
    }
  };

  // 3. Fetch Quotations
  const fetchQuotations = async () => {
    if (!leadId) return;
    setIsLoadingQuotations(true);
    try {
      const res = await quotationApi.getQuotations({ lead_id: leadId });
      if (res && res.data) {
        setQuotations(Array.isArray(res.data) ? res.data : res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching quotations:", err);
    } finally {
      setIsLoadingQuotations(false);
    }
  };

  // 3.5 Fetch Insurances & Policy History
  const fetchInsurances = async (leadData = null) => {
    if (!leadId) return;
    setIsLoadingInsurance(true);
    try {
      const currentLead = leadData || lead;
      // Fetch all insurance records (bypass 15-day expiry restriction with all: 1, status: 'all')
      const res = await api.get("/insurances", { params: { all: 1, status: "all" } }).catch(() => null);
      let list = [];
      if (res && res.data) {
        list = Array.isArray(res.data) ? res.data : (res.data.data || []);
      }
      const leadPhone = currentLead?.phone ? String(currentLead.phone).trim() : "";

      const currentLeadName = currentLead?.name ? String(currentLead.name).trim().toLowerCase() : "";

      const matched = list.filter((ins) => {
        // 1. Direct lead_id or customer_id matching
        if (String(ins.customer_id) === String(leadId) || String(ins.lead_id) === String(leadId)) return true;
        
        // 2. Deal ID matching with this lead's deals
        if (currentLead?.deals && Array.isArray(currentLead.deals)) {
          const matchDeal = currentLead.deals.some(
            (d) => String(d.id) === String(ins.deal_id) || (d.deal_number && String(d.deal_number) === String(ins.deal_id))
          );
          if (matchDeal) return true;
        }

        // 3. Fallback: Phone matching ONLY if customer name also matches (prevents shared dummy phone leakage)
        if (
          leadPhone &&
          currentLeadName &&
          (String(ins.customer_number || "").trim() === leadPhone || String(ins.customer_phone || "").trim() === leadPhone) &&
          String(ins.customer_name || "").trim().toLowerCase() === currentLeadName
        ) {
          return true;
        }

        return false;
      });

      // Also incorporate any insurances directly attached to lead or deals
      if (currentLead?.insurances && Array.isArray(currentLead.insurances)) {
        currentLead.insurances.forEach((di) => {
          if (!matched.some((m) => String(m.id) === String(di.id))) {
            matched.push(di);
          }
        });
      }
      if (currentLead?.deals && Array.isArray(currentLead.deals)) {
        currentLead.deals.forEach((d) => {
          if (d.insurances && Array.isArray(d.insurances)) {
            d.insurances.forEach((di) => {
              if (!matched.some((m) => String(m.id) === String(di.id))) {
                matched.push(di);
              }
            });
          }
        });
      }

      setInsurances(matched);
    } catch (err) {
      console.error("Error fetching insurances:", err);
    } finally {
      setIsLoadingInsurance(false);
    }
  };

  // 4. Fetch Assignments History
  const fetchAssignments = async () => {
    if (!leadId) return;
    setIsLoadingAssignments(true);
    try {
      const res = await api.get(`/leads/${leadId}/assignments`).catch(() => null);
      if (res && res.data && res.data.data) {
        setAssignments(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        const r = (u.role || "").toLowerCase();
        if (r.includes("executive") || r.includes("sales_executive") || r === "sales") {
          router.replace(`/sales-executive/leads/${leadId}`);
          return;
        }
      } catch (_) {}
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeadDetails();
    fetchFollowUps();
    fetchQuotations();
    fetchAssignments();
    fetchInsurances();

    const handleInsuranceSync = () => {
      fetchLeadDetails();
      fetchInsurances();
    };
    window.addEventListener("csd_insurances_updated", handleInsuranceSync);
    window.addEventListener("csd_deals_updated", handleInsuranceSync);
    return () => {
      window.removeEventListener("csd_insurances_updated", handleInsuranceSync);
      window.removeEventListener("csd_deals_updated", handleInsuranceSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  // Submit Follow-up Log
  const handleSubmitFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpForm.notes.trim()) {
      showToast("Please enter interaction notes / remarks.", "error");
      return;
    }

    setIsSubmittingFollowUp(true);
    try {
      const payload = {
        lead_id: leadId,
        type: followUpForm.type,
        status: followUpForm.outcome,
        outcome: followUpForm.outcome,
        follow_up_date: followUpForm.follow_up_date,
        follow_up_time: followUpForm.follow_up_time,
        next_follow_up_date: followUpForm.next_follow_up_date || null,
        next_follow_up_time: followUpForm.next_follow_up_time || null,
        notes: followUpForm.notes.trim(),
        remarks: followUpForm.notes.trim(),
        lead_status_name: "Follow-up",
        is_discount_requested: Boolean(followUpForm.request_discount),
        discount_amount: followUpForm.request_discount && followUpForm.discount_amount ? Number(followUpForm.discount_amount) : null,
        proposed_price: followUpForm.proposed_price ? Number(followUpForm.proposed_price) : null,
        reason: followUpForm.discount_reason || followUpForm.notes.trim() || "Customer demanded discount during follow-up call",
      };

      await api.post("/follow-ups", payload);

      window.dispatchEvent(new Event("csd_approvals_updated"));

      showToast(
        followUpForm.request_discount
          ? `Follow-up logged & discount request (₹${Number(followUpForm.discount_amount).toLocaleString("en-IN")}) sent to Sales Manager & Admin!`
          : "Follow-up call interaction recorded!",
        "success"
      );
      setShowFollowUpModal(false);
      const today = getTodayDate();
      const nowTime = getCurrentTimeFormatted();
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 3);
      const nextDateStr = nextDate.toISOString().split("T")[0];

      setFollowUpForm({
        outcome: "Interested / Call Back",
        type: "Phone Call",
        follow_up_date: today,
        follow_up_time: nowTime,
        next_follow_up_date: nextDateStr,
        next_follow_up_time: "10:00 AM",
        notes: "",
        request_discount: false,
        discount_amount: "",
        proposed_price: "",
        discount_reason: "",
      });
      fetchFollowUps();
      fetchLeadDetails();
    } catch (err) {
      console.error("Error creating follow-up:", err);
      showToast("Failed to record follow-up interaction.", "error");
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  // Delete Action Handler (Task 5)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "lead") {
        await api.delete(`/leads/${deleteTarget.id}`);
        showToast("Lead deleted successfully", "success");
        setDeleteTarget(null);
        router.push("/admin/leads");
        return;
      } else if (deleteTarget.type === "followup") {
        await api.delete(`/follow-ups/${deleteTarget.id}`);
        showToast("Follow-up interaction deleted", "success");
        fetchFollowUps();
      } else if (deleteTarget.type === "quotation") {
        await api.delete(`/quotations/${deleteTarget.id}`);
        showToast("Quotation deleted successfully", "success");
        fetchQuotations();
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err?.response?.data?.message || "Failed to delete item", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container-fluid py-5 text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 text-muted">Loading complete customer lead 360 profile...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!lead) {
    return (
      <AdminLayout>
        <div className="container-fluid py-5 text-center">
          <i className="bi bi-exclamation-triangle text-warning display-4"></i>
          <h4 className="mt-3 text-dark">Lead Record Not Found</h4>
          {/* <p className="text-muted">The requested lead ID #{leadId} does not exist or has been deleted.</p> */}
          <Link href="/admin/leads" className="btn btn-primary mt-2">
            <i className="bi bi-arrow-left me-1"></i> Back to Leads Pipeline
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Print Stylesheet for Lead 360 Sheet - Multi-Page Flow */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }

          /* Reset all parent containers so the page paginates across multiple pages */
          html,
          body,
          #__next,
          .app-wrapper,
          .app-main-content,
          main {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            position: static !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide sidebar, headers, navigation bars, buttons, and popups */
          .app-sidebar,
          .app-header,
          header,
          nav,
          aside,
          .sidebar-backdrop,
          .no-print,
          .btn,
          button,
          .modal,
          .modal-backdrop,
          .modal-backdrop-custom,
          .toast-container {
            display: none !important;
          }

          /* Keep lead-detail-page in standard document flow for natural multi-page pagination */
          .lead-detail-page {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          /* Allow cards to flow naturally without premature clipping */
          .lead-detail-page .card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            margin-bottom: 16px !important;
            background: #ffffff !important;
          }

          .lead-detail-page .card-header {
            background: #f8fafc !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding: 10px 14px !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .lead-detail-page .card-body {
            padding: 12px 14px !important;
          }

          /* Ensure all expanded sections display clearly in print */
          .lead-detail-page .collapse,
          .lead-detail-page [class*="collapse"] {
            display: block !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          .lead-detail-page a {
            text-decoration: none !important;
            color: inherit !important;
          }

          .lead-detail-page .table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          .lead-detail-page .table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .lead-detail-page .table th,
          .lead-detail-page .table td {
            border: 1px solid #e2e8f0 !important;
            padding: 6px 10px !important;
          }
        }
      `}</style>
      <div className="lead-detail-page container-fluid px-3 px-md-4 py-3">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1 no-print">
              <button
                type="button"
                onClick={handleGoBack}
                className="btn btn-sm btn-outline-secondary py-1 px-2.5 text-decoration-none d-inline-flex align-items-center gap-1.5 shadow-xs"
                title={`Back to ${backDestination.label}`}
              >
                <i className="bi bi-arrow-left"></i>
                <span>{backDestination.label}</span>
              </button>
              <span className="text-muted">/</span>
              <span className="badge bg-secondary-subtle text-dark border px-2 py-1">Lead #{lead.id}</span>
            </div>
            <h3 className="mb-0 text-dark fw-bold d-flex align-items-center gap-2 flex-wrap">
              {lead.name}
              {renderLeadStatusBadge(lead.status_name || lead.status?.name || "New")}
              {lead.is_birthday_today && (
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle fs-6">
                  🎂 Birthday Today!
                </span>
              )}
              {lead.is_anniversary_today && (
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-6">
                  💐 Anniversary Today!
                </span>
              )}
            </h3>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap no-print">
            <button
              type="button"
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={handlePrintLeadProfile}
              title="Print Lead 360 Profile Sheet"
            >
              <i className="bi bi-printer-fill me-1"></i>
              <span>Print</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-danger d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={() => setDeleteTarget({ type: "lead", id: lead.id, title: `${lead.name} (${lead.phone})` })}
              title="Delete this Lead"
            >
              <i className="bi bi-trash3-fill me-1"></i>
              <span>Delete Lead</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-success d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={handleOpenFollowUpModal}
            >
              <i className="bi bi-telephone-plus-fill me-1"></i>
              <span>Log Follow-Up</span>
            </button>
            <Link
              href={`/admin/quotation/create?lead_id=${lead.id}`}
              className="btn btn-primary d-inline-flex align-items-center gap-1 shadow-sm"
            >
              <i className="bi bi-file-earmark-spreadsheet-fill me-1"></i>
              <span>Create Quotation</span>
            </Link>
            <button
              type="button"
              className="btn btn-success d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={() => setShowConvertModal(true)}
            >
              <i className="bi bi-trophy-fill me-1"></i>
              <span>Convert Deal</span>
            </button>
          </div>
        </div>

        {/* Lead Summary Overview Cards */}
        <div className="row g-3 mb-4">
          {/* Card 1: Customer Profile */}
          <div className="col-lg-6">
            <div className="card h-100 shadow-sm border-0" style={{ background: "#ffffff" }}>
              <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-3">
                <h5 className="card-title mb-0 text-dark fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-person-circle text-primary"></i> Customer Information
                </h5>
                <span
                  className={`badge ${lead.priority === "Hot"
                      ? "bg-danger text-white"
                      : lead.priority === "Warm"
                        ? "bg-warning text-dark"
                        : "bg-info text-white"
                    } px-3 py-1 fw-bold`}
                >
                  {lead.priority === "Hot" ? "🔥 Hot Priority" : lead.priority === "Warm" ? "☀️ Warm Priority" : "❄️ Cold Priority"}
                </span>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Phone Number</span>
                    <strong className="text-dark fs-6 d-flex align-items-center gap-1 mt-1">
                      <i className="bi bi-telephone-fill text-success"></i>
                      <a href={`tel:${lead.phone}`} className="text-decoration-none text-dark">
                        {lead.phone}
                      </a>
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Email Address</span>
                    <strong className="text-dark d-flex align-items-center gap-1 mt-1">
                      <i className="bi bi-envelope-fill text-primary"></i>
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-decoration-none text-dark">
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-muted">Not Provided</span>
                      )}
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Home Town</span>
                    <div className="text-dark fw-medium mt-1">
                      <i className="bi bi-house-door-fill text-primary me-1"></i>
                      {lead.city || lead.home_town
                        ? `${lead.city || lead.home_town}${lead.state ? `, ${lead.state}` : ""}`
                        : "Not Specified"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Posting Location</span>
                    <div className="text-dark fw-medium mt-1">
                      <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                      {lead.posting || "Not Specified"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Lead Source</span>
                    <div className="mt-1">
                      <span className="badge bg-dark text-light border px-2 py-1">
                        <i className="bi bi-broadcast me-1 text-warning"></i>
                        {lead.source?.title || lead.source_name || "Direct"}
                      </span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Birthday</span>
                    <div className="text-dark fw-medium mt-1">
                      <i className="bi bi-cake2-fill text-danger me-1"></i>
                      {lead.birth_date
                        ? new Date(lead.birth_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                        : "Not Recorded"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Anniversary</span>
                    <div className="text-dark fw-medium mt-1">
                      <i className="bi bi-flower1 text-info me-1"></i>
                      {lead.anniversary_date
                        ? new Date(lead.anniversary_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                        : "Not Recorded"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Assigned Representative</span>
                    <div className="text-dark fw-bold mt-1">
                      <i className="bi bi-person-badge-fill text-secondary me-1"></i>
                      {lead.assigned_to_display || lead.assigned_user?.name || lead.assigned_user_name || "Unassigned"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Created On</span>
                    <div className="text-muted mt-1" style={{ fontSize: "13px" }}>
                      <i className="bi bi-clock-history me-1 text-primary"></i>
                      {lead.created_at
                        ? new Date(lead.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Vehicle Requirement & Pipeline Stage */}
          <div className="col-lg-6">
            <div className="card h-100 shadow-sm border-0" style={{ background: "#ffffff" }}>
              <div className="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-3">
                <h5 className="card-title mb-0 text-dark fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-car-front-fill text-primary"></i> Vehicle & Requirements
                </h5>
                {renderLeadStatusBadge(lead.status_name || lead.status?.name || "New", "fs-6")}
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Vehicle Segment</span>
                    <div className="text-dark fw-bold mt-1">
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                        {lead.vehicle_segment || "4 Wheeler"}
                      </span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Brand</span>
                    <div className="text-dark fw-bold fs-6 mt-1">
                      {lead.brand?.name || lead.brand_name || "All Brands"}
                    </div>
                  </div>
                  <div className="col-12">
                    <span className="text-muted small d-block">Vehicle Model / Desired Variant</span>
                    <div className="p-3 rounded-2 mt-1 bg-light border">
                      <div className="text-dark fw-bold fs-5">
                        {lead.model_variant || (lead.variant ? `${lead.model?.name ? lead.model.name + " " : ""}${lead.variant.name}` : lead.model?.name || "Not specified")}
                      </div>
                      <div className="text-muted small mt-1 d-flex gap-3 flex-wrap">
                        {lead.brand?.name && <span><strong>Brand:</strong> {lead.brand.name}</span>}
                        {lead.model?.name && <span><strong>Model:</strong> {lead.model.name}</span>}
                        {lead.variant?.name && <span><strong>Variant:</strong> {lead.variant.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Purchase Timeline</span>
                    <div className="text-dark fw-semibold mt-1">
                      <i className="bi bi-calendar-check text-info me-1"></i>
                      {lead.purchase_timeline || "Immediate"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Expected Budget</span>
                    <div className="text-success fw-bold fs-6 mt-1">
                      <i className="bi bi-currency-rupee"></i>
                      {lead.budget && Number(lead.budget) > 0
                        ? Number(lead.budget).toLocaleString("en-IN")
                        : (lead.variant?.price || lead.model_variant_price
                          ? Number(lead.variant?.price || lead.model_variant_price).toLocaleString("en-IN")
                          : "Not Specified")}
                    </div>
                  </div>
                  {(() => {
                    const localDisc = discountApprovalApi.getLeadApprovalStatus(lead.id);
                    const discStatus = (lead.discount_approval_status || localDisc?.status || "none").toLowerCase();
                    const approvedAmt = Number(lead.approved_discount || localDisc?.approved_amount || (discStatus === "approved" ? localDisc?.discount_amount : 0) || 0);
                    const requestedAmt = Number(lead.requested_discount || localDisc?.discount_amount || 0);
                    const effectiveApprovedDisc = approvedAmt > 0 ? approvedAmt : (discStatus === "approved" ? requestedAmt : 0);

                    const rawBudget = Number(lead.budget) > 0
                      ? Number(lead.budget)
                      : (lead.variant?.price || lead.model_variant_price
                        ? Number(lead.variant?.price || lead.model_variant_price)
                        : 0);

                    const finalTotalBudget = Math.max(0, rawBudget - effectiveApprovedDisc);

                    return (
                      <>
                        <div className="col-sm-6">
                          <span className="text-muted small d-block">Discount Request Status</span>
                          <div className="mt-1 d-flex align-items-center gap-2 flex-wrap">
                            {discStatus === "approved" ? (
                              <span className="badge bg-success text-white py-1 px-2.5 d-inline-flex align-items-center gap-1.5 fw-semibold" style={{ fontSize: "12px" }}>
                                <i className="bi bi-check-circle-fill"></i>
                                Approved: ₹{effectiveApprovedDisc.toLocaleString("en-IN")}
                              </span>
                            ) : discStatus === "pending" ? (
                              <span className="badge bg-warning text-dark py-1 px-2.5 d-inline-flex align-items-center gap-1.5 fw-semibold" style={{ fontSize: "12px" }}>
                                <i className="bi bi-hourglass-split"></i>
                                Pending (Req: ₹{requestedAmt > 0 ? requestedAmt.toLocaleString("en-IN") : "0"})
                              </span>
                            ) : discStatus === "rejected" ? (
                              <span className="badge bg-danger text-white py-1 px-2.5 d-inline-flex align-items-center gap-1.5 fw-semibold" style={{ fontSize: "12px" }}>
                                <i className="bi bi-x-circle-fill"></i>
                                Rejected
                              </span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary py-1 px-2 border" style={{ fontSize: "11px" }}>
                                No Discount Requested
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Net Budget / Total (Budget - Approved Discount) when discount is approved */}
                        {discStatus === "approved" && effectiveApprovedDisc > 0 && rawBudget > 0 && (
                          <div className="col-sm-6">
                            <span className="text-muted small d-block">Total Budget (After Approved Discount)</span>
                            <div className="text-primary fw-bolder fs-6 mt-1 d-flex align-items-center gap-2">
                              <i className="bi bi-calculator-fill text-primary"></i>
                              <span>₹{finalTotalBudget.toLocaleString("en-IN")}</span>
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-1.5 py-0.5 fw-semibold" style={{ fontSize: "10.5px" }}>
                                -₹{effectiveApprovedDisc.toLocaleString("en-IN")} Off
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Collapsible Activity & History Sections (Reference UI as per Screenshot) */}
        {/* ========================================================================= */}
        <div className="d-flex flex-column gap-3 mb-4">
          {/* 1. Follow-Up History Section */}
          <div className="card shadow-sm border-0" style={{ borderRadius: "16px", overflow: "hidden", background: "#ffffff" }}>
            <div
              className="d-flex align-items-center justify-content-between px-4 py-3"
              style={{
                backgroundColor: "#F1F3ED",
                borderBottom: openSections.followups ? "1px solid #DFE2D6" : "none",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => toggleSection("followups")}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-telephone-outbound-fill text-primary fs-5"></i>
                <h6 className="mb-0 fw-bold text-dark fs-6">
                  Follow-Up History ({pureFollowUps.length})
                </h6>
              </div>

              <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 py-1 px-2.5"
                  style={{ fontSize: "0.8rem" }}
                  onClick={handleOpenFollowUpModal}
                >
                  <i className="bi bi-plus-lg"></i>
                  <span>Log Call / Interaction</span>
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-light border-0 rounded-circle p-1 d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px", background: "rgba(0,0,0,0.05)" }}
                  onClick={() => toggleSection("followups")}
                  title={openSections.followups ? "Hide / Collapse" : "Show / Expand"}
                >
                  <i className={`bi ${openSections.followups ? "bi-chevron-up" : "bi-chevron-down"} fw-bold text-dark`}></i>
                </button>
              </div>
            </div>

            {openSections.followups && (
              <div className="card-body p-4">
                {isLoadingFollowUps ? (
                  <div className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Loading follow-up interactions...
                  </div>
                ) : pureFollowUps.length === 0 ? (
                  <div className="text-center py-5 border rounded-3 bg-light">
                    <i className="bi bi-telephone-x text-muted display-6"></i>
                    <p className="mt-2 text-muted mb-3">No follow-up interaction logged yet for this lead.</p>
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={handleOpenFollowUpModal}
                    >
                      <i className="bi bi-telephone-plus-fill me-1"></i> Log First Interaction
                    </button>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {pureFollowUps.map((fu, idx) => (
                      <div
                        key={fu.id || idx}
                        className="p-3 border rounded-3 bg-light"
                        style={{
                          transition: "all 0.15s ease",
                          borderColor: "#e2e8f0",
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-primary text-white">
                              <i className="bi bi-telephone-fill me-1"></i>
                              {fu.type || "Phone Call"}
                            </span>
                            <span className="badge bg-info-subtle text-info border">
                              {fu.status || fu.outcome || "Call Back"}
                            </span>
                            {fu.is_discount_requested && fu.discount_amount && (
                              <span className="badge bg-warning-subtle text-warning-emphasis border">
                                <i className="bi bi-tag-fill me-1"></i>Disc. Req: ₹{Number(fu.discount_amount).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>

                          <div className="d-flex align-items-center gap-2">
                            <span className="text-muted small">
                              <i className="bi bi-calendar3 me-1"></i>
                              {fu.follow_up_date} {fu.follow_up_time ? `at ${fu.follow_up_time}` : ""}
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger border-0 p-1 rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: "28px", height: "28px" }}
                              title="Delete this Follow-Up Record"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({
                                  type: "followup",
                                  id: fu.id,
                                  title: `${fu.type || "Follow-up"} on ${fu.follow_up_date || "date"} (${fu.outcome || fu.status || "Interaction"})`,
                                });
                              }}
                            >
                              <i className="bi bi-trash3 text-danger"></i>
                            </button>
                          </div>
                        </div>

                        {fu.notes && (
                          <p
                            className="text-dark mb-2 small"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {fu.notes}
                          </p>
                        )}

                        <div className="d-flex justify-content-between align-items-center text-muted small border-top pt-2">
                          <span>
                            Logged By: <strong className="text-dark">{fu.user_name || fu.user?.name || "Representative"}</strong>
                          </span>
                          {fu.next_follow_up_date && (
                            <span className="text-warning fw-semibold">
                              <i className="bi bi-alarm-fill me-1"></i>
                              Next: {fu.next_follow_up_date} {fu.next_follow_up_time || ""}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Quotations Sent Section */}
          <div className="card shadow-sm border-0" style={{ borderRadius: "16px", overflow: "hidden", background: "#ffffff" }}>
            <div
              className="d-flex align-items-center justify-content-between px-4 py-3"
              style={{
                backgroundColor: "#F1F3ED",
                borderBottom: openSections.quotations ? "1px solid #DFE2D6" : "none",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => toggleSection("quotations")}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-spreadsheet-fill text-primary fs-5"></i>
                <h6 className="mb-0 fw-bold text-dark fs-6">
                  Quotations Sent ({quotations.length})
                </h6>
              </div>

              <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Link
                  href={`/admin/quotation/create?lead_id=${lead.id}`}
                  className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 py-1 px-2.5"
                  style={{ fontSize: "0.8rem" }}
                >
                  <i className="bi bi-plus-lg"></i>
                  <span>Generate New Quotation</span>
                </Link>
                <button
                  type="button"
                  className="btn btn-sm btn-light border-0 rounded-circle p-1 d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px", background: "rgba(0,0,0,0.05)" }}
                  onClick={() => toggleSection("quotations")}
                  title={openSections.quotations ? "Hide / Collapse" : "Show / Expand"}
                >
                  <i className={`bi ${openSections.quotations ? "bi-chevron-up" : "bi-chevron-down"} fw-bold text-dark`}></i>
                </button>
              </div>
            </div>

            {openSections.quotations && (
              <div className="card-body p-4">
                {isLoadingQuotations ? (
                  <div className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Loading quotations...
                  </div>
                ) : quotations.length === 0 ? (
                  <div className="text-center py-5 border rounded-3 bg-light">
                    <i className="bi bi-file-earmark-spreadsheet text-muted display-6"></i>
                    <p className="mt-2 text-muted mb-3">No quotation has been generated for this lead yet.</p>
                    <Link
                      href={`/admin/quotation/create?lead_id=${lead.id}`}
                      className="btn btn-sm btn-primary"
                    >
                      <i className="bi bi-calculator me-1"></i> Create First Quotation
                    </Link>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: "50px" }}>#</th>
                          <th style={{ width: "95px" }} className="text-center">Actions</th>
                          <th>Quotation #</th>
                          <th>Date</th>
                          <th>Vehicle / Variant</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotations.map((q, idx) => (
                          <tr key={q.id}>
                            <td className="text-muted small">{idx + 1}</td>
                            <td className="text-center">
                              <div className="d-flex align-items-center justify-content-center gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => quotationApi.downloadPdf(q.id, q.quotation_number)}
                                  title="Download PDF"
                                >
                                  <i className="bi bi-file-earmark-pdf text-danger"></i>
                                </button>
                                <Link
                                  href={`/admin/quotation/${q.id}`}
                                  className="btn btn-sm btn-outline-primary"
                                  title="View Quotation Details"
                                >
                                  <i className="bi bi-eye"></i>
                                </Link>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => setDeleteTarget({ type: "quotation", id: q.id, title: `Quotation #${q.quotation_number || q.id}` })}
                                  title="Delete Quotation"
                                >
                                  <i className="bi bi-trash3"></i>
                                </button>
                              </div>
                            </td>
                            <td className="fw-bold text-primary">{q.quotation_number || `#Q-${q.id}`}</td>
                            <td className="text-muted small">
                              {q.quotation_date || (q.created_at ? new Date(q.created_at).toLocaleDateString("en-IN") : "-")}
                            </td>
                            <td>
                              <span className="text-dark fw-medium">
                                {q.variant_name || q.model_name || lead.model_variant || "-"}
                              </span>
                            </td>
                            <td className="fw-bold text-success">
                              ₹{getQuotationAmount(q).toLocaleString("en-IN")}
                            </td>
                            <td>
                              <span className="badge bg-secondary-subtle text-dark border">
                                {q.status || "Draft"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Assignment History Section */}
          <div className="card shadow-sm border-0" style={{ borderRadius: "16px", overflow: "hidden", background: "#ffffff" }}>
            <div
              className="d-flex align-items-center justify-content-between px-4 py-3"
              style={{
                backgroundColor: "#F1F3ED",
                borderBottom: openSections.assignments ? "1px solid #DFE2D6" : "none",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => toggleSection("assignments")}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-clock-history text-primary fs-5"></i>
                <h6 className="mb-0 fw-bold text-dark fs-6">
                  Assignment History ({assignments.length})
                </h6>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light border-0 rounded-circle p-1 d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px", background: "rgba(0,0,0,0.05)" }}
                  onClick={() => toggleSection("assignments")}
                  title={openSections.assignments ? "Hide / Collapse" : "Show / Expand"}
                >
                  <i className={`bi ${openSections.assignments ? "bi-chevron-up" : "bi-chevron-down"} fw-bold text-dark`}></i>
                </button>
              </div>
            </div>

            {openSections.assignments && (
              <div className="card-body p-4">
                <h6 className="text-dark fw-bold mb-3">Executive Re-assignment Timeline</h6>
                {isLoadingAssignments ? (
                  <div className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Loading assignment records...
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-muted p-4 text-center border rounded-3 bg-light">
                    No reassignment records found. Currently assigned to:{" "}
                    <strong>{lead.assigned_to_display || lead.assigned_user?.name || "Initial Executive"}</strong>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {assignments.map((hist) => (
                      <div key={hist.id} className="p-3 border rounded-3 bg-light">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-dark fw-bold">
                            <i className="bi bi-person-check-fill text-success me-1"></i>
                            Assigned To: {hist.assign_to_name || "Executive"}
                          </span>
                          <span className="text-muted small">
                            {new Date(hist.created_at).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center text-muted small mt-2">
                          <span>
                            Assigned By: <strong className="text-dark">{hist.assign_by_name || "Super Admin"}</strong>
                          </span>
                          {hist.remarks && (
                            <span className="badge bg-dark border text-light">{hist.remarks}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


          {/* 4. Insurance Policies & Coverage History Section */}
          <div className="card shadow-sm border-0" style={{ borderRadius: "16px", overflow: "hidden", background: "#ffffff" }}>
            <div
              className="d-flex align-items-center justify-content-between px-4 py-3"
              style={{
                backgroundColor: "#F1F3ED",
                borderBottom: openSections.insurance ? "1px solid #DFE2D6" : "none",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => toggleSection("insurance")}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-shield-check-fill text-success fs-5"></i>
                <h6 className="mb-0 fw-bold text-dark fs-6">
                  Insurance Policies & History ({insurances.length})
                </h6>
                {insurances.length > 0 && (
                  <span className="badge bg-success-subtle text-success border border-success-subtle fw-semibold px-2 py-0.5 ms-2" style={{ fontSize: "11px" }}>
                    Active Coverage
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Link
                  href="/admin/deals/pending-insurance"
                  className="btn btn-sm btn-outline-custom d-inline-flex align-items-center gap-1 py-1 px-2.5"
                  style={{ fontSize: "0.8rem" }}
                >
                  <i className="bi bi-shield-plus text-primary"></i>
                  <span>Pending Insurance Queue</span>
                </Link>
                <button
                  type="button"
                  className="btn btn-sm btn-light border-0 rounded-circle p-1 d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px", background: "rgba(0,0,0,0.05)" }}
                  onClick={() => toggleSection("insurance")}
                  title={openSections.insurance ? "Hide / Collapse" : "Show / Expand"}
                >
                  <i className={`bi ${openSections.insurance ? "bi-chevron-up" : "bi-chevron-down"} fw-bold text-dark`}></i>
                </button>
              </div>
            </div>

            {openSections.insurance && (
              <div className="card-body p-4">
                {isLoadingInsurance ? (
                  <div className="text-center py-4 text-muted">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Loading insurance records...
                  </div>
                ) : insurances.length === 0 ? (
                  <div className="text-center py-5 border rounded-3 bg-light">
                    <i className="bi bi-shield-x text-muted display-6"></i>
                    <h6 className="fw-bold text-dark mt-2 mb-1">No Insurance Policy Linked Yet</h6>
                    <p className="text-muted small mb-3">
                      This customer does not have an active insurance policy on record.
                    </p>
                    <Link
                      href="/admin/deals/pending-insurance"
                      className="btn btn-sm btn-primary"
                    >
                      <i className="bi bi-shield-plus me-1"></i> Check Pending Insurance Deals
                    </Link>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {insurances.map((ins, insIdx) => (
                      <div
                        key={ins.id || insIdx}
                        className="p-3 border rounded-3 bg-white shadow-xs position-relative"
                        style={{ borderLeft: "4px solid #10B981" }}
                      >
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-2 border-bottom">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="badge bg-primary font-monospace px-2 py-1">
                              <i className="bi bi-shield-lock me-1"></i>
                              {ins.policy_number || "POL-RECORD"}
                            </span>
                            <strong className="text-dark fs-6">{ins.insurance_company || "Standard Insurance"}</strong>
                            <span className="badge bg-info-subtle text-info border border-info px-2 py-0.5 small">
                              {ins.insurance_type || "Comprehensive"}
                            </span>
                          </div>

                          <div className="d-flex align-items-center gap-2">
                            <span
                              className={`badge fw-semibold px-2.5 py-1 rounded-pill ${
                                ins.status === "expired"
                                  ? "bg-danger-subtle text-danger border border-danger-subtle"
                                  : ins.status === "expiring_soon"
                                  ? "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                                  : "bg-success-subtle text-success border border-success-subtle"
                              }`}
                              style={{ fontSize: "11px" }}
                            >
                              <i className={`bi me-1 ${ins.status === "expired" ? "bi-x-circle" : ins.status === "expiring_soon" ? "bi-exclamation-triangle" : "bi-check-circle"}`}></i>
                              {ins.status === "expired" ? "Expired" : ins.status === "expiring_soon" ? "Expiring Soon" : "Active Policy"}
                            </span>
                          </div>
                        </div>

                        {/* Policy Metrics Grid */}
                        <div className="row g-2 pt-2 small text-muted">
                          <div className="col-12 col-sm-6 col-md-3">
                            <span>Policy Period:</span>{" "}
                            <strong className="text-dark d-block">
                              {ins.policy_start_date || ins.start_date || "—"} to {ins.policy_expiry_date || ins.insurance_expire_date || "—"}
                            </strong>
                          </div>
                          <div className="col-12 col-sm-6 col-md-3">
                            <span>Premium Amount:</span>{" "}
                            <strong className="text-success d-block fw-bold">
                              ₹{Number(ins.premium_amount || 0).toLocaleString("en-IN")}
                            </strong>
                          </div>
                          <div className="col-12 col-sm-6 col-md-3">
                            <span>Vehicle Reg / Chassis:</span>{" "}
                            <strong className="text-dark d-block font-monospace">
                              {ins.vehicle_number || ins.registration_number || ins.vin_chassis_number || "—"}
                            </strong>
                          </div>
                          <div className="col-12 col-sm-6 col-md-3">
                            <span>Reminder Schedule:</span>{" "}
                            <strong className="text-dark d-block">
                              {ins.reminder_days_before ? `${ins.reminder_days_before} Days Before` : "15 Days Before"}
                              {ins.reminder_date ? ` (${ins.reminder_date})` : ""}
                            </strong>
                          </div>
                        </div>

                        {ins.notes && (
                          <div className="mt-2 p-2 bg-light rounded text-secondary small">
                            <i className="bi bi-info-circle me-1 text-primary"></i>
                            <strong>Policy Notes:</strong> {ins.notes}
                          </div>
                        )}

                        {/* Renewal History Timeline if available */}
                        {Array.isArray(ins.renewal_history || ins.renewalHistories) && (ins.renewal_history || ins.renewalHistories).length > 0 && (
                          <div className="mt-3 pt-2 border-top">
                            <span className="small fw-bold text-dark text-uppercase d-block mb-2">
                              <i className="bi bi-clock-history me-1 text-primary"></i> Renewal History Archive:
                            </span>
                            <div className="d-flex flex-column gap-1">
                              {(ins.renewal_history || ins.renewalHistories).map((ren, rIdx) => (
                                <div key={ren.id || rIdx} className="d-flex justify-content-between align-items-center p-2 rounded bg-light small">
                                  <div>
                                    <span className="badge bg-secondary font-monospace me-2">{ren.policy_number}</span>
                                    <span className="fw-semibold text-dark">{ren.insurance_company}</span>
                                    <span className="text-muted ms-2">({ren.policy_start_date} to {ren.policy_expiry_date})</span>
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    <strong className="text-success">₹{Number(ren.premium_amount || 0).toLocaleString("en-IN")}</strong>
                                    <span className="badge bg-success-subtle text-success">Renewed</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Deal Ledger & Invoices Section (Task 2 - Matching Screenshot 2) */}
          <div className="card shadow-sm border-0" style={{ borderRadius: "16px", overflow: "hidden", background: "#ffffff" }}>
            <div
              className="d-flex align-items-center justify-content-between px-4 py-3"
              style={{
                backgroundColor: "#F1F3ED",
                borderBottom: openSections.invoices ? "1px solid #DFE2D6" : "none",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => toggleSection("invoices")}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-collection-fill text-primary fs-5"></i>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h6 className="mb-0 fw-bold text-dark fs-6">
                      Deal Ledger & Invoices: {primaryDeal ? primaryDeal.deal_number : "Not Converted Yet"}
                    </h6>
                    {primaryDeal && (
                      <span
                        className={`badge ${
                          primaryDeal.deal_status === "cancelled"
                            ? "bg-danger text-white"
                            : "bg-success-subtle text-success border border-success-subtle"
                        } fw-semibold px-2 py-0.5`}
                        style={{ fontSize: "11px" }}
                      >
                        {primaryDeal.deal_status === "cancelled" ? "Cancelled" : "Booking Confirmed"}
                      </span>
                    )}
                  </div>
                  <span className="small text-muted" style={{ fontSize: "12px" }}>
                    Customer: {lead.name} • {primaryDeal?.model_variant || lead.model_variant || "Vehicle"}
                  </span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Link
                  href="/admin/deals"
                  className="btn btn-sm btn-outline-custom d-inline-flex align-items-center gap-1 py-1 px-2.5"
                  style={{ fontSize: "0.8rem" }}
                >
                  <i className="bi bi-trophy text-primary"></i>
                  <span>Deals & Bookings</span>
                </Link>
                <Link
                  href="/admin/invoice"
                  className="btn btn-sm btn-outline-custom d-inline-flex align-items-center gap-1 py-1 px-2.5"
                  style={{ fontSize: "0.8rem" }}
                >
                  <i className="bi bi-receipt text-success"></i>
                  <span>All Invoices</span>
                </Link>
                <button
                  type="button"
                  className="btn btn-sm btn-light border-0 rounded-circle p-1 d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px", background: "rgba(0,0,0,0.05)" }}
                  onClick={() => toggleSection("invoices")}
                  title={openSections.invoices ? "Hide / Collapse" : "Show / Expand"}
                >
                  <i className={`bi ${openSections.invoices ? "bi-chevron-up" : "bi-chevron-down"} fw-bold text-dark`}></i>
                </button>
              </div>
            </div>

            {openSections.invoices && (
              <div className="card-body p-4">
                {primaryDeal ? (
                  <>
                    {/* Financial Summary (Matching Screenshot 2) */}
                    <div className="row g-3 mb-4">
                      <div className="col-12 col-md-4">
                        <div className="card bg-light border-0 p-3 rounded-3">
                          <span className="small text-muted text-uppercase fw-semibold">Net Deal Amount</span>
                          <h4 className="fw-bold text-dark my-1">
                            ₹{formatIndianCurrency(primaryDeal.net_amount || primaryDeal.total_amount || 0)}
                          </h4>
                          <span className="small text-muted">{primaryDeal.model_variant}</span>
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="card bg-success-subtle border-0 p-3 rounded-3">
                          <span className="small text-success text-uppercase fw-semibold">Total Paid</span>
                          <h4 className="fw-bold text-success my-1">
                            ₹{formatIndianCurrency(primaryDeal.total_paid || 0)}
                          </h4>
                          <span className="small text-success">
                            {leadInvoices.length} Invoices Cleared
                          </span>
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="card bg-danger-subtle border-0 p-3 rounded-3">
                          <span className="small text-danger text-uppercase fw-semibold">Balance Due</span>
                          <h4 className="fw-bold text-danger my-1">
                            ₹{formatIndianCurrency(primaryDeal.deal_status === "cancelled" ? 0 : (primaryDeal.balance_due || 0))}
                          </h4>
                          <span className="small text-danger">
                            {primaryDeal.deal_status === "cancelled" ? "Deal Cancelled (Settled)" : "Pending Receivables"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Table of Invoices (Matching Screenshot 2) */}
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <i className="bi bi-receipt text-primary"></i>
                      All Invoices Issued for this Deal ({leadInvoices.length} Invoices)
                    </h6>

                    {leadInvoices.length === 0 ? (
                      <div className="text-center py-4 border rounded-3 bg-light text-muted">
                        <i className="bi bi-receipt-cutoff display-6 text-muted mb-2"></i>
                        <p className="mb-1 fw-semibold text-dark">No Installment Invoices Recorded Yet</p>
                        <p className="small text-muted mb-0">Payments recorded in Deals or Billing will appear here automatically.</p>
                      </div>
                    ) : (
                      <div className="table-responsive border rounded-3 overflow-hidden">
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
                            {leadInvoices.map((inv, idx) => (
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
                                <td className="text-end fw-bold text-success">
                                  ₹{formatIndianCurrency(inv.amountPaid)}
                                </td>
                                <td className="text-center">
                                  <span className={`badge ${inv.status === "Refunded" ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"}`}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="text-end px-3">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-dark d-inline-flex align-items-center gap-1"
                                    onClick={() => setSelectedInvoiceForSingleView(inv)}
                                  >
                                    <i className="bi bi-file-earmark-text"></i>
                                    <span>View Bill</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-5 border rounded-3 bg-light">
                    <i className="bi bi-receipt text-muted display-6"></i>
                    <h6 className="fw-bold text-dark mt-2 mb-1">No Deal or Invoices Converted Yet</h6>
                    <p className="text-muted small mb-3">
                      This lead has not been converted to a Deal yet. Convert to Deal to issue booking invoices, record installments, and track payment balances.
                    </p>
                    <Link href={`/admin/leads`} className="btn btn-sm btn-primary">
                      <i className="bi bi-trophy-fill me-1"></i> Check Deals & Bookings
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

        {/* Modal: Log Follow-Up Call */}
        {showFollowUpModal && (
          <div className="modal-backdrop-custom">
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-telephone-outbound-fill text-success me-2"></i> Log Follow-Up Interaction
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowFollowUpModal(false)}></button>
              </div>

              <form onSubmit={handleSubmitFollowUp}>
                <div className="modal-body-custom py-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Interaction Type</label>
                      <select
                        className="form-select"
                        value={followUpForm.type}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })}
                      >
                        <option value="Phone Call">📞 Phone Call</option>
                        <option value="WhatsApp">💬 WhatsApp</option>
                        <option value="Showroom Visit">🏢 Showroom Walk-in</option>
                        <option value="Email">✉️ Email</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Call Outcome</label>
                      <select
                        className="form-select"
                        value={followUpForm.outcome}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isNeg = val.toLowerCase().includes("negotiation");
                          setFollowUpForm({
                            ...followUpForm,
                            outcome: val,
                            request_discount: isNeg ? followUpForm.request_discount : false,
                          });
                        }}
                      >
                        <option value="Interested / Call Back">Interested / Call Back</option>
                        <option value="Quotation Requested">Quotation Requested</option>
                        <option value="Quotation Sent">Quotation Sent</option>
                        <option value="Negotiation / Price Discussion">Negotiation / Price Discussion</option>
                        <option value="Not Reachable / Busy">Not Reachable / Busy</option>
                        <option value="Lost to Competitor / Lost of Lead">Lost to Competitor / Lost of Lead</option>
                        <option value="Deal Won">Deal Won</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        <i className="bi bi-calendar-event me-1 text-primary"></i> Interaction Date
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={followUpForm.follow_up_date || ""}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        <i className="bi bi-clock me-1 text-primary"></i> Interaction Time
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 04:30 PM"
                        value={followUpForm.follow_up_time || ""}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, follow_up_time: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small">
                        Discussion Notes / Feedback <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="What did the customer say? What are the next steps?"
                        required
                        value={followUpForm.notes}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                      ></textarea>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        <i className="bi bi-calendar-plus me-1 text-success"></i> Next Follow-Up Date
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        min={getTodayDate()}
                        onClick={(e) => {
                          try {
                            e.target.showPicker?.();
                          } catch (err) {}
                        }}
                        value={followUpForm.next_follow_up_date || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const today = getTodayDate();
                          if (val && val < today) {
                            setFollowUpForm({ ...followUpForm, next_follow_up_date: today });
                            return;
                          }
                          setFollowUpForm({ ...followUpForm, next_follow_up_date: val });
                        }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        <i className="bi bi-alarm me-1 text-success"></i> Next Follow-Up Time
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 10:00 AM"
                        value={followUpForm.next_follow_up_time || ""}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up_time: e.target.value })}
                      />
                    </div>

                    {/* Customer Demanded Discount Switch & Fields - Show ONLY on Negotiation outcome (Task 2) */}
                    {(followUpForm.outcome || "").toLowerCase().includes("negotiation") && (
                      <div className="col-12">
                        <div className="p-3 rounded-3 border" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                          <div className="form-check form-switch d-flex align-items-center justify-content-between p-0 m-0">
                            <label className="form-check-label fw-bold text-dark d-flex align-items-center gap-2 mb-0" htmlFor="leadDetailDiscountSwitch" style={{ cursor: "pointer" }}>
                              <i className="bi bi-tag-fill text-danger"></i>
                              <span>Customer Demanded Discount? (Send to Sales Manager & Admin for Approval)</span>
                            </label>
                            <input
                              className="form-check-input ms-3"
                              type="checkbox"
                              role="switch"
                              id="leadDetailDiscountSwitch"
                              style={{ width: "2.6rem", height: "1.3rem", cursor: "pointer" }}
                              checked={followUpForm.request_discount}
                              onChange={(e) => setFollowUpForm({ ...followUpForm, request_discount: e.target.checked })}
                            />
                          </div>

                          {followUpForm.request_discount && (
                            <div className="mt-3 pt-3 border-top">
                              <div className="row g-3">
                                <div className="col-12">
                                  <label className="form-label text-dark fw-semibold small">
                                    Requested Discount Amount (₹) <span className="text-danger">*</span>
                                  </label>
                                  <div className="input-group">
                                    <span className="input-group-text bg-white fw-bold">₹</span>
                                    <input
                                      type="number"
                                      className="form-control"
                                      placeholder="e.g. 25000"
                                      value={followUpForm.discount_amount}
                                      onChange={(e) => setFollowUpForm({ ...followUpForm, discount_amount: e.target.value })}
                                      required={followUpForm.request_discount}
                                    />
                                  </div>
                                </div>
                                <div className="col-12">
                                  <label className="form-label text-dark fw-semibold small">Discount Reason / Justification</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Customer ready to pay token advance today if 25k discount approved"
                                    value={followUpForm.discount_reason}
                                    onChange={(e) => setFollowUpForm({ ...followUpForm, discount_reason: e.target.value })}
                                  />
                                  <div className="form-text small text-muted mt-1">
                                    <i className="bi bi-info-circle me-1 text-primary"></i>
                                    Request status will default to <strong>Pending</strong> and appear on both Super Admin and Sales Manager Dashboards for approval.
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-custom" onClick={() => setShowFollowUpModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={isSubmittingFollowUp}>
                    {isSubmittingFollowUp ? "Saving..." : "Record Interaction"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Convert Deal */}
        {showConvertModal && lead && (
          <ConvertDealModal
            isOpen={showConvertModal}
            lead={lead}
            onClose={() => setShowConvertModal(false)}
            onSuccess={() => {
              setShowConvertModal(false);
              showToast("Lead successfully converted to Deal!", "success");
              fetchLeadDetails();
            }}
            showToast={showToast}
          />
        )}

        {/* Modal: Delete Confirmation (Task 5) */}
        {deleteTarget && (
          <div className="modal-backdrop-custom">
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center bg-danger text-white">
                <h5 className="modal-title-custom mb-0 fs-6 fw-bold">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Confirm Delete {deleteTarget.type === "lead" ? "Lead" : deleteTarget.type === "followup" ? "Follow-Up Record" : "Quotation"}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteTarget(null)}
                ></button>
              </div>
              <div className="modal-body-custom p-4">
                <p className="text-dark mb-2">
                  Are you sure you want to delete this {deleteTarget.type === "lead" ? "entire lead" : deleteTarget.type === "followup" ? "follow-up interaction" : "quotation"}?
                </p>
                {deleteTarget.title && (
                  <div className="p-2 bg-light border rounded small fw-semibold text-secondary">
                    {deleteTarget.title}
                  </div>
                )}
                <p className="text-danger small mt-2 mb-0">
                  <i className="bi bi-info-circle me-1"></i>
                  This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer-custom d-flex justify-content-end gap-2 p-3 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-light border"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger d-inline-flex align-items-center gap-1"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  <i className="bi bi-trash3-fill"></i>
                  <span>{isDeleting ? "Deleting..." : "Yes, Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL: SINGLE INVOICE BILL PREVIEW & PRINT (Task 2)
            ========================================================================= */}
        {selectedInvoiceForSingleView && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1060 }}
            onClick={() => setSelectedInvoiceForSingleView(null)}
          >
            <div
              className="modal-dialog modal-dialog-centered modal-lg print-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="modal-content border-0 shadow-lg print-card-content"
                style={{ borderRadius: "16px", overflow: "hidden", backgroundColor: "#FFFFFF" }}
              >
                {/* Header */}
                <div
                  className="modal-header px-4 py-3 text-white d-flex align-items-center justify-content-between no-print"
                  style={{ backgroundColor: "#2A3816" }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-text fs-5 text-warning"></i>
                    <div>
                      <h5 className="modal-title fw-bold text-white mb-0">
                        Invoice Preview: {selectedInvoiceForSingleView.invoiceNo}
                      </h5>
                      <span className="small" style={{ color: "#DCE9A2" }}>
                        Deal #{selectedInvoiceForSingleView.dealNumber} • {selectedInvoiceForSingleView.customerName}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedInvoiceForSingleView(null)}
                  ></button>
                </div>

                {/* Printable Invoice Body */}
                <div className="modal-body px-4 py-4 printable-deal-sheet">
                  {/* Top Branding */}
                  <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                    <div>
                      <h4 className="fw-bold mb-0" style={{ color: "var(--primary, #58632A)" }}>
                        DEFENCE AUTOLINK
                      </h4>
                      <div className="small text-muted">
                        CSD Canteen Authorized Military Automobile Consultancy
                      </div>
                      <div className="small text-muted">
                        Reg. Address: CSD Depot Road, Ahmedabad, Gujarat, India
                      </div>
                      <div className="small text-muted">
                        GSTIN: 24AAACD1234F1Z5 | Support: +91 98765 43210
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="badge bg-success text-white fs-6 px-3 py-1 text-uppercase fw-bold">
                        Tax Invoice / Payment Receipt
                      </span>
                      <div className="small text-muted mt-2">
                        Invoice No: <strong className="text-dark font-monospace">{selectedInvoiceForSingleView.invoiceNo}</strong>
                      </div>
                      <div className="small text-muted">
                        Date: <strong>{selectedInvoiceForSingleView.date}</strong> {selectedInvoiceForSingleView.time}
                      </div>
                      <div className="small text-muted">
                        Deal No: <strong className="font-monospace text-primary">{selectedInvoiceForSingleView.dealNumber}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Vehicle Info */}
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <div className="border rounded p-3 h-100 bg-light">
                        <span className="small text-uppercase fw-bold text-muted d-block mb-1">
                          Billed To (Customer):
                        </span>
                        <div className="fw-bold text-dark fs-6 mb-1">{selectedInvoiceForSingleView.customerName}</div>
                        <div className="small text-muted">
                          Phone: <strong>{selectedInvoiceForSingleView.mobile || "—"}</strong>
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
                          <strong>
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
        )}
      </div>
    </AdminLayout>
  );
}
