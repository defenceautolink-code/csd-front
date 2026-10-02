"use client";

import React, { useState, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import api from "@/lib/axios";

// Helper to generate Invoice Number in exact required format:

export const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `DAL-/${year}/${month}/${random4}`;
};

// Helper to format currency in Indian format: ₹1,50,000
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return "₹" + num.toLocaleString("en-IN");
};

// Default Pipeline Leads from Dealership CRM Pipeline
const DEFAULT_PIPELINE_LEADS = [
  {
    id: "lead-101",
    customer_name: "Subedar Rajesh Sharma",
    phone: "98765 43210",
    email: "rajesh.sharma@gov.in",
    city: "Ahmedabad, Gujarat",
    brand_name: "Maruti Suzuki",
    model_variant: "Grand Vitara Zeta 1.5L Smart Hybrid",
    priority: "Hot",
    status_name: "Token Deposited",
    total_deal_amount: 1450000,
  },
  {
    id: "lead-102",
    customer_name: "Major Vikramaditya Singh",
    phone: "98251 23456",
    email: "vikram.singh@army.nic.in",
    city: "Gandhinagar, Gujarat",
    brand_name: "Hyundai",
    model_variant: "New Venue 1.0 Turbo DCT HX5",
    priority: "Hot",
    status_name: "Booking Confirmed",
    total_deal_amount: 1095000,
  },
  {
    id: "lead-103",
    customer_name: "Havildar Amit Deshmukh",
    phone: "94210 98765",
    email: "amit.deshmukh@gmail.com",
    city: "Vadodara, Gujarat",
    brand_name: "Tata",
    model_variant: "Nexon Fearless Plus S 1.2 Turbo",
    priority: "Warm",
    status_name: "CSD Scrutiny",
    total_deal_amount: 1320000,
  },
  {
    id: "lead-104",
    customer_name: "Captain Sunita Rawat",
    phone: "98980 11223",
    email: "sunita.rawat@nic.in",
    city: "Ahmedabad, Gujarat",
    brand_name: "Mahindra",
    model_variant: "XUV700 AX7 Diesel AT Luxury Pack",
    priority: "Hot",
    status_name: "Ready for Delivery",
    total_deal_amount: 2180000,
  },
  {
    id: "lead-105",
    customer_name: "Col. Ajay Rathore",
    phone: "98250 99881",
    email: "ajay.rathore@gov.in",
    city: "Ahmedabad, Gujarat",
    brand_name: "Toyota",
    model_variant: "Innova Hycross VX Hybrid",
    priority: "Hot",
    status_name: "Quotation Approved",
    total_deal_amount: 2550000,
  },
  {
    id: "lead-106",
    customer_name: "Lt. Col. Pradeep Nair",
    phone: "97120 33445",
    email: "pradeep.nair@indianarmy.org",
    city: "Surat, Gujarat",
    brand_name: "Kia",
    model_variant: "Seltos GTX Plus 1.5 Turbo DCT",
    priority: "Warm",
    status_name: "Follow-up Scheduled",
    total_deal_amount: 1980000,
  },
  {
    id: "lead-107",
    customer_name: "Subedar Major Balwant Singh",
    phone: "98799 44556",
    email: "balwant.singh@csd.gov.in",
    city: "Jamnagar, Gujarat",
    brand_name: "Maruti Suzuki",
    model_variant: "Brezza ZXI Plus AT",
    priority: "Hot",
    status_name: "CSD Indent Open",
    total_deal_amount: 1380000,
  },
];

// Initial Realistic CSD Demo Data (Token-based multi-invoice flow)
const INITIAL_DEMO_TOKENS = [
  {
    tokenNo: "TKN-2026-1042",
    customerName: "Subedar Rajesh Sharma",
    serviceNo: "JC-458921X",
    unit: "14 Rajputana Rifles, Ahmedabad Cantt",
    mobile: "98765 43210",
    email: "rajesh.sharma@gov.in",
    city: "Ahmedabad, Gujarat",
    brand: "Maruti Suzuki",
    model: "Grand Vitara",
    variant: "Zeta 1.5L Smart Hybrid Petrol",
    color: "Nexa Blue",
    totalDealAmount: 1450000,
    bookingDate: "2026-09-10",
    status: "Partial",
    invoices: [
      {
        id: "INV-1042-1",
        invoiceNo: "DAL-/2026/09/1042",
        date: "2026-09-10",
        time: "11:30 AM",
        installmentTitle: "1st Installment - Booking Token Advance",
        paymentMode: "UPI / GPay",
        transactionRef: "UPI/625371928341",
        amountPaid: 50000,
        items: [
          {
            desc: "CSD AFD Portal Registration & Token Booking Advance",
            hsn: "998313",
            qty: 1,
            rate: 50000,
            amount: 50000,
          },
        ],
        remarks: "Initial token advance received for vehicle allocation & CSD file opening.",
        status: "Paid",
        generatedBy: "Super Admin",
      },
      {
        id: "INV-1042-2",
        invoiceNo: "DAL-/2026/09/3914",
        date: "2026-09-18",
        time: "03:45 PM",
        installmentTitle: "2nd Installment - Margin Money Deposit",
        paymentMode: "NEFT / NetBanking",
        transactionRef: "NEFT/SBIN20260918002",
        amountPaid: 350000,
        items: [
          {
            desc: "Customer Margin Money / Part Payment for Dealer Billing",
            hsn: "998313",
            qty: 1,
            rate: 350000,
            amount: 350000,
          },
        ],
        remarks: "Part payment received towards showroom ex-dealership billing.",
        status: "Paid",
        generatedBy: "Super Admin",
      },
      {
        id: "INV-1042-3",
        invoiceNo: "DAL-/2026/09/7821",
        date: "2026-09-24",
        time: "02:15 PM",
        installmentTitle: "3rd Installment - RTO, Insurance & Accessories",
        paymentMode: "Cheque",
        transactionRef: "CHQ-882910 (SBI)",
        amountPaid: 150000,
        items: [
          {
            desc: "Gujarat RTO Registration & HSRP Number Plate",
            hsn: "998314",
            qty: 1,
            rate: 85000,
            amount: 85000,
          },
          {
            desc: "Comprehensive Zero-Dep Insurance (1+3 Years)",
            hsn: "997133",
            qty: 1,
            rate: 45000,
            amount: 45000,
          },
          {
            desc: "CSD Premium Essential Accessories Kit",
            hsn: "8708",
            qty: 1,
            rate: 20000,
            amount: 20000,
          },
        ],
        remarks: "RTO documentation & Insurance premium settled via cheque.",
        status: "Paid",
        generatedBy: "Super Admin",
      },
    ],
  },
  {
    tokenNo: "TKN-2026-1088",
    customerName: "Major Vikramaditya Singh",
    serviceNo: "IC-672109M",
    unit: "HQ Golden Katar Division, Gandhinagar",
    mobile: "98251 23456",
    email: "vikram.singh@army.nic.in",
    city: "Gandhinagar, Gujarat",
    brand: "Hyundai",
    model: "New Venue",
    variant: "1.0 Turbo DCT HX5 Petrol",
    color: "Titan Grey",
    totalDealAmount: 1095000,
    bookingDate: "2026-09-12",
    status: "Partial",
    invoices: [
      {
        id: "INV-1088-1",
        invoiceNo: "DAL-/2026/09/2180",
        date: "2026-09-12",
        time: "10:15 AM",
        installmentTitle: "1st Installment - Token Advance",
        paymentMode: "UPI / PhonePe",
        transactionRef: "UPI/992144872110",
        amountPaid: 25000,
        items: [
          {
            desc: "Token Booking Deposit for Hyundai New Venue CSD Allocation",
            hsn: "998313",
            qty: 1,
            rate: 25000,
            amount: 25000,
          },
        ],
        remarks: "Booking token received. CSD Indent initiated.",
        status: "Paid",
        generatedBy: "Super Admin",
      },
      {
        id: "INV-1088-2",
        invoiceNo: "DAL-/2026/09/5432",
        date: "2026-09-21",
        time: "04:30 PM",
        installmentTitle: "2nd Installment - Defence Car Loan Disbursement",
        paymentMode: "Bank DD / Cheque",
        transactionRef: "DD-901842 (PNB Defence)",
        amountPaid: 800000,
        items: [
          {
            desc: "CSD Vehicle Loan Disbursement from PNB Defence Branch",
            hsn: "998313",
            qty: 1,
            rate: 800000,
            amount: 800000,
          },
        ],
        remarks: "Direct bank loan demand draft cleared.",
        status: "Paid",
        generatedBy: "Super Admin",
      },
    ],
  },
  {
    tokenNo: "TKN-2026-1120",
    customerName: "Havildar Amit Deshmukh",
    serviceNo: "15482910K",
    unit: "Bombay Sappers (Engineers)",
    mobile: "94210 98765",
    email: "amit.deshmukh@gmail.com",
    city: "Vadodara, Gujarat",
    brand: "Tata",
    model: "Nexon",
    variant: "Fearless Plus S 1.2 Turbo Petrol",
    color: "Daytona Grey",
    totalDealAmount: 1320000,
    bookingDate: "2026-09-22",
    status: "Partial",
    invoices: [
      {
        id: "INV-1120-1",
        invoiceNo: "DAL-/2026/09/8109",
        date: "2026-09-22",
        time: "01:20 PM",
        installmentTitle: "1st Installment - Token Advance & File Charges",
        paymentMode: "Cash",
        transactionRef: "CASH-REC-0091",
        amountPaid: 50000,
        items: [
          {
            desc: "Initial Token Deposit & CSD Document Scrutiny Fee",
            hsn: "998313",
            qty: 1,
            rate: 50000,
            amount: 50000,
          },
        ],
        remarks: "Cash payment received at front desk against receipt.",
        status: "Paid",
        generatedBy: "Super Admin",
      },
    ],
  },
  {
    tokenNo: "TKN-2026-0955",
    customerName: "Captain Sunita Rawat",
    serviceNo: "MS-18492P",
    unit: "Military Hospital, Ahmedabad",
    mobile: "98980 11223",
    email: "sunita.rawat@nic.in",
    city: "Ahmedabad, Gujarat",
    brand: "Mahindra",
    model: "XUV700",
    variant: "AX7 Diesel AT Luxury Pack",
    color: "Midnight Black",
    totalDealAmount: 2180000,
    bookingDate: "2026-08-28",
    status: "Fully Paid",
    invoices: [
      {
        id: "INV-0955-1",
        invoiceNo: "DAL-/2026/08/4120",
        date: "2026-08-28",
        time: "12:00 PM",
        installmentTitle: "1st Installment - Token Booking Deposit",
        paymentMode: "UPI / GPay",
        transactionRef: "UPI/551928374619",
        amountPaid: 100000,
        items: [
          {
            desc: "Booking token amount for Mahindra XUV700 priority allocation",
            hsn: "998313",
            qty: 1,
            rate: 100000,
            amount: 100000,
          },
        ],
        remarks: "Token confirmed. Vehicle queued for CSD dispatch.",
        status: "Paid",
        generatedBy: "Super Admin",
      },
      {
        id: "INV-0955-2",
        invoiceNo: "DAL-/2026/09/0411",
        date: "2026-09-08",
        time: "02:40 PM",
        installmentTitle: "2nd Installment - CSD Demand Draft Transfer",
        paymentMode: "NEFT / RTGS",
        transactionRef: "RTGS/HDFC20260908129",
        amountPaid: 1000000,
        items: [
          {
            desc: "CSD Purchase Order Base Payment",
            hsn: "998313",
            qty: 1,
            rate: 1000000,
            amount: 1000000,
          },
        ],
        remarks: "RTGS cleared into Defence Autolink CSD Escrow account.",
        status: "Paid",
        generatedBy: "Super Admin",
      },
      {
        id: "INV-0955-3",
        invoiceNo: "DAL-/2026/09/6329",
        date: "2026-09-19",
        time: "05:10 PM",
        installmentTitle: "3rd & Final Installment - Complete Balance Settlement",
        paymentMode: "NEFT / RTGS",
        transactionRef: "RTGS/HDFC20260919984",
        amountPaid: 1080000,
        items: [
          {
            desc: "Remaining Vehicle Ex-Showroom Balance Settlement",
            hsn: "998313",
            qty: 1,
            rate: 920000,
            amount: 920000,
          },
          {
            desc: "BH-Series RTO Registration & Road Tax",
            hsn: "998314",
            qty: 1,
            rate: 98000,
            amount: 98000,
          },
          {
            desc: "Ceramic Coating & Luxury Teflon Shield",
            hsn: "8708",
            qty: 1,
            rate: 62000,
            amount: 62000,
          },
        ],
        remarks: "Full and final settlement received. Gate pass & delivery cleared.",
        status: "Paid",
        generatedBy: "Super Admin",
      },
    ],
  },
];

export default function GenerateInvoicePage() {
  const { showToast } = useToast();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [tokensData, setTokensData] = useState(() => {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem("csd_tokens_invoices_v1");
      return stored ? JSON.parse(stored) : INITIAL_DEMO_TOKENS;
    } catch (err) {
      console.error(err);
      return INITIAL_DEMO_TOKENS;
    }
  });
  const [pipelineLeads, setPipelineLeads] = useState(DEFAULT_PIPELINE_LEADS);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [activeTab, setActiveTab] = useState("tokens"); // 'tokens' or 'all-invoices'

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedTokenForMultiView, setSelectedTokenForMultiView] = useState(null);
  const [selectedInvoiceForSingleView, setSelectedInvoiceForSingleView] = useState(null);

  // ----------------------------------------------------
  // Form State for "Generate Invoice" Modal
  // ----------------------------------------------------
  const [selectedPipelineLeadId, setSelectedPipelineLeadId] = useState("");
  const [linkedExistingToken, setLinkedExistingToken] = useState(null);
  const [formTokenNo, setFormTokenNo] = useState("");
  const [formInvoiceNo, setFormInvoiceNo] = useState(generateInvoiceNumber());
  const [formInvoiceDate, setFormInvoiceDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [formInstallmentTitle, setFormInstallmentTitle] = useState("1st Installment - Token Advance");
  const [formPaymentMode, setFormPaymentMode] = useState("UPI / GPay");
  const [formTransactionRef, setFormTransactionRef] = useState("");
  const [formAmountPaid, setFormAmountPaid] = useState("50000");
  const [formRemarks, setFormRemarks] = useState("");

  // Customer & Vehicle fields (Auto-populated from selected pipeline lead)
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formServiceNo, setFormServiceNo] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCity, setFormCity] = useState("Ahmedabad, Gujarat");
  const [formBrand, setFormBrand] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formVariant, setFormVariant] = useState("");
  const [formColor, setFormColor] = useState("Pearl White");
  const [formTotalDealAmount, setFormTotalDealAmount] = useState("1350000");

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

  // Load data from localStorage on mount & Fetch Pipeline Leads
  useEffect(() => {
    try {
      if (!localStorage.getItem("csd_tokens_invoices_v1")) {
        localStorage.setItem(
          "csd_tokens_invoices_v1",
          JSON.stringify(INITIAL_DEMO_TOKENS)
        );
      }
    } catch (err) {
      console.error(err);
    }

    // Fetch dynamic pipeline leads from Backend API
    const loadPipelineLeads = async () => {
      setIsLoadingLeads(true);
      try {
        const res = await api.get("/leads");
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          // Merge with default pipeline leads to guarantee a rich list
          const apiLeads = res.data.data.map((l) => ({
            id: l.id,
            customer_name: l.name || l.customer_name,
            phone: l.phone,
            email: l.email,
            city: l.city || l.address || "Ahmedabad",
            brand_name: l.brand?.name || l.brand_name || "Maruti Suzuki",
            model_variant: l.model_variant || "Standard CSD Variant",
            priority: l.priority || "Hot",
            status_name: l.status?.name || "Active Lead",
            total_deal_amount: l.budget || 1250000,
          }));
          setPipelineLeads(apiLeads);
        }
      } catch (e) {
        // Fallback to default pipeline leads if backend offline
        console.log("Using local pipeline leads:", e);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    loadPipelineLeads();
  }, []);

  // Save to localStorage whenever tokensData changes
  const saveTokensData = (newData) => {
    setTokensData(newData);
    try {
      localStorage.setItem("csd_tokens_invoices_v1", JSON.stringify(newData));
    } catch (e) {
      console.error(e);
    }
  };

  // Reset to default demo data
  const handleResetDemoData = () => {
    if (
      window.confirm(
        "Are you sure you want to reset invoices to initial demo data?"
      )
    ) {
      saveTokensData(INITIAL_DEMO_TOKENS);
      showToast("Demo data reloaded successfully!", "info");
    }
  };

  // Calculate Token Summaries (Total Paid, Remaining Balance, Progress %)
  const enrichedTokens = useMemo(() => {
    return tokensData.map((tok) => {
      const totalPaid = (tok.invoices || []).reduce(
        (sum, inv) => sum + Number(inv.amountPaid || 0),
        0
      );
      const dealAmount = Number(tok.totalDealAmount) || 0;
      const balanceDue = Math.max(0, dealAmount - totalPaid);
      const isSettled = balanceDue <= 0 && dealAmount > 0;
      const percentPaid =
        dealAmount > 0
          ? Math.min(100, Math.round((totalPaid / dealAmount) * 100))
          : 0;

      return {
        ...tok,
        computedTotalPaid: totalPaid,
        computedBalanceDue: balanceDue,
        computedStatus: isSettled ? "Fully Paid" : "Partial",
        computedPercentPaid: percentPaid,
        invoicesCount: (tok.invoices || []).length,
      };
    });
  }, [tokensData]);

  // Flattened list of ALL invoices across all tokens
  const allInvoicesList = useMemo(() => {
    const list = [];
    enrichedTokens.forEach((tok) => {
      (tok.invoices || []).forEach((inv) => {
        list.push({
          ...inv,
          tokenNo: tok.tokenNo,
          customerName: tok.customerName,
          mobile: tok.mobile,
          vehicle: `${tok.brand} ${tok.model} (${tok.variant})`,
          totalDealAmount: tok.totalDealAmount,
          parentToken: tok,
        });
      });
    });
    // Sort newest first
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [enrichedTokens]);

  // Overall KPIs
  const metrics = useMemo(() => {
    const totalInvoicesCount = allInvoicesList.length;
    const totalCollected = allInvoicesList.reduce(
      (sum, i) => sum + Number(i.amountPaid || 0),
      0
    );
    const totalDealVolume = enrichedTokens.reduce(
      (sum, t) => sum + Number(t.totalDealAmount || 0),
      0
    );
    const totalPending = Math.max(0, totalDealVolume - totalCollected);
    const totalTokensCount = enrichedTokens.length;

    return {
      totalInvoicesCount,
      totalCollected,
      totalDealVolume,
      totalPending,
      totalTokensCount,
    };
  }, [allInvoicesList, enrichedTokens]);

  // Filtered Tokens for Tab 1
  const filteredTokens = useMemo(() => {
    return enrichedTokens.filter((tok) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        tok.tokenNo.toLowerCase().includes(q) ||
        tok.customerName.toLowerCase().includes(q) ||
        tok.mobile.toLowerCase().includes(q) ||
        tok.brand.toLowerCase().includes(q) ||
        tok.model.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" && tok.computedStatus === "Fully Paid") ||
        (statusFilter === "partial" && tok.computedStatus === "Partial");

      return matchQuery && matchStatus;
    });
  }, [enrichedTokens, searchQuery, statusFilter]);

  // Filtered All Invoices for Tab 2
  const filteredAllInvoices = useMemo(() => {
    return allInvoicesList.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.tokenNo.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.installmentTitle.toLowerCase().includes(q) ||
        inv.vehicle.toLowerCase().includes(q);

      return matchQuery;
    });
  }, [allInvoicesList, searchQuery]);

  //  PIPELINE LEAD SELECTOR HANDLER
  
    const handleSelectPipelineCustomer = (leadId) => {
    setSelectedPipelineLeadId(leadId);
    if (!leadId) {
      setLinkedExistingToken(null);
      return;
    }

    const lead = pipelineLeads.find((l) => String(l.id) === String(leadId));
    if (!lead) return;

    const leadName = lead.customer_name || lead.name || "";
    const leadPhone = lead.phone || "";

    setFormCustomerName(leadName);
    setFormMobile(leadPhone);
    setFormEmail(lead.email || "");
    setFormCity(lead.city || "Ahmedabad, Gujarat");
    const leadBrand = lead.brand_name || lead.brand?.name || "";
    const leadModel = lead.model_variant || lead.model?.name || "";
    setFormBrand(leadBrand);
    setFormModel(leadModel);
    setFormVariant(leadModel || "Standard CSD Variant");
    const dealAmt = Number(lead.budget) || Number(lead.total_deal_amount) || 1350000;
    setFormTotalDealAmount(String(dealAmt));

    // Check if this lead already has an existing Token in the system
    const existing = enrichedTokens.find(
      (t) =>
        (leadPhone && t.mobile.replace(/\D/g, "").includes(leadPhone.replace(/\D/g, ""))) ||
        (leadName && t.customerName.toLowerCase().trim() === leadName.toLowerCase().trim())
    );

    if (existing) {
      setLinkedExistingToken(existing);
      setFormTokenNo(existing.tokenNo);

      const nextBillNo = (existing.invoices || []).length + 1;
      let stageTitle = `${nextBillNo}th Installment`;
      if (nextBillNo === 2) stageTitle = "2nd Installment - Margin Money Deposit";
      if (nextBillNo === 3) stageTitle = "3rd Installment - RTO, Insurance & CSD Tax";
      if (nextBillNo >= 4) stageTitle = `${nextBillNo}th Installment - Balance Settlement`;

      setFormInstallmentTitle(stageTitle);
      const remaining = existing.computedBalanceDue;
      const suggestedAmt = remaining > 0 ? remaining : 50000;
      setFormAmountPaid(String(suggestedAmt));
      setFormLineItems([
        {
          desc: `${stageTitle} for ${existing.brand} ${existing.model}`,
          hsn: "998313",
          qty: 1,
          rate: String(suggestedAmt),
          amount: String(suggestedAmt),
        },
      ]);
      setFormRemarks(`Installment payment for existing token ${existing.tokenNo}.`);
      showToast(
        `Linked to ${existing.tokenNo} (${existing.invoicesCount} previous bills found)`,
        "info"
      );
    } else {
      // New Token for this Pipeline Lead
      const newTokNo = `TKN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setLinkedExistingToken(null);
      setFormTokenNo(newTokNo);
      setFormInstallmentTitle("1st Installment - Token Booking Advance");
      setFormAmountPaid("50000");
      setFormLineItems([
        {
          desc: `CSD AFD Token Advance for ${lead.brand_name || "Vehicle"} ${lead.model_variant || ""}`,
          hsn: "998313",
          qty: 1,
          rate: "50000",
          amount: "50000",
        },
      ]);
      setFormRemarks(`Initial token advance for pipeline lead: ${leadName}.`);
    }
  };

  // Open Generate Invoice for an existing token from Table Row "Add Bill"
  const handleOpenGenerateForToken = (token) => {
    // Find matching pipeline lead if available
    const matchedLead = pipelineLeads.find(
      (l) =>
        l.phone?.replace(/\D/g, "") === token.mobile?.replace(/\D/g, "") ||
        l.customer_name?.toLowerCase() === token.customerName?.toLowerCase()
    );

    setSelectedPipelineLeadId(matchedLead ? String(matchedLead.id) : "");
    setLinkedExistingToken(token);
    setFormTokenNo(token.tokenNo);
    setFormCustomerName(token.customerName);
    setFormMobile(token.mobile);
    setFormEmail(token.email || "");
    setFormCity(token.city || "Ahmedabad, Gujarat");
    setFormServiceNo(token.serviceNo || "");
    setFormUnit(token.unit || "");
    setFormBrand(token.brand);
    setFormModel(token.model);
    setFormVariant(token.variant);
    setFormTotalDealAmount(String(token.totalDealAmount));

    setFormInvoiceNo(generateInvoiceNumber());
    setFormInvoiceDate(new Date().toISOString().split("T")[0]);

    const nextCount = (token.invoices || []).length + 1;
    let titlePreset = `${nextCount}th Installment`;
    if (nextCount === 2) titlePreset = "2nd Installment - Margin Money Deposit";
    if (nextCount === 3) titlePreset = "3rd Installment - RTO, Insurance & CSD Tax";
    if (nextCount >= 4) titlePreset = `${nextCount}th Installment - Balance Settlement`;
    setFormInstallmentTitle(titlePreset);

    const remaining = token.computedBalanceDue;
    const suggested = remaining > 0 ? remaining : 50000;
    setFormAmountPaid(String(suggested));
    setFormTransactionRef("");
    setFormRemarks(`Installment payment for CSD booking ${token.tokenNo}.`);
    setFormLineItems([
      {
        desc: `${titlePreset} for ${token.brand} ${token.model}`,
        hsn: "998313",
        qty: 1,
        rate: String(suggested),
        amount: String(suggested),
      },
    ]);

    setIsGenerateModalOpen(true);
  };

  // Open Generate Modal from top button "Generate New Invoice"
  const handleOpenGenerateModal = () => {
    setFormInvoiceNo(generateInvoiceNumber());
    setFormInvoiceDate(new Date().toISOString().split("T")[0]);
    setSelectedPipelineLeadId("");
    setLinkedExistingToken(null);
    setFormTokenNo(`TKN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormCustomerName("");
    setFormServiceNo("");
    setFormUnit("");
    setFormMobile("");
    setFormEmail("");
    setFormCity("Ahmedabad, Gujarat");
    setFormBrand("");
    setFormModel("");
    setFormVariant("");
    setFormColor("Pearl White");
    setFormTotalDealAmount("1350000");
    setFormInstallmentTitle("1st Installment - Token Advance");
    setFormAmountPaid("50000");
    setFormTransactionRef("");
    setFormRemarks("Initial booking token amount received for CSD file opening.");
    setFormLineItems([
      {
        desc: "CSD AFD Portal Registration & Token Booking Advance",
        hsn: "998313",
        qty: 1,
        rate: "50000",
        amount: "50000",
      },
    ]);
    setIsGenerateModalOpen(true);
  };

  // Regnerate invoice number with current year/month/random4
  const handleRegenerateInvoiceNo = () => {
    const newNo = generateInvoiceNumber();
    setFormInvoiceNo(newNo);
    showToast(`Generated new invoice no: ${newNo}`, "info");
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
  // SUBMIT HANDLER: Generate & Save Invoice
  // =========================================================================
  const handleSaveInvoice = (e) => {
    e.preventDefault();

    if (!formCustomerName || !formMobile) {
      showToast("Customer Name and Mobile number are required.", "warning");
      return;
    }

    const amountNum = Number(formAmountPaid) || 0;
    if (amountNum <= 0) {
      showToast("Please enter a valid amount paid for this invoice.", "warning");
      return;
    }

    const nowTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const finalInvoiceNo = formInvoiceNo || generateInvoiceNumber();
    const finalTokenNo = formTokenNo || `TKN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInvoiceObj = {
      id: `INV-${Date.now()}`,
      invoiceNo: finalInvoiceNo,
      date: formInvoiceDate || new Date().toISOString().split("T")[0],
      time: nowTime,
      installmentTitle: formInstallmentTitle || "Installment Payment",
      paymentMode: formPaymentMode,
      transactionRef: formTransactionRef || "VERIFIED-REF",
      amountPaid: amountNum,
      items: formLineItems.map((item) => ({
        desc: item.desc || "CSD Payment Installment",
        hsn: item.hsn || "998313",
        qty: Number(item.qty) || 1,
        rate: Number(item.rate) || amountNum,
        amount: Number(item.amount) || amountNum,
      })),
      remarks: formRemarks || "Payment received and recorded.",
      status: "Paid",
      generatedBy: "Super Admin",
    };

    let updatedTokens = [...tokensData];
    let targetTokenRef = null;

    // Check if target token already exists in database
    const existingIndex = updatedTokens.findIndex((t) => t.tokenNo === finalTokenNo);

    if (existingIndex !== -1) {
      // Add subsequent invoice to existing token
      const existingTok = updatedTokens[existingIndex];
      const newInvoices = [...(existingTok.invoices || []), newInvoiceObj];
      const updatedTok = {
        ...existingTok,
        invoices: newInvoices,
        customerName: formCustomerName,
        mobile: formMobile,
        brand: formBrand || existingTok.brand,
        model: formModel || existingTok.model,
        totalDealAmount: Number(formTotalDealAmount) || existingTok.totalDealAmount,
      };
      updatedTokens[existingIndex] = updatedTok;
      targetTokenRef = updatedTok;
    } else {
      // Create new token record for this customer
      const newTokObj = {
        tokenNo: finalTokenNo,
        customerName: formCustomerName,
        serviceNo: formServiceNo || "CSD-APPL",
        unit: formUnit || "General Defence",
        mobile: formMobile,
        email: formEmail || "customer@csd.gov.in",
        city: formCity || "Ahmedabad, Gujarat",
        brand: formBrand || "Maruti Suzuki",
        model: formModel || "Grand Vitara",
        variant: formVariant || "Zeta 1.5L",
        color: formColor || "Pearl White",
        totalDealAmount: Number(formTotalDealAmount) || amountNum,
        bookingDate: formInvoiceDate,
        status: "Partial",
        invoices: [newInvoiceObj],
      };
      updatedTokens.unshift(newTokObj);
      targetTokenRef = newTokObj;
    }

    saveTokensData(updatedTokens);
    setIsGenerateModalOpen(false);
    showToast(
      `Invoice ${newInvoiceObj.invoiceNo} generated successfully for ${formCustomerName}!`,
      "success"
    );

    // Open single invoice voucher modal for preview and instant printing
    if (targetTokenRef) {
      setSelectedInvoiceForSingleView({
        ...newInvoiceObj,
        tokenNo: targetTokenRef.tokenNo,
        customerName: targetTokenRef.customerName,
        mobile: targetTokenRef.mobile,
        vehicle: `${targetTokenRef.brand} ${targetTokenRef.model} (${targetTokenRef.variant})`,
        totalDealAmount: targetTokenRef.totalDealAmount,
        parentToken: targetTokenRef,
      });
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
      "Token No",
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
      `"${i.invoiceNo}"`,
      `"${i.date}"`,
      `"${i.tokenNo}"`,
      `"${i.customerName}"`,
      `"${i.mobile}"`,
      `"${i.vehicle}"`,
      `"${i.installmentTitle}"`,
      `"${i.paymentMode}"`,
      `"${i.transactionRef}"`,
      i.amountPaid,
      `"${i.status}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CSD_All_Invoices_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Exported all invoices to CSV successfully!", "success");
  };

  // Export Token-wise Statement to CSV
  const handleExportTokenLedgerCSV = (token) => {
    if (!token || !token.invoices) return;

    const headers = [
      "Token No",
      "Customer Name",
      "Vehicle",
      "Invoice No",
      "Date",
      "Payment Stage",
      "Payment Mode",
      "Ref No",
      "Amount Paid (INR)",
    ];

    const rows = token.invoices.map((inv) => [
      `"${token.tokenNo}"`,
      `"${token.customerName}"`,
      `"${token.brand} ${token.model}"`,
      `"${inv.invoiceNo}"`,
      `"${inv.date}"`,
      `"${inv.installmentTitle}"`,
      `"${inv.paymentMode}"`,
      `"${inv.transactionRef}"`,
      inv.amountPaid,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ledger_${token.tokenNo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported statement for ${token.tokenNo}`, "success");
  };

  // Print Invoice
  const handlePrintInvoice = () => {
    window.print();
  };

  if (!mounted) {
    return (
      <AdminLayout>
        <div className="p-4 text-center text-muted">
          <div className="spinner-border text-primary me-2" role="status"></div>
          Loading Invoice Management System...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* =========================================================================
          PRINT-ONLY STYLESHEET: Ensures invoice prints on clean A4 sheet
          ========================================================================= */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printableInvoiceArea,
          #printableInvoiceArea * {
            visibility: visible !important;
          }
          #printableInvoiceArea {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="container-fluid px-3 px-lg-4 py-3">
        {/* =====================================================================
            PAGE HEADER & QUICK ACTIONS
            ===================================================================== */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span
                className="badge rounded-pill"
                style={{
                  background: "rgba(88, 99, 42, 0.15)",
                  color: "var(--primary, #58632A)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  letterSpacing: "0.5px",
                }}
              >
                SUPER ADMIN BILLING DESK
              </span>
              <span className="text-muted small">• Pipeline Customer Multi-Bill Flow</span>
            </div>
            <h2
              className="fw-bold mb-1 mt-1"
              style={{ color: "#131C27", letterSpacing: "-0.5px" }}
            >
              Generate Invoice & Token Billing
            </h2>
            <p className="text-muted small mb-0">
              Select customer from leads pipeline, generate sequential installment invoices (
              <code>DAL-/YYYY/MM/XXXX</code>), consolidated statements & PDF exports.
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 shadow-sm"
              onClick={handleResetDemoData}
              title="Reload initial demo data"
            >
              <i className="bi bi-arrow-counterclockwise"></i>
              <span>Reset Demo</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-dark btn-sm d-flex align-items-center gap-2 shadow-sm"
              onClick={handleExportAllInvoicesCSV}
            >
              <i className="bi bi-file-earmark-spreadsheet-fill text-success"></i>
              <span>Export Invoices CSV</span>
            </button>

            <button
              type="button"
              className="btn d-flex align-items-center gap-2 shadow-sm text-white"
              style={{
                backgroundColor: "var(--primary, #58632A)",
                borderColor: "var(--primary, #58632A)",
                fontWeight: 600,
              }}
              onClick={handleOpenGenerateModal}
            >
              <i className="bi bi-plus-circle-fill"></i>
              <span>Generate New Invoice</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            KPI SUMMARY METRIC CARDS
            ===================================================================== */}
        <div className="row g-3 mb-4">
          {/* Card 1: Total Invoices */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div
              className="card border-0 shadow-sm h-100 p-3"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #131C27, #1e2d3d)",
                color: "#ffffff",
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-uppercase small text-light opacity-75 fw-semibold">
                    Invoices Issued
                  </span>
                  <h3 className="fw-bold my-1 text-white">
                    {metrics.totalInvoicesCount}
                  </h3>
                  <span className="small text-light opacity-75">
                    Across {metrics.totalTokensCount} Customer Tokens
                  </span>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(220, 233, 162, 0.15)",
                    color: "#DCE9A2",
                    fontSize: "1.4rem",
                  }}
                >
                  <i className="bi bi-receipt-cutoff"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Total Collected */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div
              className="card border-0 shadow-sm h-100 p-3"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #58632A, #3F4912)",
                color: "#ffffff",
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-uppercase small text-light opacity-75 fw-semibold">
                    Total Collected
                  </span>
                  <h3 className="fw-bold my-1 text-white">
                    {formatCurrency(metrics.totalCollected)}
                  </h3>
                  <span className="small text-light opacity-75">
                    Realized payments received
                  </span>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    fontSize: "1.4rem",
                  }}
                >
                  <i className="bi bi-wallet2"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Total Pending Balance */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div
              className="card border-0 shadow-sm h-100 p-3"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #EE6800, #C25400)",
                color: "#ffffff",
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-uppercase small text-light opacity-75 fw-semibold">
                    Outstanding Balance
                  </span>
                  <h3 className="fw-bold my-1 text-white">
                    {formatCurrency(metrics.totalPending)}
                  </h3>
                  <span className="small text-light opacity-75">
                    To be collected via next bills
                  </span>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    fontSize: "1.4rem",
                  }}
                >
                  <i className="bi bi-hourglass-split"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Total Deal Volume */}
          <div className="col-12 col-sm-6 col-xl-3">
            <div
              className="card border-0 shadow-sm h-100 p-3"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #000080, #131C27)",
                color: "#ffffff",
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-uppercase small text-light opacity-75 fw-semibold">
                    Total Deal Value
                  </span>
                  <h3 className="fw-bold my-1 text-white">
                    {formatCurrency(metrics.totalDealVolume)}
                  </h3>
                  <span className="small text-light opacity-75">
                    Active CSD bookings volume
                  </span>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    fontSize: "1.4rem",
                  }}
                >
                  <i className="bi bi-shield-check"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            FILTER TABS & SEARCH BAR
            ===================================================================== */}
        <div
          className="card border-0 shadow-sm mb-4"
          style={{ borderRadius: "12px" }}
        >
          <div className="card-body p-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              {/* Tab Selector */}
              <ul className="nav nav-pills" role="tablist">
                <li className="nav-item">
                  <button
                    className={`nav-link d-flex align-items-center gap-2 py-2 px-3 fw-semibold ${
                      activeTab === "tokens" ? "active" : ""
                    }`}
                    style={
                      activeTab === "tokens"
                        ? {
                            backgroundColor: "var(--primary, #58632A)",
                            color: "#fff",
                            borderRadius: "8px",
                          }
                        : { color: "#4B5563" }
                    }
                    onClick={() => setActiveTab("tokens")}
                  >
                    <i className="bi bi-collection-fill"></i>
                    <span>Customer Tokens (Multi-Bill Ledgers)</span>
                    <span
                      className={`badge rounded-pill ${
                        activeTab === "tokens" ? "bg-light text-dark" : "bg-secondary text-white"
                      }`}
                    >
                      {enrichedTokens.length}
                    </span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link d-flex align-items-center gap-2 py-2 px-3 fw-semibold ${
                      activeTab === "all-invoices" ? "active" : ""
                    }`}
                    style={
                      activeTab === "all-invoices"
                        ? {
                            backgroundColor: "var(--primary, #58632A)",
                            color: "#fff",
                            borderRadius: "8px",
                          }
                        : { color: "#4B5563" }
                    }
                    onClick={() => setActiveTab("all-invoices")}
                  >
                    <i className="bi bi-file-earmark-ruled-fill"></i>
                    <span>All Invoices Master Register</span>
                    <span
                      className={`badge rounded-pill ${
                        activeTab === "all-invoices"
                          ? "bg-light text-dark"
                          : "bg-secondary text-white"
                      }`}
                    >
                      {allInvoicesList.length}
                    </span>
                  </button>
                </li>
              </ul>

              {/* Search & Filters */}
              <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1 justify-content-end">
                <div
                  className="input-group input-group-sm"
                  style={{ maxWidth: "340px" }}
                >
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder={
                      activeTab === "tokens"
                        ? "Search Token, Customer, Phone, Car..."
                        : "Search Invoice No, Token, Customer..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="btn btn-outline-secondary border-start-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>

                {activeTab === "tokens" && (
                  <select
                    className="form-select form-select-sm"
                    style={{ maxWidth: "160px" }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="partial">Partial Payment</option>
                    <option value="paid">Fully Settled</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            TAB 1: CUSTOMER TOKENS (MULTI-INVOICE GROUPED VIEW)
            ===================================================================== */}
        {activeTab === "tokens" && (
          <div
            className="card border-0 shadow-sm"
            style={{ borderRadius: "12px", overflow: "hidden" }}
          >
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead
                  style={{
                    backgroundColor: "#131C27",
                    color: "#DCE9A2",
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <tr>
                    <th className="py-3 px-3">Token No & Date</th>
                    <th className="py-3">Customer Details</th>
                    <th className="py-3">Booked Vehicle</th>
                    <th className="py-3 text-end">Total Deal</th>
                    <th className="py-3 text-end">Paid (Invoices Sum)</th>
                    <th className="py-3 text-end">Remaining Balance</th>
                    <th className="py-3 text-center">Invoices</th>
                    <th className="py-3 text-center">Status</th>
                    <th className="py-3 text-end px-3">Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "0.9rem" }}>
                  {filteredTokens.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary opacity-50"></i>
                        No matching customer tokens found. Click{" "}
                        <strong>&quot;Generate New Invoice&quot;</strong> to add one!
                      </td>
                    </tr>
                  ) : (
                    filteredTokens.map((tok) => {
                      const isComplete = tok.computedStatus === "Fully Paid";
                      return (
                        <tr key={tok.tokenNo}>
                          {/* Token & Date */}
                          <td className="px-3">
                            <div className="fw-bold text-dark font-monospace">
                              {tok.tokenNo}
                            </div>
                            <small className="text-muted">
                              <i className="bi bi-calendar3 me-1"></i>
                              {tok.bookingDate}
                            </small>
                          </td>

                          {/* Customer */}
                          <td>
                            <div className="fw-semibold text-dark">
                              {tok.customerName}
                            </div>
                            <small className="text-muted d-block">
                              <i className="bi bi-telephone me-1"></i>
                              {tok.mobile}
                            </small>
                            {tok.serviceNo && (
                              <span
                                className="badge bg-light text-dark border px-2 py-0.5 mt-1"
                                style={{ fontSize: "0.7rem" }}
                              >
                                {tok.serviceNo}
                              </span>
                            )}
                          </td>

                          {/* Vehicle */}
                          <td>
                            <div className="fw-semibold text-dark">
                              {tok.brand} {tok.model}
                            </div>
                            <small className="text-muted d-block">
                              {tok.variant}
                            </small>
                          </td>

                          {/* Deal Amount */}
                          <td className="text-end fw-semibold">
                            {formatCurrency(tok.totalDealAmount)}
                          </td>

                          {/* Total Paid (Sum of all invoices) */}
                          <td className="text-end">
                            <div className="fw-bold text-success">
                              {formatCurrency(tok.computedTotalPaid)}
                            </div>
                            <div
                              className="progress mt-1"
                              style={{ height: "4px" }}
                            >
                              <div
                                className={`progress-bar ${
                                  isComplete ? "bg-success" : "bg-warning"
                                }`}
                                role="progressbar"
                                style={{
                                  width: `${tok.computedPercentPaid}%`,
                                }}
                              ></div>
                            </div>
                            <small
                              className="text-muted"
                              style={{ fontSize: "0.72rem" }}
                            >
                              {tok.computedPercentPaid}% Paid
                            </small>
                          </td>

                          {/* Remaining Balance */}
                          <td className="text-end">
                            <span
                              className={`fw-bold ${
                                tok.computedBalanceDue > 0
                                  ? "text-danger"
                                  : "text-muted"
                              }`}
                            >
                              {formatCurrency(tok.computedBalanceDue)}
                            </span>
                          </td>

                          {/* Invoices Count Badge */}
                          <td className="text-center">
                            <span
                              className="badge rounded-pill px-2.5 py-1.5"
                              style={{
                                background: "rgba(0, 0, 128, 0.1)",
                                color: "#000080",
                                fontWeight: 700,
                              }}
                            >
                              <i className="bi bi-receipt me-1"></i>
                              {tok.invoicesCount} {tok.invoicesCount === 1 ? "Bill" : "Bills"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="text-center">
                            <span
                              className={`badge rounded-pill px-2.5 py-1 ${
                                isComplete
                                  ? "bg-success-subtle text-success"
                                  : "bg-warning-subtle text-warning"
                              }`}
                              style={{ fontWeight: 600 }}
                            >
                              {isComplete ? "Settled" : "Partial"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="text-end px-3">
                            <div className="d-flex align-items-center justify-content-end gap-1">
                              {/* VIEW ALL INVOICES (Consolidated modal) */}
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                                onClick={() => setSelectedTokenForMultiView(tok)}
                                title="View All Invoices for this Token"
                              >
                                <i className="bi bi-eye-fill"></i>
                                <span>View Invoices</span>
                              </button>

                              {/* ADD NEXT BILL / INSTALLMENT */}
                              <button
                                type="button"
                                className="btn btn-sm text-white d-inline-flex align-items-center gap-1"
                                style={{
                                  backgroundColor: "var(--primary, #58632A)",
                                  borderColor: "var(--primary, #58632A)",
                                }}
                                onClick={() => handleOpenGenerateForToken(tok)}
                                title="Add Next Installment Bill"
                              >
                                <i className="bi bi-plus-lg"></i>
                                <span>Add Bill</span>
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
        )}

        {/* =====================================================================
            TAB 2: ALL INVOICES MASTER REGISTER (INDIVIDUAL BILLS)
            ===================================================================== */}
        {activeTab === "all-invoices" && (
          <div
            className="card border-0 shadow-sm"
            style={{ borderRadius: "12px", overflow: "hidden" }}
          >
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead
                  style={{
                    backgroundColor: "#131C27",
                    color: "#DCE9A2",
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <tr>
                    <th className="py-3 px-3">Invoice No</th>
                    <th className="py-3">Date & Time</th>
                    <th className="py-3">Token Ref</th>
                    <th className="py-3">Customer & Vehicle</th>
                    <th className="py-3">Installment / Purpose</th>
                    <th className="py-3 text-end">Amount Paid</th>
                    <th className="py-3">Payment Mode & Ref</th>
                    <th className="py-3 text-center">Status</th>
                    <th className="py-3 text-end px-3">Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "0.9rem" }}>
                  {filteredAllInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        <i className="bi bi-receipt fs-1 d-block mb-2 text-secondary opacity-50"></i>
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    filteredAllInvoices.map((inv) => (
                      <tr key={inv.id || inv.invoiceNo}>
                        {/* Invoice No */}
                        <td className="px-3">
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

                        {/* Token No */}
                        <td>
                          <span className="badge bg-light text-primary border font-monospace">
                            {inv.tokenNo}
                          </span>
                        </td>

                        {/* Customer & Vehicle */}
                        <td>
                          <div className="fw-semibold text-dark">
                            {inv.customerName}
                          </div>
                          <small className="text-muted d-block text-truncate" style={{ maxWidth: "220px" }}>
                            {inv.vehicle}
                          </small>
                        </td>

                        {/* Installment / Purpose */}
                        <td>
                          <span className="fw-semibold text-dark">
                            {inv.installmentTitle}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="text-end fw-bold text-success fs-6">
                          {formatCurrency(inv.amountPaid)}
                        </td>

                        {/* Mode & Ref */}
                        <td>
                          <div className="fw-semibold text-dark">
                            {inv.paymentMode}
                          </div>
                          <small className="text-muted font-monospace">
                            {inv.transactionRef}
                          </small>
                        </td>

                        {/* Status */}
                        <td className="text-center">
                          <span className="badge bg-success-subtle text-success px-2 py-1">
                            {inv.status || "Paid"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-end px-3">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            {/* View Individual Invoice */}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-dark d-inline-flex align-items-center gap-1"
                              onClick={() => setSelectedInvoiceForSingleView(inv)}
                              title="View & Print Invoice Voucher"
                            >
                              <i className="bi bi-file-earmark-text-fill text-primary"></i>
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODAL 1: GENERATE INVOICE (TASK 1: FIXED SUBMIT BUTTON & TASK 2: PIPELINE LEADS SELECTOR)
            ===================================================================== */}
        {isGenerateModalOpen && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(19, 28, 39, 0.70)", zIndex: 1050 }}
          >
            <div
              className="modal-dialog modal-lg modal-dialog-centered"
              style={{ maxWidth: "800px", margin: "1.75rem auto" }}
            >
              {/* Form container with fixed height and flex-column layout */}
              <form
                onSubmit={handleSaveInvoice}
                className="modal-content border-0 shadow-lg"
                style={{
                  maxHeight: "90vh",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "14px",
                  overflow: "hidden",
                  backgroundColor: "#ffffff",
                }}
              >
                {/* 1. Modal Header (Pinned at top) */}
                <div
                  className="modal-header px-4 py-3 flex-shrink-0"
                  style={{
                    backgroundColor: "#131C27",
                    color: "#DCE9A2",
                    borderBottom: "1px solid rgba(220, 233, 162, 0.2)",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "36px",
                        height: "36px",
                        background: "rgba(88, 99, 42, 0.4)",
                        color: "#DCE9A2",
                      }}
                    >
                      <i className="bi bi-receipt-cutoff fs-5"></i>
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold text-white mb-0">
                        Generate Invoice Voucher
                      </h5>
                      <small style={{ color: "#DCE9A2" }}>
                        Format: <code>DAL-/YYYY/MM/XXXX</code> • Leads Pipeline Flow
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setIsGenerateModalOpen(false)}
                    aria-label="Close"
                  ></button>
                </div>

                {/* 2. Modal Body (Scrollable with smooth scrolling) */}
                <div
                  className="modal-body px-4 py-3"
                  style={{
                    overflowY: "auto",
                    flex: "1 1 auto",
                    maxHeight: "calc(90vh - 135px)",
                  }}
                >
                  {/* =========================================================================
                      TASK 2: SELECT CUSTOMER FROM LEADS PIPELINE (NO RADIO BUTTONS)
                      ========================================================================= */}
                  <div
                    className="p-3 rounded mb-3 border shadow-sm"
                    style={{
                      background: "linear-gradient(135deg, rgba(88, 99, 42, 0.08), rgba(19, 28, 39, 0.04))",
                      borderColor: "var(--border-color, #D9DDCC)",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label className="form-label fw-bold text-dark small mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-funnel-fill text-primary"></i>
                        <span>Select Customer from Leads Pipeline</span>
                        <span className="text-danger">*</span>
                      </label>
                      <span className="badge bg-secondary-subtle text-secondary small">
                        {pipelineLeads.length} Pipeline Customers
                      </span>
                    </div>

                    <select
                      className="form-select fw-semibold"
                      style={{ borderColor: "var(--primary, #58632A)" }}
                      value={selectedPipelineLeadId}
                      onChange={(e) => handleSelectPipelineCustomer(e.target.value)}
                    >
                      <option value="">-- Choose Customer from Leads Pipeline --</option>
                      {pipelineLeads.map((lead) => {
                        const leadName = lead.customer_name || lead.name;
                        return (
                          <option key={lead.id} value={lead.id}>
                            【{lead.brand_name || "CSD Brand"}】 {leadName} — {lead.model_variant || ""} (📞 {lead.phone})
                          </option>
                        );
                      })}
                    </select>

                    {/* Linked Token Notification Banner */}
                    {linkedExistingToken ? (
                      <div
                        className="mt-2.5 p-2.5 rounded d-flex align-items-center justify-content-between"
                        style={{
                          background: "rgba(21, 128, 61, 0.12)",
                          border: "1px solid #16a34a",
                        }}
                      >
                        <div className="small">
                          <span className="badge bg-success me-2">EXISTING TOKEN LINKED</span>
                          <strong className="text-dark font-monospace">
                            {linkedExistingToken.tokenNo}
                          </strong>{" "}
                          • {linkedExistingToken.invoicesCount} Previous Bills Generated
                        </div>
                        <div className="small text-end">
                          <span className="text-muted">Total Paid: </span>
                          <strong className="text-success">
                            {formatCurrency(linkedExistingToken.computedTotalPaid)}
                          </strong>{" "}
                          | <span className="text-muted">Balance: </span>
                          <strong className="text-danger">
                            {formatCurrency(linkedExistingToken.computedBalanceDue)}
                          </strong>
                        </div>
                      </div>
                    ) : selectedPipelineLeadId ? (
                      <div
                        className="mt-2.5 p-2 rounded d-flex align-items-center justify-content-between"
                        style={{
                          background: "rgba(88, 99, 42, 0.1)",
                          border: "1px dashed var(--primary, #58632A)",
                        }}
                      >
                        <div className="small">
                          <span className="badge bg-primary me-2">NEW TOKEN ALLOCATION</span>
                          <span>First booking bill for pipeline customer. Assigned Token: </span>
                          <strong className="text-dark font-monospace">{formTokenNo}</strong>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Auto-Generated Invoice No & Date */}
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small text-dark">
                        Invoice Number (DAL-/YYYY/MM/XXXX)
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted font-monospace">
                          #
                        </span>
                        <input
                          type="text"
                          className="form-control font-monospace fw-bold"
                          value={formInvoiceNo}
                          readOnly
                          style={{
                            backgroundColor: "#F7F7F5",
                            color: "#131C27",
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={handleRegenerateInvoiceNo}
                          title="Regenerate random 4-digit code"
                        >
                          <i className="bi bi-arrow-repeat"></i>
                        </button>
                      </div>
                      <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                        Format: Current Year ({new Date().getFullYear()}) / Month (
                        {String(new Date().getMonth() + 1).padStart(2, "0")}) / Random 4 Digits
                      </small>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small text-dark">
                        Invoice Issue Date
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={formInvoiceDate}
                        onChange={(e) => setFormInvoiceDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Customer & Vehicle Information Grid (Pre-filled from pipeline lead) */}
                  <div className="p-3 bg-light rounded border mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="fw-bold text-dark mb-0">
                        <i className="bi bi-person-badge-fill me-1 text-primary"></i>
                        Customer & Vehicle Particulars
                      </h6>
                      <span className="text-muted small">
                        Token Ref: <strong className="font-monospace text-dark">{formTokenNo || "Auto"}</strong>
                      </span>
                    </div>

                    <div className="row g-2">
                      <div className="col-12 col-md-6">
                        <label className="form-label small mb-1">
                          Customer Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Customer full name"
                          value={formCustomerName}
                          onChange={(e) => setFormCustomerName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label small mb-1">
                          Mobile Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. 9825123456"
                          value={formMobile}
                          onChange={(e) => setFormMobile(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label small mb-1">
                          Service / Army No
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. IC-78291X"
                          value={formServiceNo}
                          onChange={(e) => setFormServiceNo(e.target.value)}
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label small mb-1">
                          Unit / Station
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Ahmedabad Cantt"
                          value={formUnit}
                          onChange={(e) => setFormUnit(e.target.value)}
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label small mb-1">
                          City & State
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Ahmedabad, Gujarat"
                          value={formCity}
                          onChange={(e) => setFormCity(e.target.value)}
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <label className="form-label small mb-0 fw-bold text-dark">
                            Brand (From Lead) <span className="text-danger">*</span>
                          </label>
                          {formBrand ? (
                            <span className="badge bg-success-subtle text-success px-1.5 py-0" style={{ fontSize: "0.68rem" }}>
                              <i className="bi bi-shield-check me-1"></i>From Lead
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border px-1.5 py-0" style={{ fontSize: "0.68rem" }}>
                              Auto-filled
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          className="form-control form-control-sm fw-bold"
                          placeholder="Select lead to load brand"
                          value={formBrand}
                          readOnly
                          style={{
                            backgroundColor: "#F7F7F5",
                            color: formBrand ? "var(--primary, #58632A)" : "#6c757d",
                            cursor: "not-allowed",
                            border: formBrand ? "1.5px solid var(--primary, #58632A)" : "1px solid #ced4da",
                          }}
                          required
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <label className="form-label small mb-0 fw-bold text-dark">
                            Model / Variant <span className="text-danger">*</span>
                          </label>
                          {formModel && (
                            <span className="badge bg-info-subtle text-info px-1.5 py-0" style={{ fontSize: "0.68rem" }}>
                              From Lead
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          className="form-control form-control-sm fw-semibold"
                          placeholder="Select lead to load model"
                          value={formModel}
                          readOnly
                          style={{
                            backgroundColor: "#F7F7F5",
                            color: "#131C27",
                            cursor: "not-allowed",
                          }}
                          required
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label small mb-1">
                          Total Deal Value (₹)
                        </label>
                        <input
                          type="number"
                          className="form-control form-control-sm fw-bold"
                          value={formTotalDealAmount}
                          onChange={(e) => setFormTotalDealAmount(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Stage & Amount Paid */}
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small text-dark">
                        Payment Installment / Stage Title
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        list="installmentPresetsList"
                        value={formInstallmentTitle}
                        onChange={(e) => setFormInstallmentTitle(e.target.value)}
                        placeholder="e.g. 2nd Installment - Margin Money"
                        required
                      />
                      <datalist id="installmentPresetsList">
                        <option value="1st Installment - Token Booking Advance" />
                        <option value="2nd Installment - Margin Money Deposit" />
                        <option value="3rd Installment - CSD Base Value Transfer" />
                        <option value="4th Installment - RTO, Insurance & Registration" />
                        <option value="5th Installment - Accessories & Teflon Kit" />
                        <option value="Full & Final Balance Settlement" />
                      </datalist>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small text-dark">
                        Amount Paid on this Invoice (₹) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light fw-bold">₹</span>
                        <input
                          type="number"
                          className="form-control fw-bold fs-6 text-success"
                          value={formAmountPaid}
                          onChange={(e) => setFormAmountPaid(e.target.value)}
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Mode & Reference */}
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small text-dark">
                        Payment Mode
                      </label>
                      <select
                        className="form-select"
                        value={formPaymentMode}
                        onChange={(e) => setFormPaymentMode(e.target.value)}
                      >
                        <option value="UPI / GPay">UPI / GPay / PhonePe</option>
                        <option value="NEFT / NetBanking">NEFT / NetBanking</option>
                        <option value="RTGS">RTGS Bank Transfer</option>
                        <option value="Cheque">Bank Cheque</option>
                        <option value="Bank DD / Cheque">Demand Draft (DD)</option>
                        <option value="Cash">Cash Receipt</option>
                        <option value="Debit / Credit Card">POS Card Swipe</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small text-dark">
                        Transaction / Cheque / UTR Reference
                      </label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. UPI/625371928341 or CHQ-99120"
                        value={formTransactionRef}
                        onChange={(e) => setFormTransactionRef(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Itemized Line Items Breakdown */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="form-label fw-semibold small text-dark mb-0">
                        Invoice Line Items Breakdown
                      </label>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary py-0 px-2"
                        style={{ fontSize: "0.75rem" }}
                        onClick={handleAddLineItem}
                      >
                        <i className="bi bi-plus me-1"></i>Add Row
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-1 align-middle">
                        <thead className="table-light small">
                          <tr>
                            <th>Description</th>
                            <th style={{ width: "90px" }}>HSN</th>
                            <th style={{ width: "60px" }}>Qty</th>
                            <th style={{ width: "110px" }}>Rate (₹)</th>
                            <th style={{ width: "120px" }}>Amount (₹)</th>
                            <th style={{ width: "40px" }}></th>
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
                                  placeholder="Item description"
                                  onChange={(e) =>
                                    handleLineItemChange(idx, "desc", e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.hsn}
                                  onChange={(e) =>
                                    handleLineItemChange(idx, "hsn", e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.qty}
                                  onChange={(e) =>
                                    handleLineItemChange(idx, "qty", e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.rate}
                                  onChange={(e) =>
                                    handleLineItemChange(idx, "rate", e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm fw-semibold"
                                  value={item.amount}
                                  onChange={(e) =>
                                    handleLineItemChange(idx, "amount", e.target.value)
                                  }
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

                  {/* Remarks / Notes */}
                  <div className="mb-2">
                    <label className="form-label fw-semibold small text-dark">
                      Payment Remarks / Internal Notes
                    </label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Add any specific delivery condition, gate pass clearance or bank note..."
                      value={formRemarks}
                      onChange={(e) => setFormRemarks(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                {/* =========================================================================
                    TASK 1: FIXED & PROMINENT MODAL FOOTER WITH SUBMIT BUTTON
                    This footer is pinned to the bottom of the modal dialog so it is ALWAYS visible!
                    ========================================================================= */}
                <div
                  className="modal-footer px-4 py-3 bg-light flex-shrink-0 d-flex justify-content-between align-items-center"
                  style={{
                    borderTop: "1px solid #dee2e6",
                    boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setIsGenerateModalOpen(false)}
                  >
                    <i className="bi bi-x me-1"></i>
                    Cancel
                  </button>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="submit"
                      className="btn text-white px-4 py-2 fw-bold shadow d-flex align-items-center gap-2"
                      style={{
                        backgroundColor: "var(--primary, #58632A)",
                        borderColor: "var(--primary, #58632A)",
                        fontSize: "0.95rem",
                      }}
                    >
                      <i className="bi bi-check2-circle fs-5"></i>
                      <span>Generate & Save Invoice</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODAL 2: VIEW ALL INVOICES FOR TOKEN (CONSOLIDATED TIMELINE)
            ===================================================================== */}
        {selectedTokenForMultiView && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(19, 28, 39, 0.65)", zIndex: 1050 }}
          >
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
              <div
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
                        Consolidated Invoices Ledger: {selectedTokenForMultiView.tokenNo}
                      </h5>
                      <span className="small" style={{ color: "#DCE9A2" }}>
                        Customer: {selectedTokenForMultiView.customerName} • {selectedTokenForMultiView.brand}{" "}
                        {selectedTokenForMultiView.model}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedTokenForMultiView(null)}
                  ></button>
                </div>

                {/* Body */}
                <div className="modal-body px-4 py-4">
                  {/* Financial Summary Top Bar */}
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-3">
                      <div className="card bg-light border-0 p-3 rounded">
                        <span className="small text-muted text-uppercase fw-semibold">
                          Total Deal Value
                        </span>
                        <h4 className="fw-bold text-dark my-1">
                          {formatCurrency(selectedTokenForMultiView.totalDealAmount)}
                        </h4>
                        <span className="small text-muted">Vehicle + CSD Package</span>
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div
                        className="card border-0 p-3 rounded"
                        style={{ background: "rgba(21, 128, 61, 0.1)" }}
                      >
                        <span className="small text-success text-uppercase fw-semibold">
                          Total Invoices Paid ({selectedTokenForMultiView.invoicesCount} Bills)
                        </span>
                        <h4 className="fw-bold text-success my-1">
                          {formatCurrency(selectedTokenForMultiView.computedTotalPaid)}
                        </h4>
                        <span className="small text-muted">
                          {selectedTokenForMultiView.computedPercentPaid}% Total Cleared
                        </span>
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div
                        className="card border-0 p-3 rounded"
                        style={{ background: "rgba(220, 38, 38, 0.08)" }}
                      >
                        <span className="small text-danger text-uppercase fw-semibold">
                          Outstanding Balance
                        </span>
                        <h4 className="fw-bold text-danger my-1">
                          {formatCurrency(selectedTokenForMultiView.computedBalanceDue)}
                        </h4>
                        <span className="small text-muted">Remaining to collect</span>
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="card bg-light border-0 p-3 rounded d-flex justify-content-center">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="small fw-semibold text-dark">
                            Settlement Progress
                          </span>
                          <span className="small fw-bold text-dark">
                            {selectedTokenForMultiView.computedPercentPaid}%
                          </span>
                        </div>
                        <div className="progress" style={{ height: "8px" }}>
                          <div
                            className={`progress-bar ${
                              selectedTokenForMultiView.computedBalanceDue <= 0
                                ? "bg-success"
                                : "bg-warning"
                            }`}
                            style={{
                              width: `${selectedTokenForMultiView.computedPercentPaid}%`,
                            }}
                          ></div>
                        </div>
                        <div className="mt-2 text-center">
                          <span
                            className={`badge ${
                              selectedTokenForMultiView.computedBalanceDue <= 0
                                ? "bg-success"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {selectedTokenForMultiView.computedBalanceDue <= 0
                              ? "Account Fully Settled"
                              : "Active Billing in Progress"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info Pill Strip */}
                  <div className="bg-light p-3 rounded border mb-4 d-flex flex-wrap gap-4 align-items-center justify-content-between">
                    <div>
                      <small className="text-muted d-block">Customer Phone</small>
                      <strong className="text-dark">
                        {selectedTokenForMultiView.mobile}
                      </strong>
                    </div>
                    <div>
                      <small className="text-muted d-block">Service / Army No</small>
                      <strong className="text-dark">
                        {selectedTokenForMultiView.serviceNo || "N/A"}
                      </strong>
                    </div>
                    <div>
                      <small className="text-muted d-block">Unit / Station</small>
                      <strong className="text-dark">
                        {selectedTokenForMultiView.unit || "N/A"}
                      </strong>
                    </div>
                    <div>
                      <small className="text-muted d-block">Vehicle Details</small>
                      <strong className="text-dark">
                        {selectedTokenForMultiView.brand}{" "}
                        {selectedTokenForMultiView.model} (
                        {selectedTokenForMultiView.variant})
                      </strong>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1"
                        onClick={() =>
                          handleExportTokenLedgerCSV(selectedTokenForMultiView)
                        }
                      >
                        <i className="bi bi-download"></i>
                        <span>Export Ledger CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Invoices issued for this Token */}
                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <i className="bi bi-receipt text-primary"></i>
                    All Invoices Generated for this Customer ({selectedTokenForMultiView.invoicesCount} Invoices)
                  </h6>

                  <div className="table-responsive border rounded">
                    <table className="table align-middle mb-0 table-hover">
                      <thead className="table-light small text-uppercase">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th>Invoice No</th>
                          <th>Date & Time</th>
                          <th>Installment Title / Stage</th>
                          <th>Payment Mode</th>
                          <th>Reference / UTR</th>
                          <th className="text-end">Amount Paid</th>
                          <th className="text-center">Status</th>
                          <th className="text-end px-3">Action</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: "0.88rem" }}>
                        {(selectedTokenForMultiView.invoices || []).map(
                          (inv, idx) => (
                            <tr key={inv.id || idx}>
                              <td className="px-3 text-muted fw-bold">
                                {idx + 1}
                              </td>
                              <td>
                                <span className="badge font-monospace bg-light text-dark border fw-bold">
                                  {inv.invoiceNo}
                                </span>
                              </td>
                              <td>
                                <div className="fw-semibold text-dark">
                                  {inv.date}
                                </div>
                                <small className="text-muted">{inv.time}</small>
                              </td>
                              <td className="fw-semibold text-dark">
                                {inv.installmentTitle}
                              </td>
                              <td>{inv.paymentMode}</td>
                              <td className="font-monospace text-muted small">
                                {inv.transactionRef}
                              </td>
                              <td className="text-end fw-bold text-success">
                                {formatCurrency(inv.amountPaid)}
                              </td>
                              <td className="text-center">
                                <span className="badge bg-success-subtle text-success">
                                  {inv.status || "Paid"}
                                </span>
                              </td>
                              <td className="text-end px-3">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark d-inline-flex align-items-center gap-1"
                                  onClick={() => {
                                    setSelectedInvoiceForSingleView({
                                      ...inv,
                                      tokenNo: selectedTokenForMultiView.tokenNo,
                                      customerName:
                                        selectedTokenForMultiView.customerName,
                                      mobile: selectedTokenForMultiView.mobile,
                                      vehicle: `${selectedTokenForMultiView.brand} ${selectedTokenForMultiView.model} (${selectedTokenForMultiView.variant})`,
                                      totalDealAmount:
                                        selectedTokenForMultiView.totalDealAmount,
                                      parentToken: selectedTokenForMultiView,
                                    });
                                  }}
                                >
                                  <i className="bi bi-file-earmark-text text-primary"></i>
                                  <span>View Bill</span>
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                      <tfoot className="table-light fw-bold">
                        <tr>
                          <td colSpan="6" className="text-end px-3">
                            Total Paid Across All Invoices:
                          </td>
                          <td className="text-end text-success fs-6">
                            {formatCurrency(
                              selectedTokenForMultiView.computedTotalPaid
                            )}
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div className="modal-footer px-4 py-3 bg-light d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSelectedTokenForMultiView(null)}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="btn text-white fw-bold shadow-sm d-flex align-items-center gap-2"
                    style={{
                      backgroundColor: "var(--primary, #58632A)",
                      borderColor: "var(--primary, #58632A)",
                    }}
                    onClick={() => {
                      const tok = selectedTokenForMultiView;
                      setSelectedTokenForMultiView(null);
                      handleOpenGenerateForToken(tok);
                    }}
                  >
                    <i className="bi bi-plus-circle-fill"></i>
                    <span>Generate Next Installment Bill</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODAL 3: VIEW & PRINT INDIVIDUAL INVOICE VOUCHER (PRINTABLE PDF)
            ===================================================================== */}
        {selectedInvoiceForSingleView && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(19, 28, 39, 0.75)", zIndex: 1060 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div
                className="modal-content border-0 shadow-lg"
                style={{ borderRadius: "14px", overflow: "hidden" }}
              >
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
                      Invoice Voucher Preview
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
                          <div>
                            <h3
                              className="fw-bold mb-0"
                              style={{
                                color: "#131C27",
                                letterSpacing: "-0.5px",
                              }}
                            >
                              DEFENCE AUTOLINK
                            </h3>
                            <span
                              className="small fw-semibold"
                              style={{ color: "var(--primary, #58632A)" }}
                            >
                              CSD Canteen Automotive Facilitation & Delivery Desk
                            </span>
                          </div>
                        </div>
                        <div
                          className="small text-muted mt-2"
                          style={{ lineHeight: "1.4" }}
                        >
                          SG Highway Corporate Hub, Near Thaltej Cross Roads,
                          Ahmedabad, Gujarat - 380054
                          <br />
                          GSTIN: <strong>24AAECD4920K1Z5</strong> • PAN:{" "}
                          <strong>AAECD4920K</strong> • Contact:{" "}
                          <strong>+91 97233 37621</strong>
                        </div>
                      </div>

                      {/* Invoice Badge & Details */}
                      <div className="text-end">
                        <span
                          className="badge px-3 py-1.5 text-uppercase fw-bold mb-2"
                          style={{
                            background: "rgba(21, 128, 61, 0.15)",
                            color: "#15803D",
                            fontSize: "0.85rem",
                            border: "1px solid #15803D",
                          }}
                        >
                          TAX INVOICE / RECEIPT
                        </span>
                        <div className="fw-bold fs-5 text-dark font-monospace">
                          {selectedInvoiceForSingleView.invoiceNo}
                        </div>
                        <div className="small text-muted">
                          Date:{" "}
                          <strong>
                            {selectedInvoiceForSingleView.date} |{" "}
                            {selectedInvoiceForSingleView.time}
                          </strong>
                        </div>
                        <div className="small text-muted font-monospace">
                          Token Ref:{" "}
                          <strong className="text-dark">
                            {selectedInvoiceForSingleView.tokenNo}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Vehicle Information Grid */}
                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <div className="border rounded p-3 h-100 bg-light">
                        <span className="small text-uppercase fw-bold text-muted d-block mb-1">
                          Billed To (Customer Details):
                        </span>
                        <h6 className="fw-bold text-dark mb-1">
                          {selectedInvoiceForSingleView.customerName}
                        </h6>
                        <div className="small text-muted">
                          {selectedInvoiceForSingleView.parentToken?.serviceNo && (
                            <div>
                              Service No:{" "}
                              <strong>
                                {selectedInvoiceForSingleView.parentToken.serviceNo}
                              </strong>
                            </div>
                          )}
                          {selectedInvoiceForSingleView.parentToken?.unit && (
                            <div>
                              Unit:{" "}
                              <strong>
                                {selectedInvoiceForSingleView.parentToken.unit}
                              </strong>
                            </div>
                          )}
                          <div>
                            Mobile:{" "}
                            <strong>
                              {selectedInvoiceForSingleView.mobile}
                            </strong>
                          </div>
                          <div>
                            City:{" "}
                            <strong>
                              {selectedInvoiceForSingleView.parentToken?.city ||
                                "Ahmedabad, Gujarat"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="border rounded p-3 h-100 bg-light">
                        <span className="small text-uppercase fw-bold text-muted d-block mb-1">
                          Vehicle & Booking Particulars:
                        </span>
                        <h6 className="fw-bold text-dark mb-1">
                          {selectedInvoiceForSingleView.vehicle}
                        </h6>
                        <div className="small text-muted">
                          <div>
                            Color:{" "}
                            <strong>
                              {selectedInvoiceForSingleView.parentToken?.color ||
                                "As per CSD Indent"}
                            </strong>
                          </div>
                          <div>
                            Total Deal Value:{" "}
                            <strong className="text-dark">
                              {formatCurrency(
                                selectedInvoiceForSingleView.totalDealAmount
                              )}
                            </strong>
                          </div>
                          <div>
                            Payment Purpose:{" "}
                            <strong className="text-primary">
                              {selectedInvoiceForSingleView.installmentTitle}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="table-responsive mb-4">
                    <table className="table table-bordered align-middle mb-0">
                      <thead
                        style={{
                          backgroundColor: "#131C27",
                          color: "#ffffff",
                          fontSize: "0.82rem",
                          textTransform: "uppercase",
                        }}
                      >
                        <tr>
                          <th style={{ width: "40px" }} className="text-center">
                            #
                          </th>
                          <th>Description of Service / Charges</th>
                          <th style={{ width: "90px" }} className="text-center">
                            HSN/SAC
                          </th>
                          <th style={{ width: "60px" }} className="text-center">
                            Qty
                          </th>
                          <th style={{ width: "110px" }} className="text-end">
                            Rate
                          </th>
                          <th style={{ width: "130px" }} className="text-end">
                            Amount (INR)
                          </th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: "0.88rem" }}>
                        {(selectedInvoiceForSingleView.items || [
                          {
                            desc: selectedInvoiceForSingleView.installmentTitle,
                            hsn: "998313",
                            qty: 1,
                            rate: selectedInvoiceForSingleView.amountPaid,
                            amount: selectedInvoiceForSingleView.amountPaid,
                          },
                        ]).map((item, idx) => (
                          <tr key={idx}>
                            <td className="text-center text-muted">{idx + 1}</td>
                            <td className="fw-semibold text-dark">
                              {item.desc}
                            </td>
                            <td className="text-center font-monospace small">
                              {item.hsn}
                            </td>
                            <td className="text-center">{item.qty}</td>
                            <td className="text-end">
                              {formatCurrency(item.rate)}
                            </td>
                            <td className="text-end fw-bold">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td
                            colSpan="5"
                            className="text-end fw-bold text-dark pt-3"
                          >
                            Current Invoice Total:
                          </td>
                          <td className="text-end fw-bold fs-6 text-success pt-3">
                            {formatCurrency(
                              selectedInvoiceForSingleView.amountPaid
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Payment Details & Multi-Bill Ledger Status */}
                  <div className="row g-3 mb-4">
                    <div className="col-7">
                      <div className="border rounded p-3 bg-light">
                        <span className="small text-uppercase fw-bold text-muted d-block mb-1">
                          Payment Mode & Verification:
                        </span>
                        <div className="small">
                          <div>
                            Payment Method:{" "}
                            <strong>
                              {selectedInvoiceForSingleView.paymentMode}
                            </strong>
                          </div>
                          <div>
                            UTR / Transaction Ref:{" "}
                            <strong className="font-monospace text-dark">
                              {selectedInvoiceForSingleView.transactionRef ||
                                "Verified"}
                            </strong>
                          </div>
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
                            {formatCurrency(
                              selectedInvoiceForSingleView.totalDealAmount
                            )}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between small text-muted mb-1">
                          <span>Paid in this Invoice:</span>
                          <strong className="text-success">
                            {formatCurrency(
                              selectedInvoiceForSingleView.amountPaid
                            )}
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
                      <ol
                        className="small text-muted ps-3 mb-0"
                        style={{ fontSize: "0.72rem", lineHeight: "1.4" }}
                      >
                        <li>
                          This is an official computer-generated receipt for CSD
                          AFD portal documentation.
                        </li>
                        <li>
                          Token booking amounts are adjusted against final vehicle
                          invoice upon delivery.
                        </li>
                        <li>
                          Vehicle allocation is subject to availability and Army
                          CSD AFD portal approval.
                        </li>
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

                {/* Modal Footer Controls (Hidden on print) */}
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
                      className="btn btn-outline-dark d-flex align-items-center gap-1"
                      onClick={() => {
                        const csvRow = `"${selectedInvoiceForSingleView.invoiceNo}","${selectedInvoiceForSingleView.date}","${selectedInvoiceForSingleView.tokenNo}","${selectedInvoiceForSingleView.customerName}",${selectedInvoiceForSingleView.amountPaid}`;
                        const blob = new Blob(
                          [
                            `InvoiceNo,Date,TokenNo,CustomerName,Amount\n${csvRow}`,
                          ],
                          { type: "text/csv" }
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `Invoice_${selectedInvoiceForSingleView.invoiceNo.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
                        a.click();
                        showToast("Invoice data exported!", "success");
                      }}
                    >
                      <i className="bi bi-file-earmark-arrow-down"></i>
                      <span>Export CSV</span>
                    </button>

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
