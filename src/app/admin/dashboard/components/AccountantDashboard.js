"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import axios from "axios";
import { useToast } from "@/app/components/Toast";

export default function AccountantDashboard() {
  const { showToast } = useToast();
  const pathname = usePathname();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  // Base path based on current route
  const basePath = pathname?.startsWith("/accountant") ? "/accountant" : "/admin";

  // Live Statistics State
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Expense Categories for modal
  const [categories, setCategories] = useState([]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category_id: "",
    amount: "",
    payment_method: "Cash",
    expense_date: new Date().toISOString().split("T")[0],
    description: "",
  });

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const token = typeof window !== "undefined"
      ? localStorage.getItem("token") || localStorage.getItem("auth_token")
      : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch Live Dashboard Statistics
  const fetchDashboardStats = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const headers = getAuthHeaders();
      let res;
      try {
        res = await axios.get(`${API_URL}/dashboard/accountant-stats`, { headers });
      } catch (err) {
        // Fallback to query param
        res = await axios.get(`${API_URL}/dashboard/stats?role=Accountant`, { headers });
      }

      if (res?.data?.status && res?.data?.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error("Failed to load accountant dashboard stats:", e);
      if (!quiet) {
        showToast("Failed to load financial statistics. Please refresh.", "error");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [API_URL, showToast]);

  // Fetch Expense Categories for Add Expense Modal
  const fetchExpenseCategories = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/expense-categories`, { headers });
      const cats = res.data?.data?.data || res.data?.data || [];
      setCategories(cats);
      if (cats.length > 0 && !expenseForm.category_id) {
        setExpenseForm((prev) => ({ ...prev, category_id: String(cats[0].id) }));
      }
    } catch (err) {
      console.warn("Could not load expense categories:", err);
    }
  };


  useEffect(() => {
    fetchDashboardStats();
    fetchExpenseCategories();

    const handleUpdate = () => {
      fetchDashboardStats(true);
    };

    window.addEventListener("csd_approvals_updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    return () => {
      window.removeEventListener("csd_approvals_updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, [fetchDashboardStats]);

  // Handle Add Expense Form Submit
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.category_id) {
      showToast("Please fill all required expense fields.", "warning");
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const headers = getAuthHeaders();
      await axios.post(
        `${API_URL}/expenses`,
        {
          title: expenseForm.title,
          category_id: parseInt(expenseForm.category_id, 10),
          amount: parseFloat(expenseForm.amount),
          payment_method: expenseForm.payment_method,
          expense_date: expenseForm.expense_date,
          description: expenseForm.description || null,
          status: "Approved",
        },
        { headers }
      );

      showToast(`Expense of ₹${Number(expenseForm.amount).toLocaleString("en-IN")} added successfully!`, "success");
      setShowAddExpenseModal(false);
      setExpenseForm({
        title: "",
        category_id: categories.length > 0 ? String(categories[0].id) : "",
        amount: "",
        payment_method: "Cash",
        expense_date: new Date().toISOString().split("T")[0],
        description: "",
      });
      fetchDashboardStats(true);
    } catch (err) {
      console.error("Expense store error:", err);
      showToast(err.response?.data?.message || "Failed to record expense. Please check input.", "error");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Helper currency formatter
  const formatINR = (val) => {
    if (val === null || val === undefined) return "₹0";
    const num = Number(val);
    if (isNaN(num)) return "₹0";
    return num.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  };

  const kpis = stats?.kpis || {};
  const pendingCustomers = stats?.pending_customers || [];
  const recentTransactions = stats?.recent_transactions || [];
  const expenseBreakdown = stats?.expense_breakdown || [];

  return (
    <div className="container-fluid px-0 pb-5">
      {/* ----------------------------------------------------
          1. HEADER AREA: Title, Subtitle, Live Date & Refresh
          ---------------------------------------------------- */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3">
        <div>
          <h1 className="fw-bolder mb-1 fs-2 text-dark">Accounts & Financial Dashboard</h1>
          <p className="text-secondary small mb-0">Live Cashflow, Collections, Receivables & Operational Expenses</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Live Date Pill */}
          <div
            className="btn btn-sm btn-light bg-white border rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow-sm text-dark"
            style={{ fontSize: "0.84rem" }}
          >
            <i className="bi bi-calendar3 text-primary"></i>
            <span>{stats?.date_display || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="btn btn-sm btn-white bg-white border rounded-circle shadow-sm d-flex align-items-center justify-content-center"
            style={{ width: "36px", height: "36px" }}
            onClick={() => fetchDashboardStats(true)}
            title="Refresh Live Data"
            disabled={isRefreshing || isLoading}
          >
            <i className={`bi bi-arrow-clockwise text-dark ${isRefreshing ? "spin" : ""}`}></i>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. 8 PRIMARY FINANCIAL KPI CARDS
          ---------------------------------------------------- */}
      {isLoading ? (
        <div className="row g-3 mb-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="col-6 col-md-3">
              <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm" style={{ minHeight: "115px" }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="placeholder-glow w-50"><span className="placeholder col-10"></span></div>
                  <div className="placeholder-glow"><span className="placeholder rounded-3" style={{ width: "32px", height: "32px" }}></span></div>
                </div>
                <div className="placeholder-glow"><span className="placeholder col-8 fs-3"></span></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="row g-3 mb-4">
          {/* Card 1: Total Receivables */}
          <div className="col-6 col-md-3">
            <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                  TOTAL RECEIVABLES
                </span>
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: "32px", height: "32px", backgroundColor: "#EFF6FF", color: "#3B82F6" }}
                >
                  <i className="bi bi-file-earmark-text fs-6"></i>
                </div>
              </div>
              <div className="fw-bolder fs-3 text-dark">{kpis.total_receivables_formatted || "₹0"}</div>
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                From {formatINR(kpis.total_deals_value)} total booked deals
              </span>
            </div>
          </div>

          {/* Card 2: Total Collected */}
          <div className="col-6 col-md-3">
            <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                  TOTAL COLLECTED
                </span>
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: "32px", height: "32px", backgroundColor: "#ECFDF5", color: "#10B981" }}
                >
                  <i className="bi bi-cash-stack fs-6"></i>
                </div>
              </div>
              <div className="fw-bolder fs-3 text-success">{kpis.total_collected_formatted || "₹0"}</div>
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                Cleared customer collections
              </span>
            </div>
          </div>

          {/* Card 3: Today's Collection */}
          <div className="col-6 col-md-3">
            <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                  TODAY&apos;S COLLEC.
                </span>
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: "32px", height: "32px", backgroundColor: "#F0F9FF", color: "#0284C7" }}
                >
                  <i className="bi bi-calendar2-check fs-6"></i>
                </div>
              </div>
              <div className="fw-bolder fs-3 text-dark">{kpis.today_collection_formatted || "₹0"}</div>
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                Recorded today
              </span>
            </div>
          </div>

          {/* Card 4: This Month's Collection */}
          <div className="col-6 col-md-3">
            <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                  MONTHLY COLLEC.
                </span>
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: "32px", height: "32px", backgroundColor: "#F5F3FF", color: "#8B5CF6" }}
                >
                  <i className="bi bi-graph-up-arrow fs-6"></i>
                </div>
              </div>
              <div className="fw-bolder fs-3 text-dark">{kpis.month_collection_formatted || "₹0"}</div>
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                Current month inflow
              </span>
            </div>
          </div>

          {/* Card 5: Total Expenses */}
          <div className="col-6 col-md-3">
            <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                  TOTAL EXPENSES
                </span>
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: "32px", height: "32px", backgroundColor: "#FFF1F2", color: "#F43F5E" }}
                >
                  <i className="bi bi-receipt-cutoff fs-6"></i>
                </div>
              </div>
              <div className="fw-bolder fs-3 text-danger">{kpis.total_expenses_formatted || "₹0"}</div>
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                Total showroom operational cost
              </span>
            </div>
          </div>

          {/* Card 6: Month's Expenses */}
          <div className="col-6 col-md-3">
            <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                  MONTH&apos;S EXPENSES
                </span>
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: "32px", height: "32px", backgroundColor: "#FFF7ED", color: "#F97316" }}
                >
                  <i className="bi bi-hourglass-split fs-6"></i>
                </div>
              </div>
              <div className="fw-bolder fs-3 text-dark">{kpis.month_expenses_formatted || "₹0"}</div>
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                Operational burn this month
              </span>
            </div>
          </div>

          {/* Card 7: Active Tokens / Ledgers */}
          <div className="col-6 col-md-3">
            <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                  ACTIVE INVOICES
                </span>
               <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: "32px", height: "32px", backgroundColor: "#F1F5F9", color: "#475569" }}
                >
                  <i className="bi bi-journal-check fs-6"></i>
                </div> 
              </div>
              <div className="fw-bolder fs-3 text-dark">{kpis.active_tokens_count ?? 0}</div>
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                Active customer billing ledgers
              </span>
            </div>
          </div>

          {/* Card 8: Net Operating Cash Flow (Signature Dark Navy Card) */}
          <div className="col-6 col-md-3">
            <div
              className="h-100 rounded-4 p-3 shadow-sm d-flex flex-column justify-content-between"
              style={{ backgroundColor: "#0B1320", background: "#0B1320", color: "#FFFFFF", minHeight: "115px" }}
            >
              <div className="d-flex align-items-start justify-content-between mb-2">
                <span className="fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px", color: "#94A3B8" }}>
                  NET CASH FLOW
                </span>
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{ width: "32px", height: "32px", backgroundColor: "rgba(255,255,255,0.15)", color: "#FFFFFF" }}
                >
                  <i className="bi bi-wallet2 fs-6 text-white"></i>
                </div>
              </div>
              <div className="fw-bolder fs-3 text-white">
                {kpis.net_cash_flow_formatted || "₹0"}
              </div>
              <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>
                Total Inflow minus Expenses
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          3. MAIN CONTENT: 2-Column Desktop Layout
          ---------------------------------------------------- */}
      <div className="row g-4">
        {/* LEFT COLUMN: Showroom Expense Breakdown & Recent Cashflow Passbook */}
        <div className="col-12 col-lg-5">
          {/* Real Showroom Expense Breakdown Card */}
          <div className="card border rounded-4 p-4 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h5 className="fw-bold text-dark mb-0 fs-6">Showroom Expense Breakdown</h5>
                <small className="text-muted" style={{ fontSize: "0.75rem" }}>Categorized Operational Overhead</small>
              </div>
              <Link
                href={`${basePath}/expense-detail`}
                className="btn btn-sm btn-light border rounded-pill px-3 py-1 fw-semibold text-secondary"
                style={{ fontSize: "0.75rem" }}
              >
                <span>Manage</span>
                <i className="bi bi-arrow-right ms-1 small"></i>
              </Link>
            </div>

            {expenseBreakdown.length === 0 ? (
              <div className="text-center py-4 text-muted small">
                <i className="bi bi-receipt fs-3 d-block mb-2 text-secondary opacity-50"></i>
                No showroom expenses recorded yet.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 mb-3">
                {expenseBreakdown.map((item, idx) => {
                  const icons = ["bi-lightning-charge", "bi-building", "bi-truck", "bi-cup-hot", "bi-gear"];
                  const colors = ["#10B981", "#3B82F6", "#F97316", "#8B5CF6", "#EC4899"];
                  const bgColors = ["#ECFDF5", "#EFF6FF", "#FFF7ED", "#F5F3FF", "#FDF2F8"];
                  const icon = icons[idx % icons.length];
                  const color = colors[idx % colors.length];
                  const bg = bgColors[idx % bgColors.length];

                  return (
                    <div key={item.category_id || idx} className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle"
                          style={{ width: "34px", height: "34px", backgroundColor: bg, color: color }}
                        >
                          <i className={`bi ${icon} small`}></i>
                        </div>
                        <div>
                          <div className="fw-semibold small text-dark">{item.category_name}</div>
                        </div>
                      </div>
                      <span className="fw-bold text-danger small fs-6">-{formatINR(item.total)}</span>
                    </div>
                  );
                })}

                <div style={{ borderTop: "1px dashed #E2E8F0", margin: "8px 0" }}></div>

                {/* Total Expense Banner */}
                <div
                  className="rounded-4 p-3 d-flex align-items-center justify-content-between"
                  style={{ backgroundColor: "#FFF1F2", border: "1px solid #FECDD3" }}
                >
                  <span className="fw-bold small text-uppercase" style={{ color: "#E11D48", letterSpacing: "0.6px" }}>
                    TOTAL EXPENSES
                  </span>
                  <span className="fw-bolder fs-5" style={{ color: "#E11D48" }}>
                    {formatINR(kpis.total_expenses)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Financial Transactions Passbook Card */}
          <div className="card border rounded-4 p-4 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h5 className="fw-bold text-dark mb-0 fs-6">Recent Cash Flow Journal</h5>
                <small className="text-muted" style={{ fontSize: "0.75rem" }}>Live customer receipts & expense disbursements</small>
              </div>
              <Link
                href={`${basePath}/reports/payment-collection`}
                className="btn btn-link text-decoration-none text-secondary p-0 fw-bold small"
                style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
              >
                VIEW ALL
              </Link>
            </div>

            <div className="table-responsive">
              <table className="table table-borderless align-middle mb-0 w-100">
                <thead>
                  <tr className="border-bottom" style={{ borderColor: "#F1F5F9" }}>
                    <th className="text-muted fw-bold small text-uppercase ps-2 py-2" style={{ fontSize: "0.68rem", width: "28%" }}>
                      DATE
                    </th>
                    <th className="text-muted fw-bold small text-uppercase px-2 py-2" style={{ fontSize: "0.68rem", width: "42%" }}>
                      PARTY / REF
                    </th>
                    <th className="text-muted fw-bold small text-uppercase text-end pe-2 py-2" style={{ fontSize: "0.68rem", width: "30%" }}>
                      AMOUNT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-muted small">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-bottom" style={{ borderColor: "#F8FAFC" }}>
                        <td className="small text-secondary ps-2 py-3 text-nowrap">
                          {tx.date}
                        </td>
                        <td className="px-2 py-3">
                          <div className="fw-bold text-dark small text-truncate" style={{ maxWidth: "160px" }}>
                            {tx.title}
                          </div>
                          <div className="text-muted text-truncate" style={{ fontSize: "0.7rem", maxWidth: "160px" }}>
                            {tx.party_type} • <span className="badge bg-light text-secondary border py-0 px-1">{tx.mode}</span>
                          </div>
                        </td>
                        <td className="text-end pe-2 py-3 text-nowrap">
                          <div
                            className={`small fw-bolder ${tx.type === "income" ? "text-success" : "text-danger"}`}
                          >
                            {tx.type === "income" ? "+" : "-"}{formatINR(tx.amount)}
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.68rem" }}>
                            {tx.ref}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Pending Customer Payments & Quick Actions */}
        <div className="col-12 col-lg-7">
          {/* Pending Customer Payments (Top Balance Dues) */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div>
                <h5 className="fw-bold text-dark mb-0 fs-6">Pending Customer Balances</h5>
                <small className="text-muted" style={{ fontSize: "0.75rem" }}>Active vehicle deals with outstanding dues</small>
              </div>
              <Link
                href={`${basePath}/invoice`}
                className="btn btn-sm btn-light border rounded-pill px-3 py-1 fw-semibold text-secondary"
                style={{ fontSize: "0.75rem" }}
              >
                Invoicing Hub &rarr;
              </Link>
            </div>

            {pendingCustomers.length === 0 ? (
              <div className="card border rounded-4 p-4 bg-white shadow-sm text-center py-5">
                <i className="bi bi-check-circle-fill text-success fs-1 mb-2"></i>
                <div className="fw-bold text-dark">All Customer Payments Cleared!</div>
                <div className="text-muted small">No outstanding balance due on any confirmed deals.</div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {pendingCustomers.map((deal) => (
                  <div key={deal.id} className="card border rounded-4 p-3 bg-white shadow-sm">
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary-subtle text-primary fw-bold font-monospace px-2 py-1" style={{ fontSize: "0.7rem" }}>
                            {deal.deal_number}
                          </span>
                          <span className="badge bg-secondary-subtle text-secondary small" style={{ fontSize: "0.68rem" }}>
                            {deal.brand_name || "Vehicle Deal"}
                          </span>
                        </div>
                        <div className="fw-bold text-dark fs-6 mt-1">{deal.customer_name}</div>
                        <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                          {deal.model_variant} • {deal.customer_phone}
                        </div>
                      </div>

                      <div className="text-end">
                        <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-1 fw-bold text-uppercase" style={{ fontSize: "0.68rem" }}>
                          DUE: {formatINR(deal.balance_due)}
                        </span>
                      </div>
                    </div>

                    {/* 3 Stats in Light Box */}
                    <div className="row g-2 p-2 rounded-3 mb-2 text-center" style={{ backgroundColor: "#F8FAFC" }}>
                      <div className="col-4 text-start ps-3">
                        <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.62rem" }}>
                          SALE VALUE
                        </div>
                        <div className="fw-bold text-dark small">{formatINR(deal.net_amount)}</div>
                      </div>
                      <div className="col-4 text-center">
                        <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.62rem" }}>
                          PAID
                        </div>
                        <div className="fw-bold text-success small">{formatINR(deal.total_paid)}</div>
                      </div>
                      <div className="col-4 text-end pe-3">
                        <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.62rem" }}>
                          BALANCE DUE
                        </div>
                        <div className="fw-bold text-danger small">{formatINR(deal.balance_due)}</div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                      <Link
                        href={`${basePath}/invoice`}
                        className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-semibold"
                        style={{ fontSize: "0.78rem" }}
                      >
                        <i className="bi bi-receipt me-1"></i>
                        Open Invoice Ledger
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h5 className="fw-bold text-dark mb-3 fs-6">Accounts Quick Actions</h5>
            <div className="row g-3">
              {/* 1. Generate Invoice */}
              <div className="col-6 col-md-6">
                <Link
                  href={`${basePath}/invoice`}
                  className="btn btn-light bg-white w-100 h-100 border rounded-4 p-3 shadow-sm d-flex flex-column align-items-center justify-content-center text-center text-decoration-none"
                  style={{ minHeight: "115px" }}
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                    style={{ width: "42px", height: "42px", backgroundColor: "#EFF6FF", color: "#2563EB" }}
                  >
                    <i className="bi bi-receipt-cutoff fs-5"></i>
                  </div>
                  <span className="fw-bold text-dark mb-1" style={{ fontSize: "0.88rem" }}>
                    Generate Invoice
                  </span>
                  <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                    Create customer tokens & bills
                  </span>
                </Link>
              </div>

              {/* 2. Expense Master */}
              <div className="col-6 col-md-6">
                <Link
                  href={`${basePath}/expense-master`}
                  className="btn btn-light bg-white w-100 h-100 border rounded-4 p-3 shadow-sm d-flex flex-column align-items-center justify-content-center text-center text-decoration-none"
                  style={{ minHeight: "115px" }}
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                    style={{ width: "42px", height: "42px", backgroundColor: "#ECFDF5", color: "#10B981" }}
                  >
                    <i className="bi bi-wallet2 fs-5"></i>
                  </div>
                  <span className="fw-bold text-dark mb-1" style={{ fontSize: "0.88rem" }}>
                    Expense Master
                  </span>
                  <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                    Showroom expense categories
                  </span>
                </Link>
              </div>

              {/* 3. Expense Detail */}
              <div className="col-6 col-md-6">
                <Link
                  href={`${basePath}/expense-detail`}
                  className="btn btn-light bg-white w-100 h-100 border rounded-4 p-3 shadow-sm d-flex flex-column align-items-center justify-content-center text-center text-decoration-none"
                  style={{ minHeight: "115px" }}
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                    style={{ width: "42px", height: "42px", backgroundColor: "#FFF1F2", color: "#E11D48" }}
                  >
                    <i className="bi bi-journal-text fs-5"></i>
                  </div>
                  <span className="fw-bold text-dark mb-1" style={{ fontSize: "0.88rem" }}>
                    Expense Details
                  </span>
                  <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                    Track expenses & disbursements
                  </span>
                </Link>
              </div>

              {/* 4. Profile */}
              <div className="col-6 col-md-6">
                <Link
                  href="/admin/profile"
                  className="btn btn-light bg-white w-100 h-100 border rounded-4 p-3 shadow-sm d-flex flex-column align-items-center justify-content-center text-center text-decoration-none"
                  style={{ minHeight: "115px" }}
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                    style={{ width: "42px", height: "42px", backgroundColor: "#F0F9FF", color: "#0284C7" }}
                  >
                    <i className="bi bi-person-badge fs-5"></i>
                  </div>
                  <span className="fw-bold text-dark mb-1" style={{ fontSize: "0.88rem" }}>
                    My Profile
                  </span>
                  <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                    View & manage account profile
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          4. WORKING RECORD EXPENSE MODAL
          ---------------------------------------------------- */}
      {showAddExpenseModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          onClick={() => setShowAddExpenseModal(false)}
        >
          <div className="card rounded-4 border shadow-lg w-100" style={{ maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-receipt me-2 text-primary"></i>
                Record Showroom Expense
              </h6>
              <button type="button" className="btn-close" onClick={() => setShowAddExpenseModal(false)}></button>
            </div>
            <form onSubmit={handleAddExpenseSubmit}>
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Expense Title / Description *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Electricity Bill, Transit Trailer Freight, Office Refreshments"
                    required
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  />
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Category *</label>
                    <select
                      className="form-select form-select-sm"
                      required
                      value={expenseForm.category_id}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                    >
                      {categories.length === 0 ? (
                        <option value="">General & Admin</option>
                      ) : (
                        categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="col-6">
                    <label className="form-label small fw-semibold">Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="form-control form-control-sm"
                      placeholder="e.g. 25000"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Payment Mode</label>
                    <select
                      className="form-select form-select-sm"
                      value={expenseForm.payment_method}
                      onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="Cheque">Bank Cheque</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>

                  <div className="col-6">
                    <label className="form-label small fw-semibold">Expense Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      required
                      value={expenseForm.expense_date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-semibold">Additional Remarks (Optional)</label>
                  <textarea
                    rows={2}
                    className="form-control form-control-sm"
                    placeholder="Vendor invoice number, voucher notes, etc."
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="card-footer bg-white border-top p-3 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                  onClick={() => setShowAddExpenseModal(false)}
                  disabled={isSubmittingExpense}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary rounded-pill px-3 d-flex align-items-center gap-2"
                  disabled={isSubmittingExpense}
                >
                  {isSubmittingExpense && <span className="spinner-border spinner-border-sm" role="status"></span>}
                  <span>Save Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
