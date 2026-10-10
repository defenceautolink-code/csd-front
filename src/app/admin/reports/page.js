"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import { hasPermission } from "@/utils/auth";
import reportApi from "@/services/reportApi";

export default function ReportsPage() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState("current_quarter");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [exporting, setExporting] = useState(false);

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

  const can = (permission) => hasPermission(permission, currentUser);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedPeriod === "custom") {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      } else {
        params.period = selectedPeriod;
      }
      if (selectedSegment) {
        params.vehicle_segment = selectedSegment;
      }

      const res = await reportApi.getDealershipAnalytics(params);
      if (res && res.status && res.data) {
        setAnalyticsData(res.data);
      } else if (res && res.data) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      console.error("Error fetching dealership analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, startDate, endDate, selectedSegment]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      showToast("Preparing raw analytics export...", "info");
      const res = await reportApi.exportReport({ period: selectedPeriod, format: "csv" });
      if (res && res.status) {
        showToast("Report export ready!", "success");
      } else {
        // Fallback: download client-side CSV of current leaderboard/sources
        const rows = [
          ["Acquisition Channel", "Total Leads", "Won Deals", "Conversion", "Revenue"],
          ...(analyticsData?.lead_source_attribution || []).map((s) => [
            s.acquisition_channel,
            s.total_leads,
            s.won_deals,
            s.formatted_conversion,
            s.formatted_revenue,
          ]),
        ];
        const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `dealership_analytics_${selectedPeriod}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Exported CSV successfully", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("CSV export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  const kpis = analyticsData?.kpi_summary;
  const funnel = analyticsData?.sales_conversion_funnel || [];
  const leadSources = analyticsData?.lead_source_attribution || [];
  const leaderboard = analyticsData?.sales_executive_leaderboard || [];

  // Funnel color palette
  const getFunnelColor = (idx) => {
    const colors = ["#3F4912", "#4B5028", "#D99A00", "#EE6800", "#008318"];
    return colors[idx % colors.length];
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Breadcrumbs & Header Actions */}
        <div className="page-header-wrapper">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item active">Reports & Analytics</li>
            </ul>
            <h1 className="page-title mt-1">Dealership Analytics & Performance Reports</h1>
            {analyticsData?.time_filter?.period_label && (
              <span className="badge bg-light text-dark border mt-1">
                <i className="bi bi-calendar3 me-1"></i>
                {analyticsData.time_filter.period_label}
                {analyticsData.time_filter.start_date &&
                  ` (${analyticsData.time_filter.start_date} to ${analyticsData.time_filter.end_date})`}
              </span>
            )}
          </div>

          <div className="page-header-actions d-flex flex-wrap align-items-center gap-2">
            {/* Period Dropdown */}
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="current_quarter">Current Financial Quarter (Q2)</option>
              <option value="q1">Quarter 1 (Q1)</option>
              <option value="q2">Quarter 2 (Q2)</option>
              <option value="q3">Quarter 3 (Q3)</option>
              <option value="q4">Quarter 4 (Q4)</option>
              <option value="current_month">Current Month</option>
              <option value="last_month">Last Month</option>
              <option value="current_year">Current Financial Year</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Date Range...</option>
            </select>

            {/* Segment Filter */}
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
            >
              <option value="">All Vehicle Segments</option>
              <option value="4 Wheeler">4 Wheeler</option>
              <option value="2 Wheeler">2 Wheeler</option>
            </select>

            {/* Custom Dates if Selected */}
            {selectedPeriod === "custom" && (
              <div className="d-flex align-items-center gap-1">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="From"
                />
                <span className="text-muted small">to</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="To"
                />
              </div>
            )}

            {can("reports.export_pdf") && (
              <button
                className="btn btn-outline-custom"
                onClick={handleExportPdf}
                title="Print or Save as PDF"
              >
                <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
                <span>Export PDF</span>
              </button>
            )}

            {can("reports.export_csv") && (
              <button
                className="btn btn-primary"
                onClick={handleExportCsv}
                disabled={exporting}
              >
                <i className="bi bi-file-earmark-arrow-down"></i>
                <span>{exporting ? "Exporting..." : "Export Excel / CSV"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-5 my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading Analytics...</span>
            </div>
            <p className="text-muted mt-3">Loading real-time dealership metrics & analytics...</p>
          </div>
        ) : (
          <>
            {/* Revenue & Conversion KPI Cards */}
            <div className="row g-3 mb-4">
              {/* Card 1: Total Revenue */}
              <div className="col-xl-3 col-sm-6">
                <div className="card stat-card h-100">
                  <div className="stat-card-header">
                    <span className="stat-card-title">Total Vehicle Sales Revenue</span>
                    <div className="stat-icon-box success">
                      <i className="bi bi-currency-rupee"></i>
                    </div>
                  </div>
                  <div className="stat-card-value">
                    {kpis?.total_vehicle_sales_revenue?.formatted_amount || "₹0"}
                  </div>
                  {kpis?.total_vehicle_sales_revenue?.comparison_label && (
                    <div className="stat-change positive">
                      <i
                        className={`bi bi-arrow-${
                          kpis.total_vehicle_sales_revenue.trend === "down" ? "down" : "up"
                        }-short`}
                      ></i>
                      <span>{kpis.total_vehicle_sales_revenue.comparison_label}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Dealership Gross Margin */}
              <div className="col-xl-3 col-sm-6">
                <div className="card stat-card h-100">
                  <div className="stat-card-header">
                    <span className="stat-card-title">Dealership Gross Margin</span>
                    <div className="stat-icon-box primary">
                      <i className="bi bi-pie-chart-fill"></i>
                    </div>
                  </div>
                  <div className="stat-card-value">
                    {kpis?.dealership_gross_margin?.formatted_amount || "₹0"}
                  </div>
                  <span className="text-primary small fw-semibold">
                    {kpis?.dealership_gross_margin?.margin_label ||
                      `${kpis?.dealership_gross_margin?.margin_percentage || 0}% Average Margin`}
                  </span>
                </div>
              </div>

              {/* Card 3: Pipeline Conversion Rate */}
              <div className="col-xl-3 col-sm-6">
                <div className="card stat-card h-100">
                  <div className="stat-card-header">
                    <span className="stat-card-title">Pipeline Conversion Rate</span>
                    <div className="stat-icon-box warning">
                      <i className="bi bi-graph-up-arrow"></i>
                    </div>
                  </div>
                  <div className="stat-card-value">
                    {kpis?.pipeline_conversion_rate?.formatted_rate ||
                      `${kpis?.pipeline_conversion_rate?.rate_percentage || 0}%`}
                  </div>
                  {kpis?.pipeline_conversion_rate?.comparison_label && (
                    <div className="stat-change positive">
                      <i className="bi bi-arrow-up-short"></i>
                      <span>{kpis.pipeline_conversion_rate.comparison_label}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 4: Average Deal Ticket Size */}
              <div className="col-xl-3 col-sm-6">
                <div className="card stat-card h-100">
                  <div className="stat-card-header">
                    <span className="stat-card-title">Average Deal Ticket Size</span>
                    <div className="stat-icon-box info">
                      <i className="bi bi-tag-fill"></i>
                    </div>
                  </div>
                  <div className="stat-card-value">
                    {kpis?.average_deal_ticket_size?.formatted_amount || "₹0"}
                  </div>
                  <span className="text-info small fw-semibold">
                    {kpis?.average_deal_ticket_size?.driver_label || "Active deals driven"}
                  </span>
                </div>
              </div>
            </div>

            {/* Funnel Breakdown & Lead Source Performance */}
            <div className="row g-4 mb-4">
              {/* Sales Conversion Funnel */}
              <div className="col-xl-6">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="card-title mb-1">Sales Conversion Funnel</h5>
                    <p className="text-muted small mb-0">
                      Progression from initial customer inquiry to car delivery
                    </p>
                  </div>

                  <div className="card-body">
                    {funnel.length === 0 ? (
                      <p className="text-muted small my-3">No funnel data available for this range.</p>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {funnel.map((stage, idx) => (
                          <div key={stage.stage_number || idx}>
                            <div className="d-flex justify-content-between text-dark small fw-bold mb-1">
                              <span>{stage.label}</span>
                              <span>
                                {stage.count?.toLocaleString("en-IN")} {stage.unit_label} (
                                {stage.percentage}%)
                              </span>
                            </div>
                            <div className="progress" style={{ height: "14px", background: "#E2E8F0" }}>
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${Math.min(stage.percentage, 100)}%`,
                                  background: getFunnelColor(idx),
                                  borderRadius: "4px",
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lead Source Acquisition Performance */}
              <div className="col-xl-6">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="card-title mb-1">Lead Source Attribution</h5>
                    <p className="text-muted small mb-0">
                      Inquiry volume, conversion efficiency, and revenue contribution
                    </p>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-custom">
                      <thead>
                        <tr>
                          <th>Acquisition Channel</th>
                          <th>Total Leads</th>
                          <th>Won Deals</th>
                          <th>Conversion</th>
                          <th>Revenue (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadSources.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center text-muted py-4">
                              No lead source attribution records found.
                            </td>
                          </tr>
                        ) : (
                          leadSources.map((source, idx) => (
                            <tr key={source.source_id || idx}>
                              <td>
                                <span className="text-dark fw-semibold small">
                                  {source.acquisition_channel}
                                </span>
                              </td>
                              <td>{source.total_leads}</td>
                              <td>{source.won_deals}</td>
                              <td>
                                <span className="badge bg-success-subtle text-success">
                                  {source.formatted_conversion || `${source.conversion_rate}%`}
                                </span>
                              </td>
                              <td className="text-dark fw-bold small">
                                {source.formatted_revenue ||
                                  `₹${(source.revenue || 0).toLocaleString("en-IN")}`}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Leaderboard Performance */}
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Sales Executive Performance Leaderboard</h5>
                <span className="text-muted small">Target achievements & gross bookings</span>
              </div>

              <div className="table-responsive">
                <table className="table table-custom">
                  <thead>
                    <tr>
                      <th>Rank & Rep</th>
                      <th>Branch</th>
                      <th>Leads Assigned</th>
                      <th>Test Drives</th>
                      <th>Deals Closed</th>
                      <th>Target Achieved</th>
                      <th>Total Sales Volume</th>
                      <th className="text-end">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center text-muted py-4">
                          No sales executive leaderboard records found.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((rep, idx) => {
                        const rankColor =
                          rep.rank === 1
                            ? "bg-warning text-dark"
                            : rep.rank === 2
                            ? "bg-secondary text-white"
                            : rep.rank === 3
                            ? "bg-info text-white"
                            : "bg-light text-dark border";

                        const statusBadgeClass =
                          rep.performance_status === "Outstanding"
                            ? "bg-success-subtle text-success"
                            : rep.performance_status === "Exceeding"
                            ? "bg-success-subtle text-success"
                            : rep.performance_status === "On Track"
                            ? "bg-primary-subtle text-primary"
                            : "bg-warning-subtle text-warning";

                        const avatarSrc =
                          rep.profile_photo || `/image/avatar-${(idx % 4) + 1}.svg`;

                        return (
                          <tr key={rep.user_id || idx}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <span
                                  className={`badge ${rankColor} fw-bold rounded-circle p-2`}
                                  style={{ minWidth: "28px", textAlign: "center" }}
                                >
                                  #{rep.rank}
                                </span>
                                <img
                                  src={avatarSrc}
                                  alt={rep.rep_name}
                                  className="avatar"
                                  onError={(e) => {
                                    e.target.src = "/image/avatar-1.svg";
                                  }}
                                />
                                <div>
                                  <div className="text-dark fw-bold small">{rep.rep_name}</div>
                                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                                    {rep.designation || "Sales Consultant"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>{rep.branch || "Main Showroom"}</td>
                            <td>{rep.leads_assigned || 0}</td>
                            <td>{rep.test_drives || 0}</td>
                            <td className="text-dark fw-bold">
                              {rep.deals_closed_label || `${rep.deals_closed || 0} Units`}
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="progress flex-grow-1"
                                  style={{ height: "6px", width: "80px", background: "#E2E8F0" }}
                                >
                                  <div
                                    className="progress-bar bg-success"
                                    style={{
                                      width: `${Math.min(rep.target_achieved_percentage || 0, 100)}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-success small fw-bold">
                                  {rep.target_achieved_percentage || 0}%
                                </span>
                              </div>
                            </td>
                            <td className="text-dark fw-bold">
                              {rep.formatted_sales_volume ||
                                `₹${(rep.total_sales_volume || 0).toLocaleString("en-IN")}`}
                            </td>
                            <td className="text-end">
                              <span
                                className={`badge ${statusBadgeClass} px-3 py-1 rounded-pill`}
                              >
                                {rep.performance_status || "Active"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
