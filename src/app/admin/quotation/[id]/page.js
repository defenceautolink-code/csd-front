"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/app/components/AdminLayout";
import { quotationApi } from "@/lib/quotationApi";
import { useToast } from "@/app/components/Toast";

export default function QuotationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const quotationId = params.id;

  const [quotation, setQuotation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  // Print Handler
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!quotation) return;
    setIsDownloadingPdf(true);
    try {
      await quotationApi.downloadPdf(quotation.id, quotation.quotation_number);
      showToast(`Downloaded Quotation ${quotation.quotation_number} PDF!`, "success");
    } catch (error) {
      console.error("Download PDF error:", error);
      showToast("Failed to generate and download PDF.", "error");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Send Email Handler
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
        // Refresh quotation to show 'sent' status & sent_at
        fetchQuotation();
      }
    } catch (error) {
      console.error("Send email error:", error);
      showToast(error.response?.data?.message || "Failed to send quotation email.", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Status Badge Class
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "sent":
        return <span className="badge bg-info text-dark fs-6 px-3 py-1"><i className="bi bi-send-check-fill me-1"></i>Sent</span>;
      case "accepted":
        return <span className="badge bg-success fs-6 px-3 py-1"><i className="bi bi-check-circle-fill me-1"></i>Accepted</span>;
      case "rejected":
        return <span className="badge bg-danger fs-6 px-3 py-1"><i className="bi bi-x-circle-fill me-1"></i>Rejected</span>;
      case "expired":
        return <span className="badge bg-secondary fs-6 px-3 py-1">Expired</span>;
      case "draft":
      default:
        return <span className="badge bg-warning text-dark fs-6 px-3 py-1"><i className="bi bi-pencil-square me-1"></i>Draft</span>;
    }
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
              <Link href="/admin/quotation" className="btn btn-primary btn-sm px-4">
                <i className="bi bi-arrow-left me-1"></i> Back to Quotations
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="page-body pb-5">
        {/* Navigation Breadcrumbs & Header Actions */}
        <div className="page-header-wrapper mb-4">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href="/admin/quotation">Quotations</Link>
              </li>
              <li className="breadcrumb-item active">{quotation.quotation_number}</li>
            </ul>
            <div className="d-flex align-items-center gap-3 mt-1 flex-wrap">
              <h1 className="page-title mb-0">{quotation.quotation_number}</h1>
              {getStatusBadge(quotation.status)}
            </div>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2 flex-wrap">
            <Link href="/admin/quotation" className="btn btn-outline-custom">
              <i className="bi bi-arrow-left me-1"></i>
              <span>All Quotes</span>
            </Link>

            <Link href={`/admin/quotation/${quotation.id}/edit`} className="btn btn-outline-custom">
              <i className="bi bi-pencil me-1"></i>
              <span>Edit</span>
            </Link>

            <button type="button" className="btn btn-outline-custom" onClick={handlePrint}>
              <i className="bi bi-printer-fill me-1"></i>
              <span>Print</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-custom text-info"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
            >
              {isDownloadingPdf ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-file-earmark-pdf-fill me-1"></i>
                  <span>Download PDF</span>
                </>
              )}
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
            OFFICIAL DEALERSHIP QUOTATION PREVIEW SHEET
            =================================================================== */}
        <div className="quotation-sheet-card mx-auto shadow-lg" id="printableQuoteCard" style={{ maxWidth: "900px" }}>
          {/* Header with Dealership Name & Address */}
          <div className="text-center mb-4 pb-3 border-bottom border-secondary border-opacity-25">
            <div className="quote-header-brand" style={{ fontSize: "1.75rem", color: "#1e3a8a", fontWeight: "bold" }}>
              DEFENCE AUTOLINK
            </div>
            <div className="quote-header-address mt-1 text-muted" style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
              OFFICIAL MULTI-BRAND DEALERSHIP • SALES & SERVICES
              <br />
              Main Ring Road Showroom, South Extension Part-II, New Delhi - 110049
              <br />
              Phone: +91 98000 11111 / +91 98231 00001 • GSTIN: 07AAAAA0000A1Z5
              <br />
              Email: sales@defenceautolink.com • Web: www.defenceautolink.com
            </div>
          </div>

          {/* Title Badge */}
          <div className="text-center mb-4">
            <div
              className="d-inline-block px-4 py-1 text-white fw-bold rounded-pill text-uppercase"
              style={{ background: "#2563eb", letterSpacing: "1px", fontSize: "0.9rem" }}
            >
              OFFICIAL PRICE QUOTATION
            </div>
          </div>

          {/* Customer & Quote Meta Box */}
          <div className="row g-3 mb-4 p-3 rounded-2 bg-light border text-dark" style={{ fontSize: "0.85rem" }}>
            <div className="col-md-6 border-end">
              <div className="text-uppercase fw-bold text-primary mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                Bill To (Customer Information)
              </div>
              <div className="fw-bold fs-6 text-dark">{quotation.customer_name}</div>
              {quotation.company_name && (
                <div className="text-muted fw-semibold">{quotation.company_name}</div>
              )}
              {quotation.customer_phone && (
                <div className="mt-1">
                  <strong>Phone:</strong> {quotation.customer_phone}
                </div>
              )}
              {quotation.customer_email && (
                <div>
                  <strong>Email:</strong> {quotation.customer_email}
                </div>
              )}
              {quotation.customer_address && (
                <div className="mt-1">
                  <strong>Address:</strong> {quotation.customer_address}
                </div>
              )}
            </div>

            <div className="col-md-6 ps-md-4">
              <div className="text-uppercase fw-bold text-primary mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                Quotation Reference & Status
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span>Quotation Number:</span>
                <strong className="text-primary">{quotation.quotation_number}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span>Quotation Date:</span>
                <strong>{quotation.quotation_date}</strong>
              </div>
              {quotation.valid_until && (
                <div className="d-flex justify-content-between mb-1">
                  <span>Valid Until:</span>
                  <strong>{quotation.valid_until}</strong>
                </div>
              )}
              {quotation.lead && (
                <div className="d-flex justify-content-between mb-1">
                  <span>Connected Lead:</span>
                  <Link href={`/sales-executive/leads/${quotation.lead.id}`} className="text-primary text-decoration-none fw-bold">
                    #{quotation.lead.id} ({quotation.lead.model_variant || quotation.lead.name})
                  </Link>
                </div>
              )}
              {quotation.creator && (
                <div className="d-flex justify-content-between">
                  <span>Prepared By:</span>
                  <span>{quotation.creator.name} ({quotation.creator.role || "Sales Executive"})</span>
                </div>
              )}
            </div>
          </div>

          {/* Subject & Description */}
          <div className="mb-4 text-dark">
            <h6 className="fw-bold text-primary mb-1">Subject: {quotation.subject}</h6>
            {quotation.description && (
              <p className="text-secondary small mb-0" style={{ lineHeight: "1.5" }}>
                {quotation.description}
              </p>
            )}
          </div>

          {/* Items Table */}
          <table className="table table-bordered table-sm text-dark align-middle mb-4" style={{ fontSize: "0.85rem" }}>
            <thead style={{ background: "#1e3a8a", color: "#ffffff" }}>
              <tr>
                <th style={{ width: "5%" }} className="text-center py-2">#</th>
                <th style={{ width: "45%" }} className="py-2">Item / Service Particulars</th>
                <th style={{ width: "8%" }} className="text-center py-2">Qty</th>
                <th style={{ width: "15%" }} className="text-end py-2">Unit Price (₹)</th>
                <th style={{ width: "12%" }} className="text-end py-2">Discount (₹)</th>
                <th style={{ width: "15%" }} className="text-end py-2">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items && quotation.items.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="text-center">{index + 1}</td>
                  <td>
                    <div className="fw-bold">{item.item_name}</div>
                    {item.description && (
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="text-center">{Number(item.quantity)}</td>
                  <td className="text-end">₹{Number(item.unit_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="text-end text-danger">
                    {Number(item.discount) > 0 ? `- ₹${Number(item.discount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹0.00"}
                  </td>
                  <td className="text-end fw-bold">
                    ₹{Number(item.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Commercial Summary Row */}
          <div className="row g-4 mb-4 text-dark" style={{ fontSize: "0.85rem" }}>
            <div className="col-md-6">
              {quotation.payment_terms && (
                <div className="p-2 mb-2 bg-light rounded border">
                  <div className="text-uppercase fw-bold text-secondary" style={{ fontSize: "0.72rem" }}>Payment Terms</div>
                  <div className="small mt-1">{quotation.payment_terms}</div>
                </div>
              )}
              {quotation.delivery_terms && (
                <div className="p-2 mb-2 bg-light rounded border">
                  <div className="text-uppercase fw-bold text-secondary" style={{ fontSize: "0.72rem" }}>Delivery Terms</div>
                  <div className="small mt-1">{quotation.delivery_terms}</div>
                </div>
              )}
            </div>

            <div className="col-md-6">
              <div className="p-3 bg-light rounded border">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Subtotal:</span>
                  <span className="fw-bold">₹{Number(quotation.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(quotation.discount) > 0 && (
                  <div className="d-flex justify-content-between mb-2 text-danger">
                    <span>Discount:</span>
                    <span className="fw-bold">- ₹{Number(quotation.discount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {Number(quotation.tax) > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Taxes / GST:</span>
                    <span className="fw-bold">₹{Number(quotation.tax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div
                  className="d-flex justify-content-between pt-2 border-top fw-bold fs-5 text-primary"
                  style={{ borderTopWidth: "2px !important" }}
                >
                  <span>Grand Total:</span>
                  <span>₹{Number(quotation.grand_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dealership Notes & Terms */}
          {quotation.notes && (
            <div className="p-3 mb-4 rounded bg-light border text-dark" style={{ fontSize: "0.78rem" }}>
              <div className="text-uppercase fw-bold text-secondary mb-1">Notes / Terms & Conditions:</div>
              <div style={{ whiteSpace: "pre-line", lineHeight: "1.4" }}>{quotation.notes}</div>
            </div>
          )}

          {/* Footer & Signatures */}
          <div className="pt-4 mt-4 border-top text-dark d-flex justify-content-between align-items-end" style={{ fontSize: "0.8rem" }}>
            <div>
              <span className="text-muted d-block">Thank you for considering Defence Autolink.</span>
              <span className="text-secondary small">For any queries, please reply to this quote or contact our sales director.</span>
            </div>
            <div className="text-end">
              <div className="signature-box" style={{ display: "inline-block", textAlign: "center", borderTop: "1px dashed #94a3b8", paddingTop: "5px", width: "160px", fontSize: "0.75rem", fontWeight: "bold" }}>
                Authorized Signatory
                <span className="d-block text-muted" style={{ fontSize: "0.68rem", fontWeight: "normal" }}>
                  DEFENCE AUTOLINK
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            SEND QUOTATION EMAIL MODAL
            =================================================================== */}
        {showSendModal && (
          <div className="modal-backdrop-custom" onClick={() => !isSendingEmail && setShowSendModal(false)}>
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
                      <strong style={{ color: "#4ADE80" }}>₹{Number(quotation.grand_total).toLocaleString("en-IN")}</strong>
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
