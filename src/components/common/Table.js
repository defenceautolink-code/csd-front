"use client";

import React from "react";
import Loading from "./Loading";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";

/**
 * Reusable Data Table Component
 *
 * @param {Object} props
 * @param {Array<Object>} props.columns - Column configuration:
 *   [{ key, label, render, sortable, className, width, align: 'start'|'center'|'end' }]
 * @param {Array<Object>} props.data - Array of row data objects
 * @param {string} [props.keyField='id'] - Primary key field name in each row
 * @param {boolean} [props.loading=false] - Whether table is currently fetching data
 * @param {string} [props.loadingText='Loading data...']
 * @param {string} [props.error=null] - Error message if request failed
 * @param {function} [props.onRetry] - Retry callback for ErrorState
 * @param {string} [props.emptyTitle='No records found']
 * @param {string} [props.emptyDescription='No data is currently available matching the criteria.']
 * @param {string} [props.emptyIcon='bi-inbox']
 * @param {React.ReactNode} [props.emptyAction]
 * @param {boolean} [props.selectable=false] - Enable row selection checkboxes
 * @param {Array<number|string>} [props.selectedIds=[]] - Array of currently selected IDs
 * @param {function} [props.onSelectRow] - (rowId, row, isSelected) => ...
 * @param {function} [props.onSelectAll] - (allIds, isSelected) => ...
 * @param {string} [props.className='']
 */
export default function Table({
  columns = [],
  data = [],
  keyField = "id",
  loading = false,
  loadingText = "Loading data...",
  error = null,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription = "There are no records matching your search or filters.",
  emptyIcon = "bi-inbox",
  emptyAction,
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  className = "",
}) {
  const allIds = data.map((item) => item[keyField]);
  const isAllSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const isSomeSelected =
    selectedIds.length > 0 && !isAllSelected;

  const handleSelectAllChange = (e) => {
    if (onSelectAll) {
      onSelectAll(allIds, e.target.checked);
    }
  };

  const handleSelectRowChange = (rowId, row, e) => {
    if (onSelectRow) {
      onSelectRow(rowId, row, e.target.checked);
    }
  };

  const totalColSpan = columns.length + (selectable ? 1 : 0);

  return (
    <div className={`table-responsive position-relative ${className}`}>
      <table className="table table-custom mb-0">
        <thead>
          <tr>
            {selectable && (
              <th style={{ width: "42px" }} className="text-center align-middle">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={handleSelectAllChange}
                  aria-label="Select all rows"
                  disabled={loading || data.length === 0}
                />
              </th>
            )}

            {columns.map((col, index) => {
              const alignClass =
                col.align === "center"
                  ? "text-center"
                  : col.align === "end" || col.align === "right"
                  ? "text-end"
                  : "";

              return (
                <th
                  key={col.key || index}
                  style={col.width ? { width: col.width } : {}}
                  className={`${alignClass} ${col.className || ""}`}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {/* Loading State */}
          {loading && data.length === 0 ? (
            <tr>
              <td colSpan={totalColSpan} className="p-0">
                <Loading text={loadingText} />
              </td>
            </tr>
          ) : error ? (
            /* Error State */
            <tr>
              <td colSpan={totalColSpan} className="p-0">
                <ErrorState message={error} onRetry={onRetry} />
              </td>
            </tr>
          ) : data.length === 0 ? (
            /* Empty State */
            <tr>
              <td colSpan={totalColSpan} className="p-0">
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  icon={emptyIcon}
                  action={emptyAction}
                />
              </td>
            </tr>
          ) : (
            /* Data Rows */
            data.map((row, rowIndex) => {
              const rowId = row[keyField] ?? rowIndex;
              const isSelected = selectedIds.includes(rowId);

              return (
                <tr
                  key={rowId}
                  className={isSelected ? "table-active-row" : ""}
                >
                  {selectable && (
                    <td className="text-center align-middle">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={isSelected}
                        onChange={(e) => handleSelectRowChange(rowId, row, e)}
                        aria-label={`Select row ${rowId}`}
                      />
                    </td>
                  )}

                  {columns.map((col, colIndex) => {
                    const alignClass =
                      col.align === "center"
                        ? "text-center"
                        : col.align === "end" || col.align === "right"
                        ? "text-end"
                        : "";

                    const rawValue = col.key ? row[col.key] : null;
                    const renderedContent = col.render
                      ? col.render(rawValue, row, rowIndex)
                      : rawValue ?? "-";

                    return (
                      <td
                        key={col.key || colIndex}
                        className={`align-middle ${alignClass} ${col.className || ""}`}
                      >
                        {renderedContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Dimmed Loading Overlay when refetching with existing data */}
      {loading && data.length > 0 && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            background: "rgba(19, 28, 39, 0.45)",
            backdropFilter: "blur(2px)",
            zIndex: 5,
          }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}
