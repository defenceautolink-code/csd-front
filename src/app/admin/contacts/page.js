"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export default function AdminContactsPage() {
  const { showToast } = useToast();
  const [inquiries, setInquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, today: 0 });

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // View Modal
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  // Delete Confirmation
  const [deletingInquiry, setDeletingInquiry] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getAuthHeaders = useCallback(() => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchInquiries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await axios.get(`${API_BASE_URL}/contact-inquiries`, {
        headers: getAuthHeaders(),
        params,
      });

      if (res.data && res.data.status) {
        setInquiries(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.last_page || 1);
          setTotalCount(res.data.pagination.total || 0);
        }
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Error fetching contact inquiries:", err);
      showToast("Failed to load contact inquiries.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, searchTerm, getAuthHeaders, showToast]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // View Details
  const handleOpenView = async (item) => {
    setSelectedInquiry(item);
    // Mark as read in backend
    try {
      await axios.get(`${API_BASE_URL}/contact-inquiries/${item.id}`, {
        headers: getAuthHeaders(),
      });
      setInquiries((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "read" } : i))
      );
    } catch (_) {}
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!deletingInquiry) return;
    setIsDeleting(true);
    try {
      const res = await axios.delete(
        `${API_BASE_URL}/contact-inquiries/${deletingInquiry.id}`,
        { headers: getAuthHeaders() }
      );
      if (res.data && res.data.status) {
        showToast("Contact inquiry deleted successfully.", "success");
        setDeletingInquiry(null);
        if (selectedInquiry?.id === deletingInquiry.id) {
          setSelectedInquiry(null);
        }
        fetchInquiries();
      }
    } catch (err) {
      showToast("Failed to delete inquiry.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Top Header */}
        <div className="page-header-wrapper mb-3">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">Website &amp; CMS</li>
              <li className="breadcrumb-item active">Contact Us Inquiries</li>
            </ul>
            <h1 className="page-title mt-1 d-flex align-items-center gap-2">
              <i className="bi bi-envelope-paper-fill text-primary"></i>
              <span>Contact Us Inquiries</span>
            </h1>
            <p className="text-muted small mb-0 mt-1">
              View, read, and manage customer inquiries submitted via the website &quot;Contact Us&quot; form.
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <Link
              href="/contact"
              target="_blank"
              className="btn btn-outline-custom btn-sm d-flex align-items-center gap-1"
              title="Preview Visitor Contact Page"
            >
              <i className="bi bi-box-arrow-up-right"></i>
              <span>View Contact Page</span>
            </Link>

            <button
              className="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm"
              onClick={fetchInquiries}
              disabled={isLoading}
            >
              <i className={`bi bi-arrow-clockwise ${isLoading ? "spin" : ""}`}></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 2 KPI Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Inquiries Received</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-inbox-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{stats.total} Messages</div>
              <span className="text-muted small">All customer requests submitted</span>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title text-success">Today&apos;s New Inquiries</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-bell-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-success">{stats.today} Inquiries</div>
              <span className="text-success small fw-semibold">Received in last 24 hours</span>
            </div>
          </div>
        </div>

        {/* Main Records Table Card */}
        <div className="card shadow-sm border">
          {/* Card Header Toolbar */}
          <div className="card-header bg-white border-bottom py-2 px-3">
            <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-secondary-subtle text-dark border px-2 py-1 text-nowrap">
                  {totalCount} Total Messages
                </span>
              </div>

              <div className="d-flex align-items-center gap-2 ms-auto">
                <div className="position-relative" style={{ width: "280px" }}>
                  <input
                    type="text"
                    className="form-control form-control-sm pe-4"
                    placeholder="Search name, email, phone, message..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="btn btn-link p-0 position-absolute end-0 top-50 translate-middle-y me-2 text-muted"
                      onClick={() => setSearchTerm("")}
                      style={{ fontSize: "12px", border: "none" }}
                    >
                      <i className="bi bi-x-circle-fill"></i>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                  onClick={fetchInquiries}
                  title="Refresh inquiries"
                >
                  <i className="bi bi-arrow-clockwise"></i>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive" style={{ minHeight: "360px" }}>
            <table className="table table-custom align-middle mb-0" style={{ width: "100%" }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: "50px" }} className="text-center">NO.</th>
                  <th style={{ width: "160px" }}>DATE &amp; TIME</th>
                  <th style={{ minWidth: "180px" }}>CUSTOMER NAME</th>
                  <th style={{ minWidth: "200px" }}>CONTACT INFO</th>
                  <th style={{ minWidth: "160px" }}>SUBJECT</th>
                  <th style={{ minWidth: "250px" }}>MESSAGE PREVIEW</th>
                  <th style={{ width: "120px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                      <div className="mt-2 text-muted small">Loading contact inquiries...</div>
                    </td>
                  </tr>
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="bi bi-envelope-x fs-1 d-block mb-2 text-secondary opacity-50"></i>
                      <div className="fw-semibold">No contact inquiries found.</div>
                    </td>
                  </tr>
                ) : (
                  inquiries.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * perPage + idx + 1;
                    const isNew = item.status === "new";

                    return (
                      <tr key={item.id} className={isNew ? "table-light fw-medium" : ""}>
                        {/* 1. NO. */}
                        <td className="text-center text-muted fw-semibold small">{rowNumber}</td>

                        {/* 2. Date */}
                        <td className="small text-muted">
                          <div>
                            {new Date(item.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="extra-small text-muted" style={{ fontSize: "11px" }}>
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* 3. Name */}
                        <td>
                          <div className="fw-bold text-dark d-flex align-items-center gap-1">
                            {isNew && <span className="badge bg-primary rounded-pill p-1 me-1">New</span>}
                            <span>{item.name}</span>
                          </div>
                        </td>

                        {/* 4. Contact */}
                        <td>
                          <div>
                            <a
                              href={`tel:${item.phone}`}
                              className="text-decoration-none small text-dark d-flex align-items-center gap-1"
                            >
                              <i className="bi bi-telephone text-primary" style={{ fontSize: "11px" }}></i>
                              <span>{item.phone}</span>
                            </a>
                          </div>
                          <div>
                            <a
                              href={`mailto:${item.email}`}
                              className="text-decoration-none text-muted small d-flex align-items-center gap-1 text-truncate"
                              style={{ maxWidth: "200px", fontSize: "11px" }}
                            >
                              <i className="bi bi-envelope text-secondary"></i>
                              <span>{item.email}</span>
                            </a>
                          </div>
                        </td>

                        {/* 5. Subject */}
                        <td className="small">
                          <span className="badge bg-light text-dark border text-truncate" style={{ maxWidth: "160px" }}>
                            {item.subject || "General Inquiry"}
                          </span>
                        </td>

                        {/* 6. Message Preview */}
                        <td>
                          <div
                            className="text-muted small text-truncate"
                            style={{ maxWidth: "280px", cursor: "pointer" }}
                            onClick={() => handleOpenView(item)}
                            title="Click to view full message"
                          >
                            {item.message}
                          </div>
                        </td>

                        {/* 7. Action */}
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger p-1 px-2"
                            onClick={() => setDeletingInquiry(item)}
                            title="Delete inquiry"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white d-flex align-items-center justify-content-between py-2 px-3">
              <span className="text-muted small">
                Showing {inquiries.length} of {totalCount} inquiries
              </span>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <li key={pg} className={`page-item ${currentPage === pg ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(pg)}>
                      {pg}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* ===================================================================
            VIEW MESSAGE DETAILS MODAL
            =================================================================== */}
        {selectedInquiry && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content shadow-lg border-0 rounded-3">
                <div className="modal-header border-bottom py-3 px-4">
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-envelope-open text-primary"></i>
                    <span>Contact Inquiry Details</span>
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedInquiry(null)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  {/* Sender Snapshot */}
                  <div className="card bg-light border-0 rounded-3 p-3 mb-3">
                    <div className="row g-2 small">
                      <div className="col-12 col-md-4">
                        <span className="text-muted">Customer Name:</span>
                        <div className="fw-bold text-dark fs-6">{selectedInquiry.name}</div>
                      </div>
                      <div className="col-12 col-md-4">
                        <span className="text-muted">Phone Number:</span>
                        <div>
                          <a href={`tel:${selectedInquiry.phone}`} className="fw-semibold text-primary text-decoration-none">
                            <i className="bi bi-telephone me-1"></i>
                            {selectedInquiry.phone}
                          </a>
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <span className="text-muted">Email Address:</span>
                        <div>
                          <a href={`mailto:${selectedInquiry.email}`} className="fw-semibold text-primary text-decoration-none">
                            <i className="bi bi-envelope me-1"></i>
                            {selectedInquiry.email}
                          </a>
                        </div>
                      </div>
                      <div className="col-12 col-md-8 mt-2">
                        <span className="text-muted">Subject:</span>
                        <div className="fw-semibold text-dark">{selectedInquiry.subject || "General Inquiry"}</div>
                      </div>
                      <div className="col-12 col-md-4 mt-2">
                        <span className="text-muted">Received Date &amp; Time:</span>
                        <div className="text-dark">
                          {new Date(selectedInquiry.created_at).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="mb-3">
                    <label className="fw-semibold small text-muted mb-1">Message Content:</label>
                    <div
                      className="p-3 bg-white border rounded-3 text-dark"
                      style={{ minHeight: "120px", whiteSpace: "pre-wrap", lineHeight: "1.6" }}
                    >
                      {selectedInquiry.message}
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top py-2 px-4 d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => {
                      setDeletingInquiry(selectedInquiry);
                    }}
                  >
                    <i className="bi bi-trash me-1"></i> Delete Message
                  </button>

                  <div className="d-flex align-items-center gap-2">
                    <a
                      href={`mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(
                        selectedInquiry.subject || "Your Inquiry at Defence Autolink"
                      )}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      <i className="bi bi-reply-fill me-1"></i> Reply via Email
                    </a>
                    <a href={`tel:${selectedInquiry.phone}`} className="btn btn-success btn-sm">
                      <i className="bi bi-telephone-fill me-1"></i> Call Customer
                    </a>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedInquiry(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deletingInquiry && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-3">
                <div className="modal-header border-bottom py-3 px-4">
                  <h5 className="modal-title text-danger fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <span>Confirm Delete</span>
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setDeletingInquiry(null)}
                    disabled={isDeleting}
                  ></button>
                </div>
                <div className="modal-body p-4 text-center">
                  <p className="mb-2">Are you sure you want to delete this inquiry message?</p>
                  <div className="p-3 bg-light rounded-3 text-start small border">
                    <div><strong>From:</strong> {deletingInquiry.name} ({deletingInquiry.email})</div>
                    <div><strong>Subject:</strong> {deletingInquiry.subject}</div>
                  </div>
                </div>
                <div className="modal-footer border-top py-2 px-4">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setDeletingInquiry(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm px-3"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete Message"}
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
