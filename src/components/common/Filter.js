"use client";

import React from "react";
import Button from "./Button";

/**
 * Reusable Filter Toolbar Component
 *
 * @param {Object} props
 * @param {Array<Object>} props.filters - Array of filter definitions:
 *   [{ name, label, options, placeholder, width }]
 * @param {Object} props.values - Current selected filter values map: { priority: 'Hot', status: 'New' }
 * @param {function} props.onChange - (filterName, selectedValue) => ...
 * @param {function} [props.onClear] - Clear all filters callback
 * @param {string} [props.className='']
 */
export default function Filter({
  filters = [],
  values = {},
  onChange,
  onClear,
  className = "",
}) {
  const activeCount = Object.values(values).filter(
    (v) => v !== "" && v !== null && v !== undefined
  ).length;

  return (
    <div className={`d-flex flex-wrap align-items-center gap-2 ${className}`}>
      {filters.map((filter) => {
        const {
          name,
          label,
          options = [],
          placeholder,
          width = "160px",
        } = filter;
        const currentVal = values[name] ?? "";

        return (
          <div key={name} style={{ width }}>
            <select
              id={`filter-${name}`}
              name={name}
              className={`form-select form-select-sm ${
                currentVal ? "border-primary text-primary fw-semibold" : ""
              }`}
              value={currentVal}
              onChange={(e) => onChange(name, e.target.value)}
              aria-label={label || name}
            >
              <option value="">{placeholder || `All ${label || name}`}</option>
              {options.map((opt, i) => {
                const optVal =
                  typeof opt === "object" && opt !== null ? opt.value : opt;
                const optLbl =
                  typeof opt === "object" && opt !== null ? opt.label : opt;

                return (
                  <option key={`${name}-${optVal}-${i}`} value={optVal}>
                    {optLbl}
                  </option>
                );
              })}
            </select>
          </div>
        );
      })}

      {activeCount > 0 && onClear && (
        <Button
          variant="outline-secondary"
          size="sm"
          icon="bi-x-lg"
          onClick={onClear}
          title="Clear all active filters"
        >
          Reset ({activeCount})
        </Button>
      )}
    </div>
  );
}
