"use client";

import React from "react";

/**
 * Reusable Loading Indicator Component
 *
 * @param {Object} props
 * @param {string} [props.text='Loading data...'] - Loading text message
 * @param {string} [props.size='md'] - 'sm' | 'md' | 'lg'
 * @param {boolean} [props.overlay=false] - Display as full container overlay
 * @param {string} [props.className='']
 */
export default function Loading({
  text = "Loading data...",
  size = "md",
  overlay = false,
  className = "",
}) {
  const spinnerSizeClass =
    size === "sm"
      ? "spinner-border-sm"
      : size === "lg"
      ? "style={{ width: '3rem', height: '3rem' }}"
      : "";

  const content = (
    <div className={`d-flex flex-column align-items-center justify-content-center p-4 ${className}`}>
      <div
        className={`spinner-border text-primary mb-2 ${size === "sm" ? "spinner-border-sm" : ""}`}
        style={size === "lg" ? { width: "2.75rem", height: "2.75rem" } : {}}
        role="status"
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      {text && <span className="text-muted small fw-medium">{text}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div
        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded-3"
        style={{
          background: "rgba(19, 28, 39, 0.75)",
          backdropFilter: "blur(4px)",
          zIndex: 10,
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}
