"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";

export default function LeadStatusPage() {
  const { showToast } = useToast();

  // API Base URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  // 1. Component States
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editStatus, setEditStatus] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Adding New Lead Status (matches user screenshot)
  const [formData, setFormData] = useState({
    name: "",
    status: "Active", // Status State
  });

  // 2. Fetch all lead statuses from Laravel backend
  const fetchLeadStatuses = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/lead-statuses`);
      if (response.data && response.data.status) {
        setLeadStatuses(response.data.data);
      }
    } catch (error) {
      console.log("Error fetching lead statuses:", error);
      showToast("Unable to fetch lead statuses from API.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Run on page load
  useEffect(() => {
    fetchLeadStatuses();
  }, []);

  // 3. Create (Store) Lead Status
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Please enter a status name.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/lead-statuses`, {
        name: formData.name.trim(),
        status: formData.status,
      });

      if (response.data && response.data.status) {
        showToast(`Lead status "${formData.name}" added successfully!`, "success");
        setFormData({ name: "", status: "Active" });
        setShowAddModal(false);
        fetchLeadStatuses(); // Refresh list
      }
    } catch (error) {
      console.log("Create Error:", error);
      const msg = error.response?.data?.message || "Failed to create lead status.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Update (Edit) Lead Status
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editStatus.name.trim()) {
      showToast("Please enter a status name.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.put(`${API_URL}/lead-statuses/${editStatus.id}`, {
        name: editStatus.name.trim(),
        status: editStatus.status,
      });

      if (response.data && response.data.status) {
        showToast(`Lead status updated successfully!`, "success");
        setEditStatus(null);
        fetchLeadStatuses(); // Refresh list
      }
    } catch (error) {
      console.log("Update Error:", error);
      const msg = error.response?.data?.message || "Failed to update lead status.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete Lead Status
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;

    try {
      const response = await axios.delete(`${API_URL}/lead-statuses/${deleteTarget.id}`);
      if (response.data && response.data.status) {
        showToast(`Lead status "${deleteTarget.name}" deleted!`, "success");
        setDeleteTarget(null);
        fetchLeadStatuses(); // Refresh list
      }
    } catch (error) {
      console.log("Delete Error:", error);
      const msg = error.response?.data?.message || "Failed to delete lead status.";
      showToast(msg, "error");
    }
  };

  // Search filter
  const filteredStatuses = leadStatuses.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
              <li className="breadcrumb-item active">Lead Statuses</li>
            </ul>
            <h1 className="page-title mt-1">Lead Status Master</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-custom"
              onClick={() => showToast("Exporting pipeline stages as CSV...", "info")}
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export CSV</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setFormData({ name: "", status: "Active" });
                setShowAddModal(true);
              }}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Add Lead Status</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Configured Stages</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-tag-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{leadStatuses.length} Stages</div>
              <span className="text-primary small fw-semibold">Live Database Records</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Active Stages</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-check2-circle"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {leadStatuses.filter((s) => s.status === "Active").length} Active
              </div>
              <span className="text-success small fw-semibold">Active in Pipeline</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Initial Stage</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-lightning-charge-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">New Lead</div>
              <span className="text-warning small fw-semibold">Default Ingestion Stage</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Backend API</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-hdd-network-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">Connected</div>
              <span className="text-info small fw-semibold">REST API (/api/lead-statuses)</span>
            </div>
          </div>
        </div>

        {/* Lead Status Table Card */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <h5 className="card-title mb-0">Pipeline Stage Configurations</h5>
              <span className="badge bg-primary-subtle text-primary rounded-pill px-2">
                {filteredStatuses.length} Statuses
              </span>
            </div>
            <div style={{ maxWidth: "260px" }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search status name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th>Status Name</th>
                  <th>Status State</th>
                  <th>Created Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading lead statuses from API...
                    </td>
                  </tr>
                ) : filteredStatuses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      No lead statuses found. Click <strong>Add Lead Status</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  filteredStatuses.map((item, index) => (
                    <tr key={item.id}>
                      <td>
                        <span className="text-muted small">{index + 1}</span>
                      </td>
                      <td>
                        <h6 className="mb-0 text-dark fw-bold">{item.name}</h6>
                      </td>
                      <td>
                        {item.status === "Active" ? (
                          <span className="badge-custom badge-active">
                            <span className="badge-dot-indicator"></span>Active
                          </span>
                        ) : (
                          <span className="badge-custom badge-inactive">
                            <span className="badge-dot-indicator"></span>Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-muted small">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A"}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="table-actions justify-content-end">
                          <button
                            className="btn-action btn-edit"
                            title="Edit Status"
                            onClick={() =>
                              setEditStatus({
                                id: item.id,
                                name: item.name,
                                status: item.status || "Active",
                              })
                            }
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn-action btn-delete"
                            title="Delete Status"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            ADD LEAD STATUS MODAL (Matches user's exact UI screenshot)
            ------------------------------------------------------------------ */}
        {showAddModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowAddModal(false)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-tag-fill text-info"></i> Add Lead Status
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Status Name Field */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Status Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. New, Deal Won, Deal Lost, In Follow-Up"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Status State Field */}
                  <div className="mb-2">
                    <label className="form-label text-dark fw-bold small">
                      Status State <span className="text-danger">*</span>
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
                    <span>{isSubmitting ? "Saving..." : "Save Status"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            EDIT LEAD STATUS MODAL
            ------------------------------------------------------------------ */}
        {editStatus && (
          <div className="modal-backdrop-custom" onClick={() => setEditStatus(null)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-pencil-square text-info"></i> Edit Lead Status
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditStatus(null)}
                ></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Status Name Field */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Status Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. New, Deal Won, Deal Lost, In Follow-Up"
                      required
                      value={editStatus.name}
                      onChange={(e) => setEditStatus({ ...editStatus, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Status State Field */}
                  <div className="mb-2">
                    <label className="form-label text-dark fw-bold small">
                      Status State <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={editStatus.status}
                      onChange={(e) => setEditStatus({ ...editStatus, status: e.target.value })}
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
                    onClick={() => setEditStatus(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmitting ? "Updating..." : "Save Status"}</span>
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
                  <i className="bi bi-exclamation-triangle-fill text-danger me-1"></i> Delete Lead Status
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteTarget(null)}
                ></button>
              </div>

              <div className="modal-body-custom">
                <p className="text-dark mb-0">
                  Are you sure you want to delete pipeline status <strong>"{deleteTarget.name}"</strong>?
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
                  Delete Status
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
