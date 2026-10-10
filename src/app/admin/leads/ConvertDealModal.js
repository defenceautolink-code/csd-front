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
        } catch (e) {}
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

    setIsSubmitting(true);

    const payload = {
      lead_id: Number(lead.id),
      quotation_id: formData.quotation_id ? Number(formData.quotation_id) : null,
      total_amount: totalNum,
      discount_amount: discountNum,
      has_insurance: formData.has_insurance === "Yes",
      insurance: formData.has_insurance,
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

    try {
      const res = await dealApi.convertLead(payload, lead);
      showToast(res.message || `Lead "${lead.name}" converted to Deal successfully!`, "success");
      setIsSubmitting(false);
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
                <div className="small text-muted">
                  <i className="bi bi-telephone me-1"></i>
                  {lead.phone} {lead.city ? `• ${lead.city}` : ""}
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
                          className={`p-3 rounded-3 border transition-all h-100 d-flex flex-column justify-content-between position-relative ${
                            isSelected
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
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
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
    </div>
  );
}
