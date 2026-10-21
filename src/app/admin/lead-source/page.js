"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import Pagination from "@/components/common/Pagination";
import * as XLSX from "xlsx";

export default function LeadSourcePage() {
  const { showToast } = useToast();

  // API URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  // 1. Component States
  const [leadSources, setLeadSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dedicated Lead Source Stats State from Backend API
  const [sourceStats, setSourceStats] = useState({
    total_channels: 0,
    active_channels: 0,
    top_channel: "Showroom Walk-in",
  });

  const fetchSourceStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/lead-sources/stats`);
      if (res.data && res.data.status && res.data.data) {
        setSourceStats(res.data.data);
      }
    } catch (e) {
      console.log("Error fetching lead source stats:", e);
    }
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [serverPagination, setServerPagination] = useState(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSource, setEditSource] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Adding New Source (matches user screenshot)
  const [formData, setFormData] = useState({
    title: "",
    status: "Active",
  });

  // 2. Fetch all lead sources from Laravel backend
  const fetchLeadSources = async () => {
    setIsLoading(true);
    fetchSourceStats();
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const response = await axios.get(`${API_URL}/lead-sources`, { params });
      if (response.data && response.data.status) {
        setLeadSources(response.data.data || []);
        if (response.data.pagination) {
          setServerPagination(response.data.pagination);
        } else if (response.data.meta) {
          setServerPagination(response.data.meta);
        } else {
          setServerPagination(null);
        }
      }
    } catch (error) {
      console.log("Error fetching lead sources:", error);
      showToast("Unable to fetch lead sources from API.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Run on page load & pagination changes
  useEffect(() => {
    fetchLeadSources();
    fetchSourceStats();
  }, [currentPage, perPage, searchTerm]);

  // Export to Excel handler
  const [isExporting, setIsExporting] = useState(false);
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      showToast("Preparing lead sources Excel sheet...", "info");
      const response = await axios.get(`${API_URL}/lead-sources`, {
        params: { all: true },
      });

      let dataToExport = [];
      if (response.data && response.data.status && Array.isArray(response.data.data)) {
        dataToExport = response.data.data;
      } else {
        dataToExport = leadSources;
      }

      if (dataToExport.length === 0) {
        showToast("No lead sources available to export.", "warning");
        setIsExporting(false);
        return;
      }

      const rows = dataToExport.map((source, index) => ({
        "Sr No": index + 1,
        "Source Title": source.title || "",
        "Status": source.status || "Active",
        "Created Date": source.created_at ? new Date(source.created_at).toLocaleDateString("en-IN") : "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 8 },
        { wch: 30 },
        { wch: 15 },
        { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Lead Sources");
      const fileName = `Lead_Sources_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showToast("Lead Sources Excel file downloaded successfully!", "success");
    } catch (error) {
      console.error("Export Error:", error);
      showToast("Failed to export lead sources to Excel.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Create (Store) Lead Source
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("Please enter a title.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/lead-sources`, {
        title: formData.title.trim(),
        status: formData.status,
      });

      if (response.data && response.data.status) {
        showToast(`Lead source "${formData.title}" added successfully!`, "success");
        setFormData({ title: "", status: "Active" });
        setShowAddModal(false);
        fetchLeadSources(); // Refresh list
      }
    } catch (error) {
      console.log("Create Error:", error);
      const msg = error.response?.data?.message || "Failed to create lead source.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Update (Edit) Lead Source
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editSource.title.trim()) {
      showToast("Please enter a title.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.put(`${API_URL}/lead-sources/${editSource.id}`, {
        title: editSource.title.trim(),
        status: editSource.status,
      });

      if (response.data && response.data.status) {
        showToast(`Lead source updated successfully!`, "success");
        setEditSource(null);
        fetchLeadSources(); // Refresh list
      }
    } catch (error) {
      console.log("Update Error:", error);
      const msg = error.response?.data?.message || "Failed to update lead source.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete Lead Source
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;

    try {
      const response = await axios.delete(`${API_URL}/lead-sources/${deleteTarget.id}`);
      if (response.data && response.data.status) {
        showToast(`Lead source "${deleteTarget.title}" deleted!`, "success");
        setDeleteTarget(null);
        fetchLeadSources(); // Refresh list
      }
    } catch (error) {
      console.log("Delete Error:", error);
      const msg = error.response?.data?.message || "Failed to delete lead source.";
      showToast(msg, "error");
    }
  };

  // Handle server-side vs client-side pagination fallback
  const isServerPaginated = Boolean(serverPagination);

  // Search filter
  const filteredSources = isServerPaginated
    ? leadSources
    : leadSources.filter((item) =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const totalSources = isServerPaginated
    ? (serverPagination.total ?? leadSources.length)
    : filteredSources.length;

  const lastPage = isServerPaginated
    ? (serverPagination.last_page ?? Math.max(1, Math.ceil(totalSources / perPage)))
    : Math.max(1, Math.ceil(totalSources / perPage));

  const paginatedSources = isServerPaginated
    ? leadSources
    : filteredSources.slice(
        (currentPage - 1) * perPage,
        currentPage * perPage
      );

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Breadcrumbs & Header Actions */}
        <div className="page-header-wrapper">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <a href="#">Master Data</a>
              </li>
              <li className="breadcrumb-item active">Lead Sources</li>
            </ul>
            <h1 className="page-title mt-1">Lead Source Master</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-custom"
              onClick={handleExportExcel}
              disabled={isExporting}
            >
              <i className={`bi ${isExporting ? "bi-hourglass-split" : "bi-file-earmark-excel"} text-success`}></i>
              <span>{isExporting ? "Exporting..." : "Export Excel"}</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setFormData({ title: "", status: "Active" });
                setShowAddModal(true);
              }}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Add Lead Source</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-4 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Channels</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-diagram-3-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {sourceStats.total_channels || totalSources} Sources
              </div>
              <span className="text-primary small fw-semibold">Live Database Records</span>
            </div>
          </div>

          <div className="col-md-4 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Active Channels</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-check2-circle"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {sourceStats.active_channels} Active
              </div>
              <span className="text-warning small fw-semibold">Enabled in Pipeline</span>
            </div>
          </div>
        </div>

        {/* Lead Sources Table Card */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <h5 className="card-title mb-0">Lead Acquisition Sources</h5>
              <span className="badge bg-primary-subtle text-primary rounded-pill px-2">
                {totalSources} Sources
              </span>
            </div>
            <div style={{ maxWidth: "260px" }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search channel title..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>No</th>
                  <th style={{ width: "90px" }} className="text-center">Actions</th>
                  <th>Source Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading lead sources from API...
                    </td>
                  </tr>
                ) : filteredSources.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      No lead sources found. Click <strong>Add Lead Source</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedSources.map((source, index) => (
                    <tr key={source.id}>
                      <td>
                        <span className="text-muted small">
                          {(currentPage - 1) * perPage + index + 1}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="table-actions justify-content-center">
                          <button
                            className="btn-action btn-edit"
                            title="Edit Source"
                            onClick={() =>
                              setEditSource({
                                id: source.id,
                                title: source.title,
                                status: source.status || "Active",
                              })
                            }
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn-action btn-delete"
                            title="Delete Source"
                            onClick={() => setDeleteTarget(source)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                      <td>
                        <h6 className="mb-0 text-dark fw-bold">{source.title}</h6>
                      </td>
                      <td>
                        {source.status === "Active" ? (
                          <span className="badge-custom badge-active">
                            <span className="badge-dot-indicator"></span>Active
                          </span>
                        ) : (
                          <span className="badge-custom badge-inactive">
                            <span className="badge-dot-indicator"></span>Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!isLoading && filteredSources.length > 0 && (
            <div className="p-3 border-top bg-white">
              <Pagination
                currentPage={currentPage}
                lastPage={lastPage}
                total={totalSources}
                perPage={perPage}
                onPageChange={(page) => setCurrentPage(page)}
                onPerPageChange={(newPerPage) => {
                  setPerPage(newPerPage);
                  setCurrentPage(1);
                }}
                perPageOptions={[10, 20, 50, 100]}
                itemName="lead sources"
              />
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------
            ADD LEAD SOURCE MODAL (Matches user's exact UI screenshot)
            ------------------------------------------------------------------ */}
        {showAddModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowAddModal(false)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-diagram-3 text-info"></i> Add Lead Source
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Title Field */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Website, Facebook, Instagram, Reference, Other"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Status Field */}
                  <div className="mb-2">
                    <label className="form-label text-dark fw-bold small">
                      Status <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmitting ? "Saving..." : "Save Source"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            EDIT LEAD SOURCE MODAL
            ------------------------------------------------------------------ */}
        {editSource && (
          <div className="modal-backdrop-custom" onClick={() => setEditSource(null)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-pencil-square text-info"></i> Edit Lead Source
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditSource(null)}
                ></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Title Field */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Website, Facebook, Instagram, Reference, Other"
                      required
                      value={editSource.title}
                      onChange={(e) => setEditSource({ ...editSource, title: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Status Field */}
                  <div className="mb-2">
                    <label className="form-label text-dark fw-bold small">
                      Status <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={editSource.status}
                      onChange={(e) => setEditSource({ ...editSource, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setEditSource(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmitting ? "Updating..." : "Save Source"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            DELETE CONFIRMATION MODAL
            ------------------------------------------------------------------ */}
        {deleteTarget && (
          <div className="modal-backdrop-custom" onClick={() => setDeleteTarget(null)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-danger">
                  <i className="bi bi-exclamation-triangle-fill text-danger me-1"></i> Delete Lead Source
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteTarget(null)}
                ></button>
              </div>

              <div className="modal-body-custom">
                <p className="text-dark mb-0">
                  Are you sure you want to delete lead source <strong>"{deleteTarget.title}"</strong>?
                </p>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-outline-custom"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteSubmit}>
                  Delete Source
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
