"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dealApi from "@/services/dealApi";
import quotationApi from "@/lib/quotationApi";
import { numberToWords, formatIndianCurrency } from "@/utils/numberToWords";

export default function ConvertDealModal({
  isOpen,
  lead,
  onClose,
  onSuccess,
  showToast,
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadQuotations, setLeadQuotations] = useState([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  const getTodayDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Form State matching API specifications
  const [formData, setFormData] = useState({
    quotation_id: "",
    total_amount: "",
    discount_amount: "0",
    has_insurance: "No", // default "No"
    insurance_amount: "",
    color: "",
    vin_chassis_number: "",
    expected_delivery_date: "",
    initial_payment: {
      amount: "",
      payment_type: "token_advance",
      payment_mode: "upi",
      transaction_reference: "",
      bank_name: "",
      received_by: "",
      notes: "",
    },
  });

  // Insurance Popup State (opens on Confirm & Convert when Yes is selected)
  const [showInsurancePopup, setShowInsurancePopup] = useState(false);

  // Detailed Insurance Policy State (when has_insurance === 'Yes')
  const [insuranceDetails, setInsuranceDetails] = useState({
    insurance_company: "",
    policy_number: "",
    insurance_type: "",
    policy_start_date: "",
    policy_expiry_date: "",
    premium_amount: "",
    reminder_days_before: "",
    reminder_date: "",
    vehicle_number: "",
    notes: "",
  });

  const handleInsuranceChange = (field, value) => {
    setInsuranceDetails((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "policy_start_date" && value) {
        const d = new Date(value);
        d.setDate(d.getDate() + 365);
        const exp = d.toISOString().split("T")[0];
        updated.policy_expiry_date = exp;

        if (updated.reminder_days_before) {
          const remD = new Date(exp);
          remD.setDate(remD.getDate() - Number(updated.reminder_days_before));
          updated.reminder_date = remD.toISOString().split("T")[0];
        }
      } else if (field === "policy_expiry_date" && value) {
        if (updated.reminder_days_before) {
          const remD = new Date(value);
          remD.setDate(remD.getDate() - Number(updated.reminder_days_before));
          updated.reminder_date = remD.toISOString().split("T")[0];
        }
      } else if (field === "reminder_days_before") {
        if (value && updated.policy_expiry_date) {
          const remD = new Date(updated.policy_expiry_date);
          remD.setDate(remD.getDate() - Number(value));
          updated.reminder_date = remD.toISOString().split("T")[0];
        } else if (!value) {
          updated.reminder_date = "";
        }
      }
      return updated;
    });
  };

  // Pre-fill dynamically when lead opens & fetch customer's quotations
  useEffect(() => {
    if (lead && isOpen) {
      // Default delivery date: 15 days from now
      const delivery = new Date();
      delivery.setDate(delivery.getDate() + 15);
      const deliveryStr = delivery.toISOString().split("T")[0];

      const leadBudget = lead.budget || lead.total_deal_amount || "";

      let currentUserName = "";
      if (typeof window !== "undefined") {
        try {
          const userObj = JSON.parse(localStorage.getItem("user") || "{}");
          currentUserName = userObj?.name || "";
        } catch (e) { }
      }

      setFormData({
        quotation_id: lead.quotation_id || "",
        total_amount: leadBudget ? String(leadBudget) : "",
        discount_amount: "0",
        has_insurance: "No",
        color: lead.color || "Standard",
        vin_chassis_number: lead.vin_chassis_number || "",
        expected_delivery_date: deliveryStr,
        initial_payment: {
          amount: "",
          payment_type: "token_advance",
          payment_mode: "upi",
          transaction_reference: "",
          bank_name: "",
          received_by: currentUserName,
          notes: "",
        },
      });

      setInsuranceDetails({
        insurance_company: "",
        policy_number: "",
        insurance_type: "",
        policy_start_date: "",
        policy_expiry_date: "",
        premium_amount: "",
        reminder_days_before: "",
        reminder_date: "",
        vehicle_number: lead.registration_number || lead.vehicle_number || "",
        notes: "",
      });

      // Load all quotations generated for this customer
      const fetchQuotations = async () => {
        setIsLoadingQuotes(true);
        try {
          const res = await quotationApi.getQuotations({ lead_id: lead.id, per_page: 50 });
          let quotesList = [];
          if (res && res.data && Array.isArray(res.data)) {
            quotesList = res.data;
          } else if (Array.isArray(res)) {
            quotesList = res;
          }

          // Filter by lead ID, phone or email
          const matched = quotesList.filter(
            (q) =>
              String(q.lead_id) === String(lead.id) ||
              (lead.phone && (q.customer_phone === lead.phone || q.phone === lead.phone)) ||
              (lead.email && q.customer_email === lead.email)
          );

          const finalQuotes = matched.length > 0 ? matched : quotesList.filter((q) => String(q.lead_id) === String(lead.id));
          setLeadQuotations(finalQuotes);

          // If lead has a specific quotation_id pre-linked, auto-select it
          if (lead.quotation_id) {
            const found = finalQuotes.find((q) => String(q.id) === String(lead.quotation_id));
            if (found) {
              const quoteTotal = Number(found.grand_total || found.total_amount || 0);
              if (quoteTotal > 0 && !leadBudget) {
                setFormData((prev) => ({
                  ...prev,
                  total_amount: String(quoteTotal),
                }));
              }
            }
          }
        } catch (err) {
          console.error("Error loading quotations for convert deal:", err);
          setLeadQuotations([]);
        } finally {
          setIsLoadingQuotes(false);
        }
      };

      fetchQuotations();
    }
  }, [lead, isOpen]);

  const handleSelectQuotation = (quote) => {
    if (!quote) {
      setFormData((prev) => ({
        ...prev,
        quotation_id: "",
        has_insurance: "No",
      }));
      return;
    }

    const quoteTotal = Number(quote.grand_total || quote.total_amount || quote.final_price || 0);

    setFormData((prev) => ({
      ...prev,
      quotation_id: quote.id,
      total_amount: quoteTotal > 0 ? String(quoteTotal) : prev.total_amount,
      has_insurance: "No",
    }));
    showToast(`Selected Quotation #${quote.quotation_number || quote.id}`, "info");
  };

  if (!isOpen || !lead) return null;

  const totalNum = parseFloat(formData.total_amount) || 0;
  const discountNum = parseFloat(formData.discount_amount) || 0;
  const netPayable = Math.max(0, totalNum - discountNum);
  const initialPayNum = parseFloat(formData.initial_payment.amount) || 0;
  const balancePending = Math.max(0, netPayable - initialPayNum);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.total_amount || totalNum <= 0) {
      showToast("Please enter a valid total deal amount.", "error");
      return;
    }

    if (discountNum > totalNum) {
      showToast("Discount amount cannot exceed total deal amount.", "error");
      return;
    }

    if (!formData.color.trim()) {
      showToast("Please specify the vehicle color.", "error");
      return;
    }

    // If Insurance is selected as "Yes", open the Insurance Details popup instead of saving directly!
    if (formData.has_insurance === "Yes") {
      setShowInsurancePopup(true);
      return;
    }

    // If Insurance is "No", proceed to direct deal save
    await executeConvertDeal(false);
  };

  const executeConvertDeal = async (withInsurance = false) => {
    setIsSubmitting(true);

    const payload = {
      lead_id: Number(lead.id),
      quotation_id: formData.quotation_id ? Number(formData.quotation_id) : null,
      total_amount: totalNum,
      discount_amount: discountNum,
      has_insurance: withInsurance,
      insurance: withInsurance ? "Yes" : "No",
      color: formData.color.trim(),
      vin_chassis_number: formData.vin_chassis_number.trim(),
      expected_delivery_date: formData.expected_delivery_date,
      sales_executive_id: lead.assigned_to && Number(lead.assigned_to) !== 5 ? Number(lead.assigned_to) : undefined,
      initial_payment: {
        amount: initialPayNum,
        payment_type: formData.initial_payment.payment_type,
        payment_mode: formData.initial_payment.payment_mode,
        transaction_reference: formData.initial_payment.transaction_reference.trim(),
        bank_name: formData.initial_payment.bank_name.trim(),
        received_by: (formData.initial_payment.received_by || "").trim(),
        notes: formData.initial_payment.notes.trim(),
      },
    };

    // If Insurance is Included, append full insurance policy details
    if (withInsurance) {
      payload.insurance_company = (insuranceDetails.insurance_company || "").trim();
      payload.policy_number = (insuranceDetails.policy_number || "").trim();
      payload.insurance_type = insuranceDetails.insurance_type ? insuranceDetails.insurance_type.trim() : null;
      payload.policy_start_date = insuranceDetails.policy_start_date || null;
      payload.policy_expiry_date = insuranceDetails.policy_expiry_date || null;
      payload.premium_amount = Number(insuranceDetails.premium_amount || 0);
      payload.insurance_premium = Number(insuranceDetails.premium_amount || 0);
      payload.insurance_amount = Number(insuranceDetails.premium_amount || 0);
      payload.reminder_days_before = insuranceDetails.reminder_days_before ? Number(insuranceDetails.reminder_days_before) : null;
      payload.reminder_date = insuranceDetails.reminder_date || null;
      payload.vehicle_number = (insuranceDetails.vehicle_number || "").trim();
      payload.registration_number = (insuranceDetails.vehicle_number || "").trim();
      payload.insurance_notes = (insuranceDetails.notes || "").trim();
    }

    try {
      const res = await dealApi.convertLead(payload, lead);
      showToast(res.message || `Lead "${lead.name}" converted to Deal successfully!`, "success");
      setIsSubmitting(false);
      setShowInsurancePopup(false);
      onSuccess(lead.id);
      onClose();

      // Offer immediate redirect to Deals
      setTimeout(() => {
        router.push("/admin/deals");
      }, 500);
    } catch (err) {
      console.error("Convert Deal Error:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to convert lead to deal.";
      showToast(errorMsg, "error");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose} style={{ zIndex: 1060 }}>
      <div
        className="modal-dialog-custom"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "780px" }}
      >
        <div className="modal-header-custom d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #15803D, #166534)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              <i className="bi bi-trophy-fill"></i>
            </div>
            <div>
              <h5 className="modal-title-custom text-white mb-0 fw-bold">
                Convert Lead to Deal
              </h5>
              <span className="small text-light opacity-75">
                Lock vehicle booking, generate deal contract & record advance token
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onClose}
            aria-label="Close"
          ></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body-custom py-3" style={{ maxHeight: "78vh", overflowY: "auto" }}>
            {/* Customer & Vehicle Header Banner */}
            <div className="p-3 mb-3 bg-light rounded border d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Customer Prospect</span>
                <h6 className="mb-0 text-dark fw-bold">{lead.name}</h6>
                <div className="small text-muted d-flex flex-wrap align-items-center gap-2 mt-0.5">
                  <span>
                    <i className="bi bi-telephone me-1"></i>
                    {lead.phone}
                  </span>
                  {(lead.city || lead.home_town) && (
                    <span>
                      <i className="bi bi-house-door me-1 text-primary"></i>
                      {lead.city || lead.home_town}
                    </span>
                  )}
                  {lead.posting && (
                    <span className="badge bg-light text-dark border extra-small">
                      <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                      {lead.posting}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-end">
                <span className="text-muted small fw-semibold text-uppercase">Vehicle Model</span>
                <div className="fw-bold text-primary">{lead.model_variant}</div>
                <span className="badge bg-secondary-subtle text-dark border">
                  {lead.brand?.name || lead.brand_name || lead.vehicle_segment}
                </span>
              </div>
            </div>

            {/* QUOTATION SELECTION CARDS  */}
            {isLoadingQuotes ? (
              <div className="p-3 mb-3 bg-white rounded border text-center small text-muted">
                <div className="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>
                Checking generated quotations for {lead.name}...
              </div>
            ) : leadQuotations.length > 0 ? (
              <div className="mb-4 p-3 rounded border bg-light-subtle shadow-sm">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div>
                    <label className="form-label text-dark fw-bold small mb-0 d-flex align-items-center gap-1.5">
                      <i className="bi bi-file-earmark-spreadsheet-fill text-primary"></i>
                      <span>Select Quotation to Link with Deal ({leadQuotations.length} available)</span>
                    </label>
                    <span className="text-muted d-block" style={{ fontSize: "11px" }}>
                      Choose which car quotation this customer is finalizing for booking:
                    </span>
                  </div>
                  {formData.quotation_id && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-0 px-2 fw-semibold"
                      style={{ fontSize: "11px" }}
                      onClick={() => handleSelectQuotation(null)}
                    >
                      <i className="bi bi-x me-1"></i>Clear
                    </button>
                  )}
                </div>

                <div className="row g-2">
                  {leadQuotations.map((quote) => {
                    const isSelected = String(formData.quotation_id) === String(quote.id);
                    const quotePrice = Number(quote.grand_total || quote.total_amount || quote.final_price || 0);

                    return (
                      <div className="col-12 col-md-6" key={quote.id}>
                        <div
                          className={`p-3 rounded-3 border transition-all h-100 d-flex flex-column justify-content-between position-relative ${isSelected
                              ? "border-primary bg-primary bg-opacity-10 shadow-sm"
                              : "border-secondary border-opacity-25 bg-white hover-shadow"
                            }`}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSelectQuotation(quote)}
                        >
                          <div>
                            <div className="d-flex align-items-start justify-content-between mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <input
                                  type="radio"
                                  className="form-check-input mt-0"
                                  name="quotationRadioSelect"
                                  checked={isSelected}
                                  onChange={() => handleSelectQuotation(quote)}
                                />
                                <span className="fw-bold font-monospace small text-primary">
                                  {quote.quotation_number || `QTN-${quote.id}`}
                                </span>
                              </div>
                              {isSelected ? (
                                <span className="badge bg-primary text-white" style={{ fontSize: "10px" }}>
                                  SELECTED
                                </span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-muted" style={{ fontSize: "10px" }}>
                                  {quote.status || "Quotation"}
                                </span>
                              )}
                            </div>

                            <div
                              className="text-dark small fw-bold mb-2"
                              style={{
                                lineHeight: "1.4",
                                wordBreak: "break-word",
                                whiteSpace: "normal",
                              }}
                              title={quote.subject || quote.model_name || "Vehicle Quotation"}
                            >
                              <i className="bi bi-car-front text-secondary me-1"></i>
                              {quote.subject || quote.model_name || "Vehicle Quotation"}
                            </div>
                          </div>

                          <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top border-secondary border-opacity-10">
                            <span className="text-muted" style={{ fontSize: "11px" }}>
                              <i className="bi bi-calendar3 me-1"></i>
                              {quote.quotation_date || "Date"}
                            </span>
                            <span className="fw-bold text-success fs-6">
                              ₹{Number(quotePrice).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* SECTION 1: Deal Financials */}
            <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2 border-bottom pb-1">
              <i className="bi bi-currency-rupee text-success"></i> 1. Deal Pricing & Discount
            </h6>

            <div className="row g-3 mb-3">
              {/* Total Amount */}
              <div className="col-md-6">
                <label className="form-label text-dark fw-bold small mb-1">
                  Total Deal Amount (₹) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light fw-bold">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="form-control fw-bold"
                    placeholder="e.g. 1450000"
                    required
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  />
                </div>
                {/* Formatted Number & In-Words Display */}
                {totalNum > 0 && (
                  <div className="mt-1 p-2 bg-light-subtle border rounded small">
                    <div className="text-dark fw-bold">
                      Formatted: ₹{formatIndianCurrency(totalNum)}
                    </div>
                    <div className="text-success fw-semibold fst-italic" style={{ fontSize: "11px" }}>
                      ✍️ In Words: {numberToWords(totalNum)}
                    </div>
                  </div>
                )}
              </div>

              {/* Discount Amount */}
              <div className="col-md-6">
                <label className="form-label text-dark fw-bold small mb-1">
                  Discount Amount (₹)
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light fw-bold">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-control"
                    placeholder="e.g. 25000"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                  />
                </div>
                {/* Formatted Discount & In-Words */}
                {discountNum > 0 && (
                  <div className="mt-1 p-2 bg-light-subtle border rounded small">
                    <div className="text-dark fw-bold">
                      Formatted: ₹{formatIndianCurrency(discountNum)}
                    </div>
                    <div className="text-muted fw-semibold fst-italic" style={{ fontSize: "11px" }}>
                      ✍️ In Words: {numberToWords(discountNum)}
                    </div>
                  </div>
                )}
              </div>

              {/* Insurance Included (Yes / No - Default: No) */}
              <div className="col-md-6">
                <label className="form-label text-dark fw-bold small mb-1 d-flex justify-content-between align-items-center">
                  <span>
                    <i className="bi bi-shield-check text-primary me-1"></i>
                    Insurance Included?
                  </span>
                  <span className="badge bg-secondary-subtle text-muted" style={{ fontSize: "10px" }}>Default: No</span>
                </label>
                <div
                  className="d-flex align-items-center gap-3 p-2 rounded border bg-light"
                  style={{ height: "38px" }}
                >
                  <div className="form-check mb-0">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="dealInsuranceToggle"
                      id="insRadioNo"
                      value="No"
                      checked={formData.has_insurance === "No"}
                      onChange={() => setFormData({ ...formData, has_insurance: "No" })}
                    />
                    <label className="form-check-label small fw-semibold text-dark" htmlFor="insRadioNo" style={{ cursor: "pointer" }}>
                      No
                    </label>
                  </div>
                  <div className="form-check mb-0">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="dealInsuranceToggle"
                      id="insRadioYes"
                      value="Yes"
                      checked={formData.has_insurance === "Yes"}
                      onChange={() => setFormData({ ...formData, has_insurance: "Yes" })}
                    />
                    <label className="form-check-label small fw-bold text-success" htmlFor="insRadioYes" style={{ cursor: "pointer" }}>
                      Yes
                    </label>
                  </div>
                </div>

                
              </div>
            </div>

            {/* SECTION 2: Vehicle Delivery & Registration Info */}
            <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2 border-bottom pb-1">
              <i className="bi bi-car-front-fill text-primary"></i> 2. Vehicle Specification & Delivery
            </h6>

            <div className="row g-3 mb-3">
              {/* Color */}
              <div className="col-md-6">
                <label className="form-label text-dark fw-bold small mb-1">
                  Vehicle Color <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Pearl Metallic White"
                  required
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>

              {/* Expected Delivery Date */}
              <div className="col-md-6">
                <label className="form-label text-dark fw-bold small mb-1">
                  Expected Delivery Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  required
                  min={getTodayDate()}
                  onClick={(e) => {
                    try {
                      e.target.showPicker?.();
                    } catch (err) {}
                  }}
                  value={formData.expected_delivery_date}
                  onChange={(e) => {
                    const val = e.target.value;
                    const today = getTodayDate();
                    if (val && val < today) {
                      setFormData({ ...formData, expected_delivery_date: today });
                      return;
                    }
                    setFormData({ ...formData, expected_delivery_date: val });
                  }}
                />
              </div>
            </div>

            {/* SECTION 3: Initial Payment Details  */}
            <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2 border-bottom pb-1">
              <i className="bi bi-wallet2 text-warning"></i> 3. Initial Payment (Token Advance)
            </h6>

            <div className="p-3 bg-light rounded border mb-2">
              <div className="row g-3">
                {/* Advance Amount */}
                <div className="col-md-6">
                  <label className="form-label text-dark fw-bold small mb-1">
                    Advance Amount (₹) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white fw-bold">₹</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="form-control fw-bold"
                      placeholder="e.g. 51000"
                      required
                      value={formData.initial_payment.amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          initial_payment: {
                            ...formData.initial_payment,
                            amount: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  {/* Formatted Advance & In-Words */}
                  {initialPayNum > 0 && (
                    <div className="mt-1 p-2 bg-white border rounded small">
                      <div className="text-dark fw-bold">
                        Formatted: ₹{formatIndianCurrency(initialPayNum)}
                      </div>
                      <div className="text-success fw-semibold fst-italic" style={{ fontSize: "11px" }}>
                        ✍️ In Words: {numberToWords(initialPayNum)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Type */}
                <div className="col-md-3">
                  <label className="form-label text-dark fw-bold small mb-1">
                    Payment Type
                  </label>
                  <select
                    className="form-select"
                    value={formData.initial_payment.payment_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        initial_payment: {
                          ...formData.initial_payment,
                          payment_type: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="token_advance">Token Advance</option>
                    <option value="down_payment">Down Payment</option>
                    <option value="part_payment">Part Payment</option>
                  </select>
                </div>

                {/* Payment Mode */}
                <div className="col-md-3">
                  <label className="form-label text-dark fw-bold small mb-1">
                    Payment Mode
                  </label>
                  <select
                    className="form-select"
                    value={formData.initial_payment.payment_mode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        initial_payment: {
                          ...formData.initial_payment,
                          payment_mode: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="upi">UPI / QR Code</option>
                    <option value="neft_rtgs">NEFT / RTGS</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque / DD</option>
                  </select>
                </div>

                {/* Conditional Fields: If Cash, hide Transaction Reference, Bank Name and Notes */}
                {formData.initial_payment.payment_mode === "cash" ? (
                  <div className="col-12">
                    {/* <div className="p-2 px-3 bg-white border border-success-subtle rounded d-flex align-items-center gap-2 text-success small">
                      <i className="bi bi-cash-stack fs-5 text-success"></i>
                      <div>
                        <strong>Cash Payment Mode:</strong> Transaction Reference, Bank Name aur Remarks cash ke liye required nahi hain. Cash counter par direct collect kiya jayega.
                      </div>
                    </div> */}
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
                        value={formData.initial_payment.transaction_reference}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initial_payment: {
                              ...formData.initial_payment,
                              transaction_reference: e.target.value,
                            },
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
                        value={formData.initial_payment.bank_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initial_payment: {
                              ...formData.initial_payment,
                              bank_name: e.target.value,
                            },
                          })
                        }
                      />
                    </div>

                    {/* Received By (Person Name) */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Received By (Person Name)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Cashier / Executive Name"
                        value={formData.initial_payment.received_by}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initial_payment: {
                              ...formData.initial_payment,
                              received_by: e.target.value,
                            },
                          })
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
                        placeholder="e.g. Booking token advance received"
                        value={formData.initial_payment.notes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initial_payment: {
                              ...formData.initial_payment,
                              notes: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Remaining Balance Summary */}
            <div className="p-2 px-3 bg-light-subtle border rounded d-flex justify-content-between align-items-center">
              <span className="small text-muted">
                Initial Paid: <strong>₹{formatIndianCurrency(initialPayNum)}</strong>
              </span>
              <span className="small text-danger fw-bold">
                Remaining Balance Pending: ₹{formatIndianCurrency(balancePending)}
              </span>
            </div>
          </div>

          <div className="modal-footer-custom d-flex justify-content-between align-items-center pt-3">
            <span className="small text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Lead will move to Deals Pipeline automatically.
            </span>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-custom"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success d-inline-flex align-items-center gap-2 px-3"
                disabled={isSubmitting}
              >
                <i className="bi bi-check-circle-fill"></i>
                <span>{isSubmitting ? "Converting..." : "Confirm & Convert Deal"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ===================================================================
          SEPARATE INSURANCE POLICY DETAILS POPUP MODAL
          Opens on "Confirm & Convert Deal" click when Insurance is "Yes"
          =================================================================== */}
      {showInsurancePopup && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)", zIndex: 1075 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header bg-success text-white py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      backgroundColor: "rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i className="bi bi-shield-fill-check fs-5"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold fs-6 mb-0">
                      Insurance Policy Information
                    </h5>
                    
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  disabled={isSubmitting}
                  onClick={() => setShowInsurancePopup(false)}
                ></button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeConvertDeal(true);
                }}
              >
                <div className="modal-body p-4" style={{ maxHeight: "72vh", overflowY: "auto" }}>
                  {/* Summary context */}
                  <div className="p-3 bg-light rounded-3 mb-3 border d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <span className="text-muted small">Customer Name:</span>
                      <strong className="text-dark ms-2">{lead.name}</strong>
                      <span className="text-muted small ms-3">Phone:</span>
                      <span className="fw-semibold text-dark ms-1">{lead.phone}</span>
                    </div>
                    <div>
                      <span className="text-muted small">Vehicle:</span>
                      <span className="fw-bold text-primary ms-2">{lead.model_variant}</span>
                      <span className="badge bg-white text-dark border ms-2">{formData.color}</span>
                    </div>
                  </div>

                  <div className="row g-3">
                    {/* Insurance Company */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Insurance Company <span className="text-muted fw-normal" style={{ fontSize: "11px" }}>(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. HDFC ERGO, ICICI Lombard, Tata AIG (optional)"
                        list="modalInsuranceCompanyList"
                        value={insuranceDetails.insurance_company}
                        onChange={(e) => handleInsuranceChange("insurance_company", e.target.value)}
                      />
                      <datalist id="modalInsuranceCompanyList">
                        <option value="HDFC ERGO General Insurance" />
                        <option value="ICICI Lombard General Insurance" />
                        <option value="Tata AIG General Insurance" />
                        <option value="Bajaj Allianz General Insurance" />
                        <option value="New India Assurance" />
                        <option value="Reliance General Insurance" />
                        <option value="National Insurance Company" />
                        <option value="SBI General Insurance" />
                        <option value="Go Digit General Insurance" />
                      </datalist>
                    </div>

                    {/* Policy Number */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Policy Number <span className="text-muted fw-normal" style={{ fontSize: "11px" }}>(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. POL-2026-987654 (optional)"
                        value={insuranceDetails.policy_number}
                        onChange={(e) => handleInsuranceChange("policy_number", e.target.value)}
                      />
                    </div>

                    {/* Insurance Type */}
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Insurance Type <span className="text-muted fw-normal" style={{ fontSize: "11px" }}>(Optional)</span>
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={insuranceDetails.insurance_type}
                        onChange={(e) => handleInsuranceChange("insurance_type", e.target.value)}
                      >
                        <option value="">-- Select Insurance Type (Optional) --</option>
                        <option value="Comprehensive">Comprehensive (1+3 Years)</option>
                        <option value="Third Party">Third Party</option>
                        <option value="Own Damage">Own Damage (OD)</option>
                        <option value="Zero Depreciation">Zero Depreciation (Bumper to Bumper)</option>
                      </select>
                    </div>

                    {/* Premium Amount */}
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Premium Amount (₹) <span className="text-muted fw-normal" style={{ fontSize: "11px" }}>(Optional)</span>
                      </label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-light">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="form-control form-control-sm"
                          placeholder="e.g. 24500 (optional)"
                          value={insuranceDetails.premium_amount}
                          onChange={(e) => handleInsuranceChange("premium_amount", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Vehicle Number (Optional / Nullable) */}
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small mb-1 d-flex justify-content-between align-items-center">
                        <span>Vehicle Number</span>
                        <span className="text-muted extra-small" style={{ fontSize: "10px" }}>(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. GJ-01-AB-1234 (optional)"
                        value={insuranceDetails.vehicle_number}
                        onChange={(e) => handleInsuranceChange("vehicle_number", e.target.value.toUpperCase())}
                      />
                    </div>

                    {/* Policy Start Date */}
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Policy Start Date <span className="text-muted fw-normal" style={{ fontSize: "11px" }}>(Optional)</span>
                      </label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        min={getTodayDate()}
                        onClick={(e) => {
                          try {
                            e.target.showPicker?.();
                          } catch (err) {}
                        }}
                        value={insuranceDetails.policy_start_date}
                        onChange={(e) => {
                          const val = e.target.value;
                          const today = getTodayDate();
                          if (val && val < today) {
                            handleInsuranceChange("policy_start_date", today);
                            return;
                          }
                          handleInsuranceChange("policy_start_date", val);
                        }}
                      />
                    </div>

                    {/* Policy Expiry Date */}
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Policy Expiry Date (1 Year) <span className="text-muted fw-normal" style={{ fontSize: "11px" }}>(Optional)</span>
                      </label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        min={insuranceDetails.policy_start_date || getTodayDate()}
                        onClick={(e) => {
                          try {
                            e.target.showPicker?.();
                          } catch (err) {}
                        }}
                        value={insuranceDetails.policy_expiry_date}
                        onChange={(e) => {
                          const val = e.target.value;
                          const minD = insuranceDetails.policy_start_date || getTodayDate();
                          if (val && val < minD) {
                            handleInsuranceChange("policy_expiry_date", minD);
                            return;
                          }
                          handleInsuranceChange("policy_expiry_date", val);
                        }}
                      />
                    </div>

                    {/* Reminder Days Before */}
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Reminder Days Before <span className="text-muted fw-normal" style={{ fontSize: "11px" }}>(Optional)</span>
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={insuranceDetails.reminder_days_before}
                        onChange={(e) => handleInsuranceChange("reminder_days_before", e.target.value)}
                      >
                        <option value="">-- Select Reminder Interval (Optional) --</option>
                        <option value="15">15 Days Before Expiry</option>
                        <option value="30">30 Days Before Expiry</option>
                        <option value="45">45 Days Before Expiry</option>
                        <option value="60">60 Days Before Expiry</option>
                      </select>
                    </div>

                    {/* Calculated Reminder Date Preview */}
                    <div className="col-md-6">
                      <div className="p-2 rounded bg-light border d-flex align-items-center gap-2">
                        <i className="bi bi-bell-fill text-warning fs-5"></i>
                        <div>
                          <div className="small text-muted" style={{ fontSize: "11px" }}>First Renewal Reminder Date:</div>
                          <div className="fw-bold text-dark small">
                            {insuranceDetails.reminder_date || "Auto calculated from expiry date (optional)"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Insurance Notes <span className="text-muted fw-normal" style={{ fontSize: "11px" }}>(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Insurance notes or IDV details (optional)..."
                        value={insuranceDetails.notes}
                        onChange={(e) => handleInsuranceChange("notes", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2 px-4 border-top d-flex justify-content-between align-items-center">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={isSubmitting}
                    onClick={() => setShowInsurancePopup(false)}
                  >
                    <i className="bi bi-arrow-left me-1"></i> Back to Deal Form
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm d-inline-flex align-items-center gap-2 fw-semibold px-3"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Saving Both...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle-fill"></i>
                        Save Deal & Insurance Together
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
