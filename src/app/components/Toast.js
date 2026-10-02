"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div id="appToastContainer" style={{ position: "fixed", top: "20px", right: "20px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px" }}>
        {toasts.map((toast) => {
          const typeClass =
            toast.type === "success"
              ? "toast-success"
              : toast.type === "danger" || toast.type === "error"
              ? "toast-danger"
              : toast.type === "warning"
              ? "toast-warning"
              : "toast-info";

          const icon =
            toast.type === "success" ? (
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
            ) : toast.type === "danger" || toast.type === "error" ? (
              <i className="bi bi-exclamation-octagon-fill text-danger fs-5"></i>
            ) : toast.type === "warning" ? (
              <i className="bi bi-exclamation-triangle-fill text-warning fs-5"></i>
            ) : (
              <i className="bi bi-info-circle-fill text-white fs-5"></i>
            );

          return (
            <div
              key={toast.id}
              className={`toast custom-crm-toast ${typeClass} show align-items-center shadow-lg border-0`}
              role="alert"
              style={{ display: "block", minWidth: "300px" }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div className="toast-body d-flex align-items-center gap-3">
                  {icon}
                  <div className="toast-message text-white fw-bold">{toast.message}</div>
                </div>
                <button
                  type="button"
                  className="btn-close me-2 m-auto"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Close"
                ></button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg) => console.log(msg),
    };
  }
  return context;
}
