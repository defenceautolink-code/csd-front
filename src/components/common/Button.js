"use client";

import React from "react";

/**
 * Reusable Button Component
 *
 * @param {Object} props
 * @param {string} [props.variant='primary'] - 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning' | 'info' | 'light' | 'link'
 * @param {string} [props.size='md'] - 'xs' | 'sm' | 'md' | 'lg'
 * @param {string} [props.icon] - Bootstrap icon class name, e.g. 'bi-plus-lg' or 'bi-trash'
 * @param {string} [props.iconPosition='left'] - 'left' | 'right'
 * @param {boolean} [props.loading=false] - Show loading spinner
 * @param {string} [props.loadingText='Loading...']
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.type='button'] - 'button' | 'submit' | 'reset'
 * @param {function} [props.onClick]
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className='']
 * @param {string} [props.title]
 */
export default function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  loadingText,
  disabled = false,
  type = "button",
  onClick,
  children,
  className = "",
  title,
  ...rest
}) {
  // Map variant to Bootstrap button class
  const getVariantClass = () => {
    switch (variant) {
      case "primary":
        return "btn-primary";
      case "secondary":
        return "btn-secondary";
      case "outline":
      case "outline-custom":
        return "btn-outline-custom";
      case "outline-primary":
        return "btn-outline-primary";
      case "outline-danger":
        return "btn-outline-danger";
      case "outline-success":
        return "btn-outline-success";
      case "outline-secondary":
        return "btn-outline-secondary";
      case "danger":
        return "btn-danger";
      case "success":
        return "btn-success";
      case "warning":
        return "btn-warning";
      case "info":
        return "btn-info";
      case "light":
        return "btn-light";
      case "link":
        return "btn-link text-decoration-none";
      default:
        return `btn-${variant}`;
    }
  };

  // Map size to Bootstrap button size class
  const getSizeClass = () => {
    switch (size) {
      case "xs":
        return "btn-xs";
      case "sm":
        return "btn-sm";
      case "lg":
        return "btn-lg";
      default:
        return "";
    }
  };

  const btnClasses = [
    "btn",
    getVariantClass(),
    getSizeClass(),
    "d-inline-flex align-items-center justify-content-center gap-1",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={btnClasses}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      {...rest}
    >
      {loading && (
        <span
          className="spinner-border spinner-border-sm"
          role="status"
          aria-hidden="true"
        ></span>
      )}

      {!loading && icon && iconPosition === "left" && (
        <i className={`bi ${icon}`}></i>
      )}

      {loading && loadingText ? (
        <span>{loadingText}</span>
      ) : (
        children && <span>{children}</span>
      )}

      {!loading && icon && iconPosition === "right" && (
        <i className={`bi ${icon}`}></i>
      )}
    </button>
  );
}
