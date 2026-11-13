"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import Pagination from "@/components/common/Pagination";
import api from "@/lib/axios";

const DEFAULT_COMPANIES = [];

const STORAGE_KEY = "csd_insurance_companies_cache";

export const getStoredInsuranceCompanies = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Clear out legacy mock default companies if present
    if (parsed.some((c) => c.name === "HDFC ERGO General Insurance")) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed;
  } catch (e) {
    return [];
  }
};

export const saveStoredInsuranceCompanies = (list) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("csd_insurance_companies_updated"));
  } catch (e) {
    console.error("Failed saving insurance companies:", e);
  }
};

export default function InsuranceCompanyMasterPage() {
  const { showToast } = useToast();

  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [serverPagination, setServerPagination] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    status: "active",
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/insurance-companies/stats").catch(() => null);
      if (res && res.data && res.data.status && res.data.data) {
        setStats({
          total: Number(res.data.data.total ?? 0),
          active: Number(res.data.data.active ?? 0),
          inactive: Number(res.data.data.inactive ?? 0),
        });
        return;
      }
    } catch (_) {}

    const stored = getStoredInsuranceCompanies();
    setStats({
      total: stored.length,
      active: stored.filter((c) => (c.status || "active").toLowerCase() === "active").length,
      inactive: stored.filter((c) => (c.status || "").toLowerCase() === "inactive").length,
    });
  }, []);

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/insurance-companies", {
        params: {
          search: searchTerm || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          page: currentPage,
          per_page: perPage,
        },
      }).catch(() => null);

      if (res && res.data && res.data.status && Array.isArray(res.data.data)) {
        setCompanies(res.data.data);
        if (res.data.pagination) setServerPagination(res.data.pagination);
        saveStoredInsuranceCompanies(res.data.data);
      } else {
        // Fallback to local storage
        let local = getStoredInsuranceCompanies();
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          local = local.filter((c) => (c.name || "").toLowerCase().includes(s));
        }
        if (statusFilter !== "all") {
          local = local.filter((c) => (c.status || "active").toLowerCase() === statusFilter.toLowerCase());
        }
        const total = local.length;
        const start = (currentPage - 1) * perPage;
        const paged = local.slice(start, start + perPage);
        setCompanies(paged);
        setServerPagination({
          current_page: currentPage,
          last_page: Math.ceil(total / perPage) || 1,
          per_page: perPage,
          total: total,
          from: total > 0 ? start + 1 : 0,
          to: Math.min(start + perPage, total),
        });
      }
    } catch (err) {
      console.error("Error fetching insurance companies:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, perPage]);

  useEffect(() => {
    fetchCompanies();
    fetchStats();
  }, [fetchCompanies, fetchStats]);

  // Handle Add Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Company name is required", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post("/insurance-companies", formData).catch(() => null);
      if (res && res.data && res.data.status) {
        showToast("Insurance company created successfully!", "success");
      } else {
        const stored = getStoredInsuranceCompanies();
        const newObj = {
          id: Date.now(),
          ...formData,
        };
        stored.unshift(newObj);
        saveStoredInsuranceCompanies(stored);
        showToast("Insurance company added successfully!", "success");
      }
      setShowAddModal(false);
      setFormData({
        name: "",
        status: "active",
      });
      fetchCompanies();
      fetchStats();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to add insurance company", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editCompany?.name?.trim()) {
      showToast("Company name is required", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.put(`/insurance-companies/${editCompany.id}`, editCompany).catch(() => null);
      if (res && res.data && res.data.status) {
        showToast("Insurance company updated successfully!", "success");
      } else {
        const stored = getStoredInsuranceCompanies();
        const updated = stored.map((c) => (String(c.id) === String(editCompany.id) ? { ...c, ...editCompany } : c));
        saveStoredInsuranceCompanies(updated);
        showToast("Insurance company updated successfully!", "success");
      }
      setEditCompany(null);
      fetchCompanies();
      fetchStats();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update company", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await api.delete(`/insurance-companies/${deleteTarget.id}`).catch(() => null);
      if (res && res.data && res.data.status) {
        showToast("Insurance company deleted successfully!", "success");
      } else {
        const stored = getStoredInsuranceCompanies();
        const filtered = stored.filter((c) => String(c.id) !== String(deleteTarget.id));
        saveStoredInsuranceCompanies(filtered);
        showToast("Insurance company deleted successfully!", "success");
      }
      setDeleteTarget(null);
      fetchCompanies();
      fetchStats();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete company", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats calculation
  const totalCount = stats.total ?? (serverPagination?.total ?? companies.length);
  const activeCount = stats.active ?? companies.filter((c) => (c.status || "active").toLowerCase() === "active").length;
  const inactiveCount = stats.inactive ?? companies.filter((c) => (c.status || "").toLowerCase() === "inactive").length;

  return (
    <AdminLayout>
      <div className="container-fluid py-3 px-3 px-md-4">
        {/* Top Header */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
          <div>
            <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-building-fill-check text-primary"></i>
              Insurance Company Master
            </h4>
            <p className="text-muted small mb-0">
              Manage insurance providers, partner companies, and coverage partners across all policy modules.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm"
            onClick={() => setShowAddModal(true)}
          >
            <i className="bi bi-plus-lg"></i>
            <span>Add Insurance Company</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-lg-4">
            <div className="card shadow-sm border-0 h-100" style={{ background: "#ffffff", borderRadius: "12px" }}>
              <div className="card-body d-flex align-items-center gap-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center text-primary"
                  style={{ width: "48px", height: "48px", background: "rgba(13, 110, 253, 0.1)" }}
                >
                  <i className="bi bi-shield-shaded fs-4"></i>
                </div>
                <div>
                  <span className="text-muted small d-block">Total Companies</span>
                  <h4 className="fw-bold mb-0 text-dark">{totalCount}</h4>
                </div>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-lg-4">
            <div className="card shadow-sm border-0 h-100" style={{ background: "#ffffff", borderRadius: "12px" }}>
              <div className="card-body d-flex align-items-center gap-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center text-success"
                  style={{ width: "48px", height: "48px", background: "rgba(25, 135, 84, 0.1)" }}
                >
                  <i className="bi bi-check-circle-fill fs-4"></i>
                </div>
                <div>
                  <span className="text-muted small d-block">Active Partners</span>
                  <h4 className="fw-bold mb-0 text-success">{activeCount}</h4>
                </div>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-lg-4">
            <div className="card shadow-sm border-0 h-100" style={{ background: "#ffffff", borderRadius: "12px" }}>
              <div className="card-body d-flex align-items-center gap-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center text-secondary"
                  style={{ width: "48px", height: "48px", background: "rgba(108, 117, 125, 0.1)" }}
                >
                  <i className="bi bi-pause-circle fs-4"></i>
                </div>
                <div>
                  <span className="text-muted small d-block">Inactive Companies</span>
                  <h4 className="fw-bold mb-0 text-muted">{inactiveCount}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search Card */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: "12px", background: "#ffffff" }}>
          <div className="card-body p-3">
            <div className="row g-2 align-items-center">
              <div className="col-md-6 col-lg-4">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="Search by company name..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-outline-secondary border-start-0"
                      type="button"
                      onClick={() => setSearchTerm("")}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-md-4 col-lg-3">
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
              <div className="col-md-2 col-lg-2 ms-auto text-end">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  title="Reset Filters"
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i> Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Data Table Card */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: "12px", background: "#ffffff", overflow: "hidden" }}>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light border-bottom">
                <tr>
                  <th style={{ width: "60px" }} className="text-center">#</th>
                  <th>Company Name</th>
                  <th style={{ width: "140px" }} className="text-center">Status</th>
                  <th style={{ width: "110px" }} className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm me-2"></div>
                      Loading insurance companies...
                    </td>
                  </tr>
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                      <i className="bi bi-building-x display-6 d-block mb-2 text-secondary"></i>
                      No insurance companies found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  companies.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * perPage + idx + 1;
                    const isActive = (item.status || "active").toLowerCase() === "active";
                    return (
                      <tr key={item.id || idx}>
                        <td className="text-center text-muted small">{rowNumber}</td>
                        <td>
                          <div className="fw-bold text-dark d-flex align-items-center gap-2">
                            <i className="bi bi-shield-fill-check text-primary"></i>
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`badge ${isActive ? "bg-success-subtle text-success border border-success-subtle" : "bg-secondary-subtle text-secondary border"} px-2.5 py-1`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setEditCompany({ ...item })}
                              title="Edit Company"
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setDeleteTarget(item)}
                              title="Delete Company"
                            >
                              <i className="bi bi-trash3-fill"></i>
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

          {/* Pagination Controls */}
          {!isLoading && (serverPagination?.total > 0 || companies.length > 0) && (
            <Pagination
              currentPage={serverPagination?.current_page || currentPage}
              lastPage={serverPagination?.last_page || Math.ceil((serverPagination?.total || totalCount || companies.length) / perPage) || 1}
              total={serverPagination?.total ?? totalCount}
              perPage={perPage}
              onPageChange={(p) => setCurrentPage(p)}
              onPerPageChange={(n) => {
                setPerPage(n);
                setCurrentPage(1);
              }}
              perPageOptions={[10, 15, 25, 50]}
              itemName="companies"
            />
          )}
        </div>

        {/* Modal: Add Insurance Company */}
        {showAddModal && (
          <div className="modal-backdrop-custom">
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-building-add"></i>
                  Add Insurance Company
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddSubmit}>
                <div className="modal-body-custom p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small">
                        Company Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. HDFC ERGO General Insurance"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small">Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer-custom d-flex justify-content-between p-3 border-top">
                  <button type="button" className="btn btn-outline-custom" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Company"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Insurance Company */}
        {editCompany && (
          <div className="modal-backdrop-custom">
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-pencil-square"></i>
                  Edit Insurance Company
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditCompany(null)}
                ></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body-custom p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small">
                        Company Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editCompany.name}
                        onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small">Status</label>
                      <select
                        className="form-select"
                        value={editCompany.status || "active"}
                        onChange={(e) => setEditCompany({ ...editCompany, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer-custom d-flex justify-content-between p-3 border-top">
                  <button type="button" className="btn btn-outline-custom" onClick={() => setEditCompany(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Updating..." : "Update Company"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation */}
        {deleteTarget && (
          <div className="modal-backdrop-custom">
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center bg-danger text-white">
                <h5 className="modal-title-custom mb-0 fs-6 fw-bold">
                  <i className="bi bi-trash3-fill me-2"></i>
                  Delete Insurance Company
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteTarget(null)}
                ></button>
              </div>
              <div className="modal-body-custom p-4">
                <p className="text-dark mb-2">
                  Are you sure you want to delete this insurance company?
                </p>
                <div className="p-2 bg-light border rounded small fw-bold text-dark">
                  {deleteTarget.name}
                </div>
                <p className="text-danger small mt-2 mb-0">
                  <i className="bi bi-info-circle me-1"></i>
                  This company will be removed from future policy options.
                </p>
              </div>
              <div className="modal-footer-custom d-flex justify-content-end gap-2 p-3 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-light border"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger d-inline-flex align-items-center gap-1"
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                >
                  <i className="bi bi-trash3-fill"></i>
                  <span>{isSubmitting ? "Deleting..." : "Yes, Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-backdrop-custom {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1060;
          padding: 1rem;
        }
        .modal-dialog-custom {
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modalSlideIn 0.2s ease-out;
        }
        .modal-header-custom {
          background: #3f4912;
          padding: 1rem 1.25rem;
        }
        .btn-outline-custom {
          border: 1px solid #cbd5e1;
          color: #475569;
          background: #ffffff;
        }
        .btn-outline-custom:hover {
          background: #f1f5f9;
        }
        @keyframes modalSlideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </AdminLayout>
  );
}

