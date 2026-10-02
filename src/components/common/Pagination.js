"use client";

import React from "react";

/**
 * Reusable Pagination Component
 *
 * @param {Object} props
 * @param {number} [props.currentPage=1] - Current active page number (1-indexed)
 * @param {number} [props.lastPage=1] - Total number of pages
 * @param {number} [props.total=0] - Total count of records across all pages
 * @param {number} [props.perPage=15] - Current records per page
 * @param {function} props.onPageChange - (pageNumber) => ...
 * @param {function} [props.onPerPageChange] - (newPerPage) => ...
 * @param {Array<number>} [props.perPageOptions=[10, 15, 25, 50]]
 * @param {string} [props.itemName='records'] - Label for counted items (e.g. 'leads', 'users')
 * @param {string} [props.className='']
 */
export default function Pagination({
  currentPage = 1,
  lastPage = 1,
  total = 0,
  perPage = 15,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 15, 25, 50],
  itemName = "records",
  className = "",
}) {
  if (total === 0) return null;

  // Calculate range displayed (e.g. 1-15 of 45)
  const startItem = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
  const endItem = Math.min(currentPage * perPage, total);

  // Generate intelligent page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (lastPage <= maxVisible + 2) {
      for (let i = 1; i <= lastPage; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(lastPage - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < lastPage - 2) pages.push("...");
      pages.push(lastPage);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 py-3 px-3 border-top border-secondary-subtle ${className}`}
    >
      {/* Left: Range Info & Per-Page Selector */}
      <div className="d-flex align-items-center gap-3 text-muted small">
        <span>
          Showing <strong className="text-dark">{startItem}</strong> -{" "}
          <strong className="text-dark">{endItem}</strong> of{" "}
          <strong className="text-dark">{total}</strong> {itemName}
        </span>

        {onPerPageChange && (
          <div className="d-flex align-items-center gap-2">
            <span className="d-none d-sm-inline">Show:</span>
            <select
              className="form-select form-select-sm"
              style={{ width: "72px", padding: "2px 8px", fontSize: "0.8rem" }}
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              aria-label="Records per page"
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      {lastPage > 1 && (
        <nav aria-label="Table navigation">
          <ul className="pagination pagination-sm mb-0 gap-1">
            {/* First Page */}
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                aria-label="First page"
                title="First page"
              >
                <i className="bi bi-chevron-double-left"></i>
              </button>
            </li>

            {/* Previous Page */}
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <i className="bi bi-chevron-left"></i>
              </button>
            </li>

            {/* Numeric Page Buttons */}
            {pageNumbers.map((page, index) => {
              if (page === "...") {
                return (
                  <li key={`ellipsis-${index}`} className="page-item disabled">
                    <span className="page-link border-0">…</span>
                  </li>
                );
              }

              const isActive = page === currentPage;
              return (
                <li
                  key={`page-${page}`}
                  className={`page-item ${isActive ? "active" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => onPageChange(page)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {page}
                  </button>
                </li>
              );
            })}

            {/* Next Page */}
            <li
              className={`page-item ${
                currentPage === lastPage ? "disabled" : ""
              }`}
            >
              <button
                className="page-link"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === lastPage}
                aria-label="Next page"
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </li>

            {/* Last Page */}
            <li
              className={`page-item ${
                currentPage === lastPage ? "disabled" : ""
              }`}
            >
              <button
                className="page-link"
                onClick={() => onPageChange(lastPage)}
                disabled={currentPage === lastPage}
                aria-label="Last page"
                title="Last page"
              >
                <i className="bi bi-chevron-double-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
