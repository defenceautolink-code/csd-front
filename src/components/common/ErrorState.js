"use client";

import React from "react";
import Button from "./Button";

/**
 * Reusable Error State Component
 *
 * @param {Object} props
 * @param {string} [props.title='Unable to load data']
 * @param {string} [props.message='An unexpected error occurred while communicating with the server.']
 * @param {string} [props.icon='bi-exclamation-triangle-fill']
 * @param {function} [props.onRetry] - Retry callback function
 * @param {string} [props.retryLabel='Try Again']
 * @param {string} [props.className='']
 */
export default function ErrorState({
  title = "Unable to load data",
  message = "An error occurred while fetching information from the server.",
  icon = "bi-exclamation-triangle-fill",
  onRetry,
  retryLabel = "Try Again",
  className = "",
}) {
  return (
    <div className={`text-center py-5 px-3 ${className}`}>
      <div
        className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
        style={{
          width: "64px",
          height: "64px",
          background: "rgba(220, 38, 38, 0.12)",
          border: "1px solid rgba(220, 38, 38, 0.3)",
        }}
      >
        <i className={`bi ${icon} fs-2 text-danger`}></i>
      </div>

      <h5 className="fw-bold text-dark mb-1">{title}</h5>
      {message && (
        <p className="text-muted small mb-3 mx-auto" style={{ maxWidth: "450px" }}>
          {message}
        </p>
      )}

      {onRetry && (
        <Button
          variant="outline-danger"
          size="sm"
          icon="bi-arrow-clockwise"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
