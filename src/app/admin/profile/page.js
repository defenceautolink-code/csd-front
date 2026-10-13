"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import userApi from "@/services/userApi";
import { getAuthenticatedUser, setAuthSession, getAuthToken, getRoleDashboardPath } from "@/utils/auth";

export default function ProfilePage() {
  const { showToast } = useToast();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form 1: Editable Fields (ONLY Email & Mobile)
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Form 2: Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Load Logged-in User from localStorage and backend
  useEffect(() => {
    const authUser = getAuthenticatedUser();
    if (authUser) {
      setUser(authUser);
      setEmail(authUser.email || "");
      setPhone(authUser.phone || authUser.mobile || "");
    }

    const fetchFreshUser = async () => {
      if (!authUser?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await userApi.getUser(authUser.id);
        const userData = res?.data || res;
        if (userData && userData.id) {
          setUser((prev) => ({ ...prev, ...userData }));
          setEmail(userData.email || "");
          setPhone(userData.phone || userData.mobile || "");

          const token = getAuthToken() || "";
          if (token) {
            setAuthSession(token, { ...authUser, ...userData });
          }
        }
      } catch (err) {
        console.warn("Using cached auth user profile:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFreshUser();
  }, []);

  // Role title helper
  const roleName = typeof user?.role === "object"
    ? user.role.title || user.role.name || "Administrator"
    : user?.role || "Administrator";

  // Role Gradient for Avatar
  const getRoleGradient = () => {
    switch (roleName) {
      case "Sales Manager":
        return "linear-gradient(135deg, #EE6800, #C25400)";
      case "Sales Executive":
        return "linear-gradient(135deg, #58632A, #3F4912)";
      case "Receptionist":
        return "linear-gradient(135deg, #6B7735, #58632A)";
      case "Accountant":
        return "linear-gradient(135deg, #000080, #131C27)";
      case "Super Admin":
      default:
        return "linear-gradient(135deg, #58632A, #000080)";
    }
  };

  // =========================================================================
  // SUBMIT 1: Update Profile (ONLY Email & Phone)
  // =========================================================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      showToast("Email address is required.", "warning");
      return;
    }

    if (!phone.trim()) {
      showToast("Mobile number is required.", "warning");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const payload = {
        email: email.trim(),
        phone: phone.trim(),
        mobile: phone.trim(),
      };

      const res = await userApi.updateProfile(user.id, payload);
      showToast(res?.message || "Profile contact details updated successfully!", "success");

      const updatedUser = {
        ...user,
        email: email.trim(),
        phone: phone.trim(),
        mobile: phone.trim(),
      };
      setUser(updatedUser);

      const token = getAuthToken() || "";
      if (token) {
        setAuthSession(token, updatedUser);
        window.dispatchEvent(new Event("csd_user_updated"));
      }
    } catch (err) {
      console.error("Profile update error:", err);
      showToast(
        err.response?.data?.message || "Failed to update profile. Please try again.",
        "error"
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // =========================================================================
  // SUBMIT 2: Change Password
  // =========================================================================
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast("Please enter your current password.", "warning");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      showToast("New password must be at least 6 characters long.", "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("New password and confirm password do not match.", "warning");
      return;
    }

    if (currentPassword === newPassword) {
      showToast("New password cannot be the same as your current password.", "warning");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const payload = {
        userId: user?.id,
        user_id: user?.id,
        current_password: currentPassword,
        old_password: currentPassword,
        new_password: newPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
        new_password_confirmation: confirmPassword,
      };

      const res = await userApi.changePassword(payload);
      showToast(res?.message || "Password changed successfully!", "success");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Change password error:", err);
      showToast(
        err.response?.data?.message || "Failed to change password. Please check your current password.",
        "error"
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container-fluid px-3 px-md-4 py-4" style={{ backgroundColor: "#F7F7F5", minHeight: "100vh" }}>
        {/* Breadcrumb Navigation */}
        <div className="mb-3">
          <ul className="breadcrumb-custom mb-1" style={{ fontSize: "0.85rem" }}>
            <li className="breadcrumb-item">
              <Link href={getRoleDashboardPath(user?.role)} className="text-decoration-none text-muted">Home</Link>
            </li>
            <li className="breadcrumb-item active text-dark fw-semibold">My Profile</li>
          </ul>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h3 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-person-circle text-primary"></i>
                Account Profile & Security
              </h3>

            </div>

          </div>
        </div>

        {/* ===================================================================
            USER PROFILE HEADER CARD (CLEAN, NO OVERLAPPING TEXT)
            =================================================================== */}
        <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              {/* Left: Avatar + User Details */}
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle shadow-sm d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{
                    width: "72px",
                    height: "72px",
                    background: getRoleGradient(),
                    fontSize: "2rem",
                    flexShrink: 0,
                    border: "3px solid #FFFFFF",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>

                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                    <h4 className="fw-bold text-dark mb-0" style={{ fontSize: "1.35rem" }}>
                      {user?.name || "Admin User"}
                    </h4>
                    <span
                      className="badge px-2.5 py-1 fw-bold text-white shadow-none"
                      style={{
                        background: getRoleGradient(),
                        fontSize: "0.75rem",
                      }}
                    >
                      {roleName}
                    </span>

                  </div>

                  {/* Info Badges Row */}
                  <div className="d-flex align-items-center gap-3 flex-wrap text-muted small">
                    <span className="d-inline-flex align-items-center gap-1">
                      <i className="bi bi-envelope-fill text-primary"></i>
                      <strong className="text-dark">{user?.email || "admin@example.com"}</strong>
                    </span>
                    {(user?.phone || user?.mobile) && (
                      <span className="d-inline-flex align-items-center gap-1">
                        <i className="bi bi-telephone-fill text-success"></i>
                        <strong className="text-dark">{user?.phone || user?.mobile}</strong>
                      </span>
                    )}

                  </div>
                </div>
              </div>



            </div>
          </div>
        </div>

        {/* ===================================================================
            TWO COLUMN LAYOUT:
            Col 1: Contact Details (ONLY Email & Mobile editable)
            Col 2: Change Password Form
            =================================================================== */}
        <div className="row g-4">
          {/* -----------------------------------------------------------------
              CARD 1: CONTACT DETAILS
              ----------------------------------------------------------------- */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
              <div className="card-header bg-white border-bottom py-3 px-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center bg-primary-subtle text-primary"
                      style={{ width: "36px", height: "36px" }}
                    >
                      <i className="bi bi-person-lines-fill fs-5"></i>
                    </div>
                    <div>
                      <h5 className="fw-bold text-dark mb-0">Information</h5>

                    </div>
                  </div>

                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="card-body p-4 d-flex flex-column justify-content-between">
                <div>


                  {/* Field 1: Full Name (LOCKED) */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted mb-1 d-flex justify-content-between">
                      <span>Full Name</span>

                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0">
                        <i className="bi bi-person-fill"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control bg-light text-dark fw-bold border-start-0 border-end-0"
                        value={user?.name || "Admin User"}
                        readOnly
                        style={{ cursor: "not-allowed" }}
                      />
                      <span className="input-group-text bg-light text-muted border-start-0">
                        <i className="bi bi-lock-fill text-secondary"></i>
                      </span>
                    </div>
                  </div>

                  {/* Field 2: Assigned Role (LOCKED) */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted mb-1 d-flex justify-content-between">
                      <span>Assigned Workspace Role </span>

                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0">
                        <i className="bi bi-briefcase-fill"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control bg-light text-dark fw-semibold border-start-0 border-end-0"
                        value={roleName}
                        readOnly
                        style={{ cursor: "not-allowed" }}
                      />
                      <span className="input-group-text bg-light text-muted border-start-0">
                        <i className="bi bi-lock-fill text-secondary"></i>
                      </span>
                    </div>
                  </div>

                  {/* Field 3: Email Address (EDITABLE) */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark mb-1 d-flex justify-content-between align-items-center">
                      <span>
                        Email Address <span className="text-danger">*</span>
                      </span>
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-1.5 py-0" style={{ fontSize: "0.7rem" }}>
                        <i className="bi bi-pencil-fill me-1"></i>Editable
                      </span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-envelope-at-fill text-primary"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control fw-semibold border-start-0"
                        placeholder="e.g. admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                  </div>

                  {/* Field 4: Mobile Number (EDITABLE) */}
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-dark mb-1 d-flex justify-content-between align-items-center">
                      <span>
                        Mobile / Phone Number <span className="text-danger">*</span>
                      </span>
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-1.5 py-0" style={{ fontSize: "0.7rem" }}>
                        <i className="bi bi-pencil-fill me-1"></i>Editable
                      </span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-telephone-fill text-success"></i>
                      </span>
                      <input
                        type="tel"
                        className="form-control fw-semibold border-start-0"
                        placeholder="e.g. +91 98000 11111"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>

                  </div>
                </div>

                <div className="border-top pt-3 d-flex justify-content-end">
                  <button
                    type="submit"
                    className="btn text-white fw-bold px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
                    style={{
                      backgroundColor: "var(--primary, #58632A)",
                      borderColor: "var(--primary, #58632A)",
                    }}
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle fs-5"></i>
                        <span>Save Contact Details</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              CARD 2: CHANGE PASSWORD
              ----------------------------------------------------------------- */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 bg-white h-100">
              <div className="card-header bg-white border-bottom py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center bg-danger-subtle text-danger"
                    style={{ width: "36px", height: "36px" }}
                  >
                    <i className="bi bi-key-fill fs-5"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark mb-0">Change Password</h5>

                  </div>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="card-body p-4 d-flex flex-column justify-content-between">
                <div>


                  {/* Current Password */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark mb-1">
                      Current Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-lock text-muted"></i>
                      </span>
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        className="form-control border-start-0 border-end-0"
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0 bg-white"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        tabIndex="-1"
                        title={showCurrentPassword ? "Hide password" : "Show password"}
                      >
                        <i className={`bi ${showCurrentPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark mb-1">
                      New Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-key text-primary"></i>
                      </span>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="form-control border-start-0 border-end-0"
                        placeholder="Create strong new password (min. 6 chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0 bg-white"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex="-1"
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        <i className={`bi ${showNewPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-dark mb-1">
                      Confirm New Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-check2-circle text-success"></i>
                      </span>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="form-control border-start-0 border-end-0"
                        placeholder="Re-type your new password to verify"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0 bg-white"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex="-1"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        <i className={`bi ${showConfirmPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <small className="text-danger d-block mt-1" style={{ fontSize: "0.75rem" }}>
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>Passwords do not match.
                      </small>
                    )}
                  </div>
                </div>

                <div className="border-top pt-3 d-flex justify-content-end">
                  <button
                    type="submit"
                    className="btn btn-dark fw-bold px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
                    disabled={isUpdatingPassword}
                  >
                    {isUpdatingPassword ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-shield-lock-fill"></i>
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
