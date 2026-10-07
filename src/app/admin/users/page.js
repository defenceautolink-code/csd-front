"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import { hasPermission } from "@/utils/auth";
import Pagination from "@/components/common/Pagination";

// Role Enum options matching Laravel UserRole Enum
const ROLE_OPTIONS = [
  "Super Admin",
  "Sales Manager",
  "Sales Executive",
  "Receptionist",
  "Accountant",
  "Customer",
];

export default function UsersPage() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);
  const can = (permission) => hasPermission(permission, currentUser);

  // API Base URL for storage
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  const BASE_STORAGE_URL = API_URL.replace(/\/api\/?$/, "");

  // 1. Component States
  const [users, setUsers] = useState([]);
  const [serverPagination, setServerPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State for Adding User (matches user screenshot)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "", // Enum
    profile_photo: null,
    status: "Active",
  });

  // Helper to extract clear error message from Laravel response
  const getErrorMessage = (error, defaultMsg) => {
    if (error.response?.data?.errors) {
      const allErrors = Object.values(error.response.data.errors).flat();
      if (allErrors.length > 0) return allErrors.join(" ");
    }
    return error.response?.data?.message || defaultMsg;
  };

  // 2. Fetch all users from Laravel backend
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: perPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get("/users", { params });
      if (response.data && response.data.status) {
        setUsers(response.data.data || []);
        if (response.data.pagination) {
          setServerPagination(response.data.pagination);
        } else if (response.data.meta) {
          setServerPagination(response.data.meta);
        } else {
          setServerPagination(null);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      showToast(getErrorMessage(error, "Unable to fetch users from API."), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Run on page load and parameter change
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage, searchTerm, roleFilter, statusFilter]);

  // Photo file validation handler (enforces Laravel's max 2MB and image mime rules)
  const handlePhotoSelect = (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Backend rule: max 2048 KB
    if (file.size > 2 * 1024 * 1024) {
      showToast("Profile photo must be less than 2MB.", "error");
      e.target.value = "";
      if (isEdit) {
        setEditUser((prev) => ({ ...prev, newPhoto: null }));
      } else {
        setFormData((prev) => ({ ...prev, profile_photo: null }));
      }
      return;
    }

    // Supported mime types
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      showToast("Please select a valid image file (JPG, PNG, or WebP).", "error");
      e.target.value = "";
      if (isEdit) {
        setEditUser((prev) => ({ ...prev, newPhoto: null }));
      } else {
        setFormData((prev) => ({ ...prev, profile_photo: null }));
      }
      return;
    }

    if (isEdit) {
      setEditUser((prev) => ({ ...prev, newPhoto: file }));
    } else {
      setFormData((prev) => ({ ...prev, profile_photo: file }));
    }
  };

  // 3. Create (Store) User
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Please enter full name.", "error");
      return;
    }
    if (!formData.email.trim()) {
      showToast("Please enter email address.", "error");
      return;
    }
    if (!formData.password) {
      showToast("Please enter account password.", "error");
      return;
    }
    if (!formData.phone.trim()) {
      showToast("Please enter contact number.", "error");
      return;
    }
    if (!formData.role) {
      showToast("Please select a valid user role enum.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      if (formData.profile_photo) {
        // Interceptor in axios.js automatically removes Content-Type so browser sets boundary
        const data = new FormData();
        data.append("name", formData.name.trim());
        data.append("email", formData.email.trim());
        data.append("password", formData.password);
        data.append("phone", formData.phone.trim());
        data.append("role", formData.role);
        data.append("status", formData.status);
        data.append("profile_photo", formData.profile_photo);

        response = await api.post("/users", data);
      } else {
        // Direct JSON payload
        response = await api.post("/users", {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          role: formData.role,
          status: formData.status,
        });
      }

      if (response.data && response.data.status) {
        showToast(`User "${formData.name}" created with role "${formData.role}"!`, "success");
        setFormData({
          name: "",
          email: "",
          password: "",
          phone: "",
          role: "",
          profile_photo: null,
          status: "Active",
        });
        setShowAddModal(false);
        fetchUsers(); // Refresh list
      }
    } catch (error) {
      console.error("Create Error:", error?.response?.data || error);
      showToast(getErrorMessage(error, "Failed to create user."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Update (Edit) User
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editUser.name.trim()) {
      showToast("Please enter full name.", "error");
      return;
    }
    if (!editUser.email.trim()) {
      showToast("Please enter email address.", "error");
      return;
    }
    if (!editUser.phone.trim()) {
      showToast("Please enter contact number.", "error");
      return;
    }
    if (!editUser.role) {
      showToast("Please select a role.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      if (editUser.newPhoto) {
        // FormData with Laravel PUT spoofing; interceptor strips Content-Type for boundary
        const data = new FormData();
        data.append("_method", "PUT");
        data.append("name", editUser.name.trim());
        data.append("email", editUser.email.trim());
        data.append("phone", editUser.phone.trim());
        data.append("role", editUser.role);
        data.append("status", editUser.status);
        if (editUser.password) {
          data.append("password", editUser.password);
        }
        data.append("profile_photo", editUser.newPhoto);

        response = await api.post(`/users/${editUser.id}`, data);
      } else {
        // Direct JSON PUT
        const payload = {
          name: editUser.name.trim(),
          email: editUser.email.trim(),
          phone: editUser.phone.trim(),
          role: editUser.role,
          status: editUser.status,
        };
        if (editUser.password) {
          payload.password = editUser.password;
        }

        response = await api.put(`/users/${editUser.id}`, payload);
      }

      if (response.data && response.data.status) {
        showToast(`User profile for "${editUser.name}" updated!`, "success");
        setEditUser(null);
        fetchUsers(); // Refresh list
      }
    } catch (error) {
      console.error("Update Error:", error?.response?.data || error);
      showToast(getErrorMessage(error, "Failed to update user."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete User
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;

    try {
      const response = await api.delete(`/users/${deleteTarget.id}`);
      if (response.data && response.data.status) {
        showToast(`User account for "${deleteTarget.name}" deleted!`, "success");
        setDeleteTarget(null);
        fetchUsers(); // Refresh list
      }
    } catch (error) {
      console.error("Delete Error:", error);
      showToast(getErrorMessage(error, "Failed to delete user."), "error");
    }
  };

  // Handle server-side vs client-side pagination fallback
  const isServerPaginated = Boolean(serverPagination);

  // Filter users (used if backend returns flat list without server pagination)
  const filteredUsers = isServerPaginated
    ? users
    : users.filter((item) => {
        const matchesSearch =
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.phone?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !roleFilter || item.role === roleFilter;
        const matchesStatus = !statusFilter || item.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
      });

  const totalUsers = isServerPaginated
    ? (serverPagination.total ?? users.length)
    : filteredUsers.length;

  const lastPage = isServerPaginated
    ? (serverPagination.last_page ?? Math.max(1, Math.ceil(totalUsers / perPage)))
    : Math.max(1, Math.ceil(totalUsers / perPage));

  const paginatedUsers = isServerPaginated
    ? users
    : filteredUsers.slice(
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
              <li className="breadcrumb-item active">Users & Team</li>
            </ul>
            <h1 className="page-title mt-1">User & Team Master</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            {can("user.export") && <button
              className="btn btn-outline-custom"
              onClick={() => showToast("Exporting team user roster as CSV...", "info")}
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export CSV</span>
            </button>}
            {can("user.create") && <button
              className="btn btn-primary"
              onClick={() => {
                setFormData({
                  name: "",
                  email: "",
                  password: "",
                  phone: "",
                  role: "Sales Executive",
                  profile_photo: null,
                  status: "Active",
                });
                setShowAddModal(true);
              }}
            >
              <i className="bi bi-person-plus-fill"></i>
              <span>Add New User</span>
            </button>}
          </div>
        </div>

        {/* User KPI Summary Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Users</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-people-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{users.length} Users</div>
              <span className="text-primary small fw-semibold">Live Database Records</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Super Admins</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {users.filter((u) => u.role === "Super Admin").length} Admins
              </div>
              <span className="text-success small fw-semibold">Full System Access</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Sales Team</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-person-workspace"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {
                  users.filter(
                    (u) => u.role === "Sales Executive" || u.role === "Sales Manager"
                  ).length
                }{" "}
                Staff
              </div>
              <span className="text-warning small fw-semibold">Sales Executives & Managers</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Registered Customers</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-person-check-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {users.filter((u) => u.role === "Customer").length} Customers
              </div>
              <span className="text-info small fw-semibold">Role: Customer Enum</span>
            </div>
          </div>
        </div>

        {/* Users Table Card */}
        <div className="card">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <h5 className="card-title mb-0">Registered Users Directory</h5>
              <span className="badge bg-primary-subtle text-white rounded-pill px-2">
                {filteredUsers.length} Users
              </span>
            </div>
            <div className="d-flex flex-wrap gap-2" style={{ maxWidth: "450px" }}>
              <select
                className="form-select form-select-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ width: "170px" }}
              >
                <option value="">All Roles (Enum)</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search user name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "200px" }}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th style={{ width: "90px" }} className="text-center">Actions</th>
                  <th>User Details</th>
                  <th>Contact No</th>
                  <th>Role (Enum)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading users from API...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No users found. Click <strong>Add New User</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td>
                        <span className="text-muted small">{(currentPage - 1) * perPage + index + 1}</span>
                      </td>
                      <td className="text-center">
                        <div className="table-actions justify-content-center">
                          {can("user.edit") && <button
                            className="btn-action btn-edit"
                            title="Edit User"
                            onClick={() =>
                              setEditUser({
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                phone: user.phone || "",
                                role: user.role || "Sales Executive",
                                status: user.status || "Active",
                                password: "",
                                profile_photo: user.profile_photo,
                                newPhoto: null,
                              })
                            }
                          >
                            <i className="bi bi-pencil"></i>
                          </button>}
                          {can("user.delete") && user.role !== "Super Admin" && (
                            <button
                              className="btn-action btn-delete"
                              title="Delete User"
                              onClick={() => setDeleteTarget(user)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {user.profile_photo ? (
                            <img
                              src={
                                user.profile_photo.startsWith("http")
                                    ? user.profile_photo
                                    : `${BASE_STORAGE_URL}${user.profile_photo.startsWith("/") ? "" : "/"}${user.profile_photo}`
                              }
                              alt={user.name}
                              style={{
                                width: "32px",
                                height: "32px",
                                objectFit: "cover",
                                borderRadius: "50%",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: "#2A301E",
                                color: "#A3E635",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "13px",
                                fontWeight: "bold",
                              }}
                            >
                              {user.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h6 className="mb-0 text-dark fw-bold">{user.name}</h6>
                            <span className="text-muted small">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-dark small">
                          <i className="bi bi-telephone me-1 text-muted"></i>
                          {user.phone || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            user.role === "Super Admin"
                              ? "bg-danger-subtle text-danger"
                              : user.role === "Sales Manager"
                              ? "bg-warning-subtle text-warning"
                              : user.role === "Sales Executive"
                              ? "bg-primary-subtle text-primary"
                              : user.role === "Customer"
                              ? "bg-info-subtle text-info"
                              : "bg-secondary-subtle text-dark"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {user.status === "Active" ? (
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
          {!isLoading && filteredUsers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              total={totalUsers}
              perPage={perPage}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
              perPageOptions={[10, 20, 50, 100]}
              itemName="users"
            />
          )}
        </div>

        {/* ------------------------------------------------------------------
            ADD NEW USER MODAL (Matches user's exact UI screenshot)
            ------------------------------------------------------------------ */}
        {showAddModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowAddModal(false)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-person-plus-fill text-info"></i> Add New User
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Full Name */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Rahul Verma"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Email Address */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="name@carcrm.com"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  {/* Account Password */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Account Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon-box">
                      <i className="bi bi-lock input-icon"></i>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        placeholder="••••••••••••"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password visibility"
                      >
                        <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Profile Photo */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small mb-1">
                      Profile Photo <span className="text-muted fw-normal">(Optional, max 2MB)</span>
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={(e) => handlePhotoSelect(e, false)}
                    />
                    <small className="text-muted d-block mt-1" style={{ fontSize: "12px" }}>
                      Supports PNG, JPG, or WebP up to 2MB.
                    </small>
                  </div>

                  {/* Contact No */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Contact No <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+91 98765 43210"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  {/* Role (Enum) */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Role (Enum) <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="">Select Role (Role Enum)</option>
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
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
                    <span>{isSubmitting ? "Saving..." : "Save User"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            EDIT USER MODAL
            ------------------------------------------------------------------ */}
        {editUser && (
          <div className="modal-backdrop-custom" onClick={() => setEditUser(null)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-pencil-square text-info"></i> Edit User
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditUser(null)}
                ></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Full Name */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={editUser.name}
                      onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Email Address */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      required
                      value={editUser.email}
                      onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                    />
                  </div>

                  {/* Password (Optional update) */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Password (Leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter new password if changing"
                      value={editUser.password || ""}
                      onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                    />
                  </div>

                  {/* Profile Photo */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small mb-1">
                      Profile Photo <span className="text-muted fw-normal">(Optional, max 2MB)</span>
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={(e) => handlePhotoSelect(e, true)}
                    />
                    <small className="text-muted d-block mt-1" style={{ fontSize: "12px" }}>
                      Upload new PNG, JPG, or WebP up to 2MB to change photo.
                    </small>
                  </div>

                  {/* Contact No */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Contact No <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      required
                      value={editUser.phone}
                      onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                    />
                  </div>

                  {/* Role (Enum) */}
                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">
                      Role (Enum) <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      required
                      value={editUser.role}
                      onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="mb-2">
                    <label className="form-label text-dark fw-bold small">Status</label>
                    <select
                      className="form-select"
                      value={editUser.status}
                      onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}
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
                    onClick={() => setEditUser(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmitting ? "Updating..." : "Save User"}</span>
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
                  <i className="bi bi-exclamation-triangle-fill text-danger me-1"></i> Delete User Account
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteTarget(null)}
                ></button>
              </div>

              <div className="modal-body-custom">
                <p className="text-dark mb-0">
                  Are you sure you want to delete user <strong>"{deleteTarget.name}"</strong>?
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
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
