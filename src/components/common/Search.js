"use client";

import React, { useState, useEffect, useRef } from "react";

/**
 * Reusable Search Input Component
 *
 * @param {Object} props
 * @param {string} [props.value=''] - Controlled search string
 * @param {function} props.onChange - (value) => ...
 * @param {function} [props.onSearch] - Triggered when search is confirmed / debounced
 * @param {string} [props.placeholder='Search...']
 * @param {number} [props.debounceTime=350] - Debounce delay in ms (0 for instant)
 * @param {string} [props.className='']
 * @param {string} [props.width='260px']
 */
export default function Search({
  value = "",
  onChange,
  onSearch,
  placeholder = "Search...",
  debounceTime = 350,
  className = "",
  width = "260px",
}) {
  const [internalValue, setInternalValue] = useState(value);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInternalValue(val);

    if (onChange) {
      onChange(val);
    }

    if (onSearch) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (debounceTime > 0) {
        debounceTimerRef.current = setTimeout(() => {
          onSearch(val);
        }, debounceTime);
      } else {
        onSearch(val);
      }
    }
  };

  const handleClear = () => {
    setInternalValue("");
    if (onChange) onChange("");
    if (onSearch) onSearch("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onSearch) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      onSearch(internalValue);
    }
  };

  return (
    <div
      className={`position-relative d-inline-flex align-items-center ${className}`}
      style={{ width }}
    >
      <i
        className="bi bi-search position-absolute text-muted"
        style={{
          left: "12px",
          zIndex: 3,
          pointerEvents: "none",
          fontSize: "0.85rem",
        }}
      ></i>

      <input
        type="text"
        className="form-control form-control-sm ps-5 pe-4"
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label="Search"
      />

      {internalValue && (
        <button
          type="button"
          className="btn btn-link position-absolute text-muted p-0 border-0"
          style={{
            right: "10px",
            zIndex: 3,
            textDecoration: "none",
            fontSize: "0.8rem",
          }}
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search"
        >
          <i className="bi bi-x-circle-fill"></i>
        </button>
      )}
    </div>
  );
}
