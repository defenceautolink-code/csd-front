"use client";

import React from "react";

/**
 * Reusable Form Textarea Component
 *
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string} props.name
 * @param {string} [props.value='']
 * @param {function} props.onChange
 * @param {number} [props.rows=3]
 * @param {string} [props.placeholder='']
 * @param {boolean} [props.required=false]
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.error]
 * @param {string} [props.helperText]
 * @param {string} [props.className='']
 */
export default function Textarea({
  label,
  name,
  value = "",
  onChange,
  rows = 3,
  placeholder = "",
  required = false,
  disabled = false,
  error,
  helperText,
  className = "",
  ...rest
}) {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={name} className="form-label fw-semibold small mb-1 d-block">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      <textarea
        id={name}
        name={name}
        rows={rows}
        className={`form-control ${error ? "is-invalid" : ""}`}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        {...rest}
      ></textarea>

      {error && <div className="invalid-feedback d-block small mt-1">{error}</div>}
      {!error && helperText && (
        <small className="text-muted d-block mt-1" style={{ fontSize: "0.75rem" }}>
          {helperText}
        </small>
      )}
    </div>
  );
}
