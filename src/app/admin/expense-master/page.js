"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import expenseApi from "@/services/expenseApi";

export default function ExpenseMasterPage() {
  const { showToast } = useToast();

  // State Management
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State
  const [titleInput, setTitleInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load from Live Backend API
  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await expenseApi.getCategories();
      if (res && res.data && Array.isArray(res.data)) {
        const mapped = res.data.map((c) => ({
          ...c,
          id: c.id,
          title: c.name || c.title,
          name: c.name || c.title,
          description: c.description || "",
          status: c.status === 1 || c.status === "Active" ? "Active" : "Inactive",
        }));
        setCategories(mapped);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Error loading expense categories", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. ADD EXPENSE CATEGORY (POST /expense-categories)
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = titleInput.trim();

    if (!cleanTitle) {
      showToast("Please enter an expense title.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await expenseApi.createCategory({
        name: cleanTitle,
        description: descInput.trim() || "desc",
        status: 1,
      });
      showToast(res.message || `Expense Category "${cleanTitle}" added successfully!`, "success");
      setShowAddModal(false);
      setTitleInput("");
      setDescInput("");
      await loadData();
    } catch (err) {
      console.error(err);
      const errMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : null) ||
        "Failed to add expense category.";
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. EDIT EXPENSE CATEGORY 
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editItem || !editItem.title.trim()) {
      showToast("Please enter a category title.", "error");
      return;
    }

    const cleanTitle = editItem.title.trim();
    setIsSubmitting(true);
    try {
      const res = await expenseApi.updateCategory(editItem.id, {
        name: cleanTitle,
        description: (editItem.description ? editItem.description.trim() : "") || "desc",
        status: editItem.status === "Active" ? 1 : 0,
      });
      showToast(res.message || "Expense category updated successfully!", "success");
      setEditItem(null);
      await loadData();
    } catch (err) {
      console.error(err);
      const errMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : null) ||
        "Failed to update expense category.";
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. DELETE EXPENSE CATEGORY 
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const res = await expenseApi.deleteCategory(deleteTarget.id);
      showToast(res.message || `Category "${deleteTarget.title}" deleted successfully!`, "success");
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to delete category.", "error");
    }
  };

  // Filtered by Search 
  const filteredCategories = categories.filter((c) =>
    (c.title || c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(searchTerm.toLowerCase())
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
                <span className="text-muted">Master Data</span>
              </li>
              <li className="breadcrumb-item active">Expense Master</li>
            </ul>
            <h1 className="page-title mt-1">Expense Master</h1>
            <p className="text-muted small mb-0">
              Manage master expense categories and titles used across daily accounts and billing.
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">

            <button
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={() => {
                setTitleInput("");
                setShowAddModal(true);
              }}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Add Expense Category</span>
            </button>
          </div>
        </div>

        {/* Expense Master Table Card */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <h5 className="card-title mb-0 fw-bold">Master Expense Titles</h5>
              <span className="badge bg-primary-subtle text-primary rounded-pill px-2">
                {filteredCategories.length} Categories
              </span>
            </div>

            {/* Search Bar */}
            <div style={{ minWidth: "260px" }}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search expense title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
          </div>

          <div className="table-responsive">
            <table className="table table-custom mb-0">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th style={{ width: "260px" }}>Expense Title</th>
                  <th>Description</th>
                  <th className="text-end" style={{ width: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading master categories...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                      <div className="mb-2">
                        <i className="bi bi-folder-x fs-1 text-secondary opacity-50"></i>
                      </div>
                      <p className="mb-2 fw-semibold">No expense categories found.</p>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setTitleInput("");
                          setShowAddModal(true);
                        }}
                      >
                        <i className="bi bi-plus-circle me-1"></i> Add Category
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category, index) => {
                    return (
                      <tr key={category.id}>
                        <td>
                          <span className="text-muted small fw-semibold">{index + 1}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "rgba(88, 99, 42, 0.1)",
                                color: "#58632A",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "bold",
                                fontSize: "14px",
                              }}
                            >
                              <i className="bi bi-tag-fill"></i>
                            </div>
                            <span className="fw-bold text-dark">{category.title}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-secondary small">
                            {category.description ? (
                              category.description
                            ) : (
                              <span className="text-muted fst-italic opacity-75">No description</span>
                            )}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="table-actions justify-content-end">
                            <button
                              type="button"
                              className="btn-action btn-edit"
                              title="Edit Expense Title"
                              onClick={() =>
                                setEditItem({
                                  id: category.id,
                                  title: category.title,
                                  description: category.description || "",
                                  status: category.status,
                                })
                              }
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              type="button"
                              className="btn-action btn-delete"
                              title="Delete Expense Title"
                              onClick={() => setDeleteTarget(category)}
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
        </div>

        {/* ==============================================================
            MODAL 1: ADD EXPENSE MASTER (Single Title Field as requested)
            ============================================================== */}
        {showAddModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowAddModal(false)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "480px" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-plus-circle text-info"></i> Add Expense Category
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="modal-body-custom py-3">
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Expense Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Office Rent, Electricity Bill, Staff Food..."
                      required
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label text-dark fw-bold small">
                      Description <span className="text-muted fw-normal">(Optional)</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="e.g. Monthly office space rent and facility maintenance..."
                      value={descInput}
                      onChange={(e) => setDescInput(e.target.value)}
                    ></textarea>
                  
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
                    <span>{isSubmitting ? "Saving..." : "Save Title"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==============================================================
            MODAL 2: EDIT EXPENSE MASTER
            ============================================================== */}
        {editItem && (
          <div className="modal-backdrop-custom" onClick={() => setEditItem(null)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "480px" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-pencil-square text-info"></i> Edit Expense Category
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditItem(null)}
                ></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body-custom py-3">
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Expense Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Office Rent, Electricity Bill..."
                      required
                      value={editItem.title}
                      onChange={(e) =>
                        setEditItem({ ...editItem, title: e.target.value })
                      }
                      autoFocus
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label text-dark fw-bold small">
                      Description <span className="text-muted fw-normal">(Optional)</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="e.g. Monthly office space rent and maintenance..."
                      value={editItem.description || ""}
                      onChange={(e) =>
                        setEditItem({ ...editItem, description: e.target.value })
                      }
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setEditItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmitting ? "Updating..." : "Update Title"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==============================================================
            MODAL 3: DELETE CONFIRMATION
            ============================================================== */}
        {deleteTarget && (
          <div className="modal-backdrop-custom" onClick={() => setDeleteTarget(null)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "440px" }}
            >
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-danger d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i> Delete Category
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteTarget(null)}
                ></button>
              </div>

              <div className="modal-body-custom">
                <p className="text-dark mb-1">
                  Are you sure you want to delete expense category:
                </p>
                <div className="p-2 my-2 bg-light rounded border fw-bold text-danger">
                  "{deleteTarget.title}"
                </div>
              </div>

              <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                <button
                  type="button"
                  className="btn btn-outline-custom"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteConfirm}
                >
                  Delete Category
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
