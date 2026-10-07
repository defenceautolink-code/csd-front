"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import Pagination from "@/components/common/Pagination";
import expenseApi from "@/services/expenseApi";

export default function ExpenseDetailPage() {
  const { showToast } = useToast();

  // State Management
  const [expenseList, setExpenseList] = useState([]);
  const [categoryMasters, setCategoryMasters] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Server Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [serverPagination, setServerPagination] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("All"); // All | Online | Offline
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3-Dots Action Dropdown Menu state
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleDocClick = (e) => {
      if (e.target && e.target.closest && e.target.closest(".action-menu-container")) {
        return;
      }
      setActiveActionMenuId(null);
    };
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  // Form State
  const initialFormState = {
    title: "",
    category_id: "",
    amount: "",
    invoice_no: "",
    party_name: "",
    pay_by: "",
    payment_type: "Online", // "Online" | "Offline"
    reference_no: "",
    remark: "",
    date: new Date().toISOString().split("T")[0],
  };

  const [formData, setFormData] = useState(initialFormState);

  // Load current user from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
        } catch (e) {
          console.error("Error reading user:", e);
        }
      }
    }
  }, []);

  const normalizeExpense = (item) => {
    const isOnline = item.payment_method !== "Cash";
    return {
      ...item,
      id: item.id,
      title: item.title || item.category?.name || "Expense",
      amount: Number(item.amount) || 0,
      invoice_no: item.reference_no || item.invoice_no || `EXP-${item.id}`,
      party_name: item.description || item.party_name || item.title || "-",
      pay_by: item.creator?.name || item.pay_by || "Admin User",
      payment_type: isOnline ? "Online" : "Offline",
      payment_method: item.payment_method || (isOnline ? "Bank Transfer" : "Cash"),
      reference_no: item.reference_no || "",
      remark: item.description || item.remark || "",
      date: item.expense_date || item.date || (item.created_at ? item.created_at.split("T")[0] : new Date().toISOString().split("T")[0]),
      category_id: item.category_id || item.category?.id || "",
      category_name: item.category?.name || item.title || "",
    };
  };

  // Load live expenses, categories & statistics from backend API
  const loadData = async () => {
    setIsLoading(true);
    try {
      const expenseParams = {
        page: currentPage,
        per_page: perPage,
      };
      if (startDate) expenseParams.from_date = startDate;
      if (endDate) expenseParams.to_date = endDate;
      if (searchTerm.trim()) expenseParams.search = searchTerm.trim();
      if (paymentTypeFilter !== "All") {
        expenseParams.payment_method = paymentTypeFilter === "Offline" ? "Cash" : "Bank Transfer";
      }
      if (categoryFilter !== "All") {
        const cat = categoryMasters.find((c) => c.title === categoryFilter || c.name === categoryFilter);
        if (cat) expenseParams.category_id = cat.id;
      }

      const [catsRes, expensesRes, statsRes] = await Promise.all([
        expenseApi.getCategories().catch(() => ({ data: [] })),
        expenseApi.getExpenses(expenseParams).catch(() => ({ data: [] })),
        expenseApi.getExpenseStats().catch(() => null),
      ]);

      if (catsRes && Array.isArray(catsRes.data)) {
        setCategoryMasters(
          catsRes.data.map((c) => ({
            ...c,
            id: c.id,
            title: c.name || c.title,
            name: c.name || c.title,
          }))
        );
      }

      if (expensesRes && Array.isArray(expensesRes.data)) {
        setExpenseList(expensesRes.data.map(normalizeExpense));
        if (expensesRes.pagination) {
          setServerPagination(expensesRes.pagination);
        } else if (expensesRes.meta) {
          setServerPagination(expensesRes.meta);
        } else {
          setServerPagination(null);
        }
      }

      if (statsRes && statsRes.data) {
        setStatsData(statsRes.data);
      }
    } catch (e) {
      console.error(e);
      showToast("Error loading expense data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage, startDate, endDate, paymentTypeFilter, categoryFilter, searchTerm]);

  // Reset to page 1 on any filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, paymentTypeFilter, categoryFilter, searchTerm]);

  // Open Add Modal with pre-filled default Pay By & default Title
  const handleOpenAdd = () => {
    const loggedInName =
      currentUser?.name || currentUser?.full_name || "Admin User";
    const defaultTitle = categoryMasters.length > 0 ? (categoryMasters[0].name || categoryMasters[0].title) : "";
    const defaultCatId = categoryMasters.length > 0 ? categoryMasters[0].id : "";

    setFormData({
      ...initialFormState,
      title: defaultTitle,
      category_id: defaultCatId,
      pay_by: loggedInName,
      date: new Date().toISOString().split("T")[0],
    });
    setShowAddModal(true);
  };

  // 1. ADD EXPENSE DETAIL (POST /expenses)
  const handleAddSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title) {
      showToast("Please select an expense title from master list.", "error");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast("Please enter a valid expense amount.", "error");
      return;
    }
    if (!formData.invoice_no.trim()) {
      showToast("Please enter the invoice number.", "error");
      return;
    }
    if (!formData.party_name.trim()) {
      showToast("Please enter the party/vendor name.", "error");
      return;
    }

    // If online, reference_no is required
    if (formData.payment_type === "Online" && !formData.reference_no.trim()) {
      showToast("Reference No (UTR / Txn ID) is required for Online payment.", "error");
      return;
    }

    const selectedCat = categoryMasters.find(
      (c) => String(c.id) === String(formData.category_id) || c.title === formData.title || c.name === formData.title
    );
    const catId = selectedCat ? Number(selectedCat.id) : (Number(formData.category_id) || 1);

    setIsSubmitting(true);
    try {
      const apiPayload = {
        expense_date: formData.date || new Date().toISOString().split("T")[0],
        category_id: catId,
        title: formData.title,
        description: formData.party_name
          ? `${formData.party_name} - ${formData.remark || formData.invoice_no || ""}`
          : (formData.remark || formData.title),
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_type === "Offline" ? "Cash" : "Bank Transfer",
        reference_no: formData.payment_type === "Online" ? formData.reference_no.trim() : (formData.invoice_no.trim() || ""),
        status: "Paid",
      };

      const res = await expenseApi.createExpense(apiPayload);
      showToast(res.message || `Expense for "${formData.party_name}" recorded successfully!`, "success");
      setShowAddModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      const errMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : null) ||
        "Failed to record expense.";
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. EDIT EXPENSE DETAIL
  const handleOpenEdit = (item) => {
    setEditItem({
      ...item,
      amount: item.amount.toString(),
      payment_type: item.payment_type || "Online",
      reference_no: item.reference_no || "",
      remark: item.remark || "",
      date: item.date || new Date().toISOString().split("T")[0],
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editItem) return;

    if (!editItem.title) {
      showToast("Please select an expense title.", "error");
      return;
    }
    if (!editItem.amount || Number(editItem.amount) <= 0) {
      showToast("Please enter a valid amount.", "error");
      return;
    }
    if (!editItem.invoice_no.trim()) {
      showToast("Please enter invoice number.", "error");
      return;
    }
    if (!editItem.party_name.trim()) {
      showToast("Please enter party name.", "error");
      return;
    }
    if (editItem.payment_type === "Online" && !editItem.reference_no.trim()) {
      showToast("Reference No is required for Online payment.", "error");
      return;
    }

    const selectedCat = categoryMasters.find(
      (c) => String(c.id) === String(editItem.category_id) || c.title === editItem.title || c.name === editItem.title
    );
    const catId = selectedCat ? Number(selectedCat.id) : 1;

    setIsSubmitting(true);
    try {
      const apiPayload = {
        expense_date: editItem.date || new Date().toISOString().split("T")[0],
        category_id: catId,
        title: editItem.title,
        description: editItem.party_name
          ? `${editItem.party_name} - ${editItem.remark || editItem.invoice_no || ""}`
          : (editItem.remark || editItem.title),
        amount: parseFloat(editItem.amount),
        payment_method: editItem.payment_type === "Offline" ? "Cash" : "Bank Transfer",
        reference_no: editItem.payment_type === "Online" ? editItem.reference_no.trim() : (editItem.invoice_no.trim() || ""),
        status: editItem.status || "Paid",
      };

      const res = await expenseApi.updateExpense(editItem.id, apiPayload);
      showToast(res.message || "Expense record updated successfully!", "success");
      setEditItem(null);
      await loadData();
    } catch (err) {
      console.error(err);
      const errMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : null) ||
        "Failed to update expense.";
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. DELETE EXPENSE DETAIL (DELETE /expenses/:id)
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const res = await expenseApi.deleteExpense(deleteTarget.id);
      showToast(res.message || `Expense record deleted successfully!`, "success");
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to delete expense.", "error");
    }
  };

  // Handle server-side vs client-side pagination fallback
  const isServerPaginated = Boolean(serverPagination);

  // Filtered List
  const filteredExpenses = useMemo(() => {
    if (isServerPaginated) return expenseList;

    return expenseList.filter((item) => {
      // Date Filter
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      // Payment Type Filter
      if (paymentTypeFilter !== "All" && item.payment_type !== paymentTypeFilter) {
        return false;
      }

      // Category Filter
      if (categoryFilter !== "All" && item.title !== categoryFilter && item.category_name !== categoryFilter) {
        return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesParty = item.party_name?.toLowerCase().includes(query);
        const matchesInvoice = item.invoice_no?.toLowerCase().includes(query);
        const matchesPayBy = item.pay_by?.toLowerCase().includes(query);
        const matchesRef = item.reference_no?.toLowerCase().includes(query);
        return matchesTitle || matchesParty || matchesInvoice || matchesPayBy || matchesRef;
      }

      return true;
    });
  }, [expenseList, isServerPaginated, startDate, endDate, paymentTypeFilter, categoryFilter, searchTerm]);

  const totalExpenses = isServerPaginated
    ? (serverPagination.total ?? expenseList.length)
    : filteredExpenses.length;

  const lastPage = isServerPaginated
    ? (serverPagination.last_page ?? Math.max(1, Math.ceil(totalExpenses / perPage)))
    : Math.max(1, Math.ceil(totalExpenses / perPage));

  const paginatedExpenses = isServerPaginated
    ? expenseList
    : filteredExpenses.slice(
        (currentPage - 1) * perPage,
        currentPage * perPage
      );

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const onlineItems = filteredExpenses.filter((i) => i.payment_type === "Online");
    const onlineSum = onlineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const offlineItems = filteredExpenses.filter((i) => i.payment_type === "Offline");
    const offlineSum = offlineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return {
      totalAmount,
      totalCount: filteredExpenses.length,
      onlineSum,
      onlineCount: onlineItems.length,
      offlineSum,
      offlineCount: offlineItems.length,
    };
  }, [filteredExpenses]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      showToast("No expense records to export.", "info");
      return;
    }

    const headers = [
      "Invoice No",
      "Date",
      "Expense Title",
      "Party Name",
      "Amount",
      "Payment Type",
      "Reference No",
      "Remark",
      "Paid By",
    ];

    const rows = filteredExpenses.map((e) => [
      `"${e.invoice_no || ""}"`,
      `"${e.date || ""}"`,
      `"${e.title || ""}"`,
      `"${(e.party_name || "").replace(/"/g, '""')}"`,
      e.amount || 0,
      `"${e.payment_type || ""}"`,
      `"${e.reference_no || ""}"`,
      `"${(e.remark || "").replace(/"/g, '""')}"`,
      `"${e.pay_by || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Expense_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Expense records exported as CSV successfully!", "success");
  };

  return (
    <AdminLayout>
      <div className="page-body">
        {/* Page Breadcrumbs & Header */}
        <div className="page-header-wrapper">
          <div>
            <ul className="breadcrumb-custom">
              <li className="breadcrumb-item">
                <Link href="/admin/dashboard">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <span className="text-muted">Master Data</span>
              </li>
              <li className="breadcrumb-item">
                <Link href="/admin/expense-master">Expense Master</Link>
              </li>
              <li className="breadcrumb-item active">Expense Details</li>
            </ul>
            <h1 className="page-title mt-1">Expense Details & Billing</h1>
            <p className="text-muted small mb-0">
              Track showroom operating expenses, invoices, vendor payouts, and digital reference receipts.
            </p>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            {/* <Link
              href="/admin/expense-master"
              className="btn btn-outline-custom d-flex align-items-center gap-2"
            >
              <i className="bi bi-wallet2 text-primary"></i>
              <span>Expense Master</span>
            </Link> */}

            <button
              className="btn btn-outline-custom d-flex align-items-center gap-2"
              onClick={handleExportCSV}
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export CSV</span>
            </button>

            <button
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={handleOpenAdd}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Add Expense Entry</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        {/* <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card shadow-sm border-0">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Expenses</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-cash-stack"></i>
                </div>
              </div>
              <div className="stat-card-value text-dark">
                ₹{metrics.totalAmount.toLocaleString("en-IN")}
              </div>
              <span className="text-primary small fw-semibold">
                {metrics.totalCount} Invoices Total
              </span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card shadow-sm border-0">
              <div className="stat-card-header">
                <span className="stat-card-title">Online Payouts</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-credit-card-2-front-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-success">
                ₹{metrics.onlineSum.toLocaleString("en-IN")}
              </div>
              <span className="text-success small fw-semibold">
                {metrics.onlineCount} Online Payments
              </span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card shadow-sm border-0">
              <div className="stat-card-header">
                <span className="stat-card-title">Offline / Cash</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-cash-coin"></i>
                </div>
              </div>
              <div className="stat-card-value text-warning">
                ₹{metrics.offlineSum.toLocaleString("en-IN")}
              </div>
              <span className="text-warning small fw-semibold">
                {metrics.offlineCount} Cash Transactions
              </span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card shadow-sm border-0">
              <div className="stat-card-header">
                <span className="stat-card-title">Logged By</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-person-check-fill"></i>
                </div>
              </div>
              <div className="stat-card-value text-truncate fs-5" title={currentUser?.name || "Alexander Vance"}>
                {currentUser?.name || "Alexander Vance"}
              </div>
              <span className="text-info small fw-semibold">Active Session Officer</span>
            </div>
          </div>
        </div> */}

        {/* Expenses Table Card */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 w-100">
              <div className="d-flex align-items-center gap-2">
                <h5 className="card-title mb-0 fw-bold">Expense Records</h5>
                <span className="badge bg-primary-subtle text-primary rounded-pill px-2">
                  {totalExpenses} Records
                </span>
              </div>

              {/* Filters & Search */}
              <div className="d-flex flex-wrap align-items-center gap-2 ms-auto">
                {/* Payment Type Pill Filter */}
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${
                      paymentTypeFilter === "All"
                        ? "btn-primary"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => setPaymentTypeFilter("All")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`btn ${
                      paymentTypeFilter === "Online"
                        ? "btn-primary"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => setPaymentTypeFilter("Online")}
                  >
                    <i className="bi bi-globe me-1"></i> Online
                  </button>
                  <button
                    type="button"
                    className={`btn ${
                      paymentTypeFilter === "Offline"
                        ? "btn-primary"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => setPaymentTypeFilter("Offline")}
                  >
                    <i className="bi bi-wallet2 me-1"></i> Offline
                  </button>
                </div>

                {/* Category Dropdown Filter */}
                <select
                  className="form-select form-select-sm"
                  style={{ width: "160px" }}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {categoryMasters.map((c) => (
                    <option key={c.id} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </select>

                {/* Date Filter: From */}
                <div className="input-group input-group-sm" style={{ width: "160px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="From Date">
                    <i className="bi bi-calendar-event me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>From</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    title="Expense date from"
                  />
                </div>

                {/* Date Filter: To */}
                <div className="input-group input-group-sm" style={{ width: "155px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="To Date">
                    <i className="bi bi-calendar-check me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>To</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    title="Expense date to"
                  />
                </div>

                {/* Clear Date Filter Button */}
                {(startDate || endDate) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-2 d-flex align-items-center gap-1"
                    style={{ fontSize: "0.8rem", height: "31px" }}
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    title="Clear Date Filter"
                  >
                    <i className="bi bi-x-circle"></i>
                    <span>Reset</span>
                  </button>
                )}

                {/* Search Bar */}
                <div style={{ width: "200px" }}>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Search party, invoice..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        className="btn btn-outline-secondary border-start-0"
                        type="button"
                        onClick={() => setSearchTerm("")}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="table-responsive" style={{ minHeight: "220px" }}>
            <table className="table table-custom mb-0" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "45px" }}>#</th>
                  <th style={{ width: "65px" }} className="text-center">Actions</th>
                  <th style={{ width: "135px" }}>Invoice & Date</th>
                  <th>Expense Title</th>
                  <th style={{ minWidth: "160px" }}>Party Name</th>
                  <th style={{ width: "105px" }}>Amount</th>
                  <th style={{ width: "125px" }}>Payment Type</th>
                  <th style={{ width: "115px" }}>Paid By</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading expenses...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <div className="mb-2">
                        <i className="bi bi-receipt-cutoff fs-1 text-secondary opacity-50"></i>
                      </div>
                      <p className="mb-2 fw-semibold">No expense records found.</p>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={handleOpenAdd}
                      >
                        <i className="bi bi-plus-circle me-1"></i> Add First Expense
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((item, index) => (
                    <tr key={item.id}>
                      <td>
                        <span className="text-muted small fw-semibold">
                          {(currentPage - 1) * perPage + index + 1}
                        </span>
                      </td>

                      {/* 2. Actions (3-Dots Dropdown Menu) */}
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown position-relative d-inline-block action-menu-container">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border rounded-circle shadow-none p-0 d-inline-flex align-items-center justify-content-center"
                            style={{ width: "30px", height: "30px", cursor: "pointer" }}
                            title="Actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenuId(
                                activeActionMenuId === item.id ? null : item.id
                              );
                            }}
                          >
                            <i className="bi bi-three-dots-vertical fs-6 text-dark"></i>
                          </button>

                          {activeActionMenuId === item.id && (
                            <div
                              className="dropdown-menu show shadow-lg border rounded-3 p-1 position-absolute text-start"
                              style={{
                                minWidth: "165px",
                                zIndex: 1060,
                                top: "100%",
                                left: 0,
                                backgroundColor: "#FFFFFF",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small rounded-2 text-dark"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  setViewItem(item);
                                }}
                              >
                                <i className="bi bi-eye text-primary"></i>
                                <span>View Receipt</span>
                              </button>

                              <button
                                type="button"
                                className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small rounded-2 text-dark"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  handleOpenEdit(item);
                                }}
                              >
                                <i className="bi bi-pencil text-warning"></i>
                                <span>Edit Expense</span>
                              </button>

                              <button
                                type="button"
                                className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small rounded-2 text-danger"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  setDeleteTarget(item);
                                }}
                              >
                                <i className="bi bi-trash text-danger"></i>
                                <span>Delete Expense</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Invoice No & Date */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div className="d-flex flex-column">
                          <span className="fw-bold text-dark font-monospace" style={{ fontSize: "0.84rem" }}>
                            {item.invoice_no}
                          </span>
                          <span className="text-muted small">
                            <i className="bi bi-calendar3 me-1"></i>
                            {item.date
                              ? new Date(item.date).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </span>
                        </div>
                      </td>

                      {/* Expense Title */}
                      <td style={{ whiteSpace: "normal", maxWidth: "180px" }}>
                        <span className="badge bg-light text-dark border px-2 py-1 fw-semibold text-wrap text-start">
                          <i className="bi bi-tag text-primary me-1"></i>
                          {item.title}
                        </span>
                      </td>

                      {/* Party Name - Auto wraps long text to prevent horizontal overflow */}
                      <td style={{ whiteSpace: "normal", maxWidth: "220px", wordBreak: "break-word" }}>
                        <span className="fw-bold text-dark small">{item.party_name}</span>
                      </td>

                      {/* Amount */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className="fw-bold text-dark fs-6">
                          ₹{Number(item.amount).toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Payment Type */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        {item.payment_type === "Online" ? (
                          <div>
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                              <i className="bi bi-globe me-1"></i> Online
                            </span>
                            {item.reference_no && (
                              <div
                                className="small text-muted font-monospace mt-0.5 text-truncate"
                                style={{ maxWidth: "120px" }}
                                title={`Ref: ${item.reference_no}`}
                              >
                                Ref: {item.reference_no}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                            <i className="bi bi-cash me-1"></i> Offline / Cash
                          </span>
                        )}
                      </td>

                      {/* Paid By */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div className="d-flex align-items-center gap-1">
                          <i className="bi bi-person-circle text-muted"></i>
                          <span className="small text-dark fw-semibold text-truncate" style={{ maxWidth: "105px" }} title={item.pay_by}>
                            {item.pay_by}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!isLoading && filteredExpenses.length > 0 && (
            <div className="p-3 border-top bg-white">
              <Pagination
                currentPage={currentPage}
                lastPage={lastPage}
                total={totalExpenses}
                perPage={perPage}
                onPageChange={(page) => setCurrentPage(page)}
                onPerPageChange={(newPerPage) => {
                  setPerPage(newPerPage);
                  setCurrentPage(1);
                }}
                perPageOptions={[10, 20, 50, 100]}
                itemName="expense records"
              />
            </div>
          )}
        </div>

        {/* ==============================================================
            MODAL 1: ADD EXPENSE DETAIL
            ============================================================== */}
        {showAddModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowAddModal(false)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "620px" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-receipt text-info"></i> Add Expense Entry
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="modal-body-custom py-3">
                  <div className="row g-3">
                    {/* Expense Title (from Expense Master) */}
                    <div className="col-md-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label text-dark fw-bold small mb-0">
                          Expense Title <span className="text-danger">*</span>
                        </label>
                        
                      </div>
                      <select
                        className="form-select"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      >
                        <option value="" disabled>
                          -- Select From Expense Master --
                        </option>
                        {categoryMasters.map((cat) => (
                          <option key={cat.id} value={cat.title}>
                            {cat.title}
                          </option>
                        ))}
                      </select>
                      <div className="form-text small text-muted">
                        Master Category Title
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Amount (₹) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light fw-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="form-control"
                          placeholder="0.00"
                          required
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Invoice Number */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Invoice No <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. INV-2024-001 or Bill No"
                        required
                        value={formData.invoice_no}
                        onChange={(e) =>
                          setFormData({ ...formData, invoice_no: e.target.value })
                        }
                      />
                    </div>

                    {/* Expense Date */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Expense Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>

                    {/* Party Name */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Party / Vendor Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Torrent Power, Landlord Name..."
                        required
                        value={formData.party_name}
                        onChange={(e) =>
                          setFormData({ ...formData, party_name: e.target.value })
                        }
                      />
                    </div>

                    {/* Pay By (Logged-in user name as requested) */}
                    <div className="col-md-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label text-dark fw-bold small mb-0">
                          Pay By <span className="text-danger">*</span>
                        </label>
                        <span className="badge bg-info-subtle text-info font-monospace small">
                          Auto-Detected
                        </span>
                      </div>
                      <input
                        type="text"
                        className="form-control bg-light"
                        required
                        value={formData.pay_by}
                        onChange={(e) => setFormData({ ...formData, pay_by: e.target.value })}
                      />
                      <div className="form-text small text-muted">
                        Logged-in user name (API integration ready)
                      </div>
                    </div>

                    {/* Payment Type: Online or Offline */}
                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Payment Type <span className="text-danger">*</span>
                      </label>
                      <div className="d-flex gap-4 p-2 bg-light rounded border">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="payment_type"
                            id="payTypeOnline"
                            value="Online"
                            checked={formData.payment_type === "Online"}
                            onChange={(e) =>
                              setFormData({ ...formData, payment_type: e.target.value })
                            }
                          />
                          <label className="form-check-label fw-bold text-success" htmlFor="payTypeOnline">
                            <i className="bi bi-globe me-1"></i> Online (UPI / NEFT / Net Banking)
                          </label>
                        </div>

                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="payment_type"
                            id="payTypeOffline"
                            value="Offline"
                            checked={formData.payment_type === "Offline"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                payment_type: e.target.value,
                                reference_no: "",
                                remark: "",
                              })
                            }
                          />
                          <label className="form-check-label fw-bold text-secondary" htmlFor="payTypeOffline">
                            <i className="bi bi-cash me-1"></i> Offline (Cash)
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Conditional Online Fields: Reference No & Remark (Hidden when Offline) */}
                    {formData.payment_type === "Online" && (
                      <div className="col-12">
                        <div className="p-3 bg-light-subtle border border-success-subtle rounded">
                          <div className="d-flex align-items-center gap-1 text-success mb-2 fw-bold small">
                            <i className="bi bi-shield-check"></i> Online Transaction Details
                          </div>
                          <div className="row g-2">
                            <div className="col-md-6">
                              <label className="form-label text-dark fw-bold small mb-1">
                                Reference No / UTR / Txn ID <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. UTR / UPI Ref / Transaction ID"
                                required={formData.payment_type === "Online"}
                                value={formData.reference_no}
                                onChange={(e) =>
                                  setFormData({ ...formData, reference_no: e.target.value })
                                }
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label text-dark fw-bold small mb-1">
                                Remark
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Paid via HDFC Current A/C"
                                value={formData.remark}
                                onChange={(e) =>
                                  setFormData({ ...formData, remark: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmitting ? "Saving..." : "Save Expense"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==============================================================
            MODAL 2: EDIT EXPENSE DETAIL
            ============================================================== */}
        {editItem && (
          <div className="modal-backdrop-custom" onClick={() => setEditItem(null)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "620px" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-pencil-square text-info"></i> Edit Expense Entry
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditItem(null)}
                ></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body-custom py-3">
                  <div className="row g-3">
                    {/* Expense Title */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Expense Title <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={editItem.title}
                        onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                      >
                        <option value="" disabled>
                          -- Select From Expense Master --
                        </option>
                        {categoryMasters.map((cat) => (
                          <option key={cat.id} value={cat.title}>
                            {cat.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Amount (₹) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light fw-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="form-control"
                          required
                          value={editItem.amount}
                          onChange={(e) => setEditItem({ ...editItem, amount: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Invoice Number */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Invoice No <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editItem.invoice_no}
                        onChange={(e) =>
                          setEditItem({ ...editItem, invoice_no: e.target.value })
                        }
                      />
                    </div>

                    {/* Expense Date */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Expense Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={editItem.date}
                        onChange={(e) => setEditItem({ ...editItem, date: e.target.value })}
                      />
                    </div>

                    {/* Party Name */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Party / Vendor Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editItem.party_name}
                        onChange={(e) =>
                          setEditItem({ ...editItem, party_name: e.target.value })
                        }
                      />
                    </div>

                    {/* Pay By */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Pay By <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editItem.pay_by}
                        onChange={(e) => setEditItem({ ...editItem, pay_by: e.target.value })}
                      />
                    </div>

                    {/* Payment Type */}
                    <div className="col-12">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Payment Type <span className="text-danger">*</span>
                      </label>
                      <div className="d-flex gap-4 p-2 bg-light rounded border">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="edit_payment_type"
                            id="editPayTypeOnline"
                            value="Online"
                            checked={editItem.payment_type === "Online"}
                            onChange={(e) =>
                              setEditItem({ ...editItem, payment_type: e.target.value })
                            }
                          />
                          <label className="form-check-label fw-bold text-success" htmlFor="editPayTypeOnline">
                            <i className="bi bi-globe me-1"></i> Online
                          </label>
                        </div>

                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="edit_payment_type"
                            id="editPayTypeOffline"
                            value="Offline"
                            checked={editItem.payment_type === "Offline"}
                            onChange={(e) =>
                              setEditItem({
                                ...editItem,
                                payment_type: e.target.value,
                                reference_no: "",
                                remark: "",
                              })
                            }
                          />
                          <label className="form-check-label fw-bold text-secondary" htmlFor="editPayTypeOffline">
                            <i className="bi bi-cash me-1"></i> Offline (Cash)
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Conditional Online Fields */}
                    {editItem.payment_type === "Online" && (
                      <div className="col-12">
                        <div className="p-3 bg-light-subtle border border-success-subtle rounded">
                          <div className="d-flex align-items-center gap-1 text-success mb-2 fw-bold small">
                            <i className="bi bi-shield-check"></i> Online Transaction Details
                          </div>
                          <div className="row g-2">
                            <div className="col-md-6">
                              <label className="form-label text-dark fw-bold small mb-1">
                                Reference No / UTR <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                required={editItem.payment_type === "Online"}
                                value={editItem.reference_no}
                                onChange={(e) =>
                                  setEditItem({ ...editItem, reference_no: e.target.value })
                                }
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label text-dark fw-bold small mb-1">
                                Remark
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={editItem.remark}
                                onChange={(e) =>
                                  setEditItem({ ...editItem, remark: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setEditItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmitting ? "Updating..." : "Update Expense"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==============================================================
            MODAL 3: VIEW RECEIPT DETAILS
            ============================================================== */}
        {viewItem && (
          <div className="modal-backdrop-custom" onClick={() => setViewItem(null)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "520px" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-receipt text-info"></i> Expense Voucher
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setViewItem(null)}
                ></button>
              </div>

              <div className="modal-body-custom py-3">
                <div className="bg-light p-3 rounded border text-center mb-3">
                  <span className="text-muted small">Total Expense Amount</span>
                  <h2 className="text-dark fw-bold mb-0 mt-1">
                    ₹{Number(viewItem.amount).toLocaleString("en-IN")}
                  </h2>
                  <span
                    className={`badge mt-2 ${
                      viewItem.payment_type === "Online"
                        ? "bg-success-subtle text-success border border-success-subtle"
                        : "bg-warning-subtle text-warning border border-warning-subtle"
                    }`}
                  >
                    {viewItem.payment_type} Payment
                  </span>
                </div>

                <div className="list-group list-group-flush small">
                  <div className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Invoice No:</span>
                    <span className="fw-bold font-monospace">{viewItem.invoice_no}</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Date:</span>
                    <span className="fw-semibold">
                      {viewItem.date
                        ? new Date(viewItem.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Expense Category:</span>
                    <span className="fw-bold text-primary">{viewItem.title}</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Party / Vendor:</span>
                    <span className="fw-bold">{viewItem.party_name}</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between px-0 py-2">
                    <span className="text-muted">Paid By:</span>
                    <span className="fw-semibold">{viewItem.pay_by}</span>
                  </div>

                  {viewItem.payment_type === "Online" && (
                    <>
                      <div className="list-group-item d-flex justify-content-between px-0 py-2">
                        <span className="text-muted">Reference / UTR No:</span>
                        <span className="fw-bold font-monospace text-success">
                          {viewItem.reference_no || "N/A"}
                        </span>
                      </div>
                      {viewItem.remark && (
                        <div className="list-group-item d-flex justify-content-between px-0 py-2">
                          <span className="text-muted">Remark:</span>
                          <span className="text-dark">{viewItem.remark}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                <button
                  type="button"
                  className="btn btn-outline-custom"
                  onClick={() => setViewItem(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary d-inline-flex align-items-center gap-1"
                  onClick={() => {
                    window.print();
                  }}
                >
                  <i className="bi bi-printer"></i>
                  <span>Print Voucher</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            MODAL 4: DELETE CONFIRMATION
            ============================================================== */}
        {deleteTarget && (
          <div className="modal-backdrop-custom" onClick={() => setDeleteTarget(null)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "440px" }}
            >
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-danger d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i> Delete Expense Entry
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteTarget(null)}
                ></button>
              </div>

              <div className="modal-body-custom">
                <p className="text-dark mb-1">
                  Are you sure you want to delete this expense record?
                </p>
                <div className="p-3 my-2 bg-light rounded border">
                  <div>
                    <strong>Invoice:</strong> {deleteTarget.invoice_no}
                  </div>
                  <div>
                    <strong>Party:</strong> {deleteTarget.party_name}
                  </div>
                  <div className="text-danger fw-bold mt-1">
                    Amount: ₹{Number(deleteTarget.amount).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                <button
                  type="button"
                  className="btn btn-outline-custom"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteConfirm}
                >
                  Delete Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
