"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import priceMasterApi from "@/services/priceMasterApi";
import api from "@/lib/axios";
import Pagination from "@/components/common/Pagination";

// Currency formatter
const formatCurrency = (val) => {
  if (val === null || val === undefined || val === "" || isNaN(val)) return "-";
  const num = Number(val);
  if (num === 0) return "-";
  return "₹" + num.toLocaleString("en-IN");
};

export default function UpdatePricePage() {
  const { showToast } = useToast();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [savingRowId, setSavingRowId] = useState(null);
  const [savingBulk, setSavingBulk] = useState(false);

  // Master Data
  const [variants, setVariants] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);

  // Editable prices map: { [variantId]: number|string }
  const [revisedPrices, setRevisedPrices] = useState({});

  // Checkbox selection: Array of selected variant IDs
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");

  // Quick batch adjust popover/inputs (e.g., + ₹5000 or + 2%)
  const [quickAdjustMode, setQuickAdjustMode] = useState("flat"); // 'flat' or 'percent'
  const [quickAdjustValue, setQuickAdjustValue] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Fetch all initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [variantsRes, brandsRes, modelsRes] = await Promise.all([
        priceMasterApi.getVariants({ per_page: 100 }),
        api.get("/brands"),
        api.get("/models"),
      ]);

      const variantsList = variantsRes?.data || [];
      setVariants(variantsList);
      setBrands(brandsRes?.data?.data || brandsRes?.data || []);
      setModels(modelsRes?.data?.data || modelsRes?.data || []);

      // Initialize revised prices state with current price/ex_showroom_price
      const initialPrices = {};
      variantsList.forEach((v) => {
        initialPrices[v.id] = v.ex_showroom_price || v.price || "";
      });
      setRevisedPrices(initialPrices);
    } catch (err) {
      console.error("Failed to load vehicle price master data:", err);
      showToast("Failed to load vehicle price master data.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Models filtered for the currently selected brand
  const filteredModelsForDropdown = useMemo(() => {
    if (!selectedBrandId) return models;
    return models.filter((m) => String(m.brand_id) === String(selectedBrandId));
  }, [models, selectedBrandId]);

  // When brand filter changes, reset model filter if model doesn't belong to new brand
  const handleBrandFilterChange = (newBrandId) => {
    setSelectedBrandId(newBrandId);
    setSelectedModelId("");
    setCurrentPage(1);
  };

  // Filtered variants based on Search, Brand, and Model
  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      // 1. Brand filter
      if (selectedBrandId) {
        const vBrandId = v.brand_id || v.brand?.id;
        if (String(vBrandId) !== String(selectedBrandId)) return false;
      }

      // 2. Model filter
      if (selectedModelId) {
        const vModelId = v.model_id || v.model?.id;
        if (String(vModelId) !== String(selectedModelId)) return false;
      }

      // 3. Search filter across Variant Name, Model Name, and Brand Name
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const vName = (v.name || "").toLowerCase();
        const mName = (v.model?.name || v.model_name || "").toLowerCase();
        const bName = (v.brand?.name || v.brand_name || "").toLowerCase();
        if (!vName.includes(q) && !mName.includes(q) && !bName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [variants, selectedBrandId, selectedModelId, searchTerm]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedModelId]);

  // Pagination slicing
  const totalRecords = filteredVariants.length;
  const lastPage = Math.max(1, Math.ceil(totalRecords / perPage));
  const paginatedVariants = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredVariants.slice(start, start + perPage);
  }, [filteredVariants, currentPage, perPage]);

  // Handle inline price change
  const handlePriceChange = (variantId, newPrice) => {
    setRevisedPrices((prev) => ({
      ...prev,
      [variantId]: newPrice,
    }));
  };

  // Checkbox: Select / Deselect individual
  const toggleSelectRow = (variantId) => {
    setSelectedIds((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    );
  };

  // Checkbox: Select / Deselect ALL currently visible/filtered rows
  const isAllCurrentSelected =
    paginatedVariants.length > 0 &&
    paginatedVariants.every((v) => selectedIds.includes(v.id));

  const toggleSelectAllCurrent = () => {
    if (isAllCurrentSelected) {
      // Deselect all on current page
      const currentIds = paginatedVariants.map((v) => v.id);
      setSelectedIds((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      // Select all on current page
      const currentIds = paginatedVariants.map((v) => v.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  // Quick Batch Adjust calculation (e.g. + ₹5,000 or + 2% to all selected)
  const applyQuickAdjustToSelected = () => {
    const val = parseFloat(quickAdjustValue);
    if (isNaN(val) || val === 0) {
      showToast("Please enter a valid adjustment amount or percentage.", "warning");
      return;
    }

    setRevisedPrices((prev) => {
      const updated = { ...prev };
      selectedIds.forEach((id) => {
        const variant = variants.find((v) => v.id === id);
        const current = Number(prev[id] ?? variant?.price ?? 0);
        let nextVal = current;

        if (quickAdjustMode === "percent") {
          nextVal = Math.round(current + (current * val) / 100);
        } else {
          nextVal = Math.round(current + val);
        }

        updated[id] = Math.max(0, nextVal);
      });
      return updated;
    });

    showToast(
      `Applied adjustment of ${quickAdjustMode === "percent" ? `${val}%` : `₹${val.toLocaleString("en-IN")}`} to ${selectedIds.length} selected variants.`,
      "info"
    );
  };

  // 1. Single Variant Quick Update (Row Save 💾)
  const handleSaveSingleRow = async (variant) => {
    const newPriceVal = revisedPrices[variant.id];
    if (newPriceVal === "" || isNaN(newPriceVal) || Number(newPriceVal) <= 0) {
      showToast("Please enter a valid revised ex-showroom price.", "error");
      return;
    }

    const numPrice = Number(newPriceVal);
    setSavingRowId(variant.id);
    try {
      await priceMasterApi.updateSingleVariantPrice(variant.id, numPrice, {
        brand_id: variant.brand_id || variant.brand?.id,
        model_id: variant.model_id || variant.model?.id,
        name: variant.name,
      });

      // Update state: Set previous_price = old_price, and price = numPrice
      setVariants((prev) =>
        prev.map((v) => {
          if (v.id === variant.id) {
            const oldPrice = v.ex_showroom_price || v.price;
            return {
              ...v,
              previous_price: oldPrice,
              price: numPrice,
              ex_showroom_price: numPrice,
            };
          }
          return v;
        })
      );

      showToast(`Price for "${variant.name}" revised to ₹${numPrice.toLocaleString("en-IN")} successfully!`, "success");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || "Failed to update price", "error");
    } finally {
      setSavingRowId(null);
    }
  };

  // 2. Bulk Update Selected Variants (Bulk Action 🚀)
  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) {
      showToast("Please select at least one variant using checkboxes.", "warning");
      return;
    }

    // Build payload
    const itemsToUpdate = [];
    for (const id of selectedIds) {
      const v = variants.find((item) => item.id === id);
      const newPrice = revisedPrices[id];
      if (newPrice === "" || isNaN(newPrice) || Number(newPrice) <= 0) {
        showToast(`Invalid price for variant: ${v?.name || id}`, "error");
        return;
      }
      itemsToUpdate.push({
        id: v.id,
        revised_price: Number(newPrice),
      });
    }

    setSavingBulk(true);
    try {
      const res = await priceMasterApi.bulkUpdatePrices({
        variants: itemsToUpdate,
      });

      // Update state locally: previous_price = old_price, price = revised_price
      setVariants((prev) =>
        prev.map((v) => {
          const updatedItem = itemsToUpdate.find((u) => u.id === v.id);
          if (updatedItem) {
            const oldPrice = v.ex_showroom_price || v.price;
            return {
              ...v,
              previous_price: oldPrice,
              price: updatedItem.revised_price,
              ex_showroom_price: updatedItem.revised_price,
            };
          }
          return v;
        })
      );

      setSelectedIds([]);
      showToast(
        res?.message || `${itemsToUpdate.length} Variant prices updated successfully!`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || "Bulk price update failed", "error");
    } finally {
      setSavingBulk(false);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedBrandId("");
    setSelectedModelId("");
    setCurrentPage(1);
  };

  // Export CSV of Current & Revised Prices
  const handleExportPriceMaster = () => {
    try {
      showToast("Generating vehicle price master sheet...", "info");
      const rows = [
        ["ID", "Brand", "Model", "Variant Name", "Previous Price (₹)", "Revised Ex-Showroom (₹)", "Net Difference (₹)", "Status"],
        ...filteredVariants.map((v) => {
          const currentPrice = Number(v.ex_showroom_price || v.price || 0);
          const revised = Number(revisedPrices[v.id] ?? currentPrice);
          const prev = v.previous_price ? Number(v.previous_price) : "";
          const diff = revised - currentPrice;
          return [
            v.id,
            v.brand?.name || v.brand_name || "",
            v.model?.name || v.model_name || "",
            v.name,
            prev !== "" ? prev : "-",
            revised,
            diff,
            v.status || "Active",
          ];
        }),
      ];

      const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `vehicle_price_master_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Price master exported successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Export failed", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Breadcrumbs & Header Actions */}
        <div className="page-header-wrapper mb-3">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <span>Master Data</span>
              </li>
              <li className="breadcrumb-item active">Vehicle Price Master</li>
            </ul>
            <h1 className="page-title mt-1 d-flex align-items-center gap-2">
              <i className="bi bi-tags-fill text-primary"></i>
              Vehicle Price Master &amp; Bulk Updater
            </h1>
            <p className="text-muted small mb-0">
              Bulk update vehicle ex-showroom prices, compare previous rates, and revise catalog rates in real time.
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <Link href="/admin/quotation" className="btn btn-outline-custom">
              <i className="bi bi-file-earmark-spreadsheet-fill text-primary"></i>
              <span>Send Quotation</span>
            </Link>
            <button className="btn btn-primary" onClick={handleExportPriceMaster}>
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export Price Sheet</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            TOP FILTER & SEARCH TOOLBAR (CASCADING BRAND -> MODEL -> SEARCH)
            ========================================================================= */}
        <div
          className="card border-0 shadow-sm mb-3"
          style={{
            background: "linear-gradient(135deg, rgba(88, 99, 42, 0.05), rgba(19, 28, 39, 0.02))",
            border: "1px solid var(--border-color, #D9DDCC)",
          }}
        >
          <div className="card-body p-3">
            <div className="row g-2 align-items-center">
              {/* Search Bar */}
              <div className="col-12 col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted">
                    <i className="bi bi-search text-primary"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by Variant, Model, or Brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-outline-secondary border-start-0 bg-white text-muted"
                      type="button"
                      onClick={() => setSearchTerm("")}
                    >
                      <i className="bi bi-x-circle"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Brand Filter */}
              <div className="col-12 col-sm-6 col-md-3">
                <select
                  className="form-select fw-semibold"
                  style={{ borderColor: "var(--border-color, #D9DDCC)" }}
                  value={selectedBrandId}
                  onChange={(e) => handleBrandFilterChange(e.target.value)}
                >
                  <option value="">All Brands ({brands.length})</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model Filter (Cascading) */}
              <div className="col-12 col-sm-6 col-md-3">
                <select
                  className="form-select fw-semibold"
                  style={{ borderColor: "var(--border-color, #D9DDCC)" }}
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  disabled={selectedBrandId && filteredModelsForDropdown.length === 0}
                >
                  <option value="">
                    {selectedBrandId
                      ? `All Models (${filteredModelsForDropdown.length})`
                      : `All Models (${models.length})`}
                  </option>
                  {filteredModelsForDropdown.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear / Reset Filter Button */}
              <div className="col-12 col-md-2 d-flex align-items-center justify-content-end gap-2">
                {(searchTerm || selectedBrandId || selectedModelId) && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm w-100"
                    onClick={handleClearFilters}
                    title="Reset all filters"
                  >
                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                    Reset Filters
                  </button>
                )}
                <span className="badge bg-secondary-subtle text-secondary small py-2 px-2.5 flex-shrink-0">
                  {totalRecords} Variants
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BULK ACTION FLOATING / TOP BAR (ACTIVE WHEN CHECKBOXES ARE CHECKED)
            ========================================================================= */}
        {selectedIds.length > 0 && (
          <div
            className="alert alert-primary d-flex flex-wrap align-items-center justify-content-between p-2.5 mb-3 rounded-3 shadow-sm border border-primary animate__animated animate__fadeIn"
            style={{
              background: "linear-gradient(90deg, rgba(88, 99, 42, 0.12), rgba(19, 28, 39, 0.08))",
              borderColor: "var(--primary, #58632A)",
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary fs-6 px-2.5 py-1.5">
                <i className="bi bi-check2-circle me-1"></i>
                {selectedIds.length} Selected
              </span>
              <span className="small text-dark fw-semibold d-none d-sm-inline">
                Modify prices inline below or apply quick batch adjustment:
              </span>
            </div>

            {/* Quick Batch Increment Tools & Bulk Save Button */}
            <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-md-0">
              <div className="input-group input-group-sm" style={{ width: "230px" }}>
                <select
                  className="form-select form-select-sm"
                  style={{ maxWidth: "80px" }}
                  value={quickAdjustMode}
                  onChange={(e) => setQuickAdjustMode(e.target.value)}
                >
                  <option value="flat">+ ₹</option>
                  <option value="percent">+ %</option>
                </select>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder={quickAdjustMode === "percent" ? "e.g. 2" : "e.g. 10000"}
                  value={quickAdjustValue}
                  onChange={(e) => setQuickAdjustValue(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={applyQuickAdjustToSelected}
                  title="Apply adjustment to all selected rows"
                >
                  Apply
                </button>
              </div>

              <button
                type="button"
                className="btn btn-success btn-sm fw-bold px-3 d-flex align-items-center gap-1 shadow-sm"
                onClick={handleBulkUpdate}
                disabled={savingBulk}
              >
                {savingBulk ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Updating Prices...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-arrow-up-fill"></i>
                    <span>Update Selected Prices ({selectedIds.length})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setSelectedIds([])}
                title="Deselect all rows"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            BULK PRICE MANAGEMENT TABLE
            ========================================================================= */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 d-flex flex-wrap align-items-center justify-content-between border-bottom">
            <div>
              <h5 className="card-title text-dark mb-0 fw-bold">Vehicle Variants Price Register</h5>
              <small className="text-muted">
                Type the new revised rate directly into the Revised Ex-Showroom column. Old price automatically archives to Previous Price.
              </small>
            </div>

            <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
              <span className="text-muted extra-small">Showing page {currentPage} of {lastPage}</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "40px" }} className="text-center">
                    <input
                      type="checkbox"
                      className="form-check-input cursor-pointer"
                      checked={isAllCurrentSelected}
                      onChange={toggleSelectAllCurrent}
                      title="Select all on this page"
                    />
                  </th>
                  <th style={{ width: "60px" }}>#</th>
                  <th>Brand &amp; Vehicle Model</th>
                  <th>Variant Name</th>
                  <th style={{ minWidth: "150px" }} className="text-end">
                    Previous Price
                  </th>
                  <th style={{ minWidth: "210px" }}>
                    Revised Ex-Showroom (₹)
                    <span className="badge bg-primary-subtle text-primary ms-1 small">Editable</span>
                  </th>
                  <th style={{ minWidth: "140px" }} className="text-center">
                    Difference
                  </th>
                  <th style={{ width: "110px" }} className="text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      Loading vehicle variants catalog...
                    </td>
                  </tr>
                ) : paginatedVariants.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <i className="bi bi-search fs-3 d-block mb-2 text-secondary"></i>
                      No variants found matching your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedVariants.map((variant, index) => {
                    const rowNumber = (currentPage - 1) * perPage + index + 1;
                    const isSelected = selectedIds.includes(variant.id);
                    const brandTitle = variant.brand?.name || variant.brand_name || "Brand";
                    const modelTitle = variant.model?.name || variant.model_name || "Model";

                    // Current stored price
                    const currentStoredPrice = Number(variant.ex_showroom_price || variant.price || 0);

                    // User's revised input value
                    const revisedVal = revisedPrices[variant.id] ?? currentStoredPrice;
                    const numRevised = Number(revisedVal);

                    // Price difference between current stored price & newly typed price
                    const diff = isNaN(numRevised) ? 0 : numRevised - currentStoredPrice;
                    const hasChanged = !isNaN(numRevised) && diff !== 0;

                    // Previous price from DB
                    const hasPreviousPrice =
                      variant.previous_price !== null &&
                      variant.previous_price !== undefined &&
                      Number(variant.previous_price) > 0;

                    const isSavingThis = savingRowId === variant.id;

                    return (
                      <tr
                        key={variant.id}
                        className={isSelected ? "table-active" : hasChanged ? "bg-warning-subtle" : ""}
                        style={{ transition: "background-color 0.15s ease" }}
                      >
                        {/* Checkbox */}
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(variant.id)}
                          />
                        </td>

                        {/* Row Index */}
                        <td className="text-muted small">{rowNumber}</td>

                        {/* Brand & Model */}
                        <td>
                          <div className="d-flex align-items-center gap-1.5 flex-wrap">
                            <span className="badge bg-secondary-subtle text-secondary small px-1.5 py-0.5">
                              {brandTitle}
                            </span>
                            <strong className="text-dark small">{modelTitle}</strong>
                          </div>
                        </td>

                        {/* Variant Name */}
                        <td>
                          <span className="text-dark fw-semibold small">{variant.name}</span>
                          {variant.fuel_type && (
                            <span className="badge bg-light text-muted border ms-1 extra-small">
                              {variant.fuel_type}
                            </span>
                          )}
                        </td>

                        {/* Previous Price Column */}
                        <td className="text-end">
                          {hasPreviousPrice ? (
                            <div className="text-muted fw-semibold small font-monospace">
                              {formatCurrency(variant.previous_price)}
                            </div>
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                        </td>

                        {/* Revised Ex-Showroom (Inline Editable Input) */}
                        <td>
                          <div className="input-group input-group-sm">
                            <span
                              className="input-group-text bg-light text-muted fw-bold"
                              style={{ borderColor: hasChanged ? "#eab308" : "#ced4da" }}
                            >
                              ₹
                            </span>
                            <input
                              type="number"
                              className={`form-control font-monospace fw-bold text-dark ${
                                hasChanged ? "border-warning bg-warning-subtle text-dark" : ""
                              }`}
                              style={{
                                borderColor: hasChanged ? "#eab308" : "#ced4da",
                                minWidth: "120px",
                              }}
                              value={revisedVal}
                              onChange={(e) => handlePriceChange(variant.id, e.target.value)}
                              placeholder="e.g. 1450000"
                              min="0"
                            />
                          </div>
                        </td>

                        {/* Net Difference Indicator */}
                        <td className="text-center">
                          {hasChanged ? (
                            <span
                              className={`badge ${
                                diff > 0
                                  ? "bg-danger-subtle text-danger"
                                  : "bg-success-subtle text-success"
                              } font-monospace small px-2 py-1`}
                            >
                              {diff > 0 ? `+₹${diff.toLocaleString("en-IN")}` : `-₹${Math.abs(diff).toLocaleString("en-IN")}`}
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border extra-small">
                              Unchanged
                            </span>
                          )}
                        </td>

                        {/* Action: Single Row Save Button */}
                        <td className="text-center">
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              hasChanged ? "btn-warning text-dark fw-bold" : "btn-outline-primary"
                            } px-2.5 py-1 d-inline-flex align-items-center gap-1`}
                            onClick={() => handleSaveSingleRow(variant)}
                            disabled={isSavingThis || savingBulk}
                            title="Save new rate for this variant"
                          >
                            {isSavingThis ? (
                              <span className="spinner-border spinner-border-sm" role="status"></span>
                            ) : (
                              <>
                                <i className="bi bi-save2"></i>
                                <span className="small">Save</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination */}
          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            total={totalRecords}
            perPage={perPage}
            onPageChange={(p) => setCurrentPage(p)}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage);
              setCurrentPage(1);
            }}
            perPageOptions={[10, 15, 25, 50, 100]}
            itemName="variants"
          />
        </div>
      </div>
    </AdminLayout>
  );
}
