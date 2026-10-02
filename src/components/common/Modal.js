"use client";

import React, { useEffect } from "react";

/**
 * Reusable Modal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {function} props.onClose - Close callback
 * @param {string} [props.title] - Modal title
 * @param {string} [props.icon] - Bootstrap icon class, e.g. 'bi-person-plus-fill'
 * @param {string} [props.size='md'] - 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} [props.closeOnBackdrop=true]
 * @param {React.ReactNode} [props.footer] - Optional footer action buttons
 * @param {React.ReactNode} props.children - Modal body content
 * @param {string} [props.className='']
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  size = "md",
  closeOnBackdrop = true,
  footer,
  children,
  className = "",
}) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "modal-sm";
      case "lg":
        return "modal-lg";
      case "xl":
        return "modal-xl";
      default:
        return "";
    }
  };

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && onClose) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`modal-dialog-custom ${getSizeClass()} ${className}`}
        style={{
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {(title || onClose) && (
          <div className="modal-header-custom d-flex align-items-center justify-content-between flex-shrink-0">
            <h5 className="modal-title-custom d-flex align-items-center gap-2 mb-0 fw-bold text-white fs-5">
              {icon && <i className={`bi ${icon} text-primary`}></i>}
              <span>{title}</span>
            </h5>
            {onClose && (
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              ></button>
            )}
          </div>
        )}

        {/* Modal Body (Scrollable) */}
        <div
          className="modal-body-custom flex-grow-1"
          style={{ overflowY: "auto" }}
        >
          {children}
        </div>

        {/* Optional Modal Footer */}
        {footer && (
          <div className="modal-footer-custom flex-shrink-0 border-top border-secondary-subtle">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
