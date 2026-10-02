"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/app/components/AdminLayout";
import { quotationApi } from "@/lib/quotationApi";
import { useToast } from "@/app/components/Toast";

export default function QuotationEditPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const quotationId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [leadId, setLeadId] = useState(null);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState("draft");

  // Customer Information
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Quotation Metadata
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [notes, setNotes] = useState("");

  // Line Items
  const [items, setItems] = useState([]);

  // Fetch Existing Quotation Data
  useEffect(() => {
    const fetchQuotation = async () => {
      setIsLoading(true);
      try {
        const res = await quotationApi.getQuotation(quotationId);
        if (res && res.status && res.data) {
          const q = res.data;
          setLeadId(q.lead_id);
          setQuotationNumber(q.quotation_number || "");
          setQuotationDate(q.quotation_date || "");
          setValidUntil(q.valid_until || "");
          setStatus(q.status || "draft");

          setCustomerName(q.customer_name || "");
          setCompanyName(q.company_name || "");
          setCustomerEmail(q.customer_email || "");
          setCustomerPhone(q.customer_phone || "");
          setCustomerAddress(q.customer_address || "");

          setSubject(q.subject || "");
          setDescription(q.description || "");
          setPaymentTerms(q.payment_terms || "");
          setDeliveryTerms(q.delivery_terms || "");
          setNotes(q.notes || "");

          setItems(
            q.items && q.items.length > 0
              ? q.items.map((it) => ({
                  item_name: it.item_name,
                  description: it.description || "",
                  quantity: Number(it.quantity) || 1,
                  unit_price: Number(it.unit_price) || 0,
                  discount: Number(it.discount) || 0,
                  tax: Number(it.tax) || 0,
                }))
              : [
                  {
                    item_name: "Vehicle Purchase",
                    description: "",
                    quantity: 1,
                    unit_price: 0,
                    discount: 0,
                    tax: 18,
                  },
                ]
          );
        }
      } catch (error) {
        console.error("Failed to load quotation for editing:", error);
        showToast("Failed to load quotation details.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (quotationId) {
      fetchQuotation();
    }
  }, [quotationId]);

  // Line Item Management
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        item_name: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        discount: 0,
        tax: 18,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      showToast("Quotation must have at least one item.", "warning");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateItemTotal = (item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const discount = Number(item.discount) || 0;
    const tax = Number(item.tax) || 0;

    const base = qty * price;
    const taxable = Math.max(0, base - discount);
    const taxAmount = (taxable * tax) / 100;
    return taxable + taxAmount;
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
  };

  const calculateTotalDiscount = () => {
    return items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  };

  const calculateTotalTax = () => {
    return items.reduce((sum, item) => {
      const base = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      const discount = Number(item.discount) || 0;
      const taxable = Math.max(0, base - discount);
      const taxRate = Number(item.tax) || 0;
      return sum + (taxable * taxRate) / 100;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const totalDiscount = calculateTotalDiscount();
  const totalTax = calculateTotalTax();
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showToast("Please enter Customer Full Name.", "warning");
      return;
    }
    if (!subject.trim()) {
      showToast("Please enter Quotation Subject.", "warning");
      return;
    }
    if (items.length === 0 || items.some((it) => !it.item_name.trim())) {
      showToast("All items must have a valid name.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        lead_id: leadId,
        quotation_number: quotationNumber.trim(),
        quotation_date: quotationDate,
        valid_until: validUntil || null,
        status: status,
        customer_name: customerName.trim(),
        company_name: companyName.trim() || null,
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        subject: subject.trim(),
        description: description.trim() || null,
        payment_terms: paymentTerms.trim() || null,
        delivery_terms: deliveryTerms.trim() || null,
        notes: notes.trim() || null,
        items: items.map((it) => ({
          item_name: it.item_name.trim(),
          description: it.description?.trim() || null,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          discount: Number(it.discount) || 0,
          tax: Number(it.tax) || 0,
        })),
      };

      const res = await quotationApi.updateQuotation(quotationId, payload);
      if (res && res.status) {
        showToast("Quotation updated successfully!", "success");
        router.push(`/admin/quotation/${quotationId}`);
      }
    } catch (error) {
      console.error("Update quotation error:", error);
      const msg = error.response?.data?.message || "Failed to update quotation.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="page-body text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-secondary mt-2 small">Loading quotation for edit...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="page-body pb-5">
        {/* Navigation Breadcrumbs & Header */}
        <div className="page-header-wrapper mb-4">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href="/admin/quotation">Quotations</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href={`/admin/quotation/${quotationId}`}>{quotationNumber}</Link>
              </li>
              <li className="breadcrumb-item active">Edit</li>
            </ul>
            <h1 className="page-title mt-1">Edit Quotation #{quotationNumber}</h1>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link href={`/admin/quotation/${quotationId}`} className="btn btn-outline-custom">
              <i className="bi bi-eye me-1"></i>
              <span>View Quote</span>
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-4">
            {/* ----------------------------------------------------
                LEFT COLUMN: Customer Information & Quote Metadata
                ---------------------------------------------------- */}
            <div className="col-xl-4 col-lg-5">
              {/* Customer Information Card */}
              <div className="card mb-4" style={{ borderTop: "3px solid #3b82f6" }}>
                <div className="card-header">
                  <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-person-badge-fill text-primary"></i>
                    <span>Customer Information</span>
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label text-dark small fw-semibold">
                        Customer Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark small fw-semibold">Company Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-semibold">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-semibold">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark small fw-semibold">Address / City</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quotation Parameters Card */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-ruled-fill text-warning"></i>
                    <span>Quotation Parameters</span>
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-semibold">Quotation Number</label>
                      <input
                        type="text"
                        className="form-control text-primary fw-bold"
                        value={quotationNumber}
                        onChange={(e) => setQuotationNumber(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-semibold">Status</label>
                      <select
                        className="form-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-semibold">Quotation Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={quotationDate}
                        onChange={(e) => setQuotationDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-semibold">Valid Until</label>
                      <input
                        type="date"
                        className="form-control"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark small fw-semibold">
                        Subject Line <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark small fw-semibold">Description / Remarks</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------
                RIGHT COLUMN: Quotation Line Items & Totals
                ---------------------------------------------------- */}
            <div className="col-xl-8 col-lg-7">
              {/* Line Items Card */}
              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-cart-check-fill text-success"></i>
                      <span>Quotation Items & Services</span>
                    </h5>
                    <span className="text-secondary small">Edit particulars, pricing, discounts, and taxes</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                    onClick={handleAddItem}
                  >
                    <i className="bi bi-plus-lg"></i>
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-custom align-middle mb-0">
                      <thead className="border-bottom border-secondary border-opacity-25 text-secondary small text-uppercase">
                        <tr>
                          <th style={{ width: "35%" }} className="py-3 px-3">Item Particulars</th>
                          <th style={{ width: "10%" }} className="py-3 px-2 text-center">Qty</th>
                          <th style={{ width: "18%" }} className="py-3 px-2 text-end">Unit Price (₹)</th>
                          <th style={{ width: "13%" }} className="py-3 px-2 text-end">Discount (₹)</th>
                          <th style={{ width: "10%" }} className="py-3 px-2 text-center">Tax %</th>
                          <th style={{ width: "14%" }} className="py-3 px-3 text-end">Total (₹)</th>
                          <th style={{ width: "5%" }} className="py-3 px-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const lineTotal = calculateItemTotal(item);
                          return (
                            <tr key={index} className="border-bottom border-secondary border-opacity-10">
                              <td className="py-3 px-3">
                                <input
                                  type="text"
                                  className="form-control form-control-sm mb-1 text-dark fw-semibold"
                                  placeholder="Item Name *"
                                  value={item.item_name}
                                  onChange={(e) => handleItemChange(index, "item_name", e.target.value)}
                                  required
                                />
                                <input
                                  type="text"
                                  className="form-control form-control-sm text-secondary"
                                  placeholder="Item details..."
                                  value={item.description}
                                  onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                  style={{ fontSize: "0.75rem" }}
                                />
                              </td>

                              <td className="py-3 px-2 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  className="form-control form-control-sm text-center"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleItemChange(index, "quantity", parseInt(e.target.value, 10) || 1)
                                  }
                                />
                              </td>

                              <td className="py-3 px-2 text-end">
                                <input
                                  type="number"
                                  min="0"
                                  step="100"
                                  className="form-control form-control-sm text-end"
                                  value={item.unit_price}
                                  onChange={(e) =>
                                    handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)
                                  }
                                />
                              </td>

                              <td className="py-3 px-2 text-end">
                                <input
                                  type="number"
                                  min="0"
                                  step="100"
                                  className="form-control form-control-sm text-end text-danger"
                                  value={item.discount}
                                  onChange={(e) =>
                                    handleItemChange(index, "discount", parseFloat(e.target.value) || 0)
                                  }
                                />
                              </td>

                              <td className="py-3 px-2 text-center">
                                <select
                                  className="form-select form-select-sm text-center"
                                  value={item.tax}
                                  onChange={(e) =>
                                    handleItemChange(index, "tax", parseFloat(e.target.value) || 0)
                                  }
                                >
                                  <option value="0">0%</option>
                                  <option value="5">5%</option>
                                  <option value="12">12%</option>
                                  <option value="18">18%</option>
                                  <option value="28">28%</option>
                                </select>
                              </td>

                              <td className="py-3 px-3 text-end fw-bold text-dark fs-6">
                                ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>

                              <td className="py-3 px-2 text-center">
                                <button
                                  type="button"
                                  className="btn btn-link text-danger p-0 border-0"
                                  onClick={() => handleRemoveItem(index)}
                                  disabled={items.length <= 1}
                                >
                                  <i className="bi bi-trash fs-5"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Commercial Summary Box */}
              <div className="card mb-4 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title text-uppercase text-secondary small fw-bold mb-3">
                    Commercial Summary
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="p-3 rounded-2 bg-light border">
                        <div className="d-flex justify-content-between text-secondary small mb-2">
                          <span>Items Subtotal:</span>
                          <span className="text-dark fw-semibold">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="d-flex justify-content-between text-secondary small mb-2">
                          <span className="text-danger">Total Promotional Discount:</span>
                          <span className="text-danger fw-semibold">- ₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="d-flex justify-content-between text-secondary small">
                          <span>Total Applicable GST / Tax:</span>
                          <span className="text-dark fw-semibold">₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div
                        className="p-3 rounded-2 h-100 d-flex flex-column justify-content-center"
                        style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)" }}
                      >
                        <span className="text-secondary small text-uppercase fw-bold">Updated Grand Total</span>
                        <div className="fs-3 fw-bold text-primary mt-1">
                          ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions Card */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-shield-check text-info"></i>
                    <span>Terms & Conditions</span>
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-semibold">Payment Terms</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark small fw-semibold">Delivery Terms</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={deliveryTerms}
                        onChange={(e) => setDeliveryTerms(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark small fw-semibold">Notes / Terms & Conditions</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="card shadow-sm p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <Link href={`/admin/quotation/${quotationId}`} className="btn btn-outline-custom">
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle"></i>
                        <span>Update Quotation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
