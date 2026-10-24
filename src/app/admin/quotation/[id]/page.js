"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import AdminLayout from "@/app/components/AdminLayout";
import { quotationApi } from "@/lib/quotationApi";
import api from "@/lib/axios";
import { useToast } from "@/app/components/Toast";

export default function QuotationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const quotationId = params.id;

  const baseQuotationPath = pathname?.startsWith("/sales-manager")
    ? "/sales-manager/quotation"
    : pathname?.startsWith("/receptionist")
      ? "/receptionist/quotation"
      : pathname?.startsWith("/sales-executive")
        ? "/sales-executive/quotation"
        : "/admin/quotation";

  const homePath = pathname?.startsWith("/sales-manager")
    ? "/sales-manager/dashboard"
    : pathname?.startsWith("/receptionist")
      ? "/receptionist/dashboard"
      : pathname?.startsWith("/sales-executive")
        ? "/sales-executive/dashboard"
        : "/admin/dashboard";

  const [quotation, setQuotation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Send Email Modal State
  const [showSendModal, setShowSendModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Fetch Quotation Data
  const fetchQuotation = async () => {
    setIsLoading(true);
    try {
      const res = await quotationApi.getQuotation(quotationId);
      if (res && res.status && res.data) {
        setQuotation(res.data);
        setRecipientEmail(res.data.customer_email || "");
        setCustomSubject(`Quotation ${res.data.quotation_number} – ${res.data.subject}`);
      }
    } catch (error) {
      console.error("Fetch quotation error:", error);
      showToast(error.response?.data?.message || "Failed to load quotation details.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (quotationId) {
      fetchQuotation();
    }
  }, [quotationId]);

  // Print Handler: Updates status to 'print' on backend and prints
  const handlePrint = async () => {
    if (!quotation) return;

    try {
      await quotationApi.updateStatus(quotation.id, "print");
      setQuotation((prev) => ({ ...prev, status: "print" }));
      showToast("Quotation marked as Printed.", "info");
    } catch (err) {
      console.error("Status update error on print:", err);
    }

    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Send Email Handler: Updates status to 'sent'
  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      showToast("Please enter a valid recipient email address.", "warning");
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await quotationApi.sendQuotationEmail(quotation.id, {
        recipient_email: recipientEmail.trim(),
        custom_subject: customSubject.trim() || undefined,
        custom_message: customMessage.trim() || undefined,
      });

      if (res && res.status) {
        showToast(res.message || "Quotation emailed successfully with attached PDF!", "success");
        setShowSendModal(false);
        setQuotation((prev) => ({ ...prev, status: "sent" }));

        // Auto log follow-up in lead history table
        if (quotation.lead_id) {
          try {
            await api.post(`/leads/${quotation.lead_id}/follow-ups`, {
              type: "Quotation Sent",
              outcome: "Sent",
              status: "Sent",
              notes: `Official Quotation #${quotation.quotation_number} emailed to customer (${recipientEmail.trim()}). Total Amount: ₹${Number(quotation.grand_total || 0).toLocaleString("en-IN")}`,
              follow_up_date: new Date().toISOString().split("T")[0],
              follow_up_time: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              quotation_id: quotation.id,
            });
          } catch (fuErr) {
            console.log("Follow-up auto log note:", fuErr);
          }
        }

        fetchQuotation();
      }
    } catch (error) {
      console.error("Send email error:", error);
      showToast(error.response?.data?.message || "Failed to send quotation email.", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this quotation?")) return;
    try {
      const res = await api.delete(`/quotations/${params.id}`);
      if (res.data?.status) {
        showToast("Quotation deleted successfully!", "success");
        router.push(baseQuotationPath);
      } else {
        showToast(res.data?.message || "Failed to delete quotation.", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showToast("An error occurred while deleting quotation.", "error");
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    const s = (status || "pending").toLowerCase();
    switch (s) {
      case "sent":
      case "send":
        return (
          <span className="badge bg-info text-dark fs-6 px-3 py-1">
            <i className="bi bi-send-check-fill me-1"></i>Sent
          </span>
        );
      case "print":
      case "printed":
        return (
          <span className="badge text-white fs-6 px-3 py-1" style={{ backgroundColor: "#6366f1" }}>
            <i className="bi bi-printer-fill me-1"></i>Print
          </span>
        );
      case "accepted":
        return (
          <span className="badge bg-success fs-6 px-3 py-1">
            <i className="bi bi-check-circle-fill me-1"></i>Accepted
          </span>
        );
      case "rejected":
        return (
          <span className="badge bg-danger fs-6 px-3 py-1">
            <i className="bi bi-x-circle-fill me-1"></i>Rejected
          </span>
        );
      case "expired":
        return <span className="badge bg-secondary fs-6 px-3 py-1">Expired</span>;
      case "pending":
      case "draft":
      default:
        return (
          <span className="badge bg-warning text-dark fs-6 px-3 py-1">
            <i className="bi bi-clock-history me-1"></i>Pending
          </span>
        );
    }
  };

  // Format date helper: returns "DD.MM.YY"
  const formatDisplayDate = (d) => {
    if (!d) return "";
    try {
      const dateStr = String(d).split("T")[0];
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parts[0].slice(-2);
        const month = parts[1];
        const day = parts[2];
        return `${day}.${month}.${year}`;
      }
    } catch (e) {}
    return String(d);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="page-body text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading Quotation sheet...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!quotation) {
    return (
      <AdminLayout>
        <div className="page-body">
          <div className="card shadow-sm p-5 text-center my-4">
            <h4 className="text-dark fw-bold">Quotation Not Found</h4>
            <p className="text-secondary small mb-3">
              The requested quotation does not exist or you don't have permission to access it.
            </p>
            <div>
              <Link href={baseQuotationPath} className="btn btn-primary btn-sm px-4">
                <i className="bi bi-arrow-left me-1"></i> Back to Quotations
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ----------------------------------------------------
  // EXTRACT DEALERSHIP PARAMETERS FROM QUOTATION & ITEMS
  // ----------------------------------------------------
  const firstItem = quotation.items?.[0] || {};

  // 1. CAR and MODEL
  let carName = "";
  let modelSpec = "";
  if (firstItem.item_name && firstItem.item_name.includes("–")) {
    const parts = firstItem.item_name.split("–");
    carName = parts[0]?.trim() || "";
    modelSpec = parts[1]?.trim() || "";
  } else if (firstItem.item_name && firstItem.item_name.includes("-")) {
    const parts = firstItem.item_name.split("-");
    carName = parts[0]?.trim() || "";
    modelSpec = parts[1]?.trim() || "";
  } else if (quotation.subject) {
    const cleanSubj = quotation.subject.replace(/^Official Vehicle Quotation\s*[–-]?\s*/i, "").trim();
    const parenMatch = cleanSubj.match(/^(.*?)\s*\((.*?)\)$/);
    if (parenMatch) {
      carName = parenMatch[1]?.trim() || "";
      modelSpec = parenMatch[2]?.trim() || "";
    } else {
      carName = cleanSubj;
      modelSpec = "STANDARD";
    }
  }

  // 2. FUEL / VARIANT
  let variantFuel = "PETROL";
  if (firstItem.description && firstItem.description.includes("Fuel / Variant Type:")) {
    variantFuel = firstItem.description.replace(/.*Fuel \/ Variant Type:\s*/i, "").trim() || "PETROL";
  }

  // 3. PARAMETER VALUES
  const csdPrice = firstItem.unit_price && Number(firstItem.unit_price) > 0 ? Number(firstItem.unit_price).toLocaleString("en-IN") : "";
  const msReward = firstItem.discount && Number(firstItem.discount) > 0 ? Number(firstItem.discount).toLocaleString("en-IN") : "N.A";

  const getItemVal = (pattern) => {
    const it = quotation.items?.find((item) =>
      item.item_name && item.item_name.toLowerCase().includes(pattern.toLowerCase())
    );
    if (!it || !it.unit_price || Number(it.unit_price) === 0) return "N.A";
    return Number(it.unit_price).toLocaleString("en-IN");
  };

  const gjRto = getItemVal("Gujarat State RTO") !== "N.A" ? getItemVal("Gujarat State RTO") : getItemVal("GJ RTO");
  const bhRto = getItemVal("BH Series") !== "N.A" ? getItemVal("BH Series") : getItemVal("BH RTO");
  const crtm = getItemVal("CRTM");
  const insurance = getItemVal("Insurance");
  const accessories = getItemVal("Accessories");
  const warranty = getItemVal("Warranty");
  const diffAmtCash = getItemVal("Difference") !== "N.A" ? getItemVal("Difference") : getItemVal("Cash Adjustment");

  const displayDate = formatDisplayDate(quotation.quotation_date);
  const clientName = quotation.customer_name || "";
  const grandTotal = Number(quotation.grand_total || 0);

  // Executive info
  const executiveName = quotation.creator?.name || "Admin User";
  const executivePhone = quotation.creator?.phone || "98000 11111";

  return (
    <AdminLayout>
      {/* =========================================================================
          PRINT-ONLY STYLESHEET: Clean Single-Page A4 Dealership Grid Sheet
          ========================================================================= */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
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
          .modal,
          .modal-backdrop-custom {
            display: none !important;
          }
          .app-main-content,
          .page-body,
          .container-fluid,
          .row {
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
        {/* Navigation Breadcrumbs & Header Actions */}
        <div className="page-header-wrapper mb-4 no-print">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href={homePath}>Home</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href={baseQuotationPath}>Quotations</Link>
              </li>
              <li className="breadcrumb-item active">{quotation.quotation_number}</li>
            </ul>
            <div className="d-flex align-items-center gap-3 mt-1 flex-wrap">
              <h1 className="page-title mb-0">{quotation.quotation_number}</h1>
              {getStatusBadge(quotation.status)}
            </div>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2 flex-wrap">
            <Link href={baseQuotationPath} className="btn btn-outline-custom">
              <i className="bi bi-arrow-left me-1"></i>
              <span>All Quotes</span>
            </Link>

            <button type="button" className="btn btn-outline-custom" onClick={handlePrint}>
              <i className="bi bi-printer-fill me-1"></i>
              <span>Print</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-danger d-flex align-items-center gap-1"
              onClick={handleDelete}
              title="Delete Quotation"
            >
              <i className="bi bi-trash3-fill"></i>
              <span>Delete</span>
            </button>

            <button
              type="button"
              className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
              onClick={() => setShowSendModal(true)}
            >
              <i className="bi bi-send-fill"></i>
              <span>Send Quotation Email</span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            OFFICIAL DEALERSHIP QUOTATION GRID SHEET (EXACT SS 2 MATCH)
            =================================================================== */}
        <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: "850px" }}>
          <div
            className="card-body p-4 bg-white text-dark rounded-3"
            id="printableQuoteCard"
            style={{ minHeight: "680px" }}
          >
            {/* Header: DA Logo + Red DEFENCE AUTOLINK + Grey Address Box */}
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

            {/* Date, QUOTATION Center Badge & Client Name */}
            <div className="d-flex align-items-center justify-content-between mb-3 mt-4">
              <div className="fw-bold" style={{ fontSize: "0.92rem", color: "#0f172a" }}>
                DATE : {displayDate}
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
                {clientName ? (
                  <>
                    CLIENT: <span className="text-primary text-uppercase">{clientName.toUpperCase()}</span>
                  </>
                ) : (
                  <span style={{ display: "inline-block", minWidth: "10px" }}></span>
                )}
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
                        width: "55%",
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
                        width: "45%",
                        border: "1px solid #334155",
                        padding: "10px 12px",
                        textAlign: "center",
                        fontWeight: "800",
                        textTransform: "uppercase",
                      }}
                    >
                      MODEL: {modelSpec}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* CSD PRICE */}
                  <tr>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>CSD PRICE</td>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center", fontWeight: "700" }}>
                      {csdPrice}
                    </td>
                  </tr>

                  {/* GJ RTO */}
                  <tr>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>GJ RTO</td>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                      {gjRto}
                    </td>
                  </tr>

                  {/* BH RTO * APPOROX */}
                  <tr>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>BH RTO * APPOROX</td>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                      {bhRto}
                    </td>
                  </tr>

                  {/* CRTM */}
                  <tr>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>CRTM</td>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                      {crtm}
                    </td>
                  </tr>

                  {/* INSURANCE */}
                  <tr>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>INSURANCE</td>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                      {insurance}
                    </td>
                  </tr>

                  {/* ACCESSORIES */}
                  <tr>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>ACCESSORIES</td>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center", fontWeight: "700" }}>
                      {accessories}
                    </td>
                  </tr>

                  {/* WARRANTY */}
                  <tr>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>WARRANTY</td>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                      {warranty}
                    </td>
                  </tr>

                  {/* M.S REWORD */}
                  <tr>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>M.S REWORD</td>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                      {msReward}
                    </td>
                  </tr>

                  {/* DIFFERENCE AMT CASH */}
                  <tr>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px" }}>DIFFERENCE AMT CASH</td>
                    <td style={{ border: "1px solid #334155", padding: "8px 12px", textAlign: "center" }}>
                      {diffAmtCash}
                    </td>
                  </tr>

                  {/* NET ON-ROAD ESTIMATE */}
                  <tr style={{ background: "#fef3c7" }}>
                    <td style={{ border: "1px solid #334155", padding: "10px 12px", fontWeight: "800", color: "#92400e" }}>
                      ESTIMATED ON-ROAD PRICE
                    </td>
                    <td style={{ border: "1px solid #334155", padding: "10px 12px", textAlign: "center", fontWeight: "800", color: "#b91c1c", fontSize: "1.05rem" }}>
                      ₹ {grandTotal.toLocaleString("en-IN")}/-
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

        {/* ===================================================================
            SEND QUOTATION EMAIL MODAL
            =================================================================== */}
        {showSendModal && (
          <div className="modal-backdrop-custom">
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "550px" }}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-white d-flex align-items-center gap-2 mb-0" style={{ color: "#FFFFFF" }}>
                  <i className="bi bi-send-fill text-warning"></i>
                  <span style={{ color: "#FFFFFF" }}>Send Quotation to Customer</span>
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => !isSendingEmail && setShowSendModal(false)}
                  disabled={isSendingEmail}
                ></button>
              </div>

              <form onSubmit={handleSendEmailSubmit}>
                <div className="modal-body-custom">
                  <div className="p-3 mb-3 rounded dark-selection-box border border-secondary border-opacity-25" style={{ background: "#181A1B", color: "#FFFFFF" }}>
                    <div className="d-flex justify-content-between small mb-1">
                      <span style={{ color: "#CBD5E1" }}>Quotation Number:</span>
                      <strong style={{ color: "#60A5FA" }}>{quotation.quotation_number}</strong>
                    </div>
                    <div className="d-flex justify-content-between small mb-1">
                      <span style={{ color: "#CBD5E1" }}>Customer:</span>
                      <strong style={{ color: "#FFFFFF" }}>{quotation.customer_name}</strong>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span style={{ color: "#CBD5E1" }}>Grand Total:</span>
                      <strong style={{ color: "#4ADE80" }}>₹{Number(quotation.grand_total || 0).toLocaleString("en-IN")}</strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-dark small fw-semibold">
                      Recipient Customer Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="customer@example.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      required
                    />
                    <div className="form-text text-secondary" style={{ fontSize: "0.75rem" }}>
                      An official quotation PDF will be attached to this email.
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-dark small fw-semibold">Email Subject</label>
                    <input
                      type="text"
                      className="form-control"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label text-dark small fw-semibold">Personalized Message / Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="e.g. Please find attached the updated quotation for your consideration..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setShowSendModal(false)}
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
                        <span>Confirm & Send Email</span>
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
