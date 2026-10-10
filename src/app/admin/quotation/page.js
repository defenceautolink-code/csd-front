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

export default function QuotationMainPage() {
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
  const [bhRto, setBhRto] = useState("N.A");
  const [crtm, setCrtm] = useState("N.A");
  const [insurance, setInsurance] = useState("");
  const [accessories, setAccessories] = useState("0");
  const [warranty, setWarranty] = useState("N.A");
  const [msReward, setMsReward] = useState("N.A");
  const [diffAmtCash, setDiffAmtCash] = useState("N.A");

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
  const [statusFilter, setStatusFilter] = useState("");
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
      setCityJurisdiction(lead.city || lead.address || "Ahmedabad");
      setClientEmail(lead.email || "");

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
          const estRto = Math.round(numPrice * 0.06);
          setGjRto(String(estRto));
          const estIns = Math.round(numPrice * 0.038);
          setInsurance(String(estIns));
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

        const estRto = Math.round(numPrice * 0.06);
        setGjRto(String(estRto));

        const estIns = Math.round(numPrice * 0.038);
        setInsurance(String(estIns));
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

  const calculateTotal = (csd, rto, ins, acc, warr, ms, diff) => {
    const base = parseAmount(csd);
    const rtoVal = parseAmount(rto);
    const insVal = parseAmount(ins);
    const accVal = parseAmount(acc);
    const warrVal = parseAmount(warr);
    const diffVal = parseAmount(diff);
    const discountVal = parseAmount(ms);

    return base + rtoVal + insVal + accVal + warrVal + diffVal - discountVal;
  };

  const totalCol1 = calculateTotal(csdPrice, gjRto, insurance, accessories, warranty, msReward, diffAmtCash);

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
    setBhRto("N.A");
    setCrtm("N.A");
    setInsurance("");
    setAccessories("0");
    setWarranty("N.A");
    setMsReward("N.A");
    setDiffAmtCash("N.A");
    showToast("Quotation sheet parameters cleared.", "info");
  };

  const handlePrintPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // ----------------------------------------------------
  // 6. SAVE QUOTATION TO BACKEND DATABASE
  // ----------------------------------------------------
  const saveQuotationToBackend = async (status = "draft") => {
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
              outcome: "Sent",
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

        showToast(`Quotation #${res.data.quotation_number} saved to CRM!`, "success");
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
      const quoteObj = await saveQuotationToBackend("sent");
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
  const loadQuotationsList = async (
    page = 1,
    search = searchTerm,
    status = statusFilter,
    from = startDate,
    to = endDate,
    customPerPage = pagination.per_page || 15
  ) => {
    setIsLoadingQuotes(true);
    try {
      const params = { page, per_page: customPerPage };
      if (search && search.trim()) params.search = search.trim();
      if (status && status !== "all") params.status = status;
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
        loadQuotationsList(1, searchTerm, statusFilter, startDate, endDate, pagination.per_page);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, searchTerm, statusFilter, startDate, endDate]);

  return (
    <AdminLayout>
      <div className="page-body pb-5">
        {/* ===================================================================
            TOP HEADER & ACTION BUTTONS (Matching Screenshot)
            =================================================================== */}
        <div className="page-header-wrapper mb-3">
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
            {can("quotation.reset") && <button
              type="button"
              className="btn btn-outline-custom d-flex align-items-center gap-1"
              onClick={handleResetSheet}
            >
              <i className="bi bi-arrow-clockwise"></i>
              <span>Reset Sheet</span>
            </button>}

            {can("quotation.print_pdf") && <button
              type="button"
              className="btn btn-outline-custom d-flex align-items-center gap-1"
              onClick={handlePrintPdf}
            >
              <i className="bi bi-printer-fill"></i>
              <span>Print / PDF</span>
            </button>}

            {can("quotation.email") && <button
              type="button"
              className="btn btn-outline-custom d-flex align-items-center gap-1"
              style={{ color: "#facc15", borderColor: "rgba(234, 179, 8, 0.4)" }}
              onClick={handleOpenEmailModal}
            >
              <i className="bi bi-envelope-fill"></i>
              <span>Email Client</span>
            </button>}

            {/* Tab switch between Live Generator and All Saved Quotes */}
            {can("quotation.saved_view") && <button
              type="button"
              className={`btn btn-sm ${activeTab === "maker" ? "btn-outline-primary" : "btn-primary"} d-flex align-items-center gap-1`}
              onClick={() => setActiveTab(activeTab === "maker" ? "records" : "maker")}
            >
              <i className={activeTab === "maker" ? "bi bi-folder2-open" : "bi bi-file-earmark-spreadsheet-fill"}></i>
              <span>{activeTab === "maker" ? "Saved Quotes Pipeline" : "Back to Quotation Maker"}</span>
            </button>}
          </div>
        </div>

        {/* ===================================================================
            TAB 1: LIVE QUOTATION BUILDER & SHEET (Screenshot UI)
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
                    <select
                      className="form-select"
                      value={selectedLeadId}
                      onChange={(e) => handleSelectLead(e.target.value)}
                      disabled={isLoadingLeads}
                    >
                      <option value="">-- Choose Lead from Pipeline --</option>
                      {leadsList.map((lead) => {
                        const priorityEmoji =
                          lead.priority?.toLowerCase() === "hot"
                            ? "🔥"
                            : lead.priority?.toLowerCase() === "warm"
                              ? "☀️"
                              : "❄️";
                        return (
                          <option key={lead.id} value={lead.id}>
                            {lead.name} ({lead.model_variant || lead.brand_name || "Lead"} - {lead.priority || "Standard"} {priorityEmoji})
                          </option>
                        );
                      })}
                    </select>
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
                    <div className="col-md-6">
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
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-medium mb-1">Fuel / Variant Tag</label>
                      <select
                        className="form-select"
                        value={variantFuel}
                        onChange={(e) => setVariantFuel(e.target.value)}
                      >
                        <option value="PETROL">PETROL</option>
                        <option value="DIESEL">DIESEL</option>
                        <option value="CNG">CNG</option>
                        <option value="ELECTRIC">ELECTRIC / EV</option>
                        <option value="HYBRID">STRONG HYBRID</option>
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
                    <div className="col-12">
                      <label className="form-label text-dark small fw-medium mb-1">DIFFERENCE AMT CASH</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={diffAmtCash}
                        onChange={(e) => setDiffAmtCash(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="d-flex gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-primary flex-fill d-flex align-items-center justify-content-center gap-2"
                      onClick={() => saveQuotationToBackend("draft")}
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
                          <span>Save to CRM Pipeline</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------
                RIGHT PANEL: OFFICIAL LIVE QUOTATION SHEET (EXACT UI MATCH)
                ---------------------------------------------------- */}
            <div className="col-xl-7 col-lg-7">
              <div
                className="quotation-print-sheet p-4 shadow-lg"
                id="printableQuoteCard"
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  color: "#1e293b",
                  fontFamily: "'Inter', sans-serif",
                  border: "1px solid #e2e8f0",
                  minHeight: "750px",
                }}
              >
                {/* Header with Dealership Brand & Address Box */}
                <div className="d-flex align-items-center justify-content-between mb-3 pb-2">
                  {/* Brand Logo & Name */}
                  <div className="d-flex align-items-center gap-2" style={{ maxWidth: "35%" }}>
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: "8px",
                        background: "#1e3a8a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "1.2rem",
                        flexShrink: 0,
                      }}
                    >
                      DA
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#1e3a8a", lineHeight: "1.1" }}>
                        DEFENCE
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#2563eb", lineHeight: "1.1" }}>
                        AUTOLINK
                      </div>
                    </div>
                  </div>

                  {/* Main Red Heading & Grey Address Box */}
                  <div className="text-center" style={{ width: "65%" }}>
                    <h3
                      className="mb-1 text-uppercase fw-bold"
                      style={{
                        color: "#b91c1c",
                        fontSize: "1.6rem",
                        letterSpacing: "1.5px",
                        fontFamily: "inherit",
                      }}
                    >
                      DEFENCE AUTOLINK
                    </h3>
                    <div
                      className="p-2 rounded-2"
                      style={{
                        background: "#e2e8f0",
                        fontSize: "0.74rem",
                        fontWeight: "600",
                        color: "#1e293b",
                        lineHeight: "1.3",
                      }}
                    >
                      D-601, 6TH FLOOR, S.G BUSINESS HUB, NEAR UMIYA CAMPUS,
                      <br />
                      Ahmedabad - 380060
                    </div>
                  </div>
                </div>

                {/* Date & QUOTATION Center Badge */}
                <div className="d-flex align-items-center justify-content-between mb-3 mt-4">
                  <div className="fw-bold" style={{ fontSize: "0.92rem", color: "#0f172a" }}>
                    DATE : {quotationDate}
                  </div>

                  <div
                    className="px-4 py-1 text-center"
                    style={{
                      border: "2px solid #0f172a",
                      color: "#b91c1c",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      letterSpacing: "1px",
                    }}
                  >
                    QUOTATION
                  </div>

                  <div className="fw-bold" style={{ fontSize: "0.85rem", color: "#0f172a" }}>
                    CLIENT: <span className="text-primary">{clientName}</span>
                  </div>
                </div>

                {/* Dealership Spreadsheet Grid Table */}
                <div className="table-responsive">
                  <table
                    className="table mb-0"
                    style={{
                      border: "2px solid #334155",
                      fontSize: "0.86rem",
                      fontWeight: 600,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#94a3b8", color: "#0f172a" }}>
                        <th
                          style={{
                            width: "44%",
                            border: "1px solid #334155",
                            padding: "10px 12px",
                            fontWeight: "800",
                            textTransform: "uppercase",
                          }}
                        >
                          CAR: {carName}
                        </th>
                        <th
                          style={{
                            width: "36%",
                            border: "1px solid #334155",
                            padding: "10px 12px",
                            textAlign: "center",
                            fontWeight: "800",
                            textTransform: "uppercase",
                          }}
                        >
                          MODEL: {modelSpec}
                        </th>
                        <th
                          style={{
                            width: "20%",
                            border: "1px solid #334155",
                            padding: "10px 12px",
                            textAlign: "center",
                            fontWeight: "800",
                          }}
                        >
                          {modelCol3}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Variant Green Row */}
                      <tr>
                        <td
                          style={{
                            background: "#86efac",
                            color: "#052e16",
                            border: "1px solid #334155",
                            padding: "8px 12px",
                            fontWeight: "800",
                            textTransform: "uppercase",
                          }}
                        >
                          VARIENT: {variantFuel}
                        </td>
                        <td
                          style={{
                            border: "1px solid #334155",
                            padding: "8px 12px",
                            textAlign: "center",
                          }}
                        >
                          {variantCol2}
                        </td>
                        <td
                          style={{
                            border: "1px solid #334155",
                            padding: "8px 12px",
                            textAlign: "center",
                          }}
                        >
                          {variantCol3}
                        </td>
                      </tr>

                      {/* CSD PRICE */}
                      <tr>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>CSD PRICE</td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center", fontWeight: "700" }}>
                          {csdPrice}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {col3CsdPrice}
                        </td>
                      </tr>

                      {/* GJ RTO */}
                      <tr>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>GJ RTO</td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {gjRto}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {col3GjRto}
                        </td>
                      </tr>

                      {/* BH RTO * APPOROX */}
                      <tr>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>BH RTO * APPOROX</td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {bhRto}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {col3BhRto}
                        </td>
                      </tr>

                      {/* CRTM */}
                      <tr>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>CRTM</td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {crtm}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {col3Crtm}
                        </td>
                      </tr>

                      {/* INSURANCE */}
                      <tr>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>INSURANCE</td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {insurance}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {col3Insurance}
                        </td>
                      </tr>

                      {/* ACCESSORIES */}
                      <tr>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>ACCESSORIES</td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center", fontWeight: "700" }}>
                          {accessories}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {col3Accessories}
                        </td>
                      </tr>

                      {/* WARRANTY */}
                      <tr>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>WARRANTY</td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {warranty}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {col3Warranty}
                        </td>
                      </tr>

                      {/* M.S REWORD */}
                      <tr>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>M.S REWORD</td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {msReward}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {col3MsReward}
                        </td>
                      </tr>

                      {/* DIFFERENCE AMT CASH */}
                      <tr>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>DIFFERENCE AMT CASH</td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {diffAmtCash}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                          {col3DiffAmtCash}
                        </td>
                      </tr>

                      {/* NET ON-ROAD ESTIMATE */}
                      <tr style={{ background: "#fef3c7" }}>
                        <td style={{ border: "1px solid #334155", padding: "10px 12px", fontWeight: "800", color: "#92400e" }}>
                          ESTIMATED ON-ROAD PRICE
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "10px 12px", textAlign: "center", fontWeight: "800", color: "#b91c1c", fontSize: "1.05rem" }}>
                          ₹ {totalCol1.toLocaleString("en-IN")}/-
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "10px 12px", textAlign: "center" }}>
                          N.A
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Dealership Executive & Signature Footer */}
                <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-end" style={{ fontSize: "0.8rem" }}>
                  <div>
                    <div className="fw-bold text-dark">
                      Executive: <span className="text-primary">{executiveName}</span>
                    </div>
                    <div className="text-muted">Contact: +91 {executivePhone}</div>
                    <div className="text-secondary small mt-1" style={{ fontSize: "0.72rem" }}>
                      * Prices prevailing at the time of delivery will be applicable. Road tax as per RTO norms.
                    </div>
                  </div>

                  <div className="text-end">
                    <div className="fw-bold text-dark">For DEFENCE AUTOLINK</div>
                    <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                      (Authorized Multi-Brand Dealership Signatory)
                    </div>
                  </div>
                </div>
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
              <h5 className="card-title text-dark mb-0 fw-bold">Saved Quotations Archive</h5>
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
                    <option value="draft">Draft</option>
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

            <div className="table-responsive">
              <table className="table table-custom align-middle mb-0">
                <thead className="border-bottom border-secondary border-opacity-25 text-secondary small text-uppercase">
                  <tr>
                    <th className="py-3 px-3 text-center" style={{ width: "85px" }}>Actions</th>
                    <th className="py-3 px-3">Quotation #</th>
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
                      <td colSpan="7" className="text-center py-4 text-muted">
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        Loading quotations...
                      </td>
                    </tr>
                  ) : quotations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        No saved quotations found.
                      </td>
                    </tr>
                  ) : (
                    quotations.map((quote) => (
                      <tr key={quote.id} className="border-bottom border-secondary border-opacity-10">
                        {/* 1. Actions First Column */}
                        <td className="py-3 px-3 text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            {(can("quotation.view") || isReceptionist) && (
                              <Link
                                href={`${baseQuotationPath}/${quote.id}`}
                                className="btn btn-outline-custom btn-sm p-1 px-2"
                                title="View Quotation"
                              >
                                <i className="bi bi-eye"></i>
                              </Link>
                            )}
                          </div>
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
                          <div className="text-dark fw-semibold">{quote.customer_name}</div>
                          <span className="text-secondary small">{quote.customer_phone || quote.customer_email || "-"}</span>
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
                          <span
                            className={`badge text-capitalize ${quote.status === "accepted"
                                ? "bg-success text-white"
                                : quote.status === "sent"
                                  ? "bg-info text-dark"
                                  : "bg-warning text-dark"
                              }`}
                          >
                            {quote.status || "draft"}
                          </span>
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
          <div className="modal-backdrop-custom" onClick={() => !isSendingEmail && setShowEmailModal(false)}>
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
      </div>
    </AdminLayout>
  );
}
