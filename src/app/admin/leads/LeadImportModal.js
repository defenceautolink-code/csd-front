"use client";

import React, { useState, useRef, useMemo } from "react";
import api from "@/lib/axios";
import axios from "axios";
import * as XLSX from "xlsx";
import leadApi from "@/services/leadApi";

/**
 * EXACT Target Fields matching the Lead Table & "Add Customer Lead" form:
 * 1. Customer Details
 * 2. Vehicle Requirement & Lead Priority
 * 3. Lead Tracking & Assignment
 */
const FIELD_GROUPS = [
  {
    groupTitle: "1. Customer Details",
    icon: "bi-person-vcard",
    fields: [
      {
        key: "name",
        label: "Customer Full Name",
        required: true,
        placeholder: "e.g. Captain Vikram Rathore",
        aliases: [
          "customer full name",
          "full name",
          "fullname",
          "name",
          "customer name",
          "customer",
          "client name",
          "client",
          "lead name",
          "contact name",
          "candidate name",
        ],
      },
      {
        key: "phone",
        label: "Phone Number",
        required: true,
        placeholder: "+91 98765 43210",
        aliases: [
          "phone number",
          "phone no",
          "phone",
          "mobile number",
          "mobile no",
          "mobile",
          "number",
          "contact number",
          "contact no",
          "contact",
          "whatsapp",
          "cell",
        ],
      },
      {
        key: "email",
        label: "Email Address",
        required: false,
        placeholder: "vikram.rathore@defmail.com",
        aliases: [
          "email address",
          "email",
          "e-mail",
          "mail",
          "email id",
          "customer email",
        ],
      },
      {
        key: "city",
        label: "City",
        required: false,
        placeholder: "e.g. Pune, Delhi, Jaipur",
        aliases: [
          "city",
          "ads",
          "address",
          "adreess",
          "location",
          "town",
          "district",
          "area",
          "place",
        ],
      },
      {
        key: "state",
        label: "State",
        required: false,
        placeholder: "e.g. Maharashtra, Rajasthan",
        aliases: ["state", "province", "region", "state name"],
      },
      {
        key: "birth_date",
        label: "Birth Date (Birthday)",
        required: false,
        placeholder: "mm/dd/yyyy",
        aliases: [
          "birth date",
          "birthday",
          "dob",
          "date of birth",
          "birth_date",
          "birthdate",
          "bday",
        ],
      },
      {
        key: "anniversary_date",
        label: "Anniversary Date",
        required: false,
        placeholder: "mm/dd/yyyy",
        aliases: [
          "anniversary date",
          "anniversary",
          "doa",
          "anniversary_date",
          "marriage anniversary",
        ],
      },
    ],
  },
  {
    groupTitle: "2. Vehicle Requirement",
    icon: "bi-car-front",
    fields: [
      {
        key: "brand_name",
        label: "Brand Name",
        required: false,
        placeholder: "e.g. Tata, Hyundai, Maruti Suzuki",
        aliases: [
          "brand name",
          "brand",
          "make",
          "company",
          "car brand",
          "manufacturer",
        ],
      },
      {
        key: "model_variant",
        label: "Variant / Model",
        required: true,
        placeholder: "e.g. Brezza ZDI, Classic 350, Apache RR310",
        aliases: [
          "variant / model",
          "variant",
          "model",
          "model variant",
          "vehicle model",
          "vehicle",
          "car",
          "requirement",
        ],
      },
      {
        key: "purchase_timeline",
        label: "Planning In (Purchase Timeline)",
        required: false,
        placeholder: "Immediate (Within 7 Days)",
        aliases: [
          "planning in",
          "purchase timeline",
          "timeline",
          "buying timeline",
          "when to buy",
          "timeframe",
        ],
      },
      {
        key: "budget",
        label: "Total Deal Price / Budget (₹)",
        required: false,
        placeholder: "e.g. 1450000",
        aliases: [
          "total deal price",
          "budget",
          "deal price",
          "deal amount",
          "price",
          "amount",
          "total budget",
          "budget price",
        ],
      },
    ],
  },
  {
    groupTitle: "3. Lead Tracking & Assignment",
    icon: "bi-person-check",
    fields: [
      {
        key: "source_name",
        label: "Lead Source",
        required: false,
        placeholder: "e.g. LinkedIn, Website, Direct Walk-in",
        aliases: [
          "lead source",
          "source",
          "source name",
          "lead_source",
          "channel",
          "campaign",
        ],
      },
      {
        key: "status_name",
        label: "Lead Status",
        required: false,
        placeholder: "e.g. New Lead, In Follow-Up, Quotation Sent",
        aliases: [
          "lead status",
          "status",
          "status name",
          "lead_status",
          "stage",
        ],
      },
      {
        key: "assigned_user_name",
        label: "Assigned Executive",
        required: false,
        placeholder: "e.g. David Miller (Sales Executive)",
        aliases: [
          "assigned executive",
          "assigned to",
          "sales executive",
          "assign to",
          "assignee",
          "executive",
          "assigned user",
        ],
      },
    ],
  },
];

// Flat list of all fields
const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);

/**
 * Clean string for alias auto-matching
 */
const normalizeText = (text) => {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
};

/**
 * Sanitize Vehicle Segment to strictly match Laravel backend validation:
 * Expected: "2 Wheeler" or "4 Wheeler"
 */
const sanitizeSegment = (val, fallback = "4 Wheeler") => {
  if (!val) return fallback;
  const s = String(val).toLowerCase().trim();
  if (
    s === "2" ||
    s.startsWith("2") ||
    s.includes("two") ||
    s.includes("bike") ||
    s.includes("scooter")
  ) {
    return "2 Wheeler";
  }
  return "4 Wheeler";
};

/**
 * Sanitize Priority to strictly match Laravel backend validation:
 * Expected: "Hot", "Warm", or "Cold"
 */
const sanitizePriority = (val, fallback = "Hot") => {
  if (!val) return fallback;
  const s = String(val).toLowerCase().trim();
  if (
    s.includes("hot") ||
    s.includes("arjent") ||
    s.includes("urgent") ||
    s.includes("high") ||
    s.includes("immediate") ||
    s === "1"
  ) {
    return "Hot";
  }
  if (
    s.includes("warm") ||
    s.includes("medium") ||
    s.includes("normal") ||
    s === "2"
  ) {
    return "Warm";
  }
  if (s.includes("cold") || s.includes("low") || s === "3") {
    return "Cold";
  }
  return fallback;
};

/**
 * Sanitize Email: strictly checks for valid email format.
 * If user uploads village/city/non-email text like "bhalgamda",
 * it returns "" so Laravel validation rule 'email' => 'nullable|email' does NOT fail!
 */
const sanitizeEmail = (val) => {
  if (!val) return "";
  const s = String(val).trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(s) ? s : "";
};

/**
 * Sanitize Phone: strip extra spaces/special chars, keep digits & plus
 */
const sanitizePhone = (val) => {
  if (!val) return "";
  const s = String(val).trim();
  const cleaned = s.replace(/[^\d+]/g, "");
  return cleaned || s;
};

/**
 * Sanitize Date to YYYY-MM-DD format
 */
const sanitizeDate = (val) => {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) {
    return val.toISOString().split("T")[0];
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return null;
};

export default function LeadImportModal({
  isOpen,
  onClose,
  onSuccess,
  apiUrl,
  usersList = [],
  sources = [],
  brands = [],
  statuses = [],
  showToast = () => {},
}) {
  const fileInputRef = useRef(null);

  // Wizard Steps: 1: 'upload', 2: 'mapping', 3: 'preview'
  const [currentStep, setCurrentStep] = useState(1);

  // File parsing states
  const [file, setFile] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [workbook, setWorkbook] = useState(null);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);

  // Field mapping state: { [systemKey]: excelHeaderName }
  const [mapping, setMapping] = useState({});

  // Default fallback values for unmapped/empty fields
  const [defaultValues, setDefaultValues] = useState({
    vehicle_segment: "4 Wheeler",
    brand_id: "",
    model_variant: "General Inquiry",
    priority: "Hot",
    purchase_timeline: "Immediate (Within 7 Days)",
    assigned_user_name: "",
    source_name: "Excel Import",
    status_name: "New Lead",
  });

  // Processing & progress states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });

  // Reset modal state
  const handleReset = () => {
    setFile(null);
    setSheetNames([]);
    setSelectedSheet("");
    setWorkbook(null);
    setExcelHeaders([]);
    setRawRows([]);
    setMapping({});
    setCurrentStep(1);
    setIsProcessing(false);
    setProgress({ current: 0, total: 0, percent: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (isProcessing) return;
    handleReset();
    onClose();
  };

  // Perform smart auto-matching between system fields and parsed Excel headers
  const autoMatchFields = (headers) => {
    const initialMapping = {};
    const usedHeaders = new Set();

    ALL_FIELDS.forEach((sys) => {
      // 1. Direct match with aliases
      for (const alias of sys.aliases) {
        const cleanAlias = normalizeText(alias);
        const matched = headers.find((h) => {
          const cleanH = normalizeText(h);
          return cleanH === cleanAlias;
        });

        if (matched && !usedHeaders.has(matched)) {
          initialMapping[sys.key] = matched;
          usedHeaders.add(matched);
          return;
        }
      }

      // 2. Fuzzy inclusion match (minimum 3 chars)
      for (const alias of sys.aliases) {
        const cleanAlias = normalizeText(alias);
        if (cleanAlias.length < 3) continue;
        const matched = headers.find((h) => {
          const cleanH = normalizeText(h);
          return (
            (cleanH.includes(cleanAlias) || cleanAlias.includes(cleanH)) &&
            !usedHeaders.has(h)
          );
        });

        if (matched) {
          initialMapping[sys.key] = matched;
          usedHeaders.add(matched);
          return;
        }
      }

      // Default: unmapped
      initialMapping[sys.key] = "";
    });

    return initialMapping;
  };

  // Parse file when selected
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const wb = XLSX.read(data, { type: "array", cellDates: true });

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        showToast("The uploaded file does not contain any readable sheets.", "error");
        setIsProcessing(false);
        return;
      }

      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      const firstSheet = wb.SheetNames[0];
      setSelectedSheet(firstSheet);

      loadSheetData(wb, firstSheet);
    } catch (err) {
      console.error("Error parsing Excel file:", err);
      showToast("Failed to read Excel file. Please ensure it is a valid .xlsx, .xls or .csv file.", "error");
      setIsProcessing(false);
    }
  };

  // Load and parse rows from a specific sheet
  const loadSheetData = (wb, sheetName) => {
    try {
      const sheet = wb.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });

      if (!jsonData || jsonData.length === 0) {
        showToast("The selected sheet is empty.", "warning");
        setIsProcessing(false);
        return;
      }

      // First row = headers
      const rawHeaders = (jsonData[0] || []).map((h) => String(h || "").trim());
      const headers = rawHeaders.filter((h) => h.length > 0);

      if (headers.length === 0) {
        showToast("No column headers detected in the first row.", "error");
        setIsProcessing(false);
        return;
      }

      // Rows data
      const dataRows = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.every((c) => c === "" || c === null || c === undefined)) {
          continue;
        }
        const rowObj = {};
        rawHeaders.forEach((h, colIdx) => {
          if (h) {
            let val = row[colIdx];
            if (val instanceof Date) {
              val = val.toISOString().split("T")[0];
            }
            rowObj[h] = val !== undefined && val !== null ? String(val).trim() : "";
          }
        });
        dataRows.push(rowObj);
      }

      setExcelHeaders(headers);
      setRawRows(dataRows);

      // Run smart auto-matching
      const initialMap = autoMatchFields(headers);
      setMapping(initialMap);

      setIsProcessing(false);
      setCurrentStep(2); // Jump to Mapping step
      showToast(`Loaded "${sheetName}" with ${dataRows.length} rows & ${headers.length} columns!`, "success");
    } catch (err) {
      console.error("Error reading sheet:", err);
      showToast("Failed to process sheet rows.", "error");
      setIsProcessing(false);
    }
  };

  const handleSheetSwitch = (sheetName) => {
    if (!workbook) return;
    setSelectedSheet(sheetName);
    setIsProcessing(true);
    loadSheetData(workbook, sheetName);
  };

  const handleMappingChange = (sysKey, excelHeader) => {
    setMapping((prev) => ({
      ...prev,
      [sysKey]: excelHeader,
    }));
  };

  // Generate mapped leads preview & sanitized payload
  const mappedLeads = useMemo(() => {
    if (rawRows.length === 0) return [];

    return rawRows.map((row) => {
      const getVal = (sysKey) => {
        const header = mapping[sysKey];
        if (!header) return "";
        return row[header] || "";
      };

      // 1. Customer Details
      const rawName = getVal("name");
      const rawPhone = getVal("phone");
      const rawEmail = getVal("email");
      const city = getVal("city") ? String(getVal("city")).trim() : "";
      const state = getVal("state") ? String(getVal("state")).trim() : "";
      const rawBirthDate = getVal("birth_date");
      const rawAnniversaryDate = getVal("anniversary_date");

      const name = String(rawName || "").trim();
      const phone = sanitizePhone(rawPhone);
      const email = sanitizeEmail(rawEmail);
      const birthDate = sanitizeDate(rawBirthDate);
      const anniversaryDate = sanitizeDate(rawAnniversaryDate);

      // 2. Vehicle Requirement & Priority (Configured in Default Settings)
      const vehicleSegment = sanitizeSegment(defaultValues.vehicle_segment, "4 Wheeler");
      const priority = sanitizePriority(defaultValues.priority, "Hot");

      const brandName = getVal("brand_name") ? String(getVal("brand_name")).trim() : "";
      const rawVariant = getVal("model_variant");
      const modelVariant = rawVariant && String(rawVariant).trim().length > 0
        ? String(rawVariant).trim()
        : defaultValues.model_variant || "General Inquiry";

      const rawTimeline = getVal("purchase_timeline");
      const purchaseTimeline = rawTimeline && String(rawTimeline).trim().length > 0
        ? String(rawTimeline).trim()
        : defaultValues.purchase_timeline || "Immediate (Within 7 Days)";

      const rawBudget = getVal("budget");
      const budgetNum = rawBudget ? parseFloat(String(rawBudget).replace(/[^0-9.]/g, "")) || null : null;

      // 3. Lead Tracking & Assignment
      const sourceName = getVal("source_name") || defaultValues.source_name || "Excel Import";
      const statusName = getVal("status_name") || defaultValues.status_name || "New Lead";
      const assignedUser = getVal("assigned_user_name") || defaultValues.assigned_user_name || undefined;

      // Look up IDs from Master dropdowns if available
      const matchedBrand = brands.find(
        (b) =>
          normalizeText(b.name) === normalizeText(brandName) ||
          normalizeText(b.name).includes(normalizeText(brandName)) ||
          normalizeText(brandName).includes(normalizeText(b.name)) ||
          String(b.id) === String(defaultValues.brand_id)
      );
      const matchedSource = sources.find(
        (s) => normalizeText(s.title || s.name) === normalizeText(sourceName)
      );
      const matchedStatus = statuses.find(
        (st) => normalizeText(st.name) === normalizeText(statusName)
      );

      return {
        name: name,
        phone: phone,
        raw_email: rawEmail,
        email: email || null,
        city: city,
        state: state,
        birth_date: birthDate || null,
        anniversary_date: anniversaryDate || null,
        vehicle_segment: vehicleSegment,
        brand_id: matchedBrand ? matchedBrand.id : defaultValues.brand_id ? Number(defaultValues.brand_id) : null,
        brand_name: brandName || (matchedBrand ? matchedBrand.name : undefined),
        model_variant: modelVariant,
        priority: priority,
        purchase_timeline: purchaseTimeline,
        budget: budgetNum,
        total_deal_amount: budgetNum,
        source_id: matchedSource ? matchedSource.id : null,
        source_name: sourceName,
        status_id: matchedStatus ? matchedStatus.id : null,
        status_name: statusName,
        assigned_user_name: assignedUser,
      };
    });
  }, [rawRows, mapping, defaultValues, brands, sources, statuses]);

  // Validation: Customer Name & Phone are required
  const canProceedToPreview = useMemo(() => {
    return Boolean(mapping.name && mapping.phone);
  }, [mapping]);

  // Download Sample Template with EXACT same fields
  const handleDownloadSample = () => {
    const sampleHeaders = [
      "Customer Full Name",
      "Phone Number",
      "Email Address",
      "City",
      "State",
      "Birth Date",
      "Anniversary Date",
      "Vehicle Segment",
      "Brand Name",
      "Variant / Model",
      "Lead Priority",
      "Purchase Timeline",
      "Total Budget",
      "Lead Source",
    ];
    const sampleRows = [
      [
        "Captain Vikram Rathore",
        "+91 98765 43210",
        "vikram.rathore@defmail.com",
        "Pune",
        "Maharashtra",
        "1990-05-15",
        "2018-12-10",
        "4 Wheeler",
        "Tata",
        "Safari Dark Edition",
        "Hot",
        "Immediate (Within 7 Days)",
        "2400000",
        "Direct Walk-in",
      ],
      [
        "Anita Roy",
        "+91 98123 45678",
        "anita.roy@example.com",
        "Delhi",
        "Delhi",
        "1995-08-20",
        "",
        "4 Wheeler",
        "Hyundai",
        "Creta SX",
        "Warm",
        "Within 15 Days",
        "1650000",
        "Website",
      ],
      [
        "Rajesh Patel",
        "+91 98222 11334",
        "rajesh.p@example.com",
        "Ahmedabad",
        "Gujarat",
        "1988-11-04",
        "2015-02-22",
        "2 Wheeler",
        "Royal Enfield",
        "Classic 350",
        "Hot",
        "Immediate (Within 7 Days)",
        "220000",
        "LinkedIn",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "lead_import_template.xlsx");
    showToast("Downloaded sample lead Excel template!", "info");
  };

  // Final Submit Handler
  const handleFinalSubmit = async () => {
    if (mappedLeads.length === 0) {
      showToast("No records to import.", "warning");
      return;
    }

    const validLeads = mappedLeads.filter(
      (l) => l.name && String(l.name).trim().length > 0 && l.phone && String(l.phone).trim().length > 0
    );

    if (validLeads.length === 0) {
      showToast("No valid rows found. Please ensure mapped Customer Name & Phone Number columns are not empty.", "error");
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: validLeads.length, percent: 0 });

    // Prepare clean payload without internal debug properties
    const cleanPayloadLeads = validLeads.map((l) => {
      // eslint-disable-next-line no-unused-vars
      const { raw_email, ...rest } = l;
      return {
        ...rest,
        // Guarantee email is string or null
        email: rest.email || "",
      };
    });

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 1. Direct call to backend leads/bulk-import API
      try {
        const res = await leadApi.bulkImport(cleanPayloadLeads);

        if (res && (res.status || res.success)) {
          setProgress({
            current: cleanPayloadLeads.length,
            total: cleanPayloadLeads.length,
            percent: 100,
          });

          const summary = res.summary;
          const msg = summary
            ? `Bulk Import: ${summary.imported_count || 0} imported, ${summary.skipped_count || 0} skipped (duplicates), ${summary.failed_count || 0} failed.`
            : res.message || `Successfully processed ${cleanPayloadLeads.length} leads!`;

          showToast(msg, summary?.failed_count > 0 && summary?.imported_count === 0 ? "warning" : "success");
          onSuccess();
          handleClose();
          return;
        }
      } catch (bulkErr) {
        console.warn("Bulk import endpoint error, attempting batch fallback:", bulkErr);
        // If the error message is specific (like validation 422), we can log or handle
        const errMsg = bulkErr.response?.data?.message;
        if (errMsg && bulkErr.response?.status === 422) {
          showToast(`Import validation failed: ${errMsg}`, "error");
          setIsProcessing(false);
          return;
        }
      }

      // 2. Immediate Batch Fallback using Axios instance with Token
      let successCount = 0;
      let failedCount = 0;
      let lastErrorMessage = "";
      const batchSize = 4;

      for (let i = 0; i < cleanPayloadLeads.length; i += batchSize) {
        const batch = cleanPayloadLeads.slice(i, i + batchSize);
        const promises = batch.map(async (lead) => {
          try {
            // First try configured api instance
            const res = await api.post(`${apiUrl}/leads`, lead, { headers });
            if (res.data && (res.data.status || res.status === 200 || res.status === 201)) {
              successCount++;
            } else {
              failedCount++;
              if (res.data?.message) lastErrorMessage = res.data.message;
            }
          } catch (err) {
            // Fallback: try raw axios in case of interceptor issue
            try {
              const fbRes = await axios.post(`${apiUrl}/leads`, lead, { headers });
              if (fbRes.data && (fbRes.data.status || fbRes.status === 200 || fbRes.status === 201)) {
                successCount++;
                return;
              }
            } catch (rawErr) {
              const errMsg = rawErr.response?.data?.message || err.response?.data?.message || err.message;
              const errDetails = rawErr.response?.data?.errors
                ? Object.values(rawErr.response.data.errors).flat().join(" ")
                : err.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join(" ")
                : "";
              lastErrorMessage = [errMsg, errDetails].filter(Boolean).join(": ");
              console.error("Lead create error for", lead.name, ":", errMsg, errDetails);
            }
            failedCount++;
          }
        });

        await Promise.all(promises);

        const currentDone = Math.min(i + batchSize, cleanPayloadLeads.length);
        const percent = Math.round((currentDone / cleanPayloadLeads.length) * 100);
        setProgress({ current: currentDone, total: cleanPayloadLeads.length, percent });
      }

      if (successCount > 0) {
        showToast(
          `Import complete! ${successCount} leads added successfully.${
            failedCount > 0 ? ` (${failedCount} failed: ${lastErrorMessage})` : ""
          }`,
          "success"
        );
        onSuccess();
        handleClose();
      } else {
        showToast(
          lastErrorMessage || "Failed to import leads. Please verify database connection or API status.",
          "error"
        );
      }
    } catch (err) {
      console.error("Import error:", err);
      showToast(err.response?.data?.message || "An error occurred during import.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-custom" onClick={handleClose}>
      <div
        className="modal-dialog-custom modal-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "1000px", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-header-custom d-flex justify-content-between align-items-center">
          <div>
            <h5 className="modal-title-custom mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-spreadsheet-fill text-success fs-5"></i>
              <span>Smart Excel Lead Import & Field Mapping</span>
            </h5>
            <small className="text-secondary opacity-75" style={{ fontSize: "12px" }}>
              Map your Excel columns directly to the Lead form fields
            </small>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={handleClose}
            disabled={isProcessing}
          ></button>
        </div>

        {/* Wizard Steps */}
        <div
          className="px-4 py-2 border-bottom d-flex align-items-center justify-content-between bg-light"
          style={{ fontSize: "13px" }}
        >
          <div className="d-flex align-items-center gap-3">
            <span
              className={`badge rounded-pill d-flex align-items-center gap-1 ${
                currentStep === 1 ? "bg-primary text-white" : "bg-success text-white"
              }`}
              style={{ cursor: file ? "pointer" : "default" }}
              onClick={() => file && !isProcessing && setCurrentStep(1)}
            >
              <i className="bi bi-1-circle"></i> 1. Upload Excel File
            </span>
            <i className="bi bi-chevron-right text-muted small"></i>
            <span
              className={`badge rounded-pill d-flex align-items-center gap-1 ${
                currentStep === 2
                  ? "bg-primary text-white"
                  : currentStep > 2
                  ? "bg-success text-white"
                  : "bg-secondary text-light"
              }`}
              style={{ cursor: excelHeaders.length > 0 ? "pointer" : "default" }}
              onClick={() => excelHeaders.length > 0 && !isProcessing && setCurrentStep(2)}
            >
              <i className="bi bi-2-circle"></i> 2. Map Lead Form Fields ({excelHeaders.length} Columns Found)
            </span>
            <i className="bi bi-chevron-right text-muted small"></i>
            <span
              className={`badge rounded-pill d-flex align-items-center gap-1 ${
                currentStep === 3 ? "bg-primary text-white" : "bg-secondary text-light"
              }`}
              style={{ cursor: canProceedToPreview ? "pointer" : "default" }}
              onClick={() => canProceedToPreview && !isProcessing && setCurrentStep(3)}
            >
              <i className="bi bi-3-circle"></i> 3. Preview & Confirm ({rawRows.length} Leads)
            </span>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            style={{ fontSize: "11px", padding: "3px 8px" }}
            onClick={handleDownloadSample}
          >
            <i className="bi bi-download"></i>
            <span>Sample Excel</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-custom p-3" style={{ overflowY: "auto", flex: "1 1 auto" }}>
          {/* ================= STEP 1: FILE UPLOAD ================= */}
          {currentStep === 1 && (
            <div className="py-3">
              <div
                className="p-5 border border-2 border-dashed rounded-3 text-center mb-3 bg-light"
                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="bi bi-cloud-arrow-up-fill text-primary display-4 mb-3 d-block"></i>
                <h6 className="fw-bold mb-1">Click to browse or drag and drop your Excel / CSV file</h6>
                <p className="text-muted small mb-3">
                  Upload files formatted with your lead records (<strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong>)
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="d-none"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  className="btn btn-primary btn-sm px-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <i className="bi bi-folder2-open me-1"></i> Choose File
                </button>
              </div>

              {file && (
                <div className="card p-3 border shadow-sm">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center"
                        style={{ width: "42px", height: "42px" }}
                      >
                        <i className="bi bi-file-earmark-excel fs-4"></i>
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{file.name}</div>
                        <div className="text-muted small">
                          Size: {(file.size / 1024).toFixed(1)} KB • {rawRows.length} rows detected
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      {sheetNames.length > 1 && (
                        <div className="d-flex align-items-center gap-1">
                          <label className="small text-muted mb-0">Sheet:</label>
                          <select
                            className="form-select form-select-sm"
                            value={selectedSheet}
                            onChange={(e) => handleSheetSwitch(e.target.value)}
                          >
                            {sheetNames.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={handleReset}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: FIELD MAPPING ================= */}
          {currentStep === 2 && (
            <div>
              <div
                className="alert alert-info py-2 px-3 small d-flex align-items-center justify-content-between mb-3"
                style={{ backgroundColor: "rgba(13, 110, 253, 0.08)", borderColor: "rgba(13, 110, 253, 0.2)" }}
              >
                <div>
                  <i className="bi bi-check2-circle me-1 text-success fw-bold"></i>
                  <strong>Auto-Match Applied!</strong> Map your Excel columns to the corresponding Lead form fields below.
                </div>
                <span className="badge bg-primary">
                  {rawRows.length} rows from &quot;{selectedSheet}&quot;
                </span>
              </div>

              {/* Loop through each section */}
              {FIELD_GROUPS.map((group, gIdx) => (
                <div key={gIdx} className="card mb-3 border shadow-sm">
                  <div
                    className="card-header py-2 px-3 d-flex align-items-center gap-2 fw-bold text-dark"
                    style={{ backgroundColor: "#F7F7F5", borderBottom: "1px solid #EBEFE3", fontSize: "14px" }}
                  >
                    <i className={`bi ${group.icon} text-primary`}></i>
                    <span>{group.groupTitle}</span>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover table-bordered align-middle mb-0" style={{ fontSize: "13px" }}>
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: "30%" }}>Database Field (Target)</th>
                          <th style={{ width: "36%" }}>Excel Column (Dropdown)</th>
                          <th style={{ width: "24%" }}>Sample Value (Row 1)</th>
                          <th style={{ width: "10%" }} className="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.fields.map((sys) => {
                          const selectedHeader = mapping[sys.key] || "";
                          const sampleVal = selectedHeader && rawRows[0] ? rawRows[0][selectedHeader] : "";
                          const isMapped = Boolean(selectedHeader);
                          const isError = sys.required && !isMapped;

                          return (
                            <tr key={sys.key} className={isError ? "table-danger-subtle" : ""}>
                              <td>
                                <div className="fw-semibold text-dark d-flex align-items-center gap-1">
                                  {sys.label}
                                  {sys.required ? (
                                    <span className="badge bg-danger ms-1" style={{ fontSize: "10px" }}>
                                      Required *
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary-subtle text-secondary ms-1" style={{ fontSize: "10px" }}>
                                      Optional
                                    </span>
                                  )}
                                </div>
                                <div className="text-muted" style={{ fontSize: "11px" }}>
                                  {sys.placeholder}
                                </div>
                              </td>

                              <td>
                                <select
                                  className={`form-select form-select-sm ${
                                    isError ? "border-danger bg-danger-subtle" : isMapped ? "border-success" : ""
                                  }`}
                                  value={selectedHeader}
                                  onChange={(e) => handleMappingChange(sys.key, e.target.value)}
                                >
                                  <option value="">-- Don&apos;t Import / Skip --</option>
                                  {excelHeaders.map((hdr) => (
                                    <option key={hdr} value={hdr}>
                                      Column: &quot;{hdr}&quot;
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td>
                                {isMapped ? (
                                  <div
                                    className="text-truncate px-2 py-1 bg-light rounded border small"
                                    style={{ maxWidth: "220px" }}
                                    title={sampleVal || "(empty in row 1)"}
                                  >
                                    {sampleVal || <span className="text-muted fst-italic">(empty)</span>}
                                  </div>
                                ) : (
                                  <span className="text-muted small fst-italic">— Skipped —</span>
                                )}
                              </td>

                              <td className="text-center">
                                {isMapped ? (
                                  <span className="badge bg-success-subtle text-success border border-success" title="Matched">
                                    <i className="bi bi-check-lg me-1"></i> Matched
                                  </span>
                                ) : sys.required ? (
                                  <span className="badge bg-danger-subtle text-danger border border-danger" title="Required field not mapped">
                                    <i className="bi bi-exclamation-circle me-1"></i> Needed
                                  </span>
                                ) : (
                                  <span className="badge bg-light text-muted border">
                                    Skip
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Default Settings for Vehicle Segment & Priority */}
              <div className="card p-3 bg-light border">
                <h6 className="fw-bold mb-2 small text-dark d-flex align-items-center gap-1">
                  <i className="bi bi-sliders text-primary"></i> Default Settings for Imported Leads
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="small fw-semibold text-dark mb-1">
                      Vehicle Segment <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={defaultValues.vehicle_segment}
                      onChange={(e) =>
                        setDefaultValues((prev) => ({ ...prev, vehicle_segment: e.target.value }))
                      }
                    >
                      <option value="4 Wheeler">4 Wheeler (Car / SUV)</option>
                      <option value="2 Wheeler">2 Wheeler (Bike / Scooter)</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="small fw-semibold text-dark mb-1">
                      Default Priority <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={defaultValues.priority}
                      onChange={(e) =>
                        setDefaultValues((prev) => ({ ...prev, priority: e.target.value }))
                      }
                    >
                      <option value="Hot">🔥 Hot</option>
                      <option value="Warm">☀️ Warm</option>
                      <option value="Cold">❄️ Cold</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: PREVIEW & IMPORT ================= */}
          {currentStep === 3 && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <h6 className="fw-bold mb-0 text-dark">Data Preview Before Importing</h6>
                  <small className="text-muted">
                    Showing first 5 formatted leads out of total <strong>{mappedLeads.length}</strong> records ready to import
                  </small>
                </div>

                <div className="badge bg-success-subtle text-success border border-success p-2">
                  <i className="bi bi-check-circle-fill me-1"></i> {mappedLeads.length} Leads Ready
                </div>
              </div>

              {/* Progress Bar during import */}
              {isProcessing && (
                <div className="card p-3 mb-3 bg-light border border-primary">
                  <div className="d-flex justify-content-between align-items-center mb-1 small fw-bold">
                    <span>
                      <i className="bi bi-arrow-repeat spinner-border spinner-border-sm me-1 text-primary"></i>
                      Importing leads into system database...
                    </span>
                    <span className="text-primary">
                      {progress.current} / {progress.total} ({progress.percent}%)
                    </span>
                  </div>
                  <div className="progress" style={{ height: "8px" }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                      role="progressbar"
                      style={{ width: `${progress.percent}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="table-responsive border rounded-3 mb-3 bg-white">
                <table className="table table-sm table-striped table-hover align-middle mb-0" style={{ fontSize: "12px" }}>
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>City</th>
                      <th>Segment</th>
                      <th>Model / Variant</th>
                      <th>Priority</th>
                      <th>Budget (₹)</th>
                      <th>Assigned To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedLeads.slice(0, 5).map((lead, idx) => (
                      <tr key={idx}>
                        <td className="text-muted">{idx + 1}</td>
                        <td className="fw-bold text-dark">{lead.name || <span className="text-danger fst-italic">(Missing)</span>}</td>
                        <td className="fw-semibold text-primary">{lead.phone || <span className="text-danger fst-italic">(Missing)</span>}</td>
                        <td>
                          {lead.email ? (
                            lead.email
                          ) : lead.raw_email ? (
                            <span className="text-muted small fst-italic" title="Invalid email format will be skipped">
                              (Invalid email skipped)
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{lead.city || "-"}</td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {lead.vehicle_segment}
                          </span>
                        </td>
                        <td>{lead.model_variant || "-"}</td>
                        <td>
                          <span
                            className={`badge ${
                              lead.priority === "Hot"
                                ? "bg-danger"
                                : lead.priority === "Warm"
                                ? "bg-warning text-dark"
                                : "bg-info"
                            }`}
                          >
                            {lead.priority}
                          </span>
                        </td>
                        <td>{lead.budget ? `₹${lead.budget.toLocaleString("en-IN")}` : "-"}</td>
                        <td>{lead.assigned_user_name || <span className="text-muted">Unassigned</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer-custom d-flex justify-content-between align-items-center">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                className="btn btn-outline-custom btn-sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                disabled={isProcessing}
              >
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-custom btn-sm"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancel
            </button>

            {currentStep === 1 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!file || excelHeaders.length === 0 || isProcessing}
                onClick={() => setCurrentStep(2)}
              >
                Continue to Mapping <i className="bi bi-arrow-right ms-1"></i>
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!canProceedToPreview || isProcessing}
                onClick={() => setCurrentStep(3)}
              >
                {!canProceedToPreview ? "Map Name & Phone First" : "Preview & Confirm"} <i className="bi bi-arrow-right ms-1"></i>
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                className="btn btn-success btn-sm px-3"
                disabled={isProcessing || mappedLeads.length === 0}
                onClick={handleFinalSubmit}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Importing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-arrow-up-fill me-1"></i>
                    Import {mappedLeads.length} Leads
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
