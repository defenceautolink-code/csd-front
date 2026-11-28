"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import CKEditorComponent from "@/components/common/CKEditorComponent";
import { getAuthenticatedUser, getRoleDashboardPath } from "@/utils/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export default function AdminBlogsPage() {
  const { showToast } = useToast();
  const [blogs, setBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    scheduled: 0,
    total_views: 0,
  });

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State: "add" | "edit" | null
  const [modalMode, setModalMode] = useState(null);
  const [editingBlog, setEditingBlog] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation
  const [deletingBlog, setDeletingBlog] = useState(null);

  // Form State
  const initialForm = {
    title: "",
    slug: "",
    details: "",
    publish_date: new Date().toISOString().split("T")[0],
    status: "active",
    img: null,
    previewImg: "",
  };
  const [formData, setFormData] = useState(initialForm);

  const getAuthHeaders = useCallback(() => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch blogs
  const fetchBlogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
      };
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await axios.get(`${API_BASE_URL}/blogs`, {
        headers: getAuthHeaders(),
        params,
      });

      if (res.data && res.data.status) {
        setBlogs(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.last_page || 1);
          setTotalCount(res.data.pagination.total || 0);
        }
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Error fetching blogs:", err);
      showToast("Failed to load blogs records.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, statusFilter, searchTerm, getAuthHeaders, showToast]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  // Auto generate slug from title if user hasn't manually customized slug
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
      details: "",
      publish_date: new Date().toISOString().split("T")[0],
      status: "active",
      img: null,
      previewImg: "",
    });
    setEditingBlog(null);
    setModalMode("add");
  };

  const handleOpenEdit = (blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title || "",
      slug: blog.slug || "",
      details: blog.details || "",
      publish_date: blog.publish_date ? blog.publish_date.split("T")[0] : new Date().toISOString().split("T")[0],
      status: blog.status || "active",
      img: null,
      previewImg: blog.img ? (blog.img.startsWith("http") ? blog.img : `${BACKEND_BASE_URL}${blog.img}`) : "",
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

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("Please enter a blog title.", "error");
      return;
    }
    if (!formData.publish_date) {
      showToast("Please select a publish date.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("slug", formData.slug.trim());
      data.append("details", formData.details || "");
      data.append("publish_date", formData.publish_date);
      data.append("status", formData.status);
      if (formData.img instanceof File) {
        data.append("img", formData.img);
      }

      if (modalMode === "add") {
        const res = await axios.post(`${API_BASE_URL}/blogs`, data, {
          headers: {
            ...getAuthHeaders(),
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        });
        if (res.data && res.data.status) {
          showToast("Blog created successfully!", "success");
          setModalMode(null);
          fetchBlogs();
        }
      } else if (modalMode === "edit" && editingBlog) {
        data.append("_method", "PUT");
        const res = await axios.post(`${API_BASE_URL}/blogs/${editingBlog.id}`, data, {
          headers: {
            ...getAuthHeaders(),
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        });
        if (res.data && res.data.status) {
          showToast("Blog updated successfully!", "success");
          setModalMode(null);
          fetchBlogs();
        }
      }
    } catch (err) {
      console.error("Save blog error:", err);
      const errData = err.response?.data;
      let msg = errData?.message || "Failed to save blog post.";
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

  // Toggle Status
  const handleToggleStatus = async (blog) => {
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/blogs/${blog.id}/status`,
        {},
        { headers: getAuthHeaders() }
      );
      if (res.data && res.data.status) {
        showToast(`Blog is now ${res.data.status_val}`, "success");
        setBlogs((prev) =>
          prev.map((b) => (b.id === blog.id ? { ...b, status: res.data.status_val } : b))
        );
        setStats((prev) => ({
          ...prev,
          active: res.data.status_val === "active" ? prev.active + 1 : prev.active - 1,
          inactive: res.data.status_val === "inactive" ? prev.inactive + 1 : prev.inactive - 1,
        }));
      }
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  };

  // Delete Blog
  const handleDeleteConfirm = async () => {
    if (!deletingBlog) return;
    setIsSubmitting(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/blogs/${deletingBlog.id}`, {
        headers: getAuthHeaders(),
      });
      if (res.data && res.data.status) {
        showToast("Blog deleted successfully.", "success");
        setDeletingBlog(null);
        fetchBlogs();
      }
    } catch (err) {
      showToast("Failed to delete blog.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return "/visitor/home/1775506047_Tata-Safari-Facelift-1160x653.webp";
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
                <Link href={getRoleDashboardPath(getAuthenticatedUser()?.role)}>Home</Link>
              </li>
              <li className="breadcrumb-item">Website &amp; CMS</li>
              <li className="breadcrumb-item active">Blogs</li>
            </ul>
            <h1 className="page-title mt-1 d-flex align-items-center gap-2">
              <i className="bi bi-newspaper text-primary"></i>
              <span>Blog Management</span>
            </h1>
            <p className="text-muted small mb-0 mt-1">
              Create, edit, and publish dynamic blogs. Articles publish automatically to visitors on their scheduled date.
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <button
              className="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm"
              onClick={handleOpenAdd}
            >
              <i className="bi bi-plus-lg"></i>
              <span>Add New Blog</span>
            </button>
          </div>
        </div>

        {/* 3 Interactive KPI Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-4 col-sm-6">
            <div
              className={`card stat-card h-100 ${statusFilter === "all" ? "border-primary shadow" : ""}`}
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-card-header">
                <span className="stat-card-title">Total Articles</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-journal-richtext"></i>
                </div>
              </div>
              <div className="stat-card-value">{stats.total} Posts</div>
              <span className="text-muted small">All published and drafts</span>
            </div>
          </div>

          <div className="col-xl-4 col-sm-6">
            <div
              className={`card stat-card h-100 ${statusFilter === "active" ? "border-success shadow" : ""}`}
              onClick={() => {
                setStatusFilter("active");
                setCurrentPage(1);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-card-header">
                <span className="stat-card-title text-success">Active &amp; Published</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-check-circle-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-success">{stats.active} Posts</div>
              <span className="text-success small fw-semibold">Live for visitors</span>
            </div>
          </div>

          <div className="col-xl-4 col-sm-6">
            <div
              className={`card stat-card h-100 ${statusFilter === "inactive" ? "border-secondary shadow" : ""}`}
              onClick={() => {
                setStatusFilter("inactive");
                setCurrentPage(1);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-card-header">
                <span className="stat-card-title text-muted">Inactive / Drafts</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-eye-slash-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-secondary">{stats.inactive} Posts</div>
              <span className="text-muted small">Hidden from visitors</span>
            </div>
          </div>
        </div>

        {/* Main Records Table Card */}
        <div className="card shadow-sm border">
          {/* Card Header Toolbar */}
          <div className="card-header bg-white border-bottom py-2 px-3">
            <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
              {/* Left Side: Filter Dropdown & Live Count Badge */}
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
                  <option value="all">All Articles ({stats.total})</option>
                  <option value="active">Active Only ({stats.active})</option>
                  <option value="inactive">Inactive Only ({stats.inactive})</option>
                </select>

                <span className="badge bg-secondary-subtle text-dark border px-2 py-1 text-nowrap">
                  {totalCount} Records
                </span>
              </div>

              {/* Right Side: Search Bar & Refresh */}
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
                  onClick={fetchBlogs}
                  title="Refresh blogs list"
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
                  <th style={{ width: "80px" }} className="text-center">IMAGE</th>
                  <th style={{ minWidth: "280px" }}>BLOG TITLE &amp; SLUG</th>
                  <th style={{ width: "160px" }}>PUBLISH DATE</th>
                  <th style={{ width: "130px" }} className="text-center">STATUS</th>
                  <th style={{ width: "110px" }} className="text-center">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                      <div className="mt-2 text-muted small">Loading blog articles...</div>
                    </td>
                  </tr>
                ) : blogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="bi bi-journal-x fs-1 d-block mb-2 text-secondary opacity-50"></i>
                      <div className="fw-semibold">No blog posts found.</div>
                      <button className="btn btn-sm btn-primary mt-2" onClick={handleOpenAdd}>
                        <i className="bi bi-plus-lg me-1"></i> Create First Blog
                      </button>
                    </td>
                  </tr>
                ) : (
                  blogs.map((blog, idx) => {
                    const rowNumber = (currentPage - 1) * perPage + idx + 1;
                    const isFuture = blog.publish_date && new Date(blog.publish_date) > new Date();

                    return (
                      <tr key={blog.id}>
                        {/* 1. NO. */}
                        <td className="text-center text-muted fw-semibold small">{rowNumber}</td>

                        {/* 2. Image Thumb */}
                        <td className="text-center">
                          <img
                            src={getFullImageUrl(blog.img)}
                            alt={blog.title}
                            className="rounded border"
                            style={{ width: "56px", height: "38px", objectFit: "cover" }}
                            onError={(e) => {
                              e.currentTarget.src = "/visitor/home/1775506047_Tata-Safari-Facelift-1160x653.webp";
                            }}
                          />
                        </td>

                        {/* 3. Title & Slug */}
                        <td>
                          <div className="fw-bold text-dark text-truncate" style={{ maxWidth: "340px" }}>
                            {blog.title}
                          </div>
                          <div className="text-muted small text-truncate" style={{ maxWidth: "340px", fontSize: "11px" }}>
                            <i className="bi bi-link-45deg me-1"></i>/blogs/{blog.slug}
                          </div>
                        </td>

                        {/* 4. Publish Date */}
                        <td>
                          <div className="small fw-semibold text-dark d-flex align-items-center gap-1">
                            <i className="bi bi-calendar-event text-primary"></i>
                            <span>
                              {blog.publish_date
                                ? new Date(blog.publish_date).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </span>
                          </div>
                          {isFuture ? (
                            <span className="badge bg-warning-subtle text-dark border border-warning" style={{ fontSize: "10px" }}>
                              <i className="bi bi-clock me-1"></i> Scheduled
                            </span>
                          ) : (
                            <span className="text-success extra-small" style={{ fontSize: "10px" }}>
                              ✓ Live on website
                            </span>
                          )}
                        </td>

                        {/* 5. Status Toggle */}
                        <td className="text-center">
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              blog.status === "active"
                                ? "btn-success-subtle text-success border border-success"
                                : "btn-secondary-subtle text-secondary border"
                            } px-2 py-0 fw-semibold`}
                            style={{ fontSize: "11px", borderRadius: "20px" }}
                            onClick={() => handleToggleStatus(blog)}
                            title="Click to toggle Active / Inactive"
                          >
                            <i
                              className={`bi ${
                                blog.status === "active" ? "bi-check-circle-fill text-success" : "bi-x-circle text-muted"
                              } me-1`}
                            ></i>
                            {blog.status === "active" ? "Active" : "Inactive"}
                          </button>
                        </td>

                        {/* 6. Action */}
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary p-1 px-2"
                              onClick={() => handleOpenEdit(blog)}
                              title="Edit Blog"
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger p-1 px-2"
                              onClick={() => setDeletingBlog(blog)}
                              title="Delete Blog"
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

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="card-footer bg-white d-flex align-items-center justify-content-between py-2 px-3">
              <span className="text-muted small">
                Showing {blogs.length} of {totalCount} blogs
              </span>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <li key={page} className={`page-item ${currentPage === page ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(page)}>
                      {page}
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
            ADD / EDIT BLOG MODAL (With CKEditor)
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
                    <i className="bi bi-journal-plus text-primary"></i>
                    <span>{modalMode === "add" ? "Create New Blog Post" : "Edit Blog Post"}</span>
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
                          Blog Title <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Best Blue Cars in India 2026"
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
                            /blogs/
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="best-blue-cars"
                            value={formData.slug}
                            onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      {/* Publish Date */}
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold small">
                          Publish Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.publish_date}
                          onChange={(e) => setFormData((p) => ({ ...p, publish_date: e.target.value }))}
                          required
                          title="Blog will become visible to visitors on this date"
                        />
                        
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
                          <option value="active">Active (Visible)</option>
                          <option value="inactive">Inactive (Draft / Hidden)</option>
                        </select>
                      </div>

                      {/* Featured Image */}
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold small">Blog Featured Image</label>
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
                              style={{ width: "100px", height: "60px", objectFit: "cover" }}
                            />
                            <span className="badge bg-dark-subtle text-dark border ms-2 small">Image Selected</span>
                          </div>
                        )}
                      </div>

                      {/* Blog Content with CKEditor */}
                      <div className="col-12 mt-1">
                        <label className="form-label fw-semibold small mb-1">
                          Blog Content <span className="text-danger">*</span>
                        </label>
                        <CKEditorComponent
                          value={formData.details}
                          onChange={(val) => setFormData((p) => ({ ...p, details: val }))}
                          placeholder="Write your complete blog post here with headings, formatting, lists, tables..."
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
                          <i className="bi bi-check2 me-1"></i> Publish Blog
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

        {/* ===================================================================
            DELETE CONFIRMATION MODAL
            =================================================================== */}
        {deletingBlog && (
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
                    onClick={() => setDeletingBlog(null)}
                    disabled={isSubmitting}
                  ></button>
                </div>
                <div className="modal-body p-4 text-center">
                  <p className="mb-2">
                    Are you sure you want to permanently delete this blog post?
                  </p>
                  <div className="p-3 bg-light rounded-3 text-start small border">
                    <div><strong>Title:</strong> {deletingBlog.title}</div>
                    <div><strong>Slug:</strong> /blogs/{deletingBlog.slug}</div>
                    <div><strong>Publish Date:</strong> {deletingBlog.publish_date}</div>
                  </div>
                  <p className="text-muted small mt-2 mb-0">This article will be removed from website immediately.</p>
                </div>
                <div className="modal-footer border-top py-2 px-4">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setDeletingBlog(null)}
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
                    {isSubmitting ? "Deleting..." : "Yes, Delete Article"}
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
