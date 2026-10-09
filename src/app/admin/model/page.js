"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import { hasPermission } from "@/utils/auth";
import Pagination from "@/components/common/Pagination";

// Helper to filter brands based on vehicle segment
const isBrandMatchingSegment = (brand, segment) => {
  if (!segment || !brand) return true;
  const vt = brand.vehicle_type || brand.vehicle_segment || brand.segment;
  if (!vt) return true;
  const segNormalized = String(segment).toLowerCase().trim();
  const segNum = segNormalized.includes("2") ? "2" : segNormalized.includes("4") ? "4" : "";

  if (Array.isArray(vt)) {
    return vt.some((t) => {
      const s = String(t).toLowerCase().trim();
      return s === segNormalized || (segNum && s.includes(segNum));
    });
  }

  if (typeof vt === "string") {
    const s = vt.toLowerCase().trim();
    return s === segNormalized || (segNum && s.includes(segNum));
  }

  return true;
};

export default function ModelPage() {
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

  // 1. Component States
  const [models, setModels] = useState([]);
  const [brands, setBrands] = useState([]);
  const [serverPagination, setServerPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editModel, setEditModel] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Adding Model (matches user screenshot)
  const [formData, setFormData] = useState({
    vehicle_segment: "4 Wheeler", // "2 Wheeler" or "4 Wheeler"
    brand_id: "",
    name: "",
    status: "Active",
  });

  // 2. Fetch all models from Laravel backend
  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (brandFilter) params.brand_id = brandFilter;
      if (segmentFilter) params.vehicle_segment = segmentFilter;

      const response = await axios.get(`${API_URL}/models`, { params });
      if (response.data && response.data.status) {
        setModels(response.data.data || []);
        if (response.data.pagination) {
          setServerPagination(response.data.pagination);
        } else if (response.data.meta) {
          setServerPagination(response.data.meta);
        } else {
          setServerPagination(null);
        }
      }
    } catch (error) {
      console.log("Error fetching models:", error);
      showToast("Unable to fetch models from API.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all brands to populate dropdowns
  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${API_URL}/brands`);
      if (response.data && response.data.status) {
        setBrands(response.data.data);
      }
    } catch (error) {
      console.log("Error fetching brands:", error);
    }
  };

  // Run on page load and param change
  useEffect(() => {
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage, searchTerm, brandFilter, segmentFilter]);

  useEffect(() => {
    fetchBrands();
  }, []);

  // 3. Create (Store) Model
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.brand_id) {
      showToast("Please select a brand.", "error");
      return;
    }
    if (!formData.name.trim()) {
      showToast("Please enter a model name.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/models`, {
        name: formData.name.trim(),
        brand_id: formData.brand_id,
        vehicle_segment: formData.vehicle_segment,
        status: formData.status,
      });

      if (response.data && response.data.status) {
        showToast(`Model "${formData.name}" added successfully!`, "success");
        setFormData({
          vehicle_segment: "4 Wheeler",
          brand_id: "",
          name: "",
          status: "Active",
        });
        setShowAddModal(false);
        fetchModels(); // Refresh list
      }
    } catch (error) {
      console.log("Create Error:", error);
      const msg = error.response?.data?.message || "Failed to create model.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Update (Edit) Model
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editModel.brand_id) {
      showToast("Please select a brand.", "error");
      return;
    }
    if (!editModel.name.trim()) {
      showToast("Please enter a model name.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.put(`${API_URL}/models/${editModel.id}`, {
        name: editModel.name.trim(),
        brand_id: editModel.brand_id,
        vehicle_segment: editModel.vehicle_segment,
        status: editModel.status,
      });

      if (response.data && response.data.status) {
        showToast(`Model "${editModel.name}" updated successfully!`, "success");
        setEditModel(null);
        fetchModels(); // Refresh list
      }
    } catch (error) {
      console.log("Update Error:", error);
      const msg = error.response?.data?.message || "Failed to update model.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete Model
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;

    try {
      const response = await axios.delete(`${API_URL}/models/${deleteTarget.id}`);
      if (response.data && response.data.status) {
        showToast(`Model "${deleteTarget.name}" deleted!`, "success");
        setDeleteTarget(null);
        fetchModels(); // Refresh list
      }
    } catch (error) {
      console.log("Delete Error:", error);
      const msg = error.response?.data?.message || "Failed to delete model.";
      showToast(msg, "error");
    }
  };

  // Handle server-side vs client-side pagination fallback
  const isServerPaginated = Boolean(serverPagination);

  // Filter models by search, brand, and segment (fallback when backend returns full list)
  const filteredModels = isServerPaginated
    ? models
    : models.filter((item) => {
        const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBrand = !brandFilter || String(item.brand_id) === String(brandFilter);
        const matchesSegment = !segmentFilter || item.vehicle_segment === segmentFilter;
        return matchesSearch && matchesBrand && matchesSegment;
      });

  const totalModels = isServerPaginated
    ? (serverPagination.total ?? models.length)
    : filteredModels.length;

  const lastPage = isServerPaginated
    ? (serverPagination.last_page ?? Math.max(1, Math.ceil(totalModels / perPage)))
    : Math.max(1, Math.ceil(totalModels / perPage));

  const paginatedModels = isServerPaginated
    ? models
    : filteredModels.slice(
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
              <li className="breadcrumb-item active">Models</li>
            </ul>
            <h1 className="page-title mt-1">Vehicle Model Master</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            {can("model.export") && <button
              className="btn btn-outline-custom"
              onClick={() => showToast("Exporting model catalog as CSV...", "info")}
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export CSV</span>
            </button>}
            {can("model.create") && <button
              className="btn btn-primary"
              onClick={() => {
                setFormData({
                  vehicle_segment: "4 Wheeler",
                  brand_id: brands[0]?.id || "",
                  name: "",
                  status: "Active",
                });
                setShowAddModal(true);
              }}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Add Model</span>
            </button>}
          </div>
        </div>

        {/* Model KPI Counters */}
        <div className="row g-3 mb-4">
          <div className="col-md-4 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Models</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-car-front-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{models.length} Models</div>
              <span className="text-primary small fw-semibold">Live Database Records</span>
            </div>
          </div>

          <div className="col-md-4 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">4 Wheeler Models</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-car-front"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {models.filter((m) => m.vehicle_segment === "4 Wheeler").length} Models
              </div>
              <span className="text-success small fw-semibold">Cars, SUVs & Sedans</span>
            </div>
          </div>

          <div className="col-md-4 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">2 Wheeler Models</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-bicycle"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {models.filter((m) => m.vehicle_segment === "2 Wheeler").length} Models
              </div>
              <span className="text-warning small fw-semibold">Bikes & Scooters</span>
            </div>
          </div>
        </div>

        {/* Models Table Card */}
        <div className="card">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <h5 className="card-title mb-0">Vehicle Models Catalog</h5>
              <span className="badge bg-primary-subtle text-primary rounded-pill px-2">
                {filteredModels.length} Models
              </span>
            </div>
            <div className="d-flex flex-wrap gap-2" style={{ maxWidth: "550px" }}>
              <select
                className="form-select form-select-sm"
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                style={{ width: "140px" }}
              >
                <option value="">All Segments</option>
                <option value="4 Wheeler">4 Wheeler</option>
                <option value="2 Wheeler">2 Wheeler</option>
              </select>

              <select
                className="form-select form-select-sm"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                style={{ width: "160px" }}
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search model name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "180px" }}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th style={{ width: "90px" }} className="text-center">Actions</th>
                  <th>Model Name</th>
                  <th>Brand</th>
                  <th>Segment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading vehicle models from API...
                    </td>
                  </tr>
                ) : filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No models found. Click <strong>Add Model</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedModels.map((item, index) => (
                    <tr key={item.id}>
                      <td>
                        <span className="text-muted small">{(currentPage - 1) * perPage + index + 1}</span>
                      </td>
                      <td className="text-center">
                        <div className="table-actions justify-content-center">
                          {can("model.edit") && <button
                            className="btn-action btn-edit"
                            title="Edit Model"
                            onClick={() =>
                              setEditModel({
                                id: item.id,
                                name: item.name,
                                brand_id: item.brand_id,
                                vehicle_segment: item.vehicle_segment || "4 Wheeler",
                                status: item.status || "Active",
                              })
                            }
                          >
                            <i className="bi bi-pencil"></i>
                          </button>}
                          {can("model.delete") && <button
                            className="btn-action btn-delete"
                            title="Delete Model"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <i
                            className={`bi ${item.vehicle_segment === "2 Wheeler"
                                ? "bi-bicycle text-warning"
                                : "bi-car-front-fill text-info"
                              }`}
                          ></i>
                          <h6 className="mb-0 text-dark fw-bold">{item.name}</h6>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary">
                          {item.brand?.name || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${item.vehicle_segment === "2 Wheeler"
                              ? "bg-warning-subtle text-warning"
                              : "bg-info-subtle text-info"
                            } small`}
                        >
                          {item.vehicle_segment}
                        </span>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!isLoading && filteredModels.length > 0 && (
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              total={totalModels}
              perPage={perPage}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
              perPageOptions={[10, 20, 50, 100]}
              itemName="models"
            />
          )}
        </div>

        {/* ------------------------------------------------------------------
            ADD MODEL MODAL (Matches user's exact UI screenshot)
            ------------------------------------------------------------------ */}
        {showAddModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowAddModal(false)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-car-front-fill text-info"></i> Add Model
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Vehicle Segment (Radio Buttons) */}
                  <div className="mb-3">
                    <label className="form-label text-white fw-bold small mb-1">
                      Vehicle Segment <span className="text-danger">*</span>
                    </label>
                    <div
                      className="p-2 rounded-2 d-flex align-items-center gap-4 dark-selection-box"
                      style={{ background: "#181A1B", border: "1px solid #33383B" }}
                    >
                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="addVehicleSegment"
                          id="addRadio2W"
                          value="2 Wheeler"
                          checked={formData.vehicle_segment === "2 Wheeler"}
                          onChange={(e) => {
                            const newSeg = e.target.value;
                            const isCurrentBrandValid = brands.some(
                              (b) => String(b.id) === String(formData.brand_id) && isBrandMatchingSegment(b, newSeg)
                            );
                            setFormData({
                              ...formData,
                              vehicle_segment: newSeg,
                              ...(isCurrentBrandValid ? {} : { brand_id: "" }),
                            });
                          }}
                        />
                        <label className="form-check-label small" htmlFor="addRadio2W">
                          <i className="bi bi-bicycle text-info me-1"></i> 2 Wheeler
                        </label>
                      </div>

                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="addVehicleSegment"
                          id="addRadio4W"
                          value="4 Wheeler"
                          checked={formData.vehicle_segment === "4 Wheeler"}
                          onChange={(e) => {
                            const newSeg = e.target.value;
                            const isCurrentBrandValid = brands.some(
                              (b) => String(b.id) === String(formData.brand_id) && isBrandMatchingSegment(b, newSeg)
                            );
                            setFormData({
                              ...formData,
                              vehicle_segment: newSeg,
                              ...(isCurrentBrandValid ? {} : { brand_id: "" }),
                            });
                          }}
                        />
                        <label className="form-check-label small" htmlFor="addRadio4W">
                          <i className="bi bi-car-front-fill text-primary me-1"></i> 4 Wheeler
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Select Brand Dropdown */}
                  <div className="mb-3">
                    <label className="form-label text-white fw-bold small">
                      Select Brand <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      required
                      value={formData.brand_id}
                      onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                    >
                      <option value="">Choose Brand</option>
                      {brands
                        .filter((b) => isBrandMatchingSegment(b, formData.vehicle_segment))
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Model Name Input */}
                  <div className="mb-3">
                    <label className="form-label text-white fw-bold small">
                      Model Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Brezza, Nexon, Classic 350"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="mb-2">
                    <label className="form-label text-white fw-bold small">
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
                    <span>{isSubmitting ? "Saving..." : "Save Model"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            EDIT MODEL MODAL
            ------------------------------------------------------------------ */}
        {editModel && (
          <div className="modal-backdrop-custom" onClick={() => setEditModel(null)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-pencil-square text-info"></i> Edit Model
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditModel(null)}
                ></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Vehicle Segment (Radio Buttons) */}
                  <div className="mb-3">
                    <label className="form-label text-white fw-bold small mb-1">
                      Vehicle Segment <span className="text-danger">*</span>
                    </label>
                    <div
                      className="p-2 rounded-2 d-flex align-items-center gap-4 dark-selection-box"
                      style={{ background: "#181A1B", border: "1px solid #33383B" }}
                    >
                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="editVehicleSegment"
                          id="editRadio2W"
                          value="2 Wheeler"
                          checked={editModel.vehicle_segment === "2 Wheeler"}
                          onChange={(e) => {
                            const newSeg = e.target.value;
                            const isCurrentBrandValid = brands.some(
                              (b) => String(b.id) === String(editModel.brand_id) && isBrandMatchingSegment(b, newSeg)
                            );
                            setEditModel({
                              ...editModel,
                              vehicle_segment: newSeg,
                              ...(isCurrentBrandValid ? {} : { brand_id: "" }),
                            });
                          }}
                        />
                        <label className="form-check-label small" htmlFor="editRadio2W">
                          <i className="bi bi-bicycle text-info me-1"></i> 2 Wheeler
                        </label>
                      </div>

                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="editVehicleSegment"
                          id="editRadio4W"
                          value="4 Wheeler"
                          checked={editModel.vehicle_segment === "4 Wheeler"}
                          onChange={(e) => {
                            const newSeg = e.target.value;
                            const isCurrentBrandValid = brands.some(
                              (b) => String(b.id) === String(editModel.brand_id) && isBrandMatchingSegment(b, newSeg)
                            );
                            setEditModel({
                              ...editModel,
                              vehicle_segment: newSeg,
                              ...(isCurrentBrandValid ? {} : { brand_id: "" }),
                            });
                          }}
                        />
                        <label className="form-check-label small" htmlFor="editRadio4W">
                          <i className="bi bi-car-front-fill text-primary me-1"></i> 4 Wheeler
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Select Brand Dropdown */}
                  <div className="mb-3">
                    <label className="form-label text-white fw-bold small">
                      Select Brand <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      required
                      value={editModel.brand_id}
                      onChange={(e) => setEditModel({ ...editModel, brand_id: e.target.value })}
                    >
                      <option value="">Choose Brand</option>
                      {brands
                        .filter((b) => isBrandMatchingSegment(b, editModel.vehicle_segment))
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Model Name Input */}
                  <div className="mb-3">
                    <label className="form-label text-white fw-bold small">
                      Model Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Brezza, Nexon, Classic 350"
                      required
                      value={editModel.name}
                      onChange={(e) => setEditModel({ ...editModel, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="mb-2">
                    <label className="form-label text-white fw-bold small">
                      Status <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={editModel.status}
                      onChange={(e) => setEditModel({ ...editModel, status: e.target.value })}
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
                    onClick={() => setEditModel(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmitting ? "Updating..." : "Save Model"}</span>
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
                  <i className="bi bi-exclamation-triangle-fill text-danger me-1"></i> Delete Model
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteTarget(null)}
                ></button>
              </div>

              <div className="modal-body-custom">
                <p className="text-dark mb-0">
                  Are you sure you want to delete model <strong>"{deleteTarget.name}"</strong>?
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
                  Delete Model
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
