"use client";

import React, { useState } from "react";
import { useToast } from "@/app/components/Toast";

export default function AccountantDashboard() {
  const { showToast } = useToast();

  // Selected periods
  const [selectedPeriod, setSelectedPeriod] = useState("October 2023");
  const [breakdownPeriod, setBreakdownPeriod] = useState("This Month");


  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showRecordCustomerModal, setShowRecordCustomerModal] = useState(false);
  const [showRecordSupplierModal, setShowRecordSupplierModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  // Form states
  const [customerPayForm, setCustomerPayForm] = useState({
    bookingId: "BOOK-2026-00125",
    customer: "Rajesh Patel",
    amount: "50000",
    mode: "Bank Transfer",
    refNo: "NEFT-77291039",
  });

  const [supplierPayForm, setSupplierPayForm] = useState({
    supplier: "Hyundai Dealer",
    amount: "100000",
    mode: "RTGS Transfer",
    notes: "Chassis lot clearance #4492",
  });

  const [expenseForm, setExpenseForm] = useState({
    category: "Transportation",
    amount: "25000",
    description: "Vehicle transit trailer freight charges",
  });

  const handleRecordCustomerPayment = (e) => {
    e.preventDefault();
    showToast(
      `Payment of ₹${Number(customerPayForm.amount).toLocaleString()} recorded for ${customerPayForm.customer}!`,
      "success"
    );
    setShowRecordCustomerModal(false);
  };

  const handleRecordSupplierPayment = (e) => {
    e.preventDefault();
    showToast(
      `Supplier payment of ₹${Number(supplierPayForm.amount).toLocaleString()} scheduled for ${supplierPayForm.supplier}!`,
      "success"
    );
    setShowRecordSupplierModal(false);
  };

  const handleAddExpenseSubmit = (e) => {
    e.preventDefault();
    showToast(
      `Expense of ₹${Number(expenseForm.amount).toLocaleString()} added under ${expenseForm.category}!`,
      "success"
    );
    setShowAddExpenseModal(false);
  };

  return (
    <div className="container-fluid px-0 pb-5">
      {/* ----------------------------------------------------
          1. HEADER AREA: Title, Subtitle, Date Pill
          ---------------------------------------------------- */}
      <div className="mb-4">
        <h1 className="fw-bolder mb-1 fs-2 text-dark">Accountant Dashboard</h1>
        <p className="text-secondary small mb-3">Financial Overview & Operational Metrics</p>

        {/* Date Selector Pill */}
        <button
          type="button"
          className="btn btn-sm btn-light bg-white border rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow-sm text-dark"
          onClick={() => setShowPeriodModal(true)}
          style={{ fontSize: "0.84rem" }}
        >
          <i className="bi bi-calendar3 text-muted"></i>
          <span>{selectedPeriod}</span>
        </button>
      </div>

      {/* ----------------------------------------------------
          2. 8 KPI STAT CARDS (Bootstrap Grid: 4 cols on desktop, 2 on mobile)
          ---------------------------------------------------- */}
      <div className="row g-3 mb-4">
        {/* Card 1: Total Receivables */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-start justify-content-between mb-3">
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
            <div className="fw-bolder fs-3 text-dark">₹42.5L</div>
          </div>
        </div>

        {/* Card 2: Total Payables */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-start justify-content-between mb-3">
              <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                TOTAL PAYABLES
              </span>
              <div
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: "32px", height: "32px", backgroundColor: "#FFF1F2", color: "#F43F5E" }}
              >
                <i className="bi bi-receipt fs-6"></i>
              </div>
            </div>
            <div className="fw-bolder fs-3 text-dark">₹18.2L</div>
          </div>
        </div>

        {/* Card 3: Cust. Received */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-start justify-content-between mb-3">
              <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                CUST. RECEIVED
              </span>
              <div
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: "32px", height: "32px", backgroundColor: "#ECFDF5", color: "#10B981" }}
              >
                <i className="bi bi-telephone-inbound fs-6"></i>
              </div>
            </div>
            <div className="fw-bolder fs-3 text-dark">₹12.5L</div>
          </div>
        </div>

        {/* Card 4: Supplier Pending */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-start justify-content-between mb-3">
              <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                SUPPLIER PENDING
              </span>
              <div
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: "32px", height: "32px", backgroundColor: "#FFF7ED", color: "#F97316" }}
              >
                <i className="bi bi-hourglass-split fs-6"></i>
              </div>
            </div>
            <div className="fw-bolder fs-3 text-dark">₹8.4L</div>
          </div>
        </div>

        {/* Card 5: Total Expenses */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-start justify-content-between mb-3">
              <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                TOTAL EXPENSES
              </span>
              <div
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: "32px", height: "32px", backgroundColor: "#F5F3FF", color: "#8B5CF6" }}
              >
                <i className="bi bi-cash-coin fs-6"></i>
              </div>
            </div>
            <div className="fw-bolder fs-3 text-dark">₹35K</div>
          </div>
        </div>

        {/* Card 6: Today's Collec. */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-start justify-content-between mb-3">
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
            <div className="fw-bolder fs-3 text-dark">₹1.2L</div>
          </div>
        </div>

        {/* Card 7: Monthly Revenue */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border rounded-4 p-3 bg-white shadow-sm">
            <div className="d-flex align-items-start justify-content-between mb-3">
              <span className="text-muted fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px" }}>
                MONTHLY REVENUE
              </span>
              <div
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: "32px", height: "32px", backgroundColor: "#F1F5F9", color: "#475569" }}
              >
                <i className="bi bi-graph-up-arrow fs-6"></i>
              </div>
            </div>
            <div className="fw-bolder fs-3 text-dark">₹68.5L</div>
          </div>
        </div>

        {/* Card 8: Gross Profit (Signature Dark Navy Card) */}
        <div className="col-6 col-md-3">
          <div
            className="h-100 rounded-4 p-3 shadow d-flex flex-column justify-content-between"
            style={{ backgroundColor: "#0B1320", background: "#0B1320", color: "#FFFFFF", minHeight: "112px" }}
          >
            <div className="d-flex align-items-start justify-content-between mb-3">
              <span className="fw-bold text-uppercase small" style={{ fontSize: "0.68rem", letterSpacing: "0.6px", color: "#94A3B8" }}>
                GROSS PROFIT
              </span>
              <div
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: "32px", height: "32px", backgroundColor: "rgba(255,255,255,0.15)", color: "#FFFFFF" }}
              >
                <i className="bi bi-trophy fs-6 text-white"></i>
              </div>
            </div>
            <div className="fw-bolder fs-3 text-white">₹70,000</div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          3. MAIN CONTENT: 2-Column Desktop Layout
          ---------------------------------------------------- */}
      <div className="row g-4">
        {/* LEFT COLUMN: Profitability Breakdown & Recent Transactions */}
        <div className="col-12 col-lg-5">
          {/* Profitability Breakdown Card */}
          <div className="card border rounded-4 p-4 bg-white shadow-sm mb-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 className="fw-bold text-dark mb-0 fs-6">Profitability Breakdown</h5>
              <button
                type="button"
                className="btn btn-sm btn-light border rounded-pill px-3 py-1 fw-semibold text-secondary"
                style={{ fontSize: "0.75rem" }}
                onClick={() => {
                  const next = breakdownPeriod === "This Month" ? "Last Month" : "This Month";
                  setBreakdownPeriod(next);
                  showToast(`Switched breakdown to ${next}`, "info");
                }}
              >
                <span>{breakdownPeriod}</span>
                <i className="bi bi-chevron-down ms-1 small"></i>
              </button>
            </div>

            {/* Line items */}
            <div className="d-flex flex-column gap-3 mb-3">
              {/* Sale Value */}
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: "34px", height: "34px", backgroundColor: "#ECFDF5", color: "#10B981" }}
                  >
                    <i className="bi bi-graph-up small"></i>
                  </div>
                  <span className="fw-semibold small text-dark">Sale Value</span>
                </div>
                <span className="fw-bold text-dark small fs-6">₹16,25,000</span>
              </div>

              {/* Vehicle Purchase */}
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: "34px", height: "34px", backgroundColor: "#FEF2F2", color: "#EF4444" }}
                  >
                    <i className="bi bi-car-front small"></i>
                  </div>
                  <span className="fw-semibold small text-dark">Vehicle Purchase</span>
                </div>
                <span className="fw-bold text-danger small fs-6">-₹15,20,000</span>
              </div>

              {/* Transportation */}
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: "34px", height: "34px", backgroundColor: "#FFF7ED", color: "#F97316" }}
                  >
                    <i className="bi bi-truck small"></i>
                  </div>
                  <span className="fw-semibold small text-dark">Transportation</span>
                </div>
                <span className="fw-bold text-danger small fs-6">-₹25,000</span>
              </div>

              {/* Other Expenses */}
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: "34px", height: "34px", backgroundColor: "#FFF1F2", color: "#F43F5E" }}
                  >
                    <i className="bi bi-tags small"></i>
                  </div>
                  <span className="fw-semibold small text-dark">Other Expenses</span>
                </div>
                <span className="fw-bold text-danger small fs-6">-₹10,000</span>
              </div>
            </div>

            {/* Dashed Line */}
            <div style={{ borderTop: "1px dashed #E2E8F0", margin: "14px 0" }}></div>

            {/* Total Cost */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <span className="fw-bold small text-uppercase text-dark" style={{ letterSpacing: "0.5px" }}>
                TOTAL COST
              </span>
              <span className="fw-bold text-dark fs-6">₹15,55,000</span>
            </div>

            {/* Mint Green Gross Profit Highlight Banner */}
            <div
              className="rounded-4 p-3 d-flex align-items-center justify-content-between"
              style={{ backgroundColor: "#EDFBF4", border: "1px solid #A7F3D0" }}
            >
              <span className="fw-bold small text-uppercase" style={{ color: "#059669", letterSpacing: "0.6px" }}>
                GROSS PROFIT
              </span>
              <span className="fw-bolder fs-4" style={{ color: "#059669" }}>
                ₹70,000
              </span>
            </div>
          </div>

          {/* Recent Transactions Card */}
          <div className="card border rounded-4 p-4 bg-white shadow-sm">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold text-dark mb-0 fs-6">Recent Transactions</h5>
              <button
                type="button"
                className="btn btn-link text-decoration-none text-secondary p-0 fw-bold small"
                style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
                onClick={() => setShowTransactionsModal(true)}
              >
                VIEW ALL
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-borderless align-middle mb-0 w-100">
                <thead>
                  <tr className="border-bottom" style={{ borderColor: "#F1F5F9" }}>
                    <th className="text-muted fw-bold small text-uppercase ps-2 py-2" style={{ fontSize: "0.68rem", width: "28%" }}>
                      DATE
                    </th>
                    <th className="text-muted fw-bold small text-uppercase px-2 py-2" style={{ fontSize: "0.68rem", width: "42%" }}>
                      TYPE / NAME
                    </th>
                    <th className="text-muted fw-bold small text-uppercase text-end pe-3 py-2" style={{ fontSize: "0.68rem", width: "30%" }}>
                      DETAILS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-bottom" style={{ borderColor: "#F8FAFC" }}>
                    <td className="small text-secondary ps-2 py-3 text-nowrap">24 Oct, 2023</td>
                    <td className="px-2 py-3">
                      <div className="fw-bold text-dark small">Rajesh Patel</div>
                      <div className="text-muted" style={{ fontSize: "0.7rem" }}>Customer</div>
                    </td>
                    <td className="text-end pe-3 py-3 text-nowrap">
                      <div className="small text-secondary fw-semibold">Bank</div>
                      <div className="small fw-bold text-success">+₹50,000</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="small text-secondary ps-2 py-3 text-nowrap">23 Oct, 2023</td>
                    <td className="px-2 py-3">
                      <div className="fw-bold text-dark small">Hyundai Dealer</div>
                      <div className="text-muted" style={{ fontSize: "0.7rem" }}>Supplier</div>
                    </td>
                    <td className="text-end pe-3 py-3 text-nowrap">
                      <div className="small text-secondary fw-semibold">UPI</div>
                      <div className="small fw-bold text-danger">-₹10,00,000</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Pending Payments & Quick Actions */}
        <div className="col-12 col-lg-7">
          {/* Pending Customer Payments */}
          <div className="mb-4">
            <h5 className="fw-bold text-dark mb-2 fs-6">Pending Customer Payments</h5>
            <div className="card border rounded-4 p-4 bg-white shadow-sm">
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div>
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}>
                    BOOKING ID
                  </div>
                  <div className="fw-bolder text-dark fs-6 font-monospace">BOOK-2026-00125</div>
                </div>
                <div className="text-end">
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}>
                    CUSTOMER
                  </div>
                  <div className="fw-bolder text-dark fs-6">Rajesh Patel</div>
                </div>
              </div>

              {/* 3 Stats in Light Box */}
              <div className="row g-2 p-3 rounded-3 mb-3 text-center" style={{ backgroundColor: "#F8FAFC" }}>
                <div className="col-4 text-start">
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.62rem" }}>
                    SALE VALUE
                  </div>
                  <div className="fw-bold text-dark fs-6">₹16,25,000</div>
                </div>
                <div className="col-4 text-center">
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.62rem" }}>
                    PAID
                  </div>
                  <div className="fw-bold text-success fs-6">₹50,000</div>
                </div>
                <div className="col-4 text-end">
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.62rem" }}>
                    BALANCE
                  </div>
                  <div className="fw-bold text-danger fs-6">₹15,75,000</div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill w-100 py-2 fw-semibold small"
                onClick={() => setShowCustomerModal(true)}
              >
                View Details
              </button>
            </div>
          </div>

          {/* Pending Supplier Payments */}
          <div className="mb-4">
            <h5 className="fw-bold text-dark mb-2 fs-6">Pending Supplier Payments</h5>
            <div className="card border rounded-4 p-4 bg-white shadow-sm">
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div>
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}>
                    SUPPLIER
                  </div>
                  <div className="fw-bolder text-dark fs-6">Hyundai Dealer</div>
                </div>
                <div>
                  <span
                    className="badge rounded-pill px-3 py-1 fw-bold text-uppercase"
                    style={{ backgroundColor: "#FEE2E2", color: "#DC2626", fontSize: "0.68rem" }}
                  >
                    PENDING
                  </span>
                </div>
              </div>

              {/* 3 Stats in Light Box */}
              <div className="row g-2 p-3 rounded-3 mb-3 text-center" style={{ backgroundColor: "#F8FAFC" }}>
                <div className="col-4 text-start">
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.62rem" }}>
                    PURCHASE
                  </div>
                  <div className="fw-bold text-dark fs-6">₹15,20,000</div>
                </div>
                <div className="col-4 text-center">
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.62rem" }}>
                    PAID
                  </div>
                  <div className="fw-bold text-success fs-6">₹10,00,000</div>
                </div>
                <div className="col-4 text-end">
                  <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.62rem" }}>
                    (OUTSTANDING)
                  </div>
                  <div className="fw-bold text-danger fs-6">₹5,20,000</div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill w-100 py-2 fw-semibold small"
                onClick={() => setShowSupplierModal(true)}
              >
                View Details
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h5 className="fw-bold text-dark mb-2 fs-6">Quick Actions</h5>
            <div className="row g-3">
              {/* 2 Dark Action Buttons */}
              <div className="col-6 col-md-6">
                <button
                  type="button"
                  className="btn w-100 h-100 border-0 rounded-4 p-3 shadow-sm d-flex flex-column align-items-center justify-content-center text-center text-white"
                  style={{ backgroundColor: "#0B1320", minHeight: "115px" }}
                  onClick={() => setShowRecordCustomerModal(true)}
                >
                  <div
                    className="rounded-circle border border-secondary border-opacity-50 d-flex align-items-center justify-content-center mb-2"
                    style={{ width: "36px", height: "36px" }}
                  >
                    <i className="bi bi-plus-lg fs-6 text-white"></i>
                  </div>
                  <span className="small fw-semibold" style={{ fontSize: "0.8rem", lineHeight: "1.2" }}>
                    Record Customer Payment
                  </span>
                </button>
              </div>

              <div className="col-6 col-md-6">
                <button
                  type="button"
                  className="btn w-100 h-100 border-0 rounded-4 p-3 shadow-sm d-flex flex-column align-items-center justify-content-center text-center text-white"
                  style={{ backgroundColor: "#0B1320", minHeight: "115px" }}
                  onClick={() => setShowRecordSupplierModal(true)}
                >
                  <div
                    className="rounded-circle border border-secondary border-opacity-50 d-flex align-items-center justify-content-center mb-2"
                    style={{ width: "36px", height: "36px" }}
                  >
                    <i className="bi bi-plus-lg fs-6 text-white"></i>
                  </div>
                  <span className="small fw-semibold" style={{ fontSize: "0.8rem", lineHeight: "1.2" }}>
                    Record Supplier Payment
                  </span>
                </button>
              </div>

              {/* 4 Light Action Cards */}
              <div className="col-6 col-md-6">
                <button
                  type="button"
                  className="btn btn-light bg-white w-100 h-100 border rounded-4 p-3 shadow-sm d-flex flex-column align-items-center justify-content-center text-center"
                  style={{ minHeight: "105px" }}
                  onClick={() => setShowAddExpenseModal(true)}
                >
                  <i className="bi bi-calculator text-secondary fs-4 mb-1"></i>
                  <span className="small fw-semibold text-dark" style={{ fontSize: "0.82rem" }}>
                    Add Expense
                  </span>
                </button>
              </div>

              <div className="col-6 col-md-6">
                <button
                  type="button"
                  className="btn btn-light bg-white w-100 h-100 border rounded-4 p-3 shadow-sm d-flex flex-column align-items-center justify-content-center text-center"
                  style={{ minHeight: "105px" }}
                  onClick={() => {
                    showToast("Customer Receivables Breakdown: ₹42.5 Lakhs", "info");
                    setShowCustomerModal(true);
                  }}
                >
                  <i className="bi bi-file-earmark-text text-secondary fs-4 mb-1"></i>
                  <span className="small fw-semibold text-dark" style={{ fontSize: "0.82rem" }}>
                    View Receivables
                  </span>
                </button>
              </div>

              <div className="col-6 col-md-6">
                <button
                  type="button"
                  className="btn btn-light bg-white w-100 h-100 border rounded-4 p-3 shadow-sm d-flex flex-column align-items-center justify-content-center text-center"
                  style={{ minHeight: "105px" }}
                  onClick={() => {
                    showToast("Supplier Payables Outstanding: ₹18.2 Lakhs", "info");
                    setShowSupplierModal(true);
                  }}
                >
                  <i className="bi bi-cash-stack text-secondary fs-4 mb-1"></i>
                  <span className="small fw-semibold text-dark" style={{ fontSize: "0.82rem" }}>
                    View Payables
                  </span>
                </button>
              </div>

              <div className="col-6 col-md-6">
                <button
                  type="button"
                  className="btn btn-light bg-white w-100 h-100 border rounded-4 p-3 shadow-sm d-flex flex-column align-items-center justify-content-center text-center"
                  style={{ minHeight: "105px" }}
                  onClick={() => {
                    showToast("Opening Financial Statement...", "info");
                    setShowTransactionsModal(true);
                  }}
                >
                  <i className="bi bi-file-earmark-bar-graph text-secondary fs-4 mb-1"></i>
                  <span className="small fw-semibold text-dark" style={{ fontSize: "0.82rem" }}>
                    Financial Reports
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ----------------------------------------------------
          5. BOOTSTRAP MODALS
          ---------------------------------------------------- */}

      {/* Customer Settlement Modal */}
      {showCustomerModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          onClick={() => setShowCustomerModal(false)}
        >
          <div className="card rounded-4 border shadow-lg w-100" style={{ maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0 text-dark">Customer Payment Settlement</h6>
              <button type="button" className="btn-close" onClick={() => setShowCustomerModal(false)}></button>
            </div>
            <div className="card-body p-4">
              <div className="p-3 bg-light rounded-3 mb-3 border">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Booking Ref:</span>
                  <span className="fw-bold font-monospace small">BOOK-2026-00125</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Customer:</span>
                  <span className="fw-bold small">Rajesh Patel</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Vehicle:</span>
                  <span className="fw-semibold small">Hyundai Creta SX (O) Turbo</span>
                </div>
              </div>

              <div className="row g-2 text-center mb-3">
                <div className="col-4">
                  <div className="p-2 border rounded-3 bg-white">
                    <span className="text-muted d-block small" style={{ fontSize: "0.65rem" }}>SALE VALUE</span>
                    <span className="fw-bold small">₹16,25,000</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded-3 bg-white">
                    <span className="text-muted d-block small" style={{ fontSize: "0.65rem" }}>PAID</span>
                    <span className="fw-bold small text-success">₹50,000</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded-3 bg-white">
                    <span className="text-muted d-block small" style={{ fontSize: "0.65rem" }}>BALANCE</span>
                    <span className="fw-bold small text-danger">₹15,75,000</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-white border-top p-3 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowCustomerModal(false)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setShowCustomerModal(false);
                  setShowRecordCustomerModal(true);
                }}
              >
                Collect Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          onClick={() => setShowSupplierModal(false)}
        >
          <div className="card rounded-4 border shadow-lg w-100" style={{ maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0 text-dark">Supplier Outstanding Details</h6>
              <button type="button" className="btn-close" onClick={() => setShowSupplierModal(false)}></button>
            </div>
            <div className="card-body p-4">
              <div className="p-3 bg-light rounded-3 mb-3 border">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Supplier:</span>
                  <span className="fw-bold small">Hyundai Dealer</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Status:</span>
                  <span className="badge bg-danger-subtle text-danger">PENDING</span>
                </div>
              </div>

              <div className="row g-2 text-center mb-3">
                <div className="col-4">
                  <div className="p-2 border rounded-3 bg-white">
                    <span className="text-muted d-block small" style={{ fontSize: "0.65rem" }}>PURCHASE</span>
                    <span className="fw-bold small">₹15,20,000</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded-3 bg-white">
                    <span className="text-muted d-block small" style={{ fontSize: "0.65rem" }}>PAID</span>
                    <span className="fw-bold small text-success">₹10,00,000</span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded-3 bg-white">
                    <span className="text-muted d-block small" style={{ fontSize: "0.65rem" }}>OUTSTANDING</span>
                    <span className="fw-bold small text-danger">₹5,20,000</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-white border-top p-3 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowSupplierModal(false)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-sm btn-dark"
                onClick={() => {
                  setShowSupplierModal(false);
                  setShowRecordSupplierModal(true);
                }}
              >
                Pay Outstanding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Customer Payment Modal */}
      {showRecordCustomerModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          onClick={() => setShowRecordCustomerModal(false)}
        >
          <div className="card rounded-4 border shadow-lg w-100" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0 text-dark">Record Customer Payment</h6>
              <button type="button" className="btn-close" onClick={() => setShowRecordCustomerModal(false)}></button>
            </div>
            <form onSubmit={handleRecordCustomerPayment}>
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Customer / Booking</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={`${customerPayForm.bookingId} - ${customerPayForm.customer}`}
                    readOnly
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    required
                    value={customerPayForm.amount}
                    onChange={(e) => setCustomerPayForm({ ...customerPayForm, amount: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Mode</label>
                  <select
                    className="form-select form-select-sm"
                    value={customerPayForm.mode}
                    onChange={(e) => setCustomerPayForm({ ...customerPayForm, mode: e.target.value })}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
              <div className="card-footer bg-white border-top p-3 d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowRecordCustomerModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-primary">
                  Save Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Supplier Payment Modal */}
      {showRecordSupplierModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          onClick={() => setShowRecordSupplierModal(false)}
        >
          <div className="card rounded-4 border shadow-lg w-100" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0 text-dark">Record Supplier Payment</h6>
              <button type="button" className="btn-close" onClick={() => setShowRecordSupplierModal(false)}></button>
            </div>
            <form onSubmit={handleRecordSupplierPayment}>
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Supplier Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={supplierPayForm.supplier}
                    onChange={(e) => setSupplierPayForm({ ...supplierPayForm, supplier: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Disbursement Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    required
                    value={supplierPayForm.amount}
                    onChange={(e) => setSupplierPayForm({ ...supplierPayForm, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="card-footer bg-white border-top p-3 d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowRecordSupplierModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-dark">
                  Disburse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          onClick={() => setShowAddExpenseModal(false)}
        >
          <div className="card rounded-4 border shadow-lg w-100" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0 text-dark">Record Expense</h6>
              <button type="button" className="btn-close" onClick={() => setShowAddExpenseModal(false)}></button>
            </div>
            <form onSubmit={handleAddExpenseSubmit}>
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Category</label>
                  <select
                    className="form-select form-select-sm"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  >
                    <option value="Transportation">Transportation</option>
                    <option value="Vehicle Purchase">Vehicle Purchase</option>
                    <option value="Utilities">Utilities & Rent</option>
                    <option value="Other Expenses">Other Expenses</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="card-footer bg-white border-top p-3 d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddExpenseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {showTransactionsModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          onClick={() => setShowTransactionsModal(false)}
        >
          <div className="card rounded-4 border shadow-lg w-100" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0 text-dark">Recent Transactions Journal</h6>
              <button type="button" className="btn-close" onClick={() => setShowTransactionsModal(false)}></button>
            </div>
            <div className="card-body p-0">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3 small text-muted">DATE</th>
                    <th className="small text-muted">PARTY</th>
                    <th className="pe-3 small text-muted text-end">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="ps-3 small text-muted">24 Oct, 2023</td>
                    <td>
                      <div className="fw-bold small text-dark">Rajesh Patel</div>
                      <div className="text-muted" style={{ fontSize: "0.7rem" }}>Customer • Bank</div>
                    </td>
                    <td className="pe-3 text-end fw-bold text-success small">+₹50,000</td>
                  </tr>
                  <tr>
                    <td className="ps-3 small text-muted">23 Oct, 2023</td>
                    <td>
                      <div className="fw-bold small text-dark">Hyundai Dealer</div>
                      <div className="text-muted" style={{ fontSize: "0.7rem" }}>Supplier • UPI</div>
                    </td>
                    <td className="pe-3 text-end fw-bold text-danger small">-₹10,00,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card-footer bg-white border-top p-3 d-flex justify-content-end">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowTransactionsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period Picker Modal */}
      {showPeriodModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          onClick={() => setShowPeriodModal(false)}
        >
          <div className="card rounded-4 border shadow-lg w-100" style={{ maxWidth: "380px" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold mb-0 text-dark">Select Period</h6>
              <button type="button" className="btn-close" onClick={() => setShowPeriodModal(false)}></button>
            </div>
            <div className="card-body p-3">
              <div className="d-flex flex-column gap-2">
                {["October 2023", "September 2023", "August 2023", "FY 2023-24"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn text-start d-flex justify-content-between align-items-center ${selectedPeriod === m ? "btn-primary fw-bold" : "btn-outline-light text-dark border"
                      }`}
                    onClick={() => {
                      setSelectedPeriod(m);
                      setShowPeriodModal(false);
                      showToast(`Selected ${m}`, "success");
                    }}
                  >
                    <span>{m}</span>
                    {selectedPeriod === m && <i className="bi bi-check2"></i>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
