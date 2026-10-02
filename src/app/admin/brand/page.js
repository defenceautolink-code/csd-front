"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import { hasPermission } from "@/utils/auth";

export default function BrandPage() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const user = localStorage.getItem("user");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) setCurrentUser(JSON.parse(user));
  }, []);
  const can = (permission) => hasPermission(permission, currentUser);

  // API Base URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  const BASE_STORAGE_URL = API_URL.replace(/\/api\/?$/, "");

  // 1. Component States
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editBrand, setEditBrand] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Adding Brand (matches user screenshot)
  const [formData, setFormData] = useState({
    name: "",
    vehicle_type: ["4 Wheeler"], // Array of selected categories
    logo: null,
    status: "Active",
  });

  // 2. Fetch all brands from Laravel backend
  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/brands`);
      if (response.data && response.data.status) {
        setBrands(response.data.data);
      }
    } catch (error) {
      console.log("Error fetching brands:", error);
      showToast("Unable to fetch brands from API.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Run on page load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper for vehicle type checkbox toggling
  const handleTypeToggle = (type) => {
    setFormData((prev) => {
      const current = [...prev.vehicle_type];
      const index = current.indexOf(type);
      if (index > -1) {
        // Uncheck if at least 1 remains
        if (current.length > 1) {
          current.splice(index, 1);
        }
      } else {
        current.push(type);
      }
      return { ...prev, vehicle_type: current };
    });
  };

  const handleEditTypeToggle = (type) => {
    setEditBrand((prev) => {
      const current = Array.isArray(prev.vehicle_type) ? [...prev.vehicle_type] : [];
      const index = current.indexOf(type);
      if (index > -1) {
        if (current.length > 1) {
          current.splice(index, 1);
        }
      } else {
        current.push(type);
      }
      return { ...prev, vehicle_type: current };
    });
  };

  // 3. Create (Store) Brand
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Please enter a brand name.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // Use FormData for file upload support
      const data = new FormData();
      data.append("name", formData.name.trim());
      data.append("status", formData.status);
      data.append("vehicle_type", JSON.stringify(formData.vehicle_type));

      if (formData.logo) {
        data.append("logo", formData.logo);
      }

      const response = await axios.post(`${API_URL}/brands`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data && response.data.status) {
        showToast(`Brand "${formData.name}" added successfully!`, "success");
        setFormData({
          name: "",
          vehicle_type: ["4 Wheeler"],
          logo: null,
          status: "Active",
        });
        setShowAddModal(false);
        fetchBrands(); // Refresh list
      }
    } catch (error) {
      console.log("Create Error:", error);
      const msg = error.response?.data?.message || "Failed to create brand.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Update (Edit) Brand
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editBrand.name.trim()) {
      showToast("Please enter a brand name.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append("_method", "PUT"); // Laravel multipart spoofing
      data.append("name", editBrand.name.trim());
      data.append("status", editBrand.status);
      data.append("vehicle_type", JSON.stringify(editBrand.vehicle_type || []));

      if (editBrand.newLogo) {
        data.append("logo", editBrand.newLogo);
      }

      const response = await axios.post(`${API_URL}/brands/${editBrand.id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data && response.data.status) {
        showToast(`Brand "${editBrand.name}" updated successfully!`, "success");
        setEditBrand(null);
        fetchBrands(); // Refresh list
      }
    } catch (error) {
      console.log("Update Error:", error);
      const msg = error.response?.data?.message || "Failed to update brand.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete Brand
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;

    try {
      const response = await axios.delete(`${API_URL}/brands/${deleteTarget.id}`);
      if (response.data && response.data.status) {
        showToast(`Brand "${deleteTarget.name}" deleted!`, "success");
        setDeleteTarget(null);
        fetchBrands(); // Refresh list
      }
    } catch (error) {
      console.log("Delete Error:", error);
      const msg = error.response?.data?.message || "Failed to delete brand.";
      showToast(msg, "error");
    }
  };

  // Search and category filter
  const filteredBrands = brands.filter((item) => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      !typeFilter ||
      (Array.isArray(item.vehicle_type)
        ? item.vehicle_type.includes(typeFilter)
        : String(item.vehicle_type).includes(typeFilter));
    return matchesSearch && matchesType;
  });

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
              <li className="breadcrumb-item active">Brands</li>
            </ul>
            <h1 className="page-title mt-1">Brand Master</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            {can("brand.export") && <button
              className="btn btn-outline-custom"
              onClick={() => showToast("Exporting brands list as CSV...", "info")}
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export CSV</span>
            </button>}
            {can("brand.create") && <button
              className="btn btn-primary"
              onClick={() => {
                setFormData({
                  name: "",
                  vehicle_type: ["4 Wheeler"],
                  logo: null,
                  status: "Active",
                });
                setShowAddModal(true);
              }}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Add Brand</span>
            </button>}
          </div>
        </div>

        {/* Brand KPI Counters */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Brands</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-shield-shaded"></i>
                </div>
              </div>
              <div className="stat-card-value">{brands.length} Brands</div>
              <span className="text-primary small fw-semibold">Live Database Records</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">4 Wheeler Brands</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-car-front-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {
                  brands.filter((b) =>
                    Array.isArray(b.vehicle_type)
                      ? b.vehicle_type.includes("4 Wheeler")
                      : String(b.vehicle_type).includes("4 Wheeler")
                  ).length
                }{" "}
                Brands
              </div>
              <span className="text-success small fw-semibold">Car OEM Manufacturers</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">2 Wheeler Brands</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-bicycle"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {
                  brands.filter((b) =>
                    Array.isArray(b.vehicle_type)
                      ? b.vehicle_type.includes("2 Wheeler")
                      : String(b.vehicle_type).includes("2 Wheeler")
                  ).length
                }{" "}
                Brands
              </div>
              <span className="text-warning small fw-semibold">Bikes & Scooters</span>
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
              <span className="text-info small fw-semibold">REST API (/api/brands)</span>
            </div>
          </div>
        </div>

        {/* Brands Table Card */}
        <div className="card">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <h5 className="card-title mb-0">Automotive Brand Directory</h5>
              <span className="badge bg-primary-subtle text-primary rounded-pill px-2">
                {filteredBrands.length} Brands
              </span>
            </div>
            <div className="d-flex gap-2" style={{ maxWidth: "420px" }}>
              <select
                className="form-select form-select-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ width: "150px" }}
              >
                <option value="">All Types</option>
                <option value="4 Wheeler">4 Wheeler</option>
                <option value="2 Wheeler">2 Wheeler</option>
              </select>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search brand name..."
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
                  <th>Brand Name</th>
                  <th>Vehicle Types</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading brands from API...
                    </td>
                  </tr>
                ) : filteredBrands.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No brands found. Click <strong>Add Brand</strong> to register one.
                    </td>
                  </tr>
                ) : (
                  filteredBrands.map((brand, index) => {
                    const types = Array.isArray(brand.vehicle_type)
                      ? brand.vehicle_type
                      : [brand.vehicle_type || "4 Wheeler"];

                    return (
                      <tr key={brand.id}>
                        <td>
                          <span className="text-muted small">{index + 1}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {brand.logo ? (
                              <img
                                src={brand.logo.startsWith("http") ? brand.logo : `${BASE_STORAGE_URL}${brand.logo.startsWith("/") ? "" : "/"}${brand.logo}`}
                                alt={brand.name}
                                style={{ width: "28px", height: "28px", objectFit: "contain", borderRadius: "4px" }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "4px",
                                  background: "#2A301E",
                                  color: "#A3E635",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                }}
                              >
                                {brand.name.charAt(0)}
                              </div>
                            )}
                            <h6 className="mb-0 text-dark fw-bold">{brand.name}</h6>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {types.map((t, idx) => (
                              <span
                                key={idx}
                                className={`badge ${t === "2 Wheeler" ? "bg-warning-subtle text-warning" : "bg-info-subtle text-info"
                                  } small`}
                                style={{ fontSize: "11px" }}
                              >
                                <i className={`bi ${t === "2 Wheeler" ? "bi-bicycle" : "bi-car-front"} me-1`}></i>
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {brand.status === "Active" ? (
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
                            {brand.created_at
                              ? new Date(brand.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                              : "N/A"}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="table-actions justify-content-end">
                            {can("brand.edit") && <button
                              className="btn-action btn-edit"
                              title="Edit Brand"
                              onClick={() =>
                                setEditBrand({
                                  id: brand.id,
                                  name: brand.name,
                                  vehicle_type: Array.isArray(brand.vehicle_type)
                                    ? brand.vehicle_type
                                    : [brand.vehicle_type || "4 Wheeler"],
                                  logo: brand.logo,
                                  status: brand.status || "Active",
                                  newLogo: null,
                                })
                              }
                            >
                              <i className="bi bi-pencil"></i>
                            </button>}
                            {can("brand.delete") && <button
                              className="btn-action btn-delete"
                              title="Delete Brand"
                              onClick={() => setDeleteTarget(brand)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            ADD BRAND MODAL (Matches user's exact UI screenshot)
            ------------------------------------------------------------------ */}
        {showAddModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowAddModal(false)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-shield-check text-info"></i> Add Brand
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Brand Name */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Brand Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Maruti Suzuki, Royal Enfield, Honda"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Vehicle Type */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small mb-1">
                      Vehicle Type <span className="text-danger">*</span>
                    </label>
                    <div
                      className="p-2 rounded-2 d-flex align-items-center gap-4 dark-selection-box"
                      style={{ background: "#181A1B", border: "1px solid #33383B" }}
                    >
                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="addCheck2W"
                          checked={formData.vehicle_type.includes("2 Wheeler")}
                          onChange={() => handleTypeToggle("2 Wheeler")}
                        />
                        <label className="form-check-label small" style={{ color: "#FFFFFF" }} htmlFor="addCheck2W">
                          <i className="bi bi-bicycle text-info me-1"></i> 2 Wheeler
                        </label>
                      </div>

                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="addCheck4W"
                          checked={formData.vehicle_type.includes("4 Wheeler")}
                          onChange={() => handleTypeToggle("4 Wheeler")}
                        />
                        <label className="form-check-label small" style={{ color: "#FFFFFF" }} htmlFor="addCheck4W">
                          <i className="bi bi-car-front-fill text-primary me-1"></i> 4 Wheeler
                        </label>
                      </div>
                    </div>
                    <small className="text-muted d-block mt-1" style={{ fontSize: "12px" }}>
                      Select one or both vehicle categories.
                    </small>
                  </div>

                  {/* Brand Logo Image */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small mb-1">
                      Brand Logo Image <span className="text-danger">*</span>
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={(e) => setFormData({ ...formData, logo: e.target.files[0] })}
                    />
                    <small className="text-muted d-block mt-1" style={{ fontSize: "12px" }}>
                      Upload PNG, JPG, or SVG logo file.
                    </small>
                  </div>

                  {/* Status */}
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
                    <span>{isSubmitting ? "Saving..." : "Save Brand"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            EDIT BRAND MODAL
            ------------------------------------------------------------------ */}
        {editBrand && (
          <div className="modal-backdrop-custom" onClick={() => setEditBrand(null)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-shield-check text-info"></i> Edit Brand
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditBrand(null)}
                ></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Brand Name */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Brand Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Maruti Suzuki, Royal Enfield, Honda"
                      required
                      value={editBrand.name}
                      onChange={(e) => setEditBrand({ ...editBrand, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Vehicle Type */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small mb-1">
                      Vehicle Type <span className="text-danger">*</span>
                    </label>
                    <div
                      className="p-2 rounded-2 d-flex align-items-center gap-4 dark-selection-box"
                      style={{ background: "#181A1B", border: "1px solid #33383B" }}
                    >
                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="editCheck2W"
                          checked={
                            Array.isArray(editBrand.vehicle_type) &&
                            editBrand.vehicle_type.includes("2 Wheeler")
                          }
                          onChange={() => handleEditTypeToggle("2 Wheeler")}
                        />
                        <label className="form-check-label small" style={{ color: "#FFFFFF" }} htmlFor="editCheck2W">
                          <i className="bi bi-bicycle text-info me-1"></i> 2 Wheeler
                        </label>
                      </div>

                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="editCheck4W"
                          checked={
                            Array.isArray(editBrand.vehicle_type) &&
                            editBrand.vehicle_type.includes("4 Wheeler")
                          }
                          onChange={() => handleEditTypeToggle("4 Wheeler")}
                        />
                        <label className="form-check-label small" style={{ color: "#FFFFFF" }} htmlFor="editCheck4W">
                          <i className="bi bi-car-front-fill text-primary me-1"></i> 4 Wheeler
                        </label>
                      </div>
                    </div>
                    <small className="text-muted d-block mt-1" style={{ fontSize: "12px" }}>
                      Select one or both vehicle categories.
                    </small>
                  </div>

                  {/* Brand Logo Image */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small mb-1">
                      Brand Logo Image (Optional change)
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={(e) => setEditBrand({ ...editBrand, newLogo: e.target.files[0] })}
                    />
                    <small className="text-muted d-block mt-1" style={{ fontSize: "12px" }}>
                      Upload new PNG, JPG, or SVG logo file to replace existing.
                    </small>
                  </div>

                  {/* Status */}
                  <div className="mb-2">
                    <label className="form-label text-dark fw-bold small">
                      Status <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={editBrand.status}
                      onChange={(e) => setEditBrand({ ...editBrand, status: e.target.value })}
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
                    onClick={() => setEditBrand(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmitting ? "Updating..." : "Save Brand"}</span>
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
                  <i className="bi bi-exclamation-triangle-fill text-danger me-1"></i> Delete Brand
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteTarget(null)}
                ></button>
              </div>

              <div className="modal-body-custom">
                <p className="text-dark mb-0">
                  Are you sure you want to delete brand <strong>"{deleteTarget.name}"</strong>?
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
                  Delete Brand
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
