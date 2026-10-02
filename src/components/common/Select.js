"use client";

import React from "react";

/**
 * Reusable Form Select Component
 *
 * @param {Object} props
 * @param {string} [props.label] - Field label text
 * @param {string} props.name - Select name attribute
 * @param {string|number} [props.value] - Selected value
 * @param {function} props.onChange - Change handler
 * @param {Array<Object|string>} props.options - [{ value, label }] or ['Option 1', 'Option 2']
 * @param {string} [props.placeholder='Select...'] - Default placeholder option
 * @param {boolean} [props.required=false]
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.error] - Validation error message
 * @param {string} [props.helperText]
 * @param {string} [props.className='']
 */
export default function Select({
  label,
  name,
  value = "",
  onChange,
  options = [],
  placeholder = "Select an option...",
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

      <select
        id={name}
        name={name}
        className={`form-select ${error ? "is-invalid" : ""}`}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        disabled={disabled}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled={required && value !== ""}>
            {placeholder}
          </option>
        )}
        {options.map((opt, index) => {
          const optValue = typeof opt === "object" && opt !== null ? opt.value : opt;
          const optLabel = typeof opt === "object" && opt !== null ? opt.label : opt;
          const optDisabled = typeof opt === "object" && opt !== null ? opt.disabled : false;

          return (
            <option key={`${optValue}-${index}`} value={optValue} disabled={optDisabled}>
              {optLabel}
            </option>
          );
        })}
      </select>

      {error && <div className="invalid-feedback d-block small mt-1">{error}</div>}
      {!error && helperText && (
        <small className="text-muted d-block mt-1" style={{ fontSize: "0.75rem" }}>
          {helperText}
        </small>
      )}
    </div>
  );
}
