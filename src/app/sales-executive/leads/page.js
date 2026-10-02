"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { salesExecutiveApi } from "@/lib/salesExecutiveApi";
import { useToast } from "@/app/components/Toast";

export default function SalesExecutiveLeadsPage() {
  const { showToast } = useToast();

  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch Assigned Leads
  const loadLeads = async (page = 1, search = "", status = "", priority = "") => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        window.location.href = "/login";
        return;
      }
    }

    setIsLoading(true);
    try {
      const params = {
        page,
        per_page: 15,
      };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (priority) params.priority = priority;

      const res = await salesExecutiveApi.getAssignedLeads(params);
      if (res && res.status) {
        setLeads(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (error) {
      console.log("Fetch leads error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load once on component mount
  useEffect(() => {
    loadLeads(1, "", "", "");
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadLeads(1, searchTerm, statusFilter, priorityFilter);
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    loadLeads(1, searchTerm, newStatus, priorityFilter);
  };

  const handlePriorityChange = (newPriority) => {
    setPriorityFilter(newPriority);
    setCurrentPage(1);
    loadLeads(1, searchTerm, statusFilter, newPriority);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setPriorityFilter("");
    setCurrentPage(1);
    loadLeads(1, "", "", "");
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadLeads(newPage, searchTerm, statusFilter, priorityFilter);
  };

  // Helper Badge Colors
  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case "hot":
        return "badge bg-danger text-white";
      case "warm":
        return "badge bg-warning text-dark";
      case "cold":
        return "badge bg-info text-dark";
      default:
        return "badge bg-secondary";
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "deal won":
      case "converted":
        return "badge bg-success";
      case "deal lost":
        return "badge bg-danger";
      case "in follow-up":
      case "in follow up":
        return "badge bg-primary";
      case "test drive scheduled":
        return "badge bg-info text-dark";
      case "quotation sent":
      case "negotiation":
        return "badge bg-warning text-dark";
      default:
        return "badge bg-secondary";
    }
  };

  // KPI Metrics Calculation
  const totalLeads = pagination.total || leads.length;
  const inFollowUpCount = leads.filter(
    (l) => l.status_name?.toLowerCase().includes("follow")
  ).length;
  const hotCount = leads.filter((l) => l.priority?.toLowerCase() === "hot").length;
  const wonCount = leads.filter(
    (l) => l.status_name?.toLowerCase().includes("won") || l.status_name?.toLowerCase().includes("converted")
  ).length;

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Breadcrumbs & Header Actions */}
        <div className="page-header-wrapper mb-4">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/sales-executive/leads">Home</Link>
              </li>
              <li className="breadcrumb-item active">My Assigned Leads</li>
            </ul>
            <h1 className="page-title mt-1">My Assigned Leads</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-custom"
              onClick={() => {
                showToast("Refreshing assigned leads...", "info");
                loadLeads(currentPage, searchTerm, statusFilter, priorityFilter);
              }}
              disabled={isLoading}
            >
              <i className={`bi bi-arrow-clockwise me-1 ${isLoading ? "spin" : ""}`}></i>
              <span>Refresh</span>
            </button>
            <Link href="/admin/follow-up" className="btn btn-primary">
              <i className="bi bi-telephone-outbound-fill me-1"></i>
              <span>Follow-Up Hub</span>
            </Link>
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid var(--primary)" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Total Assigned</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-people-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{totalLeads}</div>
              <span className="text-primary small fw-semibold">Active in your pipeline</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid var(--secondary)" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">In Follow-Up</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-telephone-outbound-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{inFollowUpCount}</div>
              <span className="text-secondary small fw-semibold">Active customer communication</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid #DC2626" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Hot Priority</span>
                <div className="stat-icon-box danger">
                  <i className="bi bi-fire"></i>
                </div>
              </div>
              <div className="stat-card-value">{hotCount}</div>
              <span className="text-danger small fw-semibold">High purchase intent</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card" style={{ borderLeft: "4px solid #15803D" }}>
              <div className="stat-card-header">
                <span className="stat-card-title">Deals Won</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-trophy-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{wonCount}</div>
              <span className="text-success small fw-semibold">Successfully closed</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="card p-3 mb-4 rounded-3 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by lead name, phone, email, model, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="New">New</option>
                <option value="In Follow-Up">In Follow-Up</option>
                <option value="Test Drive Scheduled">Test Drive Scheduled</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Deal Won">Deal Won</option>
                <option value="Deal Lost">Deal Lost</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={priorityFilter}
                onChange={(e) => handlePriorityChange(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>

            {/* Search & Reset Buttons */}
            <div className="col-12 col-md-2 d-flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm flex-fill">
                <i className="bi bi-filter me-1"></i> Apply
              </button>
              {(searchTerm || statusFilter || priorityFilter) && (
                <button
                  type="button"
                  className="btn btn-outline-custom btn-sm"
                  onClick={handleClearFilters}
                  title="Clear all filters"
                >
                  <i className="bi bi-x-circle"></i>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading leads...</span>
            </div>
            <p className="text-secondary mt-2 small">Loading your assigned leads...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && leads.length === 0 && (
          <div className="card p-5 text-center rounded-3 my-4">
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(88, 99, 42, 0.12)",
                color: "var(--primary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto 1rem",
              }}
            >
              <i className="bi bi-inbox-fill"></i>
            </div>
            <h4 className="fw-bold" style={{ color: "var(--text-primary)" }}>No leads assigned to you</h4>
            <p className="text-secondary small mb-3">
              {searchTerm || statusFilter || priorityFilter
                ? "No leads matched your search/filter criteria. Try resetting the filters."
                : "There are currently no customer leads assigned to your profile."}
            </p>
            {(searchTerm || statusFilter || priorityFilter) && (
              <div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm px-3"
                  onClick={handleClearFilters}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Desktop Table View (Hidden on mobile) */}
        {!isLoading && leads.length > 0 && (
          <div className="d-none d-lg-block">
            <div className="card rounded-3 overflow-hidden shadow-sm">
              <div className="table-responsive">
                <table className="table table-custom align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="py-3 px-3">Lead & Contact</th>
                      <th className="py-3 px-3">Vehicle Requirement</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Next Follow-Up</th>
                      <th className="py-3 px-3 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        {/* Lead & Contact */}
                        <td className="py-3 px-3">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="fw-bold fs-6" style={{ color: "var(--text-primary)" }}>{lead.name}</span>
                            {lead.is_birthday_today && (
                              <span className="badge bg-danger-subtle text-danger px-2 py-0" style={{ fontSize: "10px" }}>
                                🎂 Birthday Today
                              </span>
                            )}
                            {lead.is_anniversary_today && (
                              <span className="badge bg-primary-subtle text-primary px-2 py-0" style={{ fontSize: "10px" }}>
                                💐 Anniversary Today
                              </span>
                            )}
                          </div>
                          <div className="text-secondary small mt-1">
                            <i className="bi bi-telephone-fill me-1"></i>
                            <a href={`tel:${lead.phone}`} className="text-decoration-none" style={{ color: "var(--text-primary)" }}>
                              {lead.phone}
                            </a>
                            {lead.email && <span className="ms-2">• {lead.email}</span>}
                          </div>
                          {lead.city && (
                            <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                              <i className="bi bi-geo-alt-fill me-1"></i>
                              {lead.city}
                              {lead.state ? `, ${lead.state}` : ""}
                            </div>
                          )}
                        </td>

                        {/* Vehicle Requirement */}
                        <td className="py-3 px-3">
                          <div className="fw-bold" style={{ color: "var(--text-primary)" }}>
                            🚗 {lead.model_variant || "Model Not Specified"}
                          </div>
                          <div className="text-muted small">
                            {lead.brand_name ? `Brand: ${lead.brand_name}` : "Multi-Brand Search"}
                            {lead.budget ? ` • Budget: ${lead.budget}` : ""}
                          </div>
                          {lead.source && (
                            <span className="badge bg-secondary-subtle text-secondary mt-1">
                              Source: {typeof lead.source === "object" ? (lead.source?.title || lead.source?.name || "Direct") : lead.source}
                            </span>
                          )}
                        </td>

                        {/* Priority Badge */}
                        <td className="py-3 px-3">
                          <span className={getPriorityBadgeClass(lead.priority)}>
                            {lead.priority || "Standard"}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3">
                          <span className={getStatusBadgeClass(lead.status_name)}>
                            {lead.status_name || "New"}
                          </span>
                        </td>

                        {/* Next Follow-Up */}
                        <td className="py-3 px-3">
                          {lead.latest_follow_up?.next_follow_up_date ? (
                            <div>
                              <div className="fw-semibold text-warning small d-flex align-items-center gap-1">
                                <i className="bi bi-alarm"></i>
                                {lead.latest_follow_up.next_follow_up_date}
                              </div>
                              {lead.latest_follow_up.next_follow_up_time && (
                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                  at {lead.latest_follow_up.next_follow_up_time}
                                </div>
                              )}
                              {lead.latest_follow_up.notes && (
                                <div className="text-muted text-truncate" style={{ maxWidth: "160px", fontSize: "0.72rem" }} title={lead.latest_follow_up.notes}>
                                  &quot;{lead.latest_follow_up.notes}&quot;
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted small">No scheduled call</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3 text-end">
                          <div className="d-inline-flex align-items-center gap-2">
                            <Link
                              href={`/admin/quotation/create?lead_id=${lead.id}`}
                              className="btn btn-outline-custom btn-sm px-3 rounded-pill d-inline-flex align-items-center gap-1"
                              title="Send Quotation"
                            >
                              <i className="bi bi-file-earmark-spreadsheet-fill text-warning"></i>
                              <span>Send Quote</span>
                            </Link>
                            <Link
                              href={`/sales-executive/leads/${lead.id}`}
                              className="btn btn-primary btn-sm px-3 rounded-pill"
                            >
                              <span>View Lead</span>
                              <i className="bi bi-arrow-right ms-1"></i>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Responsive Cards View (Visible on mobile/tablet) */}
        {!isLoading && leads.length > 0 && (
          <div className="d-lg-none">
            <div className="row g-3">
              {leads.map((lead) => (
                <div key={lead.id} className="col-12 col-md-6">
                  <div className="card rounded-3 p-3 shadow-sm">
                    {/* Top Row: Name & Priority */}
                    <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                      <div>
                        <h5 className="fw-bold mb-0" style={{ color: "var(--text-primary)" }}>{lead.name}</h5>
                        {lead.city && (
                          <span className="text-secondary small">
                            <i className="bi bi-geo-alt-fill me-1"></i>
                            {lead.city}
                            {lead.state ? `, ${lead.state}` : ""}
                          </span>
                        )}
                      </div>
                      <span className={getPriorityBadgeClass(lead.priority)}>
                        {lead.priority || "Standard"}
                      </span>
                    </div>

                    {/* Phone & Vehicle */}
                    <div className="p-2 rounded-2 mb-2" style={{ background: "#F7F7F5", border: "1px solid var(--border-color)" }}>
                      <div className="d-flex align-items-center justify-content-between">
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-primary fw-bold text-decoration-none d-flex align-items-center gap-1"
                        >
                          <i className="bi bi-telephone-fill"></i>
                          <span>{lead.phone}</span>
                        </a>
                        <span className={getStatusBadgeClass(lead.status_name)}>
                          {lead.status_name || "New"}
                        </span>
                      </div>
                      <div className="small fw-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                        🚗 {lead.model_variant} {lead.brand_name ? `(${lead.brand_name})` : ""}
                      </div>
                    </div>

                    {/* Next Follow-Up Banner if scheduled */}
                    {lead.latest_follow_up?.next_follow_up_date && (
                      <div className="d-flex align-items-center gap-2 text-warning small bg-warning-subtle px-2 py-1 rounded-2 mb-3">
                        <i className="bi bi-alarm-fill"></i>
                        <span>
                          Next Follow-Up: <strong>{lead.latest_follow_up.next_follow_up_date}</strong>
                          {lead.latest_follow_up.next_follow_up_time ? ` at ${lead.latest_follow_up.next_follow_up_time}` : ""}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="d-flex gap-2 mt-2">
                      <Link
                        href={`/admin/quotation/create?lead_id=${lead.id}`}
                        className="btn btn-outline-custom btn-sm flex-fill py-2 rounded-pill fw-medium text-center"
                      >
                        <i className="bi bi-file-earmark-spreadsheet-fill text-warning me-1"></i> Send Quote
                      </Link>
                      <Link
                        href={`/sales-executive/leads/${lead.id}`}
                        className="btn btn-primary btn-sm flex-fill py-2 rounded-pill fw-medium text-center"
                      >
                        <i className="bi bi-eye-fill me-1"></i> View Lead
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && pagination.last_page > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-4">
            <span className="text-secondary small">
              Showing page <strong>{pagination.current_page}</strong> of{" "}
              <strong>{pagination.last_page}</strong> (Total {pagination.total} leads)
            </span>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                disabled={pagination.current_page <= 1}
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              >
                <i className="bi bi-chevron-left me-1"></i> Prev
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => handlePageChange(Math.min(currentPage + 1, pagination.last_page))}
              >
                Next <i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
