"use client";

import React, { useState } from "react";

/**
 * Reusable Form Input Component
 *
 * @param {Object} props
 * @param {string} [props.label] - Field label text
 * @param {string} props.name - Input name attribute
 * @param {string} [props.type='text'] - 'text' | 'email' | 'tel' | 'number' | 'password' | 'date'
 * @param {string|number} [props.value] - Input value
 * @param {function} props.onChange - Change handler (e) => ...
 * @param {string} [props.placeholder='']
 * @param {boolean} [props.required=false]
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.error] - Validation error message
 * @param {string} [props.helperText] - Subtitle/hint under input
 * @param {string} [props.icon] - Bootstrap icon class, e.g. 'bi-envelope'
 * @param {string} [props.className='']
 * @param {boolean} [props.autoFocus=false]
 */
export default function Input({
  label,
  name,
  type = "text",
  value = "",
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  error,
  helperText,
  icon,
  className = "",
  autoFocus = false,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === "password";
  const actualType = isPasswordType ? (showPassword ? "text" : "password") : type;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={name} className="form-label fw-semibold small mb-1 d-block">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      <div className="position-relative">
        {icon && (
          <i
            className={`bi ${icon} position-absolute text-muted`}
            style={{
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
              pointerEvents: "none",
            }}
          ></i>
        )}

        <input
          id={name}
          name={name}
          type={actualType}
          className={`form-control ${error ? "is-invalid" : ""} ${icon ? "ps-5" : ""}`}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          {...rest}
        />

        {isPasswordType && (
          <button
            type="button"
            className="btn btn-link position-absolute text-muted p-0 border-0"
            style={{
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
              textDecoration: "none",
            }}
            onClick={() => setShowPassword(!showPassword)}
            aria-label="Toggle password visibility"
          >
            <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
          </button>
        )}
      </div>

      {error && <div className="invalid-feedback d-block small mt-1">{error}</div>}
      {!error && helperText && (
        <small className="text-muted d-block mt-1" style={{ fontSize: "0.75rem" }}>
          {helperText}
        </small>
      )}
    </div>
  );
}
