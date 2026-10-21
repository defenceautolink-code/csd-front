"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Countdown timer on successful reset before redirecting to /login
  useEffect(() => {
    let timer;
    if (successMessage && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
    } else if (successMessage && redirectCountdown === 0) {
      router.push("/login");
    }
    return () => clearTimeout(timer);
  }, [successMessage, redirectCountdown, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token || !email) {
      setErrorMessage("Invalid reset link. Token or email is missing.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setIsExpired(false);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      const response = await axios.post(`${apiUrl}/auth/reset-password`, {
        email: email.trim(),
        token: token.trim(),
        password: password,
        password_confirmation: passwordConfirmation,
      });

      if (response.data && response.data.status) {
        setSuccessMessage(
          response.data.message || "Password has been reset successfully! Redirecting to login..."
        );
      }
    } catch (error) {
      console.log("Reset Password Error:", error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.errors?.token?.[0] ||
        error.response?.data?.errors?.password?.[0] ||
        "Failed to reset password. The link may have expired or is invalid.";

      setErrorMessage(msg);

      // Check if message indicates expiry
      if (
        msg.toLowerCase().includes("expired") ||
        error.response?.data?.errors?.token?.[0]?.toLowerCase().includes("expired")
      ) {
        setIsExpired(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Missing token/email state
  if (!token || !emailParam) {
    return (
      <div className="reset-pass-card text-center">
        <div
          className="forgot-modal-icon-badge mx-auto mb-3"
          style={{ width: "56px", height: "56px", fontSize: "1.6rem", background: "#FEE2E2", color: "#DC2626" }}
        >
          <i className="bi bi-shield-x"></i>
        </div>
        <h2 className="reset-pass-title">Invalid Reset Link</h2>
        <p className="reset-pass-subtitle">
          This password reset link is invalid or incomplete. Please request a new link from the login page.
        </p>
        <Link href="/login" className="btn-login-submit text-decoration-none">
          <span>Back to Login</span>
          <i className="bi bi-arrow-right"></i>
        </Link>
      </div>
    );
  }

  return (
    <div className="reset-pass-card">
      <div className="text-center mb-3">
        <div className="reset-pass-badge">
          <i className="bi bi-shield-lock-fill"></i>
          <span>Account Security</span>
        </div>
        <h1 className="reset-pass-title">Set New Password</h1>
        <p className="reset-pass-subtitle">
          Please enter and confirm your new secure password.
        </p>
      </div>

      {/* Meta Box: Email and 4-minute notice */}
      <div className="reset-pass-meta-box">
        <div>
          <span className="d-block small text-muted">Account:</span>
          <strong>{email}</strong>
        </div>
        <div className="text-end">
          <span className="reset-pass-expiry-tag">
            <i className="bi bi-clock-fill me-1"></i>4 Min Validity
          </span>
        </div>
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-circle-fill flex-shrink-0 fs-5"></i>
          <div className="flex-grow-1">
            <span>{errorMessage}</span>
            {isExpired && (
              <div className="mt-2">
                <Link
                  href="/login"
                  className="btn btn-sm btn-outline-danger fw-bold"
                  style={{ fontSize: "0.78rem" }}
                >
                  Request a New Link
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success View */}
      {successMessage ? (
        <div className="forgot-success-box">
          <div className="forgot-success-icon">
            <i className="bi bi-check-circle-fill"></i>
          </div>
          <h4 className="forgot-success-title">Password Reset Complete!</h4>
          <p className="forgot-success-text">
            Your password has been securely updated. Redirecting to login in{" "}
            <strong>{redirectCountdown}</strong> seconds...
          </p>
          <button
            type="button"
            className="btn-login-submit mt-2"
            onClick={() => router.push("/login")}
          >
            <span>Proceed to Login Now</span>
            <i className="bi bi-box-arrow-in-right"></i>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* New Password */}
          <div className="custom-input-group mb-3">
            <div className="custom-input-header">
              <label>New Password</label>
              <span className="small text-muted">(min 6 characters)</span>
            </div>
            <div className="input-icon-box">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="Enter new password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              <i className="bi bi-lock input-icon"></i>
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="custom-input-group mb-4">
            <div className="custom-input-header">
              <label>Confirm New Password</label>
            </div>
            <div className="input-icon-box">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="form-control"
                placeholder="Re-enter new password"
                required
                minLength={6}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                disabled={isLoading}
              />
              <i className="bi bi-shield-check input-icon"></i>
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label="Toggle confirm password visibility"
              >
                <i className={`bi ${showConfirmPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
              </button>
            </div>
            {password && passwordConfirmation && password !== passwordConfirmation && (
              <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>Passwords do not match</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-login-submit"
            disabled={isLoading || (password && passwordConfirmation && password !== passwordConfirmation)}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Saving Password...</span>
              </>
            ) : (
              <>
                <span>Save Password</span>
                <i className="bi bi-check2-circle"></i>
              </>
            )}
          </button>

          <div className="text-center mt-3">
            <Link href="/login" className="text-muted small text-decoration-none">
              <i className="bi bi-arrow-left me-1"></i>
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="reset-pass-wrapper">
      <Suspense
        fallback={
          <div className="reset-pass-card text-center p-5">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <p className="text-muted small mb-0">Loading password reset form...</p>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
