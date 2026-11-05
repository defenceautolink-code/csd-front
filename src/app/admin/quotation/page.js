"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import AdminLayout from "@/app/components/AdminLayout";
import { quotationApi } from "@/lib/quotationApi";
import { salesExecutiveApi } from "@/lib/salesExecutiveApi";
import api from "@/lib/axios";
import { useToast } from "@/app/components/Toast";
import { hasPermission } from "@/utils/auth";
import Pagination from "@/components/common/Pagination";
import * as XLSX from "xlsx";
import { logActivity } from "@/utils/activityLogger";
import ConvertDealModal from "@/app/admin/leads/ConvertDealModal";
import discountApprovalApi from "@/services/discountApprovalApi";

export default function QuotationMainPage() {
  const [selectedQuoteForDeal, setSelectedQuoteForDeal] = useState(null);
  const [showConvertDealModal, setShowConvertDealModal] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  // Searchable lead selector state (Task 10)
  const [leadSearchText, setLeadSearchText] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  // Comparable variants (Task 6) - Range: +/- 1,00,000
  const [comparableVariants, setComparableVariants] = useState([]);
  const [isLoadingComparable, setIsLoadingComparable] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveActionMenuId(null);
      setShowLeadDropdown(false);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("click", handleOutsideClick);
      return () => window.removeEventListener("click", handleOutsideClick);
    }
  }, []);

  const getLeadProfileHref = (leadId) => {
    if (!leadId) return "#";
    let userObj = currentUser;
    if (!userObj && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user");
        if (stored) userObj = JSON.parse(stored);
      } catch (e) { }
    }
    const r = userObj?.role ? String(userObj.role).toLowerCase() : "";
    if (r.includes("executive")) return `/sales-executive/leads/${leadId}`;
    if (r.includes("manager")) return `/sales-manager/leads/${leadId}`;
    return `/admin/leads/${leadId}`;
  };

  const router = useRouter();
  const pathname = usePathname();
  const isReceptionist = pathname ? pathname.startsWith("/receptionist") : false;
  const baseQuotationPath = pathname?.startsWith("/sales-manager")
    ? "/sales-manager/quotation"
    : pathname?.startsWith("/receptionist")
      ? "/receptionist/quotation"
      : pathname?.startsWith("/sales-executive")
        ? "/sales-executive/quotation"
        : "/admin/quotation";

  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    setMounted(true);
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);
  const can = (permission) => {
    if (!mounted || !currentUser) return false;
    return hasPermission(permission, currentUser);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    const [year, month, day] = date.split("T")[0].split("-");
    if (!year || !month || !day) return date;
    return `${day}-${month}-${year}`;
  };

  // Active View Tab: 'records' (Default archive table per SS 1) vs 'maker' (Builder UI)
  const [activeTab, setActiveTab] = useState("records");

  // ----------------------------------------------------
  // MASTER DATA STATES (Brand -> Model -> Variant)
  // ----------------------------------------------------
  const [leadsList, setLeadsList] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const [variantsList, setVariantsList] = useState([]);

  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  // ----------------------------------------------------
  // FORM STATES - CUSTOMER & LEAD INFO
  // ----------------------------------------------------
  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [cityJurisdiction, setCityJurisdiction] = useState("");
  const [quotationDate, setQuotationDate] = useState("");

  useEffect(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yy = String(today.getFullYear()).slice(-2);
    setQuotationDate(`${dd}.${mm}.${yy}`);
  }, []);

  // ----------------------------------------------------
  // FORM STATES - VEHICLE & SPECIFICATIONS
  // ----------------------------------------------------
  const [carName, setCarName] = useState("");
  const [modelSpec, setModelSpec] = useState("");
  const [modelCol3, setModelCol3] = useState("N.A");
  const [variantFuel, setVariantFuel] = useState("PETROL");
  const [variantCol2, setVariantCol2] = useState("N.A");
  const [variantCol3, setVariantCol3] = useState("N.A");

  // ----------------------------------------------------
  // FORM STATES - SALES EXECUTIVE DETAILS
  // ----------------------------------------------------
  const [executiveName, setExecutiveName] = useState("");
  const [executivePhone, setExecutivePhone] = useState("");

  // ----------------------------------------------------
  // FORM STATES - PRICE BREAKDOWN PARAMETERS (Column 1)
  // ----------------------------------------------------
  const [csdPrice, setCsdPrice] = useState("");
  const [gjRto, setGjRto] = useState("");
  const [bhRto, setBhRto] = useState("");
  const [crtm, setCrtm] = useState("");
  const [insurance, setInsurance] = useState("");
  const [accessories, setAccessories] = useState("");
  const [warranty, setWarranty] = useState("");
  const [msReward, setMsReward] = useState("");
  const [diffAmtCash, setDiffAmtCash] = useState("");

  // Column 3 Values
  const [col3CsdPrice, setCol3CsdPrice] = useState("N.A");
  const [col3GjRto, setCol3GjRto] = useState("N.A");
  const [col3BhRto, setCol3BhRto] = useState("N.A");
  const [col3Crtm, setCol3Crtm] = useState("N.A");
  const [col3Insurance, setCol3Insurance] = useState("N.A");
  const [col3Accessories, setCol3Accessories] = useState("N.A");
  const [col3Warranty, setCol3Warranty] = useState("N.A");
  const [col3MsReward, setCol3MsReward] = useState("N.A");
  const [col3DiffAmtCash, setCol3DiffAmtCash] = useState("N.A");

  // ----------------------------------------------------
  // MODAL & ACTION STATES
  // ----------------------------------------------------
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ----------------------------------------------------
  // RECORDS TAB STATES (Listing, Date Range & Search)
  // ----------------------------------------------------
  const [quotations, setQuotations] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("sent");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ----------------------------------------------------
  // 1. INITIAL LOAD (Leads & Brands & Current User)
  // ----------------------------------------------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          if (userObj?.name) setExecutiveName(userObj.name.toUpperCase());
          if (userObj?.phone) setExecutivePhone(userObj.phone);
        } catch (e) {
          console.error(e);
        }
      }
    }

    const fetchInitialData = async () => {
      setIsLoadingLeads(true);
      try {
        const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        const currentUser = userStr ? JSON.parse(userStr) : null;

        let leadsRes;
        if (currentUser?.role === "Sales Executive") {
          leadsRes = await salesExecutiveApi.getAssignedLeads({ per_page: 100 });
          if (leadsRes && leadsRes.data) setLeadsList(leadsRes.data);
        } else {
          leadsRes = await api.get("/leads");
          if (leadsRes && leadsRes.data && leadsRes.data.data) {
            setLeadsList(leadsRes.data.data);
          }
        }

        const brandsRes = await api.get("/brands");
        if (brandsRes && brandsRes.data && brandsRes.data.data) {
          setBrandsList(brandsRes.data.data);
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
      } finally {
        setIsLoadingLeads(false);
      }
    };

    fetchInitialData();
  }, []);

  // ----------------------------------------------------
  // 2. LEAD SELECT HANDLER
  // ----------------------------------------------------
  const handleSelectLead = async (leadId) => {
    if (!leadId) {
      setSelectedLeadId("");
      return;
    }

    setSelectedLeadId(leadId);
    try {
      const [quoteLeadRes, directLeadRes] = await Promise.all([
        quotationApi.getLeadForQuotation(leadId).catch(() => null),
        api.get(`/leads/${leadId}`).catch(() => null),
      ]);
      const quoteLead = quoteLeadRes?.data || quoteLeadRes || {};
      const directLead = directLeadRes?.data?.data || directLeadRes?.data || {};
      const lead = { ...directLead, ...quoteLead };

      setClientName(lead.customer_name || lead.name || "");
      setClientMobile(lead.phone || "");
      setCityJurisdiction(lead.posting || lead.city || lead.home_town || lead.address || "Ahmedabad");
      setClientEmail(lead.email || "");
      // Auto-fill approved discount from follow-up interaction (Task 11)
      let approvedDiscAmount = 0;
      if (lead.approved_discount && Number(lead.approved_discount) > 0) {
        approvedDiscAmount = Number(lead.approved_discount);
      } else if (lead.discount_approval_status === "approved" && lead.requested_discount) {
        approvedDiscAmount = Number(lead.requested_discount);
      } else {
        const localDisc = discountApprovalApi.getLeadApprovalStatus(leadId);
        if (localDisc && localDisc.status === "approved" && localDisc.discount_amount) {
          approvedDiscAmount = Number(localDisc.discount_amount);
        }
      }

      if (approvedDiscAmount > 0) {
        setMsReward(String(approvedDiscAmount));
        showToast(`Approved follow-up discount ₹${approvedDiscAmount.toLocaleString("en-IN")} applied to M.S Reword!`, "success");
      } else {
        setMsReward("");
      }

      setLeadSearchText(`${lead.customer_name || lead.name || "Customer"} (${lead.phone || "-"})`);


      // 1. Identify and select Brand
      let availableBrands = brandsList;
      if (!availableBrands || availableBrands.length === 0) {
        try {
          const bRes = await api.get("/brands");
          availableBrands = bRes?.data?.data || bRes?.data || [];
          if (availableBrands.length > 0) setBrandsList(availableBrands);
        } catch (e) { }
      }

      let brandId = lead.brand_id || directLead.brand_id || directLead.brand?.id;
      if (!brandId && (lead.brand_name || lead.model_variant)) {
        const matchedB = (availableBrands || []).find((b) =>
          (lead.brand_name && b.name.toLowerCase() === String(lead.brand_name).toLowerCase()) ||
          (lead.model_variant && lead.model_variant.toLowerCase().includes(b.name.toLowerCase()))
        );
        if (matchedB) brandId = matchedB.id;
      }

      let models = [];
      let brandObj = null;
      if (brandId) {
        setSelectedBrandId(String(brandId));
        brandObj = (availableBrands || []).find((b) => String(b.id) === String(brandId));
        if (brandObj) setCarName(brandObj.name.toUpperCase());

        setIsLoadingModels(true);
        try {
          const modelsRes = await api.get(`/models?brand_id=${brandId}`);
          models = modelsRes?.data?.data || modelsRes?.data || [];
          setModelsList(models);
        } catch (e) { } finally {
          setIsLoadingModels(false);
        }
      }

      // 2. Identify and select Model
      let modelId = lead.model_id || directLead.model_id || directLead.model?.id;
      let targetModel = models.find((m) => String(m.id) === String(modelId));
      if (!targetModel && (lead.model_name || lead.model_variant)) {
        const searchStr = (lead.model_name || lead.model_variant || "").toLowerCase();
        targetModel = models.find((m) => searchStr.includes(m.name.toLowerCase()));
      }

      let variants = [];
      if (targetModel) {
        const foundModelId = targetModel.id;
        setSelectedModelId(String(foundModelId));
        setModelSpec(targetModel.name.toUpperCase());
        setCarName(`${brandObj ? brandObj.name.toUpperCase() + " " : ""}${targetModel.name.toUpperCase()}`);

        setIsLoadingVariants(true);
        try {
          const variantsRes = await api.get(`/variants?model_id=${foundModelId}`);
          variants = variantsRes?.data?.data || variantsRes?.data || [];
          setVariantsList(variants);
        } catch (e) { } finally {
          setIsLoadingVariants(false);
        }
      }

      // 3. Identify and select Variant & Pricing
      let variantId = lead.variant_id || directLead.variant_id || directLead.variant?.id;
      let targetVariant = variants.find((v) => String(v.id) === String(variantId));
      if (!targetVariant && (lead.variant_name || lead.model_variant)) {
        const searchVar = (lead.variant_name || lead.model_variant || "").toLowerCase();
        targetVariant = variants.find((v) => searchVar.includes(v.name.toLowerCase()));
      }
      if (!targetVariant && variants.length === 1) {
        targetVariant = variants[0];
      }

      if (targetVariant) {
        setSelectedVariantId(String(targetVariant.id));
        setModelSpec(targetVariant.name.toUpperCase());

        if (targetVariant.price && Number(targetVariant.price) > 0) {
          const numPrice = Number(targetVariant.price);
          setCsdPrice(String(numPrice));
          setGjRto("");
          setBhRto("");
          setCrtm("");
          setInsurance("");
          setAccessories("");
          setWarranty("");
          if (approvedDiscAmount > 0) {
            setMsReward(String(approvedDiscAmount));
          }
          setDiffAmtCash("");
        }
      } else if (lead.model_variant) {
        setCarName(lead.brand_name ? `${lead.brand_name} ${lead.model_variant}` : lead.model_variant);
        setModelSpec(lead.model_variant);
      }

      showToast(`Auto-filled vehicle & details for ${lead.customer_name || lead.name || "lead"}!`, "success");
    } catch (err) {
      console.error("Error fetching lead for quote:", err);
    }
  };

  // ----------------------------------------------------
  // 3. CASCADING BRAND -> MODEL -> VARIANT
  // ----------------------------------------------------
  const fetchModelsForBrand = async (brandId) => {
    if (!brandId) {
      setModelsList([]);
      setVariantsList([]);
      return;
    }
    setIsLoadingModels(true);
    try {
      const res = await api.get(`/models?brand_id=${brandId}`);
      if (res && res.data && res.data.data) {
        setModelsList(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching models:", err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleBrandChange = (e) => {
    const brandId = e.target.value;
    setSelectedBrandId(brandId);
    setSelectedModelId("");
    setSelectedVariantId("");
    setModelsList([]);
    setVariantsList([]);

    const brandObj = brandsList.find((b) => String(b.id) === String(brandId));
    if (brandObj) {
      setCarName(brandObj.name.toUpperCase());
    }

    fetchModelsForBrand(brandId);
  };

  const fetchVariantsForModel = async (modelId) => {
    if (!modelId) {
      setVariantsList([]);
      return;
    }
    setIsLoadingVariants(true);
    try {
      const res = await api.get(`/variants?model_id=${modelId}`);
      if (res && res.data && res.data.data) {
        setVariantsList(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching variants:", err);
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const handleModelChange = (e) => {
    const modelId = e.target.value;
    setSelectedModelId(modelId);
    setSelectedVariantId("");
    setVariantsList([]);

    const modelObj = modelsList.find((m) => String(m.id) === String(modelId));
    if (modelObj) {
      const brandObj = brandsList.find((b) => String(b.id) === String(selectedBrandId));
      setCarName(`${brandObj ? brandObj.name.toUpperCase() + " " : ""}${modelObj.name.toUpperCase()}`);
      setModelSpec(modelObj.name.toUpperCase());
    }

    fetchVariantsForModel(modelId);
  };

  const handleVariantChange = (e) => {
    const variantId = e.target.value;
    setSelectedVariantId(variantId);

    const variantObj = variantsList.find((v) => String(v.id) === String(variantId));
    if (variantObj) {
      setModelSpec(variantObj.name.toUpperCase());

      if (variantObj.price && Number(variantObj.price) > 0) {
        const numPrice = Number(variantObj.price);
        setCsdPrice(String(numPrice));
        setGjRto("");
        setBhRto("");
        setCrtm("");
        setInsurance("");
        setAccessories("");
        setWarranty("");
        setDiffAmtCash("");
      }

      showToast(`Selected Variant ${variantObj.name} (₹${Number(variantObj.price || 0).toLocaleString("en-IN")})`, "info");
    }
  };

  // ----------------------------------------------------
  // 4. TOTAL ON-ROAD PRICE CALCULATION
  // ----------------------------------------------------
  const parseAmount = (val) => {
    if (!val || val === "N.A" || val === "FREE KIT") return 0;
    const clean = String(val).replace(/[^0-9.-]/g, "");
    return parseFloat(clean) || 0;
  };

  const calculateTotal = (csd, rto, bhRtoVal, crtmVal, ins, acc, warr, ms, diff) => {
    const base = parseAmount(csd);
    const rtoVal = parseAmount(rto);
    const bhVal = parseAmount(bhRtoVal);
    const crtmAmount = parseAmount(crtmVal);
    const insVal = parseAmount(ins);
    const accVal = parseAmount(acc);
    const warrVal = parseAmount(warr);
    const diffVal = parseAmount(diff);
    const discountVal = parseAmount(ms);

    return base + rtoVal + bhVal + crtmAmount + insVal + accVal + warrVal + diffVal - discountVal;
  };

  const totalCol1 = calculateTotal(csdPrice, gjRto, bhRto, crtm, insurance, accessories, warranty, msReward, diffAmtCash);

  // ----------------------------------------------------
  // COMPARABLE VARIANTS (Task 6: +/- 1,00,000 Range)
  // ----------------------------------------------------
  const fetchComparableVariants = async (price) => {
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      setComparableVariants([]);
      return;
    }
    setIsLoadingComparable(true);
    try {
      const minPrice = Math.max(0, numPrice - 100000);
      const maxPrice = numPrice + 100000;
      const res = await api.get(`/variants?min_price=${minPrice}&max_price=${maxPrice}&per_page=50`);
      let list = [];
      if (res && res.data && Array.isArray(res.data.data)) {
        list = res.data.data;
      } else if (res && Array.isArray(res.data)) {
        list = res.data;
      }
      setComparableVariants(list);
    } catch (err) {
      console.error("Error fetching comparable variants:", err);
      setComparableVariants([]);
    } finally {
      setIsLoadingComparable(false);
    }
  };

  useEffect(() => {
    if (csdPrice && Number(csdPrice) > 0) {
      const timer = setTimeout(() => {
        fetchComparableVariants(csdPrice);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setComparableVariants([]);
    }
  }, [csdPrice]);

  const handleSelectComparableVariant = async (v) => {
    if (!v) return;
    if (v.brand_id) {
      setSelectedBrandId(String(v.brand_id));
      await fetchModelsForBrand(v.brand_id);
    }
    if (v.model_id) {
      setSelectedModelId(String(v.model_id));
      await fetchVariantsForModel(v.model_id);
    }
    setSelectedVariantId(String(v.id));

    const brandName = v.brand?.name || "";
    const modelName = v.model?.name || "";
    setCarName(`${brandName} ${modelName}`.trim().toUpperCase());
    setModelSpec(v.name ? v.name.toUpperCase() : "");

    if (v.price && Number(v.price) > 0) {
      setCsdPrice(String(v.price));
      setGjRto("");
      setBhRto("");
      setCrtm("");
      setInsurance("");
      setAccessories("");
      setWarranty("");
      setDiffAmtCash("");
    }
    showToast(`Selected Comparable Variant: ${v.name} (₹${Number(v.price || 0).toLocaleString("en-IN")})`, "success");
  };


  // ----------------------------------------------------
  // 5. RESET & PRINT ACTIONS
  // ----------------------------------------------------
  const handleResetSheet = () => {
    setClientName("");
    setClientMobile("");
    setCityJurisdiction("");
    setSelectedLeadId("");
    setSelectedBrandId("");
    setSelectedModelId("");
    setSelectedVariantId("");
    setCarName("");
    setModelSpec("");
    setVariantFuel("PETROL");
    setCsdPrice("");
    setGjRto("");
    setBhRto("");
    setCrtm("");
    setInsurance("");
    setAccessories("");
    setWarranty("");
    setMsReward("");
    setDiffAmtCash("");
    showToast("Quotation sheet parameters cleared.", "info");
  };

  const handlePrintPdf = async () => {
    if (clientName && clientName.trim()) {
      try {
        await saveQuotationToBackend("print");
      } catch (err) {
        console.error("Auto save print error:", err);
      }
    }
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Export Saved Quotations Archive to Excel
  const handleExportExcel = async () => {
    try {
      let dataToExport = quotations;
      if (pagination.total > quotations.length) {
        showToast("Fetching all quotations for Excel export...", "info");
        try {
          const allRes = await quotationApi.getQuotations({
            per_page: 500,
            search: searchTerm || undefined,
            status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
            from_date: startDate || undefined,
            to_date: endDate || undefined,
          });
          if (allRes && allRes.status && Array.isArray(allRes.data)) {
            dataToExport = allRes.data;
          }
        } catch (fetchErr) {
          console.warn("Could not fetch all records, exporting current list:", fetchErr);
        }
      }

      if (!dataToExport || dataToExport.length === 0) {
        showToast("No quotation records found to export.", "warning");
        return;
      }

      const rows = dataToExport.map((q, idx) => ({
        "Sr No": idx + 1,
        "Quotation Number": q.quotation_number || `QT-${q.id}`,
        "Customer Name": q.customer_name || q.client_name || "-",
        "Mobile Number": q.customer_phone || q.client_phone || "-",
        "Email": q.customer_email || q.client_email || "-",
        "City / Address": q.customer_address || "-",
        "Subject / Vehicle": q.subject || q.car_name || "-",
        "Date": q.quotation_date || "-",
        "Grand Total (₹)": Number(q.grand_total || q.total_amount || q.total || 0),
        "Status": (q.status || "pending").toUpperCase(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Saved Quotations");

      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 22 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 },
        { wch: 35 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
      ];

      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `Saved_Quotations_Archive_${today}.xlsx`);
      showToast("Quotation records exported to Excel successfully!", "success");

      // Log quotation export in Activity Logs
      logActivity("Quotation", "export", {
        count: dataToExport.length,
        format: "Excel",
      });
    } catch (err) {
      console.error("Excel export error:", err);
      showToast("Failed to export Excel file.", "error");
    }
  };

  // ----------------------------------------------------
  // 6. SAVE QUOTATION TO BACKEND DATABASE
  // ----------------------------------------------------
  const saveQuotationToBackend = async (status = "pending") => {
    if (!clientName.trim()) {
      showToast("Please enter client full name.", "warning");
      return null;
    }

    setIsSaving(true);
    try {
      const itemsArray = [
        {
          item_name: `${carName || "Vehicle"} – ${modelSpec || "Standard"}`,
          description: `Fuel / Variant Type: ${variantFuel}`,
          quantity: 1,
          unit_price: parseAmount(csdPrice),
          discount: parseAmount(msReward),
          tax: 0,
        },
      ];

      if (parseAmount(gjRto) > 0) {
        itemsArray.push({
          item_name: "Gujarat State RTO & Registration",
          description: "Official vehicle registration and road tax",
          quantity: 1,
          unit_price: parseAmount(gjRto),
          discount: 0,
          tax: 0,
        });
      }

      if (parseAmount(insurance) > 0) {
        itemsArray.push({
          item_name: "Comprehensive Zero-Dep Insurance (1+3 Yrs)",
          description: "Full accidental, third-party and engine cover",
          quantity: 1,
          unit_price: parseAmount(insurance),
          discount: 0,
          tax: 0,
        });
      }

      if (parseAmount(accessories) > 0 || accessories === "FREE KIT") {
        itemsArray.push({
          item_name: "Genuine Dealership Accessories Pack",
          description: accessories === "FREE KIT" ? "Complimentary Dealership Kit" : "Essential accessories",
          quantity: 1,
          unit_price: parseAmount(accessories),
          discount: 0,
          tax: 0,
        });
      }

      if (parseAmount(bhRto) > 0) {
        itemsArray.push({
          item_name: "BH Series RTO & Road Tax",
          description: "Bharat Series 2-Year registration",
          quantity: 1,
          unit_price: parseAmount(bhRto),
          discount: 0,
          tax: 0,
        });
      }

      if (parseAmount(crtm) > 0) {
        itemsArray.push({
          item_name: "CRTM Charges",
          description: "Temporary permit & transit charges",
          quantity: 1,
          unit_price: parseAmount(crtm),
          discount: 0,
          tax: 0,
        });
      }

      if (parseAmount(warranty) > 0) {
        itemsArray.push({
          item_name: "Extended Warranty Shield",
          description: "Manufacturer extended warranty coverage",
          quantity: 1,
          unit_price: parseAmount(warranty),
          discount: 0,
          tax: 0,
        });
      }

      if (parseAmount(diffAmtCash) > 0) {
        itemsArray.push({
          item_name: "Difference / Cash Adjustment",
          description: "Price adjustment parameter",
          quantity: 1,
          unit_price: parseAmount(diffAmtCash),
          discount: 0,
          tax: 0,
        });
      }

      let formattedDate = new Date().toISOString().split("T")[0];
      if (quotationDate && quotationDate.includes(".")) {
        const parts = quotationDate.split(".");
        if (parts.length === 3) {
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          formattedDate = `${year}-${month}-${day}`;
        }
      }

      const itemsWithTotals = itemsArray.map((it) => ({
        ...it,
        total: Math.max(0, (Number(it.unit_price) || 0) * (Number(it.quantity) || 1) - (Number(it.discount) || 0)),
      }));

      const calculatedSubtotal = itemsWithTotals.reduce(
        (acc, it) => acc + Number(it.unit_price || 0) * Number(it.quantity || 1),
        0
      );
      const calculatedGrandTotal = itemsWithTotals.reduce(
        (acc, it) => acc + Number(it.total || 0),
        0
      );

      const payload = {
        lead_id: selectedLeadId ? Number(selectedLeadId) : null,
        quotation_date: formattedDate,
        customer_name: clientName.trim(),
        customer_phone: clientMobile.trim() || null,
        customer_address: cityJurisdiction.trim() || null,
        customer_email: clientEmail.trim() || null,
        subject: `Official Vehicle Quotation – ${carName || "Vehicle"} ${modelSpec ? `(${modelSpec})` : ""}`.trim(),
        description: `Official Price breakdown for ${clientName}${executiveName ? ` prepared by ${executiveName}` : ""}.`,
        payment_terms: "Booking advance as applicable, balance prior to vehicle delivery and RTO clearance.",
        delivery_terms: "Vehicle delivery subject to manufacturer allocation and receipt of full payment.",
        notes: "Prices prevailing at the time of invoicing & delivery will be applicable. Road tax as per RTO norms.",
        status: status,
        subtotal: calculatedSubtotal,
        grand_total: calculatedGrandTotal,
        total_amount: calculatedGrandTotal,
        total: calculatedGrandTotal,
        items: itemsWithTotals,
      };

      const res = await quotationApi.createQuotation(payload);
      if (res && res.status && res.data) {
        // Auto-record interaction in lead follow-up history table
        if (selectedLeadId) {
          try {
            const calculatedTotal = itemsArray.reduce(
              (acc, it) => acc + Number(it.unit_price || 0) * Number(it.quantity || 1),
              0
            );
            await api.post(`/leads/${selectedLeadId}/follow-ups`, {
              type: "Quotation Sent",
              outcome: "Quotation Sent",
              status: "Quotation Sent",
              status: "Sent",
              notes: `Official Quotation #${res.data.quotation_number} generated for ${carName || "Vehicle"
                } (${modelSpec || ""}). Total Amount: ₹${calculatedTotal.toLocaleString("en-IN")}`,
              follow_up_date: new Date().toISOString().split("T")[0],
              follow_up_time: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              quotation_id: res.data.id,
            });
          } catch (fuErr) {
            console.log("Follow-up auto log note:", fuErr);
          }
        }

        showToast(`Quotation #${res.data.quotation_number} saved and added to Quotations!`, "success");
        setActiveTab("records");
        loadQuotationsList(1, searchTerm, statusFilter, startDate, endDate, pagination.per_page, recordView);
        return res.data;
      }
    } catch (err) {
      console.error("Save quotation error:", err);
      showToast(err.response?.data?.message || "Failed to save quotation.", "error");
    } finally {
      setIsSaving(false);
    }
    return null;
  };

  // ----------------------------------------------------
  // 7. EMAIL CLIENT ACTION
  // ----------------------------------------------------
  const handleOpenEmailModal = () => {
    setEmailSubject(`Official Quotation for ${carName} – DEFENCE AUTOLINK`);
    setEmailNote(`Dear ${clientName || "Customer"},\n\nPlease find attached the official vehicle price quotation for ${carName} (${modelSpec}).\n\nExecutive Contact: ${executiveName} (${executivePhone})`);
    setShowEmailModal(true);
  };

  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    if (!clientEmail.trim()) {
      showToast("Please enter client email address.", "warning");
      return;
    }

    setIsSendingEmail(true);
    try {
      const quoteObj = await saveQuotationToBackend("email_sent");
      if (quoteObj && quoteObj.id) {
        const mailRes = await quotationApi.sendQuotationEmail(quoteObj.id, {
          recipient_email: clientEmail.trim(),
          custom_subject: emailSubject.trim() || undefined,
          custom_message: emailNote.trim() || undefined,
        });

        if (mailRes && mailRes.status) {
          showToast(`Quotation #${quoteObj.quotation_number} emailed to ${clientEmail} with attached PDF!`, "success");
          setShowEmailModal(false);
        }
      }
    } catch (mailErr) {
      console.error("Email send error:", mailErr);
      showToast(mailErr.response?.data?.message || "Failed to send email to client.", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // ----------------------------------------------------
  // 8. RECORDS LISTING LOAD
  // ----------------------------------------------------
  const [recordView, setRecordView] = useState("active"); // "active" | "trash"
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);
  const [isDeletingPermanent, setIsDeletingPermanent] = useState(false);

  const loadQuotationsList = async (
    page = 1,
    search = searchTerm,
    status = statusFilter,
    from = startDate,
    to = endDate,
    customPerPage = pagination.per_page || 15,
    viewMode = recordView
  ) => {
    setIsLoadingQuotes(true);
    try {
      const params = { page, per_page: customPerPage };
      if (viewMode === "trash") {
        params.status = "deleted";
      } else if (status && status !== "all") {
        params.status = status;
      }
      if (search && search.trim()) params.search = search.trim();
      if (from) {
        params.from_date = from;
        params.start_date = from;
      }
      if (to) {
        params.to_date = to;
        params.end_date = to;
      }

      const res = await quotationApi.getQuotations(params);
      if (res && res.status && Array.isArray(res.data)) {
        setQuotations(res.data);
        if (res.pagination) {
          setPagination({
            current_page: Number(res.pagination.current_page) || page,
            last_page: Number(res.pagination.last_page) || 1,
            per_page: Number(res.pagination.per_page) || customPerPage,
            total: Number(res.pagination.total) || res.data.length,
          });
        }
      }
    } catch (err) {
      console.error("Load quotes list error:", err);
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  useEffect(() => {
    if (activeTab === "records") {
      const timer = setTimeout(() => {
        loadQuotationsList(1, searchTerm, statusFilter, startDate, endDate, pagination.per_page, recordView);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, searchTerm, statusFilter, startDate, endDate, recordView]);

  const handleDeleteQuotation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this quotation?")) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/quotations/${id}`);
      if (res.data?.status) {
        showToast("Quotation deleted successfully!", "success");
        loadQuotationsList(pagination.current_page, searchTerm, statusFilter, startDate, endDate, pagination.per_page, recordView);
      } else {
        showToast(res.data?.message || "Failed to delete quotation.", "error");
      }
    } catch (err) {
      console.error("Delete quotation error:", err);
      showToast("An error occurred while deleting quotation.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreQuotation = async (id) => {
    try {
      const res = await api.post(`/quotations/${id}/restore`);
      if (res.data?.status) {
        showToast("Quotation restored successfully!", "success");
        loadQuotationsList(pagination.current_page, searchTerm, statusFilter, startDate, endDate, pagination.per_page, recordView);
      } else {
        showToast(res.data?.message || "Failed to restore quotation.", "error");
      }
    } catch (err) {
      console.error("Restore quotation error:", err);
      showToast("An error occurred while restoring quotation.", "error");
    }
  };

  const handlePermanentDeleteQuotation = async () => {
    if (!permanentDeleteTarget) return;
    setIsDeletingPermanent(true);
    try {
      const res = await api.delete(`/quotations/${permanentDeleteTarget.id}/force`);
      if (res.data?.status) {
        showToast("Quotation permanently deleted forever.", "success");
        setPermanentDeleteTarget(null);
        loadQuotationsList(pagination.current_page, searchTerm, statusFilter, startDate, endDate, pagination.per_page, recordView);
      } else {
        showToast(res.data?.message || "Failed to permanently delete quotation.", "error");
      }
    } catch (err) {
      console.error("Permanent delete quotation error:", err);
      showToast("An error occurred while permanently deleting quotation.", "error");
    } finally {
      setIsDeletingPermanent(false);
    }
  };

  const renderStatusBadge = (status) => {
    const s = (status || "pending").toLowerCase();
    if (s === "email_sent" || s === "sent" || s === "email sent") {
      return (
        <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-1">
          <i className="bi bi-envelope-check-fill me-1"></i>Email Sent
        </span>
      );
    }
    if (s === "print" || s === "printed") {
      return (
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
          <i className="bi bi-printer-fill me-1"></i>Printed / PDF
        </span>
      );
    }
    return (
      <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1">
        <i className="bi bi-hourglass-split me-1"></i>Pending
      </span>
    );
  };

  return (
    <AdminLayout>
      {/* =========================================================================
          PRINT-ONLY STYLESHEET: Ensures ONLY inner quotation sheet prints cleanly
          ========================================================================= */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            height: auto !important;
            max-height: 100% !important;
            overflow: visible !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          .app-sidebar,
          .app-header,
          .page-header-wrapper,
          aside,
          header,
          nav,
          .no-print,
          .col-xl-5,
          .modal,
          .modal-backdrop-custom {
            display: none !important;
          }
          .app-main-content,
          .page-body,
          .container-fluid,
          .row,
          .col-xl-7 {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }
          #printableQuoteCard,
          #printableQuoteCard * {
            visibility: visible !important;
          }
          #printableQuoteCard {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10px 15px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="page-body pb-5">
        {/* ===================================================================
            TOP HEADER & ACTION BUTTONS (Matching Screenshot)
            =================================================================== */}
        <div className="page-header-wrapper mb-3 no-print">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">Sales</li>
              <li className="breadcrumb-item active">Send Quotation</li>
            </ul>
            <h1 className="page-title mt-1 fw-bold fs-3 text-dark">Official Vehicle Quotation</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2 flex-wrap">
            {can("quotation.reset") && activeTab === "maker" && (
              <button
                type="button"
                className="btn btn-outline-custom d-flex align-items-center gap-1"
                onClick={handleResetSheet}
              >
                <i className="bi bi-arrow-clockwise"></i>
                <span>Reset Sheet</span>
              </button>
            )}

            {activeTab === "maker" ? (
              can("quotation.print_pdf") && (
                <button
                  type="button"
                  className="btn btn-outline-custom d-flex align-items-center gap-1"
                  onClick={handlePrintPdf}
                >
                  <i className="bi bi-printer-fill"></i>
                  <span>Print / PDF</span>
                </button>
              )

            ) : (
              <button
                type="button"
                className="btn btn-outline-success d-flex align-items-center gap-1 shadow-sm bg-white"
                onClick={handleExportExcel}
                title="Export Saved Quotations Archive to Excel"
              >
                <i className="bi bi-file-earmark-excel-fill text-success"></i>
                <span className="text-dark fw-medium">Export to Excel</span>
              </button>
            )}

            {can("quotation.email") && activeTab === "maker" && (
              <button
                type="button"
                className="btn btn-outline-custom d-flex align-items-center gap-1"
                style={{ color: "#facc15", borderColor: "rgba(234, 179, 8, 0.4)" }}
                onClick={handleOpenEmailModal}
              >
                <i className="bi bi-envelope-fill"></i>
                <span>Email Client</span>
              </button>
            )}

            <button
              type="button"
              className={`btn btn-sm ${recordView === "trash" ? "btn-danger text-white shadow-sm" : "btn-outline-custom"} ms-2`}
              onClick={() => {
                const next = recordView === "trash" ? "active" : "trash";
                setRecordView(next);
                setPagination((prev) => ({ ...prev, current_page: 1 }));
              }}
              title={recordView === "trash" ? "Back to Active Quotations" : "View Deleted Quotations"}
            >
              <i className={`bi ${recordView === "trash" ? "bi-arrow-left" : "bi-trash text-danger"} me-1`}></i>
              <span>{recordView === "trash" ? "Active Quotations" : "Trash"}</span>
            </button>
            {/* Tab switch between Live Generator and All Saved Quotes */}
            {can("quotation.saved_view") && (
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "maker" ? "btn-outline-primary" : "btn-primary"} d-flex align-items-center gap-1`}
                onClick={() => setActiveTab(activeTab === "maker" ? "records" : "maker")}
              >
                <i className={activeTab === "maker" ? "bi bi-folder2-open" : "bi bi-file-earmark-spreadsheet-fill"}></i>
                <span>{activeTab === "maker" ? "Saved Quotes Pipeline" : "Back to Quotation Maker"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ===================================================================
            TAB 1: LIVE QUOTATION BUILDER & SHEET
            =================================================================== */}
        {activeTab === "maker" && (
          <div className="row g-4">
            {/* ----------------------------------------------------
                LEFT PANEL: BUILDER & PARAMETER CONTROLS
                ---------------------------------------------------- */}
            <div className="col-xl-5 col-lg-5">
              {/* 1. Customer & Lead Info Card */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header border-0 pb-0 pt-3 px-3">
                  <h6 className="card-title text-dark fw-semibold d-flex align-items-center gap-2 mb-0">
                    <i className="bi bi-person-badge-fill text-primary"></i>
                    <span>Customer & Lead Info</span>
                  </h6>
                </div>

                <div className="card-body p-3">
                  {/* Auto-Fill from Leads Pipeline */}
                  {can("quotation.auto_fill") && <div className="mb-3">
                    <label className="form-label text-dark small fw-medium mb-1">
                      Auto-Fill from Leads Pipeline
                    </label>
                    <div className="position-relative" onClick={(e) => e.stopPropagation()}>
                      <div className="input-group">
                        <span className="input-group-text bg-white text-muted">
                          <i className="bi bi-search"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Type customer name or mobile number to search lead..."
                          value={leadSearchText}
                          onChange={(e) => {
                            setLeadSearchText(e.target.value);
                            setShowLeadDropdown(true);
                          }}
                          onFocus={() => setShowLeadDropdown(true)}
                        />
                        {selectedLeadId && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setSelectedLeadId("");
                              setLeadSearchText("");
                              handleResetSheet();
                            }}
                            title="Clear lead"
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        )}
                      </div>

                      {showLeadDropdown && (
                        <div
                          className="position-absolute start-0 end-0 mt-1 shadow-lg border rounded-3 p-1 bg-white"
                          style={{ zIndex: 1050, maxHeight: "250px", overflowY: "auto" }}
                        >
                          {(() => {
                            const q = (leadSearchText || "").toLowerCase().trim();
                            const matches = (leadsList || []).filter((l) => {
                              if (!q) return true;
                              const nameMatch = (l.name || l.customer_name || "").toLowerCase().includes(q);
                              const phoneMatch = (l.phone || "").toLowerCase().includes(q);
                              const modelMatch = (l.model_variant || l.brand_name || "").toLowerCase().includes(q);
                              return nameMatch || phoneMatch || modelMatch;
                            });

                            if (matches.length === 0) {
                              return (
                                <div className="p-3 text-center text-muted small">
                                  No matching leads found for "{leadSearchText}"
                                </div>
                              );
                            }

                            return matches.slice(0, 40).map((l) => {
                              const isSelected = selectedLeadId === String(l.id);
                              return (
                                <div
                                  key={l.id}
                                  className={`p-2 rounded-2 d-flex align-items-center justify-content-between border-bottom border-light ${isSelected ? "bg-primary-subtle" : ""
                                    }`}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setLeadSearchText(`${l.name || "Lead"} (${l.phone || "-"})`);
                                    setShowLeadDropdown(false);
                                    handleSelectLead(l.id);
                                  }}
                                >
                                  <div>
                                    <div className="fw-bold text-dark small">{l.name || "Customer"}</div>
                                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                      <i className="bi bi-telephone me-1"></i>
                                      {l.phone || "-"} • {l.model_variant || l.brand_name || "Vehicle"}
                                    </div>
                                  </div>
                                  <span className="badge bg-light text-secondary border small">
                                    #{l.id}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  </div>}

                  {/* Client Name & Mobile */}
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">Client Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Vikramaditya Singh"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">Client Mobile</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={clientMobile}
                        onChange={(e) => setClientMobile(e.target.value)}
                        placeholder="9825123456"
                      />
                    </div>
                  </div>

                  {/* City & Quotation Date */}
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">City / Jurisdiction</label>
                      <input
                        type="text"
                        className="form-control"
                        value={cityJurisdiction}
                        onChange={(e) => setCityJurisdiction(e.target.value)}
                        placeholder="Ahmedabad"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">Quotation Date</label>
                      <input
                        type="text"
                        className="form-control"
                        value={quotationDate}
                        onChange={(e) => setQuotationDate(e.target.value)}
                        placeholder="12.08.26"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Vehicle Selection (Brand, Model, Variant) */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header border-0 pb-0 pt-3 px-3">
                  <h6 className="card-title text-dark fw-semibold d-flex align-items-center gap-2 mb-0">
                    <i className="bi bi-car-front-fill text-warning"></i>
                    <span>Vehicle Selection (Brand, Model, Variant)</span>
                  </h6>
                </div>

                <div className="card-body p-3">
                  {/* Brand & Model Selector */}
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">Select Brand</label>
                      <select
                        className="form-select"
                        value={selectedBrandId}
                        onChange={handleBrandChange}
                      >
                        <option value="">-- Choose Brand --</option>
                        {brandsList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">
                        Select Model {isLoadingModels && <span className="spinner-border spinner-border-sm ms-1"></span>}
                      </label>
                      <select
                        className="form-select"
                        value={selectedModelId}
                        onChange={handleModelChange}
                        disabled={!selectedBrandId || isLoadingModels}
                      >
                        <option value="">-- Choose Model --</option>
                        {modelsList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Variant & Fuel Type */}
                  <div className="row g-2 mb-3">
                    <div className="col-12">
                      <label className="form-label text-dark small fw-medium mb-1">
                        Select Variant {isLoadingVariants && <span className="spinner-border spinner-border-sm ms-1"></span>}
                      </label>
                      <select
                        className="form-select"
                        value={selectedVariantId}
                        onChange={handleVariantChange}
                        disabled={!selectedModelId || isLoadingVariants}
                      >
                        <option value="">-- Choose Variant --</option>
                        {variantsList.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} (₹{Number(v.price || 0).toLocaleString("en-IN")})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Custom Sheet Display Headers */}
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">Sheet Car Title</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={carName}
                        onChange={(e) => setCarName(e.target.value)}
                        placeholder="e.g. NEW VENUE"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">Sheet Model Title</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={modelSpec}
                        onChange={(e) => setModelSpec(e.target.value)}
                        placeholder="e.g. 1.0 TURBO DCT HX5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Sales Executive Details Card */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header border-0 pb-0 pt-3 px-3">
                  <h6 className="card-title text-dark fw-semibold d-flex align-items-center gap-2 mb-0">
                    <i className="bi bi-headset text-info"></i>
                    <span>Sales Executive Details</span>
                  </h6>
                </div>

                <div className="card-body p-3">
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">Executive Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={executiveName}
                        onChange={(e) => setExecutiveName(e.target.value)}
                        placeholder="PRIYANKA PARMAR"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={executivePhone}
                        onChange={(e) => setExecutivePhone(e.target.value)}
                        placeholder="97233 37621"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Pricing & Breakdown Controls Card */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header border-0 pb-0 pt-3 px-3">
                  <h6 className="card-title text-dark fw-semibold d-flex align-items-center gap-2 mb-0">
                    <i className="bi bi-calculator text-success"></i>
                    <span>Price Breakdown Sheet Parameters (₹)</span>
                  </h6>
                </div>

                <div className="card-body p-3">
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">CSD Price</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={csdPrice}
                        onChange={(e) => setCsdPrice(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">GJ RTO</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={gjRto}
                        onChange={(e) => setGjRto(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">BH RTO * APPOROX</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={bhRto}
                        onChange={(e) => setBhRto(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">CRTM</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={crtm}
                        onChange={(e) => setCrtm(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">INSURANCE</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={insurance}
                        onChange={(e) => setInsurance(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">ACCESSORIES</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={accessories}
                        onChange={(e) => setAccessories(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">WARRANTY</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={warranty}
                        onChange={(e) => setWarranty(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">M.S REWORD (Disc)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={msReward}
                        onChange={(e) => setMsReward(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">DIFFERENCE AMT CASH</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={diffAmtCash}
                        onChange={(e) => setDiffAmtCash(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">
                        ESTIMATED TOTAL (₹) <span className="text-muted fw-normal" style={{ fontSize: "10px" }}>(Net After M.S Reword Disc)</span>
                      </label>
                      <div className="form-control form-control-sm bg-light fw-bold text-success d-flex align-items-center justify-content-between">
                        <span>₹{totalCol1.toLocaleString("en-IN")}</span>
                        <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: "10px" }}>Live Total</span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-primary flex-fill d-flex align-items-center justify-content-center gap-2 py-2"
                      onClick={() => saveQuotationToBackend("pending")}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cloud-check-fill"></i>
                          <span>Save to CRM Pipeline (Total: ₹{totalCol1.toLocaleString("en-IN")})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------
                RIGHT PANEL: COMPARABLE & ALTERNATIVE VARIANTS (+/- 1,00,000)
                Task 6: Replaces static Defence Autolink preview letterhead
                ---------------------------------------------------- */}
            <div className="col-xl-7 col-lg-7">
              <div
                className="card h-100 border shadow-sm rounded-3 p-4 bg-white"
                style={{ minHeight: "750px" }}
              >
                <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3 flex-wrap gap-2">
                  <div>
                    <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                      <i className="bi bi-shuffle text-primary"></i>
                      <span>Comparable & Alternative Models</span>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold rounded-pill px-2 py-0.5" style={{ fontSize: "11px" }}>
                        ± ₹1,00,000 Range
                      </span>
                    </h5>
                    <div className="text-muted small">
                      {csdPrice && Number(csdPrice) > 0 ? (
                        <span>
                          Selected Variant Price: <strong>₹{Number(csdPrice).toLocaleString("en-IN")}</strong> •
                          Matching Range: <strong>₹{Math.max(0, Number(csdPrice) - 100000).toLocaleString("en-IN")}</strong> to <strong>₹{(Number(csdPrice) + 100000).toLocaleString("en-IN")}</strong>
                        </span>
                      ) : (
                        <span>Select any vehicle variant on the left to discover matching models in price range.</span>
                      )}
                    </div>
                  </div>

                  {csdPrice && Number(csdPrice) > 0 && (
                    <span className="badge bg-light text-secondary border px-2 py-1 fw-semibold">
                      {comparableVariants.length} Alternative(s) Found
                    </span>
                  )}
                </div>

                {/* Comparable Variants Content */}
                {isLoadingComparable ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-2" role="status"></div>
                    <div className="text-muted small">Searching comparable vehicles within ± ₹1,00,000...</div>
                  </div>
                ) : !csdPrice || Number(csdPrice) <= 0 ? (
                  <div className="text-center py-5 my-auto">
                    <div
                      className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3"
                      style={{ width: "64px", height: "64px", backgroundColor: "#EFF6FF" }}
                    >
                      <i className="bi bi-car-front fs-2 text-primary"></i>
                    </div>
                    <h6 className="fw-bold text-dark">No Vehicle Variant Selected</h6>
                    <p className="text-muted small mx-auto" style={{ maxWidth: "340px" }}>
                      Choose Brand, Model and Variant from the left form to automatically view all matching alternative vehicle models within <strong>± ₹1,00,000</strong> price range.
                    </p>
                  </div>
                ) : comparableVariants.length === 0 ? (
                  <div className="text-center py-5 my-auto">
                    <i className="bi bi-inbox fs-1 text-secondary mb-2 d-block"></i>
                    <h6 className="fw-bold text-dark">No Other Alternatives in this Exact Range</h6>
                    <p className="text-muted small">
                      No other vehicle variants found between ₹{Math.max(0, Number(csdPrice) - 100000).toLocaleString("en-IN")} and ₹{(Number(csdPrice) + 100000).toLocaleString("en-IN")}.
                    </p>
                  </div>
                ) : (
                  <div className="row g-3" style={{ maxHeight: "700px", overflowY: "auto" }}>
                    {comparableVariants.map((v) => {
                      const vPrice = Number(v.price || 0);
                      const currentP = Number(csdPrice);
                      const diff = vPrice - currentP;
                      const isCurrentlySelected = selectedVariantId === String(v.id);

                      return (
                        <div key={v.id} className="col-12 col-md-6">
                          <div
                            className={`card h-100 p-3 rounded-3 border ${isCurrentlySelected ? "border-primary bg-primary-subtle shadow-sm" : "hover-shadow-sm bg-light"
                              }`}
                            style={{ transition: "all 0.15s ease" }}
                          >
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className="badge bg-dark text-white text-uppercase px-2 py-0.5 rounded" style={{ fontSize: "10px" }}>
                                {v.brand?.name || "Brand"}
                              </span>
                              {diff === 0 ? (
                                <span className="badge bg-secondary text-white" style={{ fontSize: "10px" }}>Current Match</span>
                              ) : diff > 0 ? (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-bold" style={{ fontSize: "10px" }}>
                                  + ₹{diff.toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="badge bg-success-subtle text-success border border-success-subtle fw-bold" style={{ fontSize: "10px" }}>
                                  - ₹{Math.abs(diff).toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>

                            <div className="fw-bold text-dark text-truncate" title={v.name}>
                              {v.name}
                            </div>
                            <div className="text-muted small text-truncate mb-2" style={{ fontSize: "0.75rem" }}>
                              Model: {v.model?.name || "-"}
                            </div>

                            <div className="d-flex align-items-center justify-content-between mt-auto pt-2 border-top">
                              <div>
                                <span className="text-muted small d-block" style={{ fontSize: "10px" }}>CSD PRICE</span>
                                <span className="fw-bolder text-success" style={{ fontSize: "1.05rem" }}>
                                  ₹{vPrice.toLocaleString("en-IN")}
                                </span>
                              </div>

                              <button
                                type="button"
                                className={`btn btn-sm ${isCurrentlySelected ? "btn-primary disabled" : "btn-outline-primary"
                                  } rounded-pill px-3 py-1 fw-semibold shadow-xs d-flex align-items-center gap-1`}
                                onClick={() => handleSelectComparableVariant(v)}
                                disabled={isCurrentlySelected}
                              >
                                {isCurrentlySelected ? (
                                  <>
                                    <i className="bi bi-check2"></i>
                                    <span>Selected</span>
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-plus-lg"></i>
                                    <span>Select Variant</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: SAVED QUOTATIONS RECORDS & PIPELINE
            =================================================================== */}
        {activeTab === "records" && (
          <div className="card shadow-sm rounded-3 overflow-hidden">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 p-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h5 className="card-title text-dark mb-0 fw-bold">Saved Quotations Archive</h5>
                {/* <button
                  type="button"
                  className={`btn btn-sm ${recordView === "trash" ? "btn-danger text-white shadow-sm" : "btn-outline-custom"} ms-2`}
                  onClick={() => {
                    const next = recordView === "trash" ? "active" : "trash";
                    setRecordView(next);
                    setPagination((prev) => ({ ...prev, current_page: 1 }));
                  }}
                  title={recordView === "trash" ? "Back to Active Quotations" : "View Deleted Quotations"}
                >
                  <i className={`bi ${recordView === "trash" ? "bi-arrow-left" : "bi-trash text-danger"} me-1`}></i>
                  <span>{recordView === "trash" ? "Active Quotations" : "Trash"}</span>
                </button> */}
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {/* Start Date */}
                <div className="input-group input-group-sm" style={{ width: "165px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="Start Date">
                    <i className="bi bi-calendar-event me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>From</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    title="Filter from date"
                  />
                </div>

                {/* End Date */}
                <div className="input-group input-group-sm" style={{ width: "160px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="End Date">
                    <i className="bi bi-calendar-check me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>To</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    title="Filter to date"
                  />
                </div>

                {/* Status Filter */}
                <div className="input-group input-group-sm" style={{ width: "155px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="Filter by Status">
                    <i className="bi bi-funnel me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>Status</span>
                  </span>
                  <select
                    className="form-select form-select-sm px-1"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="print">Print</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                  </select>
                </div>

                {/* Reset Filters */}
                {(startDate || endDate || statusFilter || searchTerm) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-2 d-flex align-items-center gap-1"
                    style={{ fontSize: "0.8rem", height: "31px" }}
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setStatusFilter("");
                      setSearchTerm("");
                    }}
                    title="Clear All Filters"
                  >
                    <i className="bi bi-x-circle"></i>
                    <span>Reset</span>
                  </button>
                )}

                {/* Search Box */}
                <div className="input-group input-group-sm" style={{ width: "220px" }}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search customer, number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setSearchTerm("")}
                      title="Clear Search"
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>

                {/* New Quotation Button */}
                {can("quotation.create") && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm d-flex align-items-center gap-1 ms-1"
                    onClick={() => {
                      handleResetSheet();
                      setActiveTab("maker");
                    }}
                  >
                    <i className="bi bi-plus-circle-fill"></i>
                    <span>New Quote</span>
                  </button>
                )}
              </div>
            </div>

            <div className="table-responsive" style={{ minHeight: "360px" }}>
              <table className="table table-custom align-middle mb-0">
                <thead className="border-bottom border-secondary border-opacity-25 text-secondary small text-uppercase">
                  <tr>
                    <th className="py-3 px-3 text-center" style={{ width: "50px" }}>No</th>
                    <th className="py-3 px-3 text-center" style={{ width: "85px" }}>Actions</th>
                    <th className="py-3 px-3">Quotation No</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Subject / Vehicle</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-end">Grand Total</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingQuotes ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-muted">
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        Loading quotations...
                      </td>
                    </tr>
                  ) : quotations.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-muted">
                        No saved quotations found.
                      </td>
                    </tr>
                  ) : (
                    quotations.map((quote, index) => (
                      <tr key={quote.id} className="border-bottom border-secondary border-opacity-10">
                        {/* 0. No Column */}
                        <td className="py-3 px-3 text-center">
                          <span className="text-muted small fw-semibold">
                            {index + 1}
                          </span>
                        </td>

                        {/* 1. Actions First Column - 3-Dots Menu with Convert to Deal (Task 3) */}
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {recordView === "trash" ? (
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm px-2.5 py-1 d-inline-flex align-items-center gap-1 rounded-pill shadow-xs fw-semibold"
                                title="Restore Quotation"
                                onClick={() => handleRestoreQuotation(quote.id)}
                              >
                                <i className="bi bi-arrow-counterclockwise"></i>
                                <span>Restore</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm px-2.5 py-1 d-inline-flex align-items-center gap-1 rounded-pill shadow-xs fw-semibold"
                                title="Permanently Delete Quotation Forever"
                                onClick={() => setPermanentDeleteTarget(quote)}
                              >
                                <i className="bi bi-trash3"></i>
                                <span>Delete</span>
                              </button>
                            </div>
                          ) : (
                            <div className="dropdown position-relative d-inline-block">
                              <button
                                type="button"
                                className="btn btn-sm btn-light border rounded-circle shadow-none p-0 d-inline-flex align-items-center justify-content-center"
                                style={{ width: "32px", height: "32px", cursor: "pointer" }}
                                title="Quotation Actions"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuId(activeActionMenuId === quote.id ? null : quote.id);
                                }}
                              >
                                <i className="bi bi-three-dots-vertical fs-6 text-dark"></i>
                              </button>

                              {activeActionMenuId === quote.id && (
                                <div
                                  className="dropdown-menu show shadow-lg border rounded-3 p-1 position-absolute start-0 text-start"
                                  style={{
                                    minWidth: "195px",
                                    zIndex: 1050,
                                    top: index >= Math.max(1, quotations.length - 4) ? "auto" : "100%",
                                    bottom: index >= Math.max(1, quotations.length - 4) ? "calc(100% + 4px)" : "auto",
                                    backgroundColor: "#FFFFFF",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(can("quotation.view") || isReceptionist) && (
                                    <Link
                                      href={`${baseQuotationPath}/${quote.id}`}
                                      className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-dark"
                                      onClick={() => setActiveActionMenuId(null)}
                                    >
                                      <i className="bi bi-eye text-primary"></i>
                                      <span>View Quotation</span>
                                    </Link>
                                  )}

                                  {(can("quotation.print_pdf") || isReceptionist) && (
                                    <Link
                                      href={`${baseQuotationPath}/${quote.id}`}
                                      className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-dark"
                                      onClick={() => setActiveActionMenuId(null)}
                                    >
                                      <i className="bi bi-printer-fill text-secondary"></i>
                                      <span>Print Dealership Quotation</span>
                                    </Link>
                                  )}

                                  {/* Task 3: Convert to Deal Action */}
                                  <button
                                    type="button"
                                    className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-success fw-semibold"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setSelectedQuoteForDeal(quote);
                                      setShowConvertDealModal(true);
                                    }}
                                  >
                                    <i className="bi bi-trophy-fill text-success"></i>
                                    <span>Convert to Deal</span>
                                  </button>

                                  {can("quotation.delete") && (
                                    <>
                                      <hr className="dropdown-divider my-1" />
                                      <button
                                        type="button"
                                        className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-danger"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          handleDeleteQuotation(quote.id);
                                        }}
                                      >
                                        <i className="bi bi-trash3-fill text-danger"></i>
                                        <span>Delete Quotation</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 2. Quotation # */}
                        <td className="py-3 px-3">
                          {isReceptionist ? (
                            <span className="fw-bold text-dark">{quote.quotation_number}</span>
                          ) : (
                            <Link href={`${baseQuotationPath}/${quote.id}`} className="fw-bold text-primary text-decoration-none">
                              {quote.quotation_number}
                            </Link>
                          )}
                        </td>

                        {/* 3. Customer */}
                        <td className="py-3 px-3">
                          {quote.lead_id ? (
                            <Link
                              href={getLeadProfileHref(quote.lead_id)}
                              className="text-primary fw-semibold text-decoration-none d-inline-flex align-items-center gap-1 hover-underline"
                              title="View Customer 360 Profile"
                            >
                              <span>{quote.customer_name}</span>
                              <i className="bi bi-box-arrow-up-right" style={{ fontSize: "10px" }}></i>
                            </Link>
                          ) : (
                            <Link
                              href={`/admin/leads?search=${encodeURIComponent(quote.customer_name || "")}`}
                              className="text-primary fw-semibold text-decoration-none d-inline-flex align-items-center gap-1 hover-underline"
                              title="Search Customer in Leads Pipeline"
                            >
                              <span>{quote.customer_name}</span>
                              <i className="bi bi-box-arrow-up-right" style={{ fontSize: "10px" }}></i>
                            </Link>
                          )}
                          <div className="text-secondary small">{quote.customer_phone || quote.customer_email || "-"}</div>
                        </td>

                        {/* 4. Subject / Vehicle */}
                        <td className="py-3 px-3">
                          <div className="text-dark small fw-medium text-truncate" style={{ maxWidth: "250px" }}>
                            {quote.subject}
                          </div>
                        </td>

                        {/* 5. Date */}
                        <td className="py-3 px-3 text-dark small">
                          {formatDate(quote.quotation_date)}
                        </td>

                        {/* 6. Grand Total */}
                        <td className="py-3 px-3 text-end text-success fw-bold">
                          ₹{Number(quote.grand_total).toLocaleString("en-IN")}
                        </td>

                        {/* 7. Status */}
                        <td className="py-3 px-3 text-center">
                          {renderStatusBadge(quote.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!isLoadingQuotes && pagination.total > 0 && (
              <Pagination
                currentPage={pagination.current_page || 1}
                lastPage={pagination.last_page || 1}
                total={pagination.total || quotations.length}
                perPage={pagination.per_page || 15}
                onPageChange={(page) => loadQuotationsList(page, searchTerm, statusFilter, startDate, endDate)}
                onPerPageChange={(newPerPage) => {
                  setPagination((prev) => ({ ...prev, per_page: newPerPage }));
                  loadQuotationsList(1, searchTerm, statusFilter, startDate, endDate, newPerPage);
                }}
                perPageOptions={[10, 15, 25, 50]}
                itemName="quotations"
              />
            )}
          </div>
        )}

        {/* ===================================================================
            EMAIL CLIENT MODAL
            =================================================================== */}
        {showEmailModal && (
          <div className="modal-backdrop-custom">
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-white d-flex align-items-center gap-2 mb-0" style={{ color: "#FFFFFF" }}>
                  <i className="bi bi-envelope-fill text-warning"></i>
                  <span style={{ color: "#FFFFFF" }}>Email Quotation to Client</span>
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => !isSendingEmail && setShowEmailModal(false)}
                  disabled={isSendingEmail}
                ></button>
              </div>

              <form onSubmit={handleSendEmailSubmit}>
                <div className="modal-body-custom">
                  <div className="mb-3">
                    <label className="form-label text-dark small fw-semibold">
                      Client Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="client@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-dark small fw-semibold">Subject</label>
                    <input
                      type="text"
                      className="form-control"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label text-dark small fw-semibold">Message Note</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={emailNote}
                      onChange={(e) => setEmailNote(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setShowEmailModal(false)}
                    disabled={isSendingEmail}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={isSendingEmail}>
                    {isSendingEmail ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Sending Email & PDF...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send-fill"></i>
                        <span>Send Official Quotation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sweet Alert Confirmation Modal for Permanent Delete */}
        {permanentDeleteTarget && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", zIndex: 1080 }}
            onClick={() => !isDeletingPermanent && setPermanentDeleteTarget(null)}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              style={{ maxWidth: "420px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                <div className="modal-body p-4 text-center">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-xs"
                    style={{ width: "64px", height: "64px", background: "#FEE2E2", color: "#DC2626" }}
                  >
                    <i className="bi bi-exclamation-triangle-fill fs-2"></i>
                  </div>
                  <h5 className="modal-title fw-bold text-dark mb-2">Delete Permanently?</h5>
                  <p className="text-muted small mb-0 px-2" style={{ lineHeight: "1.5" }}>
                    Are you sure you want to permanently delete quotation <strong>&quot;{permanentDeleteTarget.quote_no || `#${permanentDeleteTarget.id}`}&quot;</strong> for <strong>{permanentDeleteTarget.customer_name || "this customer"}</strong>? This record will be deleted forever and <strong>cannot be restored</strong>.
                  </p>
                </div>
                <div className="modal-footer border-0 p-3 bg-light d-flex gap-2 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3 py-1.5 rounded-pill fw-medium"
                    onClick={() => setPermanentDeleteTarget(null)}
                    disabled={isDeletingPermanent}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger px-4 py-1.5 rounded-pill fw-semibold shadow-sm"
                    onClick={handlePermanentDeleteQuotation}
                    disabled={isDeletingPermanent}
                  >
                    {isDeletingPermanent ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash3-fill me-1"></i>
                        <span>Yes, Delete Forever</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Convert to Deal Modal for Quotations (Task 3) */}
        {showConvertDealModal && selectedQuoteForDeal && (
          <ConvertDealModal
            isOpen={showConvertDealModal}
            lead={
              selectedQuoteForDeal.lead || {
                id: selectedQuoteForDeal.lead_id,
                name: selectedQuoteForDeal.customer_name,
                phone: selectedQuoteForDeal.customer_phone,
                email: selectedQuoteForDeal.customer_email,
                model_variant: selectedQuoteForDeal.subject,
              }
            }
            onClose={() => {
              setShowConvertDealModal(false);
              setSelectedQuoteForDeal(null);
            }}
            onSuccess={() => {
              showToast("Quotation successfully converted to Deal!", "success");
              loadQuotationsList(currentPage, searchTerm, statusFilter, startDate, endDate);
            }}
            showToast={showToast}
          />
        )}
      </div>
    </AdminLayout>
  );
}
