"use client";

import React from "react";
import Button from "./Button";

/**
 * Reusable Empty State Component
 *
 * @param {Object} props
 * @param {string} [props.title='No records found'] - Main heading
 * @param {string} [props.description='There are no items to display at this moment.']
 * @param {string} [props.icon='bi-inbox'] - Bootstrap icon
 * @param {string} [props.actionLabel] - Optional action button label
 * @param {function} [props.onAction] - Action callback
 * @param {React.ReactNode} [props.action] - Custom action component/button
 * @param {string} [props.className='']
 */
export default function EmptyState({
  title = "No records found",
  description = "There are no items matching your criteria.",
  icon = "bi-inbox",
  actionLabel,
  onAction,
  action,
  className = "",
}) {
  return (
    <div className={`text-center py-5 px-3 ${className}`}>
      <div
        className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
        style={{
          width: "64px",
          height: "64px",
          background: "rgba(217, 221, 204, 0.1)",
          border: "1px solid var(--border-color)",
        }}
      >
        <i className={`bi ${icon} fs-2 text-muted`}></i>
      </div>

      <h5 className="fw-bold text-dark mb-1">{title}</h5>
      {description && (
        <p className="text-muted small mb-3 mx-auto" style={{ maxWidth: "420px" }}>
          {description}
        </p>
      )}

      {action ? (
        action
      ) : actionLabel && onAction ? (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
