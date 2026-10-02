"use client";

import React, { useState, useEffect } from "react";
import Input from "./Input";
import Select from "./Select";
import Textarea from "./Textarea";
import Button from "./Button";

/**
 * Reusable Form Component
 *
 * Can render from a schema `fields` array or accept custom `children`.
 *
 * @param {Object} props
 * @param {Array<Object>} [props.fields] - Schema definition array of fields:
 *   [{ name, label, type, required, options, placeholder, col, helperText, disabled, rows, ... }]
 * @param {Object} [props.initialValues={}] - Initial form data
 * @param {Object} [props.values] - Controlled form data values
 * @param {function} [props.onChange] - Controlled change handler (newValues) => ...
 * @param {Object} [props.errors={}] - Validation error map: { fieldName: 'Error msg' }
 * @param {function} props.onSubmit - Submit handler (values, event) => ...
 * @param {function} [props.onCancel] - Cancel callback
 * @param {string} [props.submitLabel='Save Changes']
 * @param {string} [props.cancelLabel='Cancel']
 * @param {string} [props.submitIcon='bi-check2']
 * @param {boolean} [props.loading=false] - Submission loading state
 * @param {string} [props.loadingText='Saving...']
 * @param {boolean} [props.showActions=true] - Whether to render default footer buttons
 * @param {React.ReactNode} [props.children] - Optional custom children
 * @param {string} [props.className='']
 */
export default function Form({
  fields = [],
  initialValues = {},
  values: controlledValues,
  onChange: controlledOnChange,
  errors = {},
  onSubmit,
  onCancel,
  submitLabel = "Save Changes",
  cancelLabel = "Cancel",
  submitIcon = "bi-check2",
  loading = false,
  loadingText = "Saving...",
  showActions = true,
  children,
  className = "",
  ...rest
}) {
  const [internalValues, setInternalValues] = useState(initialValues);

  useEffect(() => {
    if (initialValues) {
      setInternalValues(initialValues);
    }
  }, [initialValues]);

  const currentValues = controlledValues !== undefined ? controlledValues : internalValues;

  const handleFieldChange = (name, value) => {
    const updated = { ...currentValues, [name]: value };
    if (controlledOnChange) {
      controlledOnChange(updated);
    } else {
      setInternalValues(updated);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(currentValues, e);
    }
  };

  const renderField = (field) => {
    const {
      name,
      label,
      type = "text",
      required = false,
      options = [],
      placeholder = "",
      col = 12,
      helperText,
      disabled = false,
      rows = 3,
      ...fieldRest
    } = field;

    const val = currentValues[name] ?? "";
    const err = errors[name];
    const colClass = `col-12 col-md-${col}`;

    if (type === "select") {
      return (
        <div key={name} className={colClass}>
          <Select
            name={name}
            label={label}
            value={val}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            options={options}
            placeholder={placeholder || `Select ${label || "option"}...`}
            required={required}
            disabled={disabled || loading}
            error={err}
            helperText={helperText}
            {...fieldRest}
          />
        </div>
      );
    }

    if (type === "textarea") {
      return (
        <div key={name} className={colClass}>
          <Textarea
            name={name}
            label={label}
            value={val}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            rows={rows}
            placeholder={placeholder}
            required={required}
            disabled={disabled || loading}
            error={err}
            helperText={helperText}
            {...fieldRest}
          />
        </div>
      );
    }

    if (type === "radio") {
      return (
        <div key={name} className={colClass}>
          {label && (
            <label className="form-label fw-semibold small mb-2 d-block">
              {label} {required && <span className="text-danger">*</span>}
            </label>
          )}
          <div className="d-flex flex-wrap gap-3">
            {options.map((opt, i) => {
              const optVal = typeof opt === "object" ? opt.value : opt;
              const optLbl = typeof opt === "object" ? opt.label : opt;
              const optIcon = typeof opt === "object" ? opt.icon : null;
              const isChecked = String(val) === String(optVal);

              return (
                <div className="form-check" key={`${name}-${optVal}-${i}`}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name={name}
                    id={`${name}-${optVal}`}
                    value={optVal}
                    checked={isChecked}
                    onChange={() => handleFieldChange(name, optVal)}
                    disabled={disabled || loading}
                  />
                  <label className="form-check-label small" htmlFor={`${name}-${optVal}`}>
                    {optIcon && <i className={`bi ${optIcon} me-1`}></i>}
                    {optLbl}
                  </label>
                </div>
              );
            })}
          </div>
          {err && <div className="invalid-feedback d-block small mt-1">{err}</div>}
        </div>
      );
    }

    if (type === "checkbox") {
      return (
        <div key={name} className={colClass}>
          <div className="form-check mt-2">
            <input
              className="form-check-input"
              type="checkbox"
              id={name}
              name={name}
              checked={!!val}
              onChange={(e) => handleFieldChange(name, e.target.checked)}
              disabled={disabled || loading}
            />
            <label className="form-check-label small" htmlFor={name}>
              {label} {required && <span className="text-danger">*</span>}
            </label>
          </div>
          {err && <div className="invalid-feedback d-block small mt-1">{err}</div>}
        </div>
      );
    }

    return (
      <div key={name} className={colClass}>
        <Input
          name={name}
          label={label}
          type={type}
          value={val}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled || loading}
          error={err}
          helperText={helperText}
          {...fieldRest}
        />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className={className} noValidate {...rest}>
      {fields && fields.length > 0 && (
        <div className="row g-3">{fields.map(renderField)}</div>
      )}

      {children}

      {showActions && (
        <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3 mt-3 border-top border-secondary-subtle">
          {onCancel && (
            <Button
              variant="outline-custom"
              onClick={onCancel}
              disabled={loading}
              type="button"
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            loadingText={loadingText}
            icon={submitIcon}
          >
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
