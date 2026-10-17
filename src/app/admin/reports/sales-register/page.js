"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import ReportsNav from "@/app/admin/reports/ReportsNav";
import { useToast } from "@/app/components/Toast";
import { hasPermission } from "@/utils/auth";
import { dealApi } from "@/services/dealApi";
import api from "@/lib/axios";
import Pagination from "@/components/common/Pagination";

export default function SalesRegisterReportPage() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [brands, setBrands] = useState([]);

  // Filters
  const [period, setPeriod] = useState("all_time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [forceFilter, setForceFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const can = (permission) => hasPermission(permission, currentUser || undefined);

  // Fetch Deals & Brands
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, brandsRes] = await Promise.allSettled([
        dealApi.getDeals({ per_page: 500 }),
        api.get("/brands", { params: { per_page: 100 } }),
      ]);

      if (dealsRes.status === "fulfilled" && dealsRes.value?.data) {
        setDeals(Array.isArray(dealsRes.value.data) ? dealsRes.value.data : []);
      }

      if (brandsRes.status === "fulfilled" && brandsRes.value?.data?.data) {
        setBrands(brandsRes.value.data.data);
      }
    } catch (err) {
      console.error("Error fetching sales register data:", err);
      showToast("Failed to load sales register records", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Date Filtering Helper
  const isDateInPeriod = (dateStr) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    const now = new Date();

    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (d > e) return false;
    }

    if (period === "today") {
      return d.toDateString() === now.toDateString();
    } else if (period === "this_month") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    } else if (period === "last_month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    } else if (period === "this_year") {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Date filter
      const recordDate = deal.delivery_date || deal.booking_date || deal.created_at;
      if (!isDateInPeriod(recordDate)) return false;

      // Status Filter
      if (statusFilter !== "all") {
        const stage = (deal.deal_status || deal.status || "").toLowerCase();
        if (statusFilter === "delivered" && !stage.includes("deliver")) return false;
        if (statusFilter === "booked" && stage.includes("deliver")) return false;
      }

      // Brand Filter
      if (brandFilter !== "all") {
        const bName = (deal.brand_name || deal.brand?.name || "").toLowerCase();
        if (!bName.includes(brandFilter.toLowerCase())) return false;
      }

      // Force Filter
      if (forceFilter !== "all") {
        const force = (deal.customer_force || deal.force || deal.lead?.customer_force || "").toLowerCase();
        if (!force.includes(forceFilter.toLowerCase())) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cName = (deal.customer_name || deal.lead?.name || "").toLowerCase();
        const cPhone = (deal.customer_phone || deal.lead?.phone || "").toLowerCase();
        const model = (deal.model_name || deal.vehicle_model || "").toLowerCase();
        const variant = (deal.variant_name || "").toLowerCase();
        const vin = (deal.vin_number || deal.chassis_no || deal.registration_number || "").toLowerCase();
        const rep = (deal.sales_executive_name || "").toLowerCase();

        return (
          cName.includes(q) ||
          cPhone.includes(q) ||
          model.includes(q) ||
          variant.includes(q) ||
          vin.includes(q) ||
          rep.includes(q)
        );
      }

      return true;
    });
  }, [deals, period, startDate, endDate, statusFilter, brandFilter, forceFilter, searchQuery]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalCount = filteredDeals.length;
    const deliveredCount = filteredDeals.filter((d) =>
      (d.deal_status || "").toLowerCase().includes("deliver")
    ).length;
    const totalRevenue = filteredDeals.reduce((sum, d) => sum + (Number(d.net_amount) || Number(d.total_amount) || 0), 0);
    const avgTicket = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

    return { totalCount, deliveredCount, totalRevenue, avgTicket };
  }, [filteredDeals]);

  // Pagination Logic
  const totalDeals = filteredDeals.length;
  const lastPage = Math.max(1, Math.ceil(totalDeals / perPage));
  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredDeals.slice(start, start + perPage);
  }, [filteredDeals, currentPage, perPage]);

  // Export to CSV
  const handleExportCsv = () => {
    try {
      const headers = [
        "Deal ID",
        "Date",
        "Customer Name",
        "Mobile",
        "Defence Force",
        "Rank",
        "Brand",
        "Model",
        "Variant",
        "Chassis/VIN",
        "Sales Executive",
        "Net Amount (INR)",
        "Delivery Status",
      ];

      const rows = filteredDeals.map((d) => [
        d.id || `DL-${d.deal_id || 100}`,
        d.delivery_date || d.booking_date || "-",
        `"${(d.customer_name || "").replace(/"/g, '""')}"`,
        `"${d.customer_phone || ""}"`,
        `"${d.customer_force || "Defence"}"`,
        `"${d.customer_rank || "-"}"`,
        `"${d.brand_name || ""}"`,
        `"${d.model_name || ""}"`,
        `"${d.variant_name || ""}"`,
        `"${d.vin_number || d.chassis_no || "-"}"`,
        `"${d.sales_executive_name || "-"}"`,
        Number(d.net_amount || d.total_amount || 0),
        `"${d.deal_status || "Booked"}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `vehicle_sales_register_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Sales register CSV exported successfully!", "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export CSV", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Breadcrumb Header */}
        <div className="page-header-wrapper mb-3">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href="/admin/reports">Reports & Analytics</Link>
              </li>
              <li className="breadcrumb-item active">Sales & Delivery Register</li>
            </ul>
            <h1 className="page-title mt-1">Vehicle Sales & Delivery Register</h1>
            <p className="text-muted small mb-0">
              Line-by-line customer vehicle bookings, delivery dates, defence ranks, and chassis records.
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={fetchData}
              disabled={loading}
              title="Refresh Records"
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-outline-custom btn-sm"
              onClick={() => window.print()}
            >
              <i className="bi bi-printer me-1 text-danger"></i>
              Print / PDF
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleExportCsv}
              disabled={filteredDeals.length === 0}
            >
              <i className="bi bi-file-earmark-arrow-down me-1"></i>
              Export Excel / CSV
            </button>
          </div>
        </div>

        {/* Reports Navigation Tabs */}
        <ReportsNav />

        {/* KPI Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Filtered Sales</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-car-front-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{kpis.totalCount} <span className="fs-6 text-muted fw-normal">Units</span></div>
              <span className="text-primary small fw-semibold">Across selected filters</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Delivered Vehicles</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-check2-circle"></i>
                </div>
              </div>
              <div className="stat-card-value text-success">{kpis.deliveredCount} <span className="fs-6 text-muted fw-normal">Delivered</span></div>
              <span className="text-success small fw-semibold">
                {kpis.totalCount > 0 ? Math.round((kpis.deliveredCount / kpis.totalCount) * 100) : 0}% Delivery completion
              </span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Net Revenue</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-currency-rupee"></i>
                </div>
              </div>
              <div className="stat-card-value">₹{(kpis.totalRevenue / 100000).toFixed(2)} <span className="fs-6 text-muted fw-normal">Lakhs</span></div>
              <span className="text-muted small">Total invoice billings</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card h-100">
              <div className="stat-card-header">
                <span className="stat-card-title">Average Deal Value</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-tag-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">₹{(kpis.avgTicket / 100000).toFixed(2)} <span className="fs-6 text-muted fw-normal">Lakhs</span></div>
              <span className="text-info small fw-semibold">Average per vehicle</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="card mb-4 border-0 shadow-sm">
          <div className="card-body p-3">
            <div className="row g-2 align-items-center">
              {/* Search Bar */}
              <div className="col-lg-3 col-md-6">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search customer, phone, VIN..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {/* From Date */}
              <div className="col-6 col-lg-2 col-md-3">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  title="Filter From Date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* To Date */}
              <div className="col-6 col-lg-2 col-md-3">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  title="Filter To Date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Period Dropdown */}
              <div className="col-6 col-lg-2 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all_time">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_year">This Financial Year</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="col-6 col-lg-2 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Delivery Statuses</option>
                  <option value="delivered">Delivered Only</option>
                  <option value="booked">Booked (Pending Delivery)</option>
                </select>
              </div>

              {/* Force Filter */}
              <div className="col-6 col-lg-2 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={forceFilter}
                  onChange={(e) => {
                    setForceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Defence Forces</option>
                  <option value="army">Indian Army</option>
                  <option value="navy">Indian Navy</option>
                  <option value="air">Air Force</option>
                  <option value="paramilitary">Paramilitary</option>
                  <option value="civilian">Civilians</option>
                </select>
              </div>

              {/* Brand Filter */}
              <div className="col-6 col-lg-2 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={brandFilter}
                  onChange={(e) => {
                    setBrandFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Vehicle Brands</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset button */}
              {(searchQuery || startDate || endDate || period !== "all_time" || statusFilter !== "all" || forceFilter !== "all" || brandFilter !== "all") && (
                <div className="col-auto">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStartDate("");
                      setEndDate("");
                      setPeriod("all_time");
                      setStatusFilter("all");
                      setForceFilter("all");
                      setBrandFilter("all");
                      setCurrentPage(1);
                    }}
                    title="Reset All Filters"
                  >
                    <i className="bi bi-x-circle me-1"></i> Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sales Table Card */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="card-title mb-0">Vehicle Delivery Register</h5>
              <span className="text-muted small">
                Showing {paginatedDeals.length} of {filteredDeals.length} registered vehicles
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "80px" }}>Deal #</th>
                  <th>Delivery / Booking Date</th>
                  <th>Customer Information</th>
                  <th>Defence Rank & Force</th>
                  <th>Vehicle Details</th>
                  <th>Chassis / VIN</th>
                  <th>Sales Rep</th>
                  <th className="text-end">Invoice Net (₹)</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading sales register records...
                    </td>
                  </tr>
                ) : paginatedDeals.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                      No vehicle sales or delivery records match your selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedDeals.map((deal, idx) => {
                    const isDelivered = (deal.deal_status || "").toLowerCase().includes("deliver");
                    return (
                      <tr key={deal.id || idx}>
                        <td>
                          <span className="fw-bold text-dark font-monospace small">
                            #{deal.id || `DL-${idx + 1}`}
                          </span>
                        </td>
                        <td>
                          <div className="small fw-semibold text-dark">
                            {deal.delivery_date || deal.booking_date || "-"}
                          </div>
                          <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {isDelivered ? "Delivered" : "Booked"}
                          </span>
                        </td>
                        <td>
                          <div className="fw-bold text-dark small">
                            {deal.customer_name || deal.lead?.name || "Customer"}
                          </div>
                          <div className="text-muted small">
                            <i className="bi bi-telephone me-1"></i>
                            {deal.customer_phone || deal.lead?.phone || "-"}
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border me-1">
                            {deal.customer_force || deal.lead?.customer_force || "Defence Force"}
                          </span>
                          <span className="text-muted small d-block mt-1">
                            {deal.customer_rank || deal.lead?.customer_rank || "Rank N/A"}
                          </span>
                        </td>
                        <td>
                          <div className="fw-bold text-dark small">
                            {deal.brand_name || ""} {deal.model_name || "Vehicle"}
                          </div>
                          <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {deal.variant_name || "Base"}
                          </span>
                        </td>
                        <td>
                          <span className="font-monospace small text-secondary">
                            {deal.vin_number || deal.chassis_no || deal.registration_number || "—"}
                          </span>
                        </td>
                        <td>
                          <span className="small text-dark">
                            {deal.sales_executive_name || "Showroom Team"}
                          </span>
                        </td>
                        <td className="text-end fw-bold text-dark">
                          ₹{Number(deal.net_amount || deal.total_amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge rounded-pill px-3 py-1 ${
                              isDelivered
                                ? "bg-success-subtle text-success"
                                : "bg-primary-subtle text-primary"
                            }`}
                          >
                            {isDelivered ? "Delivered" : "Booking Confirmed"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredDeals.length > 0 && (
            <Pagination
              currentPage={currentPage}
              lastPage={lastPage}
              total={totalDeals}
              perPage={perPage}
              onPageChange={(page) => setCurrentPage(page)}
              onPerPageChange={(newPerPage) => {
                setPerPage(newPerPage);
                setCurrentPage(1);
              }}
              perPageOptions={[10, 20, 50, 100]}
              itemName="deals"
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
