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
  const [selectedVariantId, setSelectedVariantId] = useState("");

  // Quick batch price input for selected variants
  const [quickAdjustValue, setQuickAdjustValue] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  // Fetch all initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [variantsSettled, brandsSettled, modelsSettled] = await Promise.allSettled([
        priceMasterApi.getVariants({ per_page: 100 }),
        api.get("/brands"),
        api.get("/models"),
      ]);

      const variantsRes = variantsSettled.status === "fulfilled" ? variantsSettled.value : null;
      const brandsRes = brandsSettled.status === "fulfilled" ? brandsSettled.value : null;
      const modelsRes = modelsSettled.status === "fulfilled" ? modelsSettled.value : null;

      const variantsList = variantsRes?.data || [];
      let brandsList = brandsRes?.data?.data || brandsRes?.data || [];
      let modelsList = modelsRes?.data?.data || modelsRes?.data || [];

      // If brands or models endpoints failed, fallback to extracting unique brands/models from variants list
      if ((!brandsList || brandsList.length === 0) && variantsList.length > 0) {
        const uniqueBrandsMap = new Map();
        variantsList.forEach((v) => {
          if (v.brand?.id && !uniqueBrandsMap.has(v.brand.id)) {
            uniqueBrandsMap.set(v.brand.id, v.brand);
          }
        });
        brandsList = Array.from(uniqueBrandsMap.values());
      }

      if ((!modelsList || modelsList.length === 0) && variantsList.length > 0) {
        const uniqueModelsMap = new Map();
        variantsList.forEach((v) => {
          if (v.model?.id && !uniqueModelsMap.has(v.model.id)) {
            uniqueModelsMap.set(v.model.id, v.model);
          }
        });
        modelsList = Array.from(uniqueModelsMap.values());
      }

      setVariants(variantsList);
      setBrands(brandsList);
      setModels(modelsList);

      // Initialize revised prices state with current price/ex_showroom_price
      const initialPrices = {};
      variantsList.forEach((v) => {
        initialPrices[v.id] = v.ex_showroom_price || v.price || "";
      });
      setRevisedPrices(initialPrices);

      if (variantsSettled.status === "rejected") {
        console.error("Variants request rejected:", variantsSettled.reason);
        showToast("Failed to load vehicle variants from server.", "error");
      }
    } catch (err) {
      console.error("Failed to load vehicle price master data:", err);
      showToast("Failed to load vehicle price master data.", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Models filtered for the currently selected brand
  const filteredModelsForDropdown = useMemo(() => {
    if (!selectedBrandId) return models;
    return models.filter((m) => String(m.brand_id) === String(selectedBrandId));
  }, [models, selectedBrandId]);

  // Variants filtered for the currently selected brand and model
  const filteredVariantsForDropdown = useMemo(() => {
    let list = variants;
    if (selectedBrandId) {
      list = list.filter((v) => {
        const vBrandId = v.brand_id || v.brand?.id;
        return String(vBrandId) === String(selectedBrandId);
      });
    }
    if (selectedModelId) {
      list = list.filter((v) => {
        const vModelId = v.model_id || v.model?.id;
        return String(vModelId) === String(selectedModelId);
      });
    }
    return list;
  }, [variants, selectedBrandId, selectedModelId]);

  // When brand filter changes, reset model and variant filter
  const handleBrandFilterChange = (newBrandId) => {
    setSelectedBrandId(newBrandId);
    setSelectedModelId("");
    setSelectedVariantId("");
    setCurrentPage(1);
  };

  // When model filter changes, reset variant filter
  const handleModelFilterChange = (newModelId) => {
    setSelectedModelId(newModelId);
    setSelectedVariantId("");
    setCurrentPage(1);
  };

  // Reset all search and dropdown filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedBrandId("");
    setSelectedModelId("");
    setSelectedVariantId("");
    setCurrentPage(1);
  };

  // Filtered variants based on Search, Brand, Model, and Variant
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

      // 3. Variant filter
      if (selectedVariantId) {
        if (String(v.id) !== String(selectedVariantId)) return false;
      }

      // 4. Search filter across Variant Name, Model Name, and Brand Name
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
  }, [variants, selectedBrandId, selectedModelId, selectedVariantId, searchTerm]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrandId, selectedModelId, selectedVariantId]);

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

  // 1. Single Variant Quick Update
  const handleSaveSingleRow = async (variant) => {
    const newPriceVal = revisedPrices[variant.id];
    if (newPriceVal === "" || isNaN(newPriceVal) || Number(newPriceVal) <= 0) {
      showToast("Please enter a valid revised ex-showroom price.", "error");
      return;
    }

    const numPrice = Number(newPriceVal);
    setSavingRowId(variant.id);
    try {
      const res = await priceMasterApi.updateSingleVariantPrice(variant.id, numPrice, {
        brand_id: variant.brand_id || variant.brand?.id,
        model_id: variant.model_id || variant.model?.id,
        name: variant.name,
        status: variant.status || "Active",
      });

      // Update state: Set previous_price from backend response or old_price
      const backendUpdated = Array.isArray(res?.data) ? res.data[0] : res?.data;
      setVariants((prev) =>
        prev.map((v) => {
          if (v.id === variant.id) {
            const oldPrice = v.ex_showroom_price || v.price;
            return {
              ...v,
              previous_price: backendUpdated?.previous_price !== undefined ? backendUpdated.previous_price : oldPrice,
              price: numPrice,
              ex_showroom_price: numPrice,
              calculated_on_road_price: backendUpdated?.on_road_price || v.calculated_on_road_price,
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

    // Auto-apply top input value to selected variants if user entered a price
    let workingPrices = { ...revisedPrices };
    const val = parseFloat(quickAdjustValue);
    if (!isNaN(val) && val > 0) {
      selectedIds.forEach((id) => {
        workingPrices[id] = Math.round(val);
      });
      setRevisedPrices(workingPrices);
    }

    // Build payload
    const itemsToUpdate = [];
    for (const id of selectedIds) {
      const v = variants.find((item) => item.id === id);
      const newPrice = workingPrices[id];
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

      // Map backend response by id for accurate previous_price and on_road_price
      const backendMap = new Map();
      if (Array.isArray(res?.data)) {
        res.data.forEach((item) => backendMap.set(item.id, item));
      }

      // Update state locally: previous_price = old_price, price = revised_price
      setVariants((prev) =>
        prev.map((v) => {
          const updatedItem = itemsToUpdate.find((u) => u.id === v.id);
          if (updatedItem) {
            const backendItem = backendMap.get(v.id);
            const oldPrice = v.ex_showroom_price || v.price;
            return {
              ...v,
              previous_price: backendItem?.previous_price !== undefined ? backendItem.previous_price : oldPrice,
              price: updatedItem.revised_price,
              ex_showroom_price: updatedItem.revised_price,
              calculated_on_road_price: backendItem?.on_road_price || v.calculated_on_road_price,
            };
          }
          return v;
        })
      );

      setSelectedIds([]);
      setQuickAdjustValue("");
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

  // Export CSV of Current & Revised Prices
  const handleExportPriceMaster = () => {
    try {
      showToast("Generating vehicle price master sheet...", "info");
      const rows = [
        ["ID", "Brand", "Model", "Variant Name", "Previous Price (₹)", "Revised Ex-Showroom (₹)", "Status"],
        ...filteredVariants.map((v) => {
          const currentPrice = Number(v.ex_showroom_price || v.price || 0);
          const revised = Number(revisedPrices[v.id] ?? currentPrice);
          const prev = v.previous_price ? Number(v.previous_price) : "";
          return [
            v.id,
            v.brand?.name || v.brand_name || "",
            v.model?.name || v.model_name || "",
            v.name,
            prev !== "" ? prev : "-",
            revised,
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
              <div className="col-12 col-md-6 col-lg-3">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted">
                    <i className="bi bi-search text-primary"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search variant, model, brand..."
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
              <div className="col-12 col-sm-6 col-md-3 col-lg-2">
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
              <div className="col-12 col-sm-6 col-md-3 col-lg-2">
                <select
                  className="form-select fw-semibold"
                  style={{ borderColor: "var(--border-color, #D9DDCC)" }}
                  value={selectedModelId}
                  onChange={(e) => handleModelFilterChange(e.target.value)}
                  disabled={Boolean(selectedBrandId && filteredModelsForDropdown.length === 0)}
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

              {/* Variant Filter (Cascading after Model) */}
              <div className="col-12 col-sm-6 col-md-3 col-lg-3">
                <select
                  className="form-select fw-semibold"
                  style={{ borderColor: "var(--border-color, #D9DDCC)" }}
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  disabled={Boolean(selectedModelId && filteredVariantsForDropdown.length === 0)}
                >
                  <option value="">
                    {selectedModelId
                      ? `All Variants (${filteredVariantsForDropdown.length})`
                      : selectedBrandId
                      ? `All Variants (${filteredVariantsForDropdown.length})`
                      : `All Variants (${variants.length})`}
                  </option>
                  {filteredVariantsForDropdown.map((v) => (
                    <option key={v.id} value={v.id}>
                      {selectedModelId
                        ? v.name
                        : v.model?.name
                        ? `${v.model.name} - ${v.name}`
                        : v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear / Reset Filter Button & Count Badge */}
              <div className="col-12 col-sm-6 col-md-3 col-lg-2 d-flex align-items-center justify-content-end gap-2">
                {(searchTerm || selectedBrandId || selectedModelId || selectedVariantId) && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm w-100"
                    onClick={handleClearFilters}
                    title="Reset all filters"
                  >
                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                    Reset
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
                Enter price above or edit inline below:
              </span>
            </div>

            {/* Direct Price Input & Save Button */}
            <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mt-md-0">
              <div className="input-group input-group-sm" style={{ width: "210px" }}>
                <span className="input-group-text bg-white fw-bold text-muted border-end-0">₹</span>
                <input
                  type="number"
                  className="form-control form-control-sm font-monospace fw-bold"
                  placeholder="Enter price"
                  value={quickAdjustValue}
                  onChange={(e) => setQuickAdjustValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBulkUpdate();
                    }
                  }}
                  min="0"
                />
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
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-save2-fill"></i>
                    <span>Save ({selectedIds.length})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setSelectedIds([]);
                  setQuickAdjustValue("");
                }}
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
                  <th style={{ width: "110px" }} className="text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      Loading vehicle variants catalog...
                    </td>
                  </tr>
                ) : paginatedVariants.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
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
                              className={`form-control font-monospace fw-bold text-dark ${hasChanged ? "border-warning bg-warning-subtle text-dark" : ""
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

                        {/* Action: Single Row Save Button */}
                        <td className="text-center">
                          <button
                            type="button"
                            className={`btn btn-sm ${hasChanged ? "btn-warning text-dark fw-bold" : "btn-outline-primary"
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
