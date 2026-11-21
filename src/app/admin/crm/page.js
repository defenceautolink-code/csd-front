"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import CKEditorComponent from "@/components/common/CKEditorComponent";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export default function AdminCrmPages() {
  const { showToast } = useToast();
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State: "add" | "edit" | null
  const [modalMode, setModalMode] = useState(null);
  const [editingPage, setEditingPage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation
  const [deletingPage, setDeletingPage] = useState(null);

  // Form State
  const initialForm = {
    title: "",
    slug: "",
    detail: "",
    status: "active",
    position: 0,
    img: null,
    previewImg: "",
  };
  const [formData, setFormData] = useState(initialForm);

  const getAuthHeaders = useCallback(() => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
      };
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await axios.get(`${API_BASE_URL}/crm-pages`, {
        headers: getAuthHeaders(),
        params,
      });

      if (res.data && res.data.status) {
        setPages(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.last_page || 1);
          setTotalCount(res.data.pagination.total || 0);
        }
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Error fetching CRM pages:", err);
      showToast("Failed to load CRM pages.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, statusFilter, searchTerm, getAuthHeaders, showToast]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleTitleChange = (e) => {
    const val = e.target.value;
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: modalMode === "add" ? autoSlug : prev.slug,
    }));
  };

  const handleOpenAdd = () => {
    setFormData({
      title: "",
      slug: "",
      detail: "",
      status: "active",
      position: 0,
      img: null,
      previewImg: "",
    });
    setEditingPage(null);
    setModalMode("add");
  };

  const handleOpenEdit = (page) => {
    setEditingPage(page);
    setFormData({
      title: page.title || "",
      slug: page.slug || "",
      detail: page.detail || "",
      status: page.status || "active",
      position: page.position !== undefined ? page.position : 0,
      img: null,
      previewImg: page.img ? (page.img.startsWith("http") ? page.img : `${BACKEND_BASE_URL}${page.img}`) : "",
    });
    setModalMode("edit");
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        img: file,
        previewImg: URL.createObjectURL(file),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("Please enter a title.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("slug", formData.slug.trim());
      data.append("detail", formData.detail || "");
      data.append("status", formData.status);
      data.append("position", String(formData.position));
      if (formData.img instanceof File) {
        data.append("img", formData.img);
      }

      if (modalMode === "add") {
        const res = await axios.post(`${API_BASE_URL}/crm-pages`, data, {
          headers: {
            ...getAuthHeaders(),
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        });
        if (res.data && res.data.status) {
          showToast("CRM Page created successfully!", "success");
          setModalMode(null);
          fetchPages();
        }
      } else if (modalMode === "edit" && editingPage) {
        data.append("_method", "PUT");
        const res = await axios.post(`${API_BASE_URL}/crm-pages/${editingPage.id}`, data, {
          headers: {
            ...getAuthHeaders(),
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        });
        if (res.data && res.data.status) {
          showToast("CRM Page updated successfully!", "success");
          setModalMode(null);
          fetchPages();
        }
      }
    } catch (err) {
      console.error("Save CRM page error:", err);
      const errData = err.response?.data;
      let msg = errData?.message || "Failed to save page.";
      if (errData?.errors) {
        const firstKey = Object.keys(errData.errors)[0];
        if (firstKey && errData.errors[firstKey]?.[0]) {
          msg = errData.errors[firstKey][0];
        }
      }
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (page) => {
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/crm-pages/${page.id}/status`,
        {},
        { headers: getAuthHeaders() }
      );
      if (res.data && res.data.status) {
        showToast(`Page is now ${res.data.status_val}`, "success");
        setPages((prev) =>
          prev.map((p) => (p.id === page.id ? { ...p, status: res.data.status_val } : p))
        );
        setStats((prev) => ({
          ...prev,
          active: res.data.status_val === "active" ? prev.active + 1 : prev.active - 1,
          inactive: res.data.status_val === "inactive" ? prev.inactive + 1 : prev.inactive - 1,
        }));
      }
    } catch (err) {
      showToast("Failed to toggle status", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPage) return;
    setIsSubmitting(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/crm-pages/${deletingPage.id}`, {
        headers: getAuthHeaders(),
      });
      if (res.data && res.data.status) {
        showToast("Page deleted successfully.", "success");
        setDeletingPage(null);
        fetchPages();
      }
    } catch (err) {
      showToast("Failed to delete page.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${BACKEND_BASE_URL}${path}`;
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
              <li className="breadcrumb-item active">CRM - Useful Links</li>
            </ul>
            <h1 className="page-title mt-1 d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-richtext text-primary"></i>
              <span>CRM (Useful Links Pages)</span>
            </h1>
            <p className="text-muted small mb-0 mt-1">
              Manage dynamic pages displayed under &quot;Useful Link&quot; on visitor website (e.g. Privacy Policy, Terms, etc.).
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
           

            <button
              className="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm"
              onClick={handleOpenAdd}
            >
              <i className="bi bi-plus-lg"></i>
              <span>Add New Page</span>
            </button>
          </div>
        </div>

        {/* 3 KPI Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div
              className={`card stat-card h-100 ${statusFilter === "all" ? "border-primary shadow" : ""}`}
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-card-header">
                <span className="stat-card-title">Total Useful Pages</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-files"></i>
                </div>
              </div>
              <div className="stat-card-value">{stats.total} Pages</div>
              <span className="text-muted small">All CRM content pages</span>
            </div>
          </div>

          <div className="col-md-4">
            <div
              className={`card stat-card h-100 ${statusFilter === "active" ? "border-success shadow" : ""}`}
              onClick={() => {
                setStatusFilter("active");
                setCurrentPage(1);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-card-header">
                <span className="stat-card-title text-success">Active &amp; Visible</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-check-circle-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-success">{stats.active} Pages</div>
              <span className="text-success small fw-semibold">Shown in Useful Link</span>
            </div>
          </div>

          <div className="col-md-4">
            <div
              className={`card stat-card h-100 ${statusFilter === "inactive" ? "border-secondary shadow" : ""}`}
              onClick={() => {
                setStatusFilter("inactive");
                setCurrentPage(1);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-card-header">
                <span className="stat-card-title text-muted">Inactive Pages</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-eye-slash-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-secondary">{stats.inactive} Pages</div>
              <span className="text-muted small">Hidden from visitors</span>
            </div>
          </div>
        </div>

        {/* Records Table Card */}
        <div className="card shadow-sm border">
          {/* Card Header Toolbar */}
          <div className="card-header bg-white border-bottom py-2 px-3">
            <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small fw-semibold d-flex align-items-center gap-1 text-nowrap">
                  <i className="bi bi-funnel-fill text-primary"></i> Status:
                </span>
                <select
                  className="form-select form-select-sm fw-semibold shadow-sm"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "160px" }}
                >
                  <option value="all">All Pages ({stats.total})</option>
                  <option value="active">Active Only ({stats.active})</option>
                  <option value="inactive">Inactive Only ({stats.inactive})</option>
                </select>

                <span className="badge bg-secondary-subtle text-dark border px-2 py-1 text-nowrap">
                  {totalCount} Records
                </span>
              </div>

              <div className="d-flex align-items-center gap-2 ms-auto">
                <div className="position-relative" style={{ width: "260px" }}>
                  <input
                    type="text"
                    className="form-control form-control-sm pe-4"
                    placeholder="Search by title, slug..."
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
                  onClick={fetchPages}
                  title="Refresh pages"
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
                  <th style={{ width: "70px" }} className="text-center">IMG</th>
                  <th style={{ minWidth: "260px" }}>PAGE TITLE &amp; SLUG</th>
                  <th style={{ width: "130px" }} className="text-center">POSITION</th>
                  <th style={{ width: "120px" }} className="text-center">STATUS</th>
                  <th style={{ width: "140px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                      <div className="mt-2 text-muted small">Loading CRM pages...</div>
                    </td>
                  </tr>
                ) : pages.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <i className="bi bi-file-earmark-x fs-1 d-block mb-2 text-secondary opacity-50"></i>
                      <div className="fw-semibold">No CRM pages found.</div>
                      <button className="btn btn-sm btn-primary mt-2" onClick={handleOpenAdd}>
                        <i className="bi bi-plus-lg me-1"></i> Create First Page
                      </button>
                    </td>
                  </tr>
                ) : (
                  pages.map((page, idx) => {
                    const rowNumber = (currentPage - 1) * perPage + idx + 1;
                    const imgUrl = getFullImageUrl(page.img);

                    return (
                      <tr key={page.id}>
                        {/* 1. NO. */}
                        <td className="text-center text-muted fw-semibold small">{rowNumber}</td>

                        {/* 2. Image */}
                        <td className="text-center">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={page.title}
                              className="rounded border"
                              style={{ width: "45px", height: "32px", objectFit: "cover" }}
                            />
                          ) : (
                            <span className="badge bg-light text-muted border" style={{ fontSize: "10px" }}>
                              No Img
                            </span>
                          )}
                        </td>

                        {/* 3. Title & Slug */}
                        <td>
                          <div className="fw-bold text-dark text-truncate" style={{ maxWidth: "340px" }}>
                            {page.title}
                          </div>
                          <div className="text-muted small text-truncate" style={{ maxWidth: "340px", fontSize: "11px" }}>
                            <i className="bi bi-link-45deg me-1"></i>/page/{page.slug}
                          </div>
                        </td>

                        {/* 4. Position */}
                        <td className="text-center">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fw-semibold">
                            Position: {page.position}
                          </span>
                        </td>

                        {/* 5. Status Toggle */}
                        <td className="text-center">
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              page.status === "active"
                                ? "btn-success-subtle text-success border border-success"
                                : "btn-secondary-subtle text-secondary border"
                            } px-2 py-0 fw-semibold`}
                            style={{ fontSize: "11px", borderRadius: "20px" }}
                            onClick={() => handleToggleStatus(page)}
                            title="Click to toggle Active / Inactive"
                          >
                            <i
                              className={`bi ${
                                page.status === "active" ? "bi-check-circle-fill text-success" : "bi-x-circle text-muted"
                              } me-1`}
                            ></i>
                            {page.status === "active" ? "Active" : "Inactive"}
                          </button>
                        </td>

                        {/* 6. Action */}
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary p-1 px-2"
                              onClick={() => handleOpenEdit(page)}
                              title="Edit Page"
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger p-1 px-2"
                              onClick={() => setDeletingPage(page)}
                              title="Delete Page"
                            >
                              <i className="bi bi-trash"></i>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white d-flex align-items-center justify-content-between py-2 px-3">
              <span className="text-muted small">
                Showing {pages.length} of {totalCount} pages
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
            ADD / EDIT MODAL
            =================================================================== */}
        {modalMode && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}
          >
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content shadow-lg border-0 rounded-3">
                <div className="modal-header bg-white border-bottom py-3 px-4">
                  <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-plus text-primary"></i>
                    <span>{modalMode === "add" ? "Create CRM Useful Link Page" : "Edit CRM Page"}</span>
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => !isSubmitting && setModalMode(null)}
                    disabled={isSubmitting}
                  ></button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="modal-body p-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                    <div className="row g-3">
                      {/* Title */}
                      <div className="col-12 col-md-8">
                        <label className="form-label fw-semibold small">
                          Page Title <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Buyer Terms and Conditions"
                          value={formData.title}
                          onChange={handleTitleChange}
                          required
                        />
                      </div>

                      {/* Slug */}
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold small">
                          URL Slug <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-light text-muted small" style={{ fontSize: "11px" }}>
                            /page/
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="buyer-terms"
                            value={formData.slug}
                            onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      {/* Position (Dropdown 0 to 5) */}
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold small">
                          Position Order (0 to 5) <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={formData.position}
                          onChange={(e) => setFormData((p) => ({ ...p, position: parseInt(e.target.value) || 0 }))}
                        >
                          <option value="0">0 (Top Priority)</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                        
                      </div>

                      {/* Status */}
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold small">
                          Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={formData.status}
                          onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                        >
                          <option value="active">Active (Shown on Visitor Footer)</option>
                          <option value="inactive">Inactive (Hidden)</option>
                        </select>
                      </div>

                      {/* Image Upload */}
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold small">Page Image (Optional)</label>
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={handleImageFileChange}
                        />
                        {formData.previewImg && (
                          <div className="mt-2 position-relative d-inline-block">
                            <img
                              src={formData.previewImg}
                              alt="Preview"
                              className="rounded border"
                              style={{ width: "80px", height: "50px", objectFit: "cover" }}
                            />
                            <span className="badge bg-dark-subtle text-dark border ms-2 small">Selected</span>
                          </div>
                        )}
                      </div>

                      {/* Detail with CKEditor */}
                      <div className="col-12 mt-1">
                        <label className="form-label fw-semibold small mb-1">
                          Page Content <span className="text-danger">*</span>
                        </label>
                        <CKEditorComponent
                          value={formData.detail}
                          onChange={(val) => setFormData((p) => ({ ...p, detail: val }))}
                          placeholder="Write the complete page content, terms, policies, or information..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer bg-light border-top py-2 px-4 d-flex justify-content-between">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setModalMode(null)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>

                    <button type="submit" className="btn btn-primary btn-sm px-4 fw-semibold" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1"></span> Saving...
                        </>
                      ) : modalMode === "add" ? (
                        <>
                          <i className="bi bi-check2 me-1"></i> Save CRM Page
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save me-1"></i> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deletingPage && (
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
                    onClick={() => setDeletingPage(null)}
                    disabled={isSubmitting}
                  ></button>
                </div>
                <div className="modal-body p-4 text-center">
                  <p className="mb-2">Are you sure you want to delete this CRM page?</p>
                  <div className="p-3 bg-light rounded-3 text-start small border">
                    <div><strong>Title:</strong> {deletingPage.title}</div>
                    <div><strong>Slug:</strong> /page/{deletingPage.slug}</div>
                    <div><strong>Position:</strong> {deletingPage.position}</div>
                  </div>
                </div>
                <div className="modal-footer border-top py-2 px-4">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setDeletingPage(null)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm px-3"
                    onClick={handleDeleteConfirm}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Deleting..." : "Yes, Delete Page"}
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
