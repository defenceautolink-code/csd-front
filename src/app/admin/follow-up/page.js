"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import { hasPermission, normalizeRole } from "@/utils/auth";
import Pagination from "@/components/common/Pagination";
import discountApprovalApi from "@/services/discountApprovalApi";
import { logActivity } from "@/utils/activityLogger";

export default function FollowUpPage() {
  const { showToast } = useToast();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) setCurrentUser(JSON.parse(user));
  }, []);

  const can = (permission) => hasPermission(permission, currentUser);

  const getLeadProfileHref = (leadId) => {
    if (!leadId) return "#";
    let userObj = currentUser;
    if (!userObj && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user");
        if (stored) userObj = JSON.parse(stored);
      } catch (e) {
        // ignore
      }
    }
    const r = userObj ? normalizeRole(userObj.role) : "";
    if (r === "sales_executive" || r === "sales" || r === "executive") {
      return `/sales-executive/leads/${leadId}`;
    }
    if (r === "sales_manager" || r === "manager") {
      return `/sales-manager/leads/${leadId}`;
    }
    return `/admin/leads/${leadId}`;
  };

  const getFollowUpDiscountInfo = (item) => {
    // Only display discount badge on follow-up interactions where discount was actually requested
    if (!item.is_discount_requested && !item.discount_amount) {
      return null;
    }

    const leadId = item.lead_id;
    const matchingLead = (leadsList || []).find((l) => Number(l.id) === Number(leadId)) || item.rawLead;
    const localDisc = leadId ? discountApprovalApi.getLeadApprovalStatus(leadId) : null;

    let status = null;
    const leadStatusName = matchingLead?.status_name || matchingLead?.status?.name || item.rawLead?.status_name || "";
    const rawDiscStatus = matchingLead?.discount_approval_status || item.rawLead?.discount_approval_status;

    if (rawDiscStatus && rawDiscStatus !== "none") {
      status = rawDiscStatus;
    } else if (leadStatusName.toLowerCase().includes("approved")) {
      status = "approved";
    } else if (leadStatusName.toLowerCase().includes("rejected")) {
      status = "rejected";
    } else if (leadStatusName.toLowerCase().includes("pending")) {
      status = "pending";
    } else if (localDisc && localDisc.status) {
      status = localDisc.status;
    } else {
      status = "pending";
    }

    if (!status || status === "none") return null;

    const amount = Number(
      matchingLead?.approved_discount ||
      matchingLead?.requested_discount ||
      item.discount_amount ||
      item.rawLead?.approved_discount ||
      item.rawLead?.requested_discount ||
      localDisc?.discount_amount ||
      0
    );

    return { status, amount };
  };

  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [recordView, setRecordView] = useState("active"); // "active" | "trash"
  const [viewHistoryCustomer, setViewHistoryCustomer] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isCustomerLocked, setIsCustomerLocked] = useState(false);

  const getTodayDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getCurrentTimeFormatted = () => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Close 3-dots action menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveActionMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      fetchFollowUps(currentPage, perPage, searchTerm, startDate, endDate, activeTab, recordView, outcomeFilter);
      axios.get(`${API_URL}/leads`).then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setLeadsList(res.data.data);
        }
      }).catch(() => { });
    };
    window.addEventListener("csd_approvals_updated", handleUpdate);
    return () => window.removeEventListener("csd_approvals_updated", handleUpdate);
  }, [currentPage, perPage, searchTerm, startDate, endDate, activeTab, recordView, outcomeFilter]);

  // Live follow-ups list & KPIs from backend
  const [followUpsList, setFollowUpsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);
  const [isDeletingPermanent, setIsDeletingPermanent] = useState(false);
  const [kpis, setKpis] = useState({ overdue: 0, due_today: 0, upcoming: 0, total: 0 });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [leadsList, setLeadsList] = useState([]);

  // New Log form state with current Interaction Date and Time
  const [callLog, setCallLog] = useState({
    lead_id: null,
    customer: "",
    phone: "",
    vehicle: "",
    outcome: "Interested / Call Back",
    interaction_date: getTodayDate(),
    interaction_time: getCurrentTimeFormatted(),
    nextDate: "",
    type: "Phone Call",
    nextTime: "10:00 AM",
    notes: "",
    request_discount: false,
    discount_amount: "",
    proposed_price: "",
    discount_reason: "",
  });

  // Dedicated API: Fetch Live KPI Metrics for Follow-Up Cards
  const fetchFollowUpStats = async (from = startDate, to = endDate) => {
    try {
      const params = {};
      if (from) params.start_date = from;
      if (to) params.end_date = to;
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/follow-ups/stats`, { params, headers });
      if (res.data && res.data.status && res.data.data) {
        setKpis({
          overdue: Number(res.data.data.overdue) || 0,
          due_today: Number(res.data.data.due_today) || 0,
          upcoming: Number(res.data.data.upcoming) || 0,
          total: Number(res.data.data.total) || 0,
        });
      }
    } catch (e) {
      console.log("Error fetching follow-up stats:", e);
    }
  };

  // Fetch follow-ups from live backend API following backend contract
  const fetchFollowUps = async (
    page = currentPage,
    limit = perPage,
    search = searchTerm,
    from = startDate,
    to = endDate,
    tab = activeTab,
    viewMode = recordView,
    outcome = outcomeFilter
  ) => {
    try {
      setLoading(true);
      fetchFollowUpStats(from, to);
      const params = {
        page: page,
        per_page: limit,
      };
      if (viewMode === "trash") {
        params.status = "deleted";
      }
      if (search && search.trim()) {
        params.search = search.trim();
      }
      if (from) {
        params.from_date = from;
        params.start_date = from;
      }
      if (to) {
        params.to_date = to;
        params.end_date = to;
      }
      if (tab && tab !== "all" && viewMode !== "trash") {
        params.tab = tab;
        params.due_filter = tab;
      }
      if (outcome && outcome !== "all") {
        params.outcome = outcome;
      }

      const res = await axios.get(`${API_URL}/follow-ups`, { params });
      if (res.data && res.data.status && Array.isArray(res.data.data)) {
        if (res.data.kpis) {
          setKpis({
            overdue: Number(res.data.kpis.overdue) || 0,
            due_today: Number(res.data.kpis.due_today) || 0,
            upcoming: Number(res.data.kpis.upcoming) || 0,
            total: Number(res.data.kpis.total) || 0,
          });
        }
        if (res.data.pagination) {
          setPagination({
            current_page: Number(res.data.pagination.current_page) || page,
            last_page: Number(res.data.pagination.last_page) || 1,
            per_page: Number(res.data.pagination.per_page) || limit,
            total: Number(res.data.pagination.total) || 0,
            from: res.data.pagination.from,
            to: res.data.pagination.to,
          });
        }

        // Task 2 & 3: Filter follow-up records to only show 'Follow-up' and 'Quotation Sent' lead stages
        let rawList = res.data.data;
        if (viewMode !== "trash") {
          rawList = rawList.filter((item) => {
            const st = (item.lead?.status_name || item.lead?.status?.name || item.status_name || "").toLowerCase();
            if (!st) return true;
            return (
              st.includes("follow") ||
              st.includes("quotation") ||
              st.includes("sent") ||
              st === "in follow-up"
            );
          });
        }
        if (outcome && outcome !== "all") {
          rawList = rawList.filter((item) => (item.status || item.outcome) === outcome);
        }

        const todayStr = new Date().toISOString().split("T")[0];
        const liveItems = rawList.map((item, idx) => {
          const custName = item.lead?.name || item.customer_name || "Customer";
          const phone = item.lead?.phone || item.phone || "-";
          const city = item.lead?.city || "";
          const vehicle = item.lead?.model_variant || item.vehicle || "-";
          const brand = item.lead?.brand_name || "";
          const outcome = item.status || item.type || "Follow-up Logged";
          let desc = item.notes || "";
          if (desc.includes("automatically sent to")) {
            desc = "Automated CRM Greeting Sent";
          } else if (desc.length > 45) {
            desc = desc.substring(0, 42) + "...";
          }
          const rawDueDate = item.next_follow_up_date || item.follow_up_date || "";
          const dueDate = rawDueDate || "-";
          const dueSub = item.next_follow_up_time ? `Scheduled • ${item.next_follow_up_time}` : (item.follow_up_time ? `Recorded • ${item.follow_up_time}` : "-");
          const rep = item.user_name || item.user?.name || item.lead?.assigned_user_name || "-";
          const isHot = item.lead?.priority === "Hot";
          const avatarNum = ((idx % 4) + 1);

          const rawFollowUpDate = item.follow_up_date || (item.created_at ? item.created_at.slice(0, 10) : "");
          const followUpDateFormatted = rawFollowUpDate
            ? new Date(rawFollowUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "-";
          const nextDueDateFormatted = item.next_follow_up_date
            ? new Date(item.next_follow_up_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : null;

          // Calculate correct tab category
          const isCompleted = (item.status || "").toLowerCase() === "completed";
          const targetDate = item.next_follow_up_date;
          let itemTab = "all";
          if (!isCompleted && targetDate) {
            if (targetDate < todayStr) itemTab = "overdue";
            else if (targetDate === todayStr) itemTab = "today";
            else itemTab = "upcoming";
          } else if (!isCompleted && item.follow_up_date === todayStr) {
            itemTab = "today";
          }

          return {
            id: item.id,
            lead_id: item.lead_id || item.lead?.id || item.lead?.lead_id || item.id,
            customer: custName,
            phone: phone,
            city: city,
            vehicle: vehicle,
            variant: brand,
            outcome: outcome,
            outcomeDesc: desc,
            badgeClass: outcome === "Completed" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning",
            badgeIcon: outcome === "Completed" ? "bi bi-check2-circle" : "bi bi-telephone-outbound",
            is_discount_requested: Boolean(item.is_discount_requested),
            discount_amount: item.discount_amount,
            proposed_price: item.proposed_price,
            rawLead: item.lead,
            rawDueDate: rawDueDate,
            dueTime: dueDate,
            dueSubtext: dueSub,
            rawFollowUpDate: rawFollowUpDate,
            followUpDateFormatted: followUpDateFormatted,
            nextDueDateFormatted: nextDueDateFormatted,
            follow_up_date: item.follow_up_date || "",
            follow_up_time: item.follow_up_time || "",
            next_follow_up_date: item.next_follow_up_date || "",
            next_follow_up_time: item.next_follow_up_time || "",
            created_at: item.created_at || "",
            dateClass: itemTab === "overdue" ? "text-danger" : itemTab === "today" ? "text-warning" : "text-dark",
            rep: rep,
            urgency: isHot ? "High Urgency" : "Medium",
            urgencyClass: isHot ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning",
            urgencyIcon: isHot ? "bi bi-fire" : null,
            followUpsCount: item.follow_ups_count || 1,
            avatar: `/image/avatar-${avatarNum}.svg`,
            tab: itemTab,
          };
        });

        setFollowUpsList(liveItems);
      }
    } catch (err) {
      console.log("Follow-ups fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced fetch on search and filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFollowUps(1, perPage, searchTerm, startDate, endDate, activeTab, recordView);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [startDate, endDate, searchTerm, activeTab, recordView]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchFollowUps(newPage, perPage, searchTerm, startDate, endDate, activeTab, recordView);
  };

  const handlePerPageChange = (newPerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
    fetchFollowUps(1, newPerPage, searchTerm, startDate, endDate, activeTab, recordView);
  };

  // Task 3: Submit with explicit Interaction Date & Interaction Time
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      const now = new Date();
      await axios.post(`${API_URL}/follow-ups`, {
        lead_id: callLog.lead_id || undefined,
        customer_name: callLog.customer,
        phone: callLog.phone,
        follow_up_date: callLog.interaction_date || now.toISOString().split("T")[0],
        follow_up_time: callLog.interaction_time || now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
        type: callLog.type || "Phone Call",
        notes: callLog.notes || "",
        next_follow_up_date: callLog.nextDate || null,
        next_follow_up_time: callLog.nextTime || "10:00 AM",
        status: callLog.outcome,
        lead_status_name: callLog.request_discount ? "Discount Pending" : "In Follow-Up",
        is_discount_requested: Boolean(callLog.request_discount),
        discount_amount: callLog.request_discount && callLog.discount_amount ? Number(callLog.discount_amount) : null,
        proposed_price: callLog.proposed_price ? Number(callLog.proposed_price) : null,
        reason: callLog.discount_reason || callLog.notes || "Customer requested special discount",
      });

      window.dispatchEvent(new Event("csd_approvals_updated"));

      showToast(
        callLog.request_discount
          ? `Follow-up logged & discount request (₹${Number(callLog.discount_amount).toLocaleString("en-IN")}) sent to Sales Manager & Admin!`
          : `Follow-up call interaction logged for ${callLog.customer}!`,
        "success"
      );
      setShowLogModal(false);
      fetchFollowUps(currentPage, perPage, searchTerm, startDate, endDate, activeTab, recordView);
    } catch (err) {
      console.log("Submit error:", err);
      if (callLog.request_discount && callLog.discount_amount) {
        await discountApprovalApi.createDiscountRequest({
          lead_id: callLog.lead_id || Date.now(),
          customer_name: callLog.customer,
          customer_phone: callLog.phone,
          vehicle_name: callLog.vehicle || "Vehicle",
          discount_amount: callLog.discount_amount,
          proposed_price: callLog.proposed_price,
          reason: callLog.discount_reason || callLog.notes || "Customer demanded discount during follow-up call",
        });
        showToast(`Discount approval request sent to Sales Manager & Admin!`, "success");
      } else {
        showToast(`Follow-up call interaction logged for ${callLog.customer}!`, "success");
      }
      setShowLogModal(false);
    }
  };

  // Task 5: Delete single follow-up
  const handleDeleteFollowUp = async (id) => {
    if (!window.confirm("Are you sure you want to delete this follow-up record?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.delete(`${API_URL}/follow-ups/${id}`, { headers });
      if (res.data?.status) {
        showToast("Follow-up interaction deleted successfully!", "success");
        fetchFollowUps(currentPage, perPage, searchTerm, startDate, endDate, activeTab, recordView);
      } else {
        showToast(res.data?.message || "Failed to delete follow-up.", "error");
      }
    } catch (err) {
      console.log("Delete follow-up error:", err);
      showToast("An error occurred while deleting follow-up.", "error");
    }
  };

  // Task 6: Restore soft-deleted follow-up
  const handleRestoreFollowUp = async (id) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${API_URL}/follow-ups/${id}/restore`, {}, { headers });
      if (res.data?.status) {
        showToast("Follow-up interaction restored successfully!", "success");
        fetchFollowUps(currentPage, perPage, searchTerm, startDate, endDate, activeTab, recordView);
      } else {
        showToast(res.data?.message || "Failed to restore follow-up.", "error");
      }
    } catch (err) {
      console.log("Restore follow-up error:", err);
      showToast("An error occurred while restoring follow-up.", "error");
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    setIsDeletingPermanent(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.delete(`${API_URL}/follow-ups/${permanentDeleteTarget.id}/force`, { headers });
      if (res.data?.status) {
        showToast("Follow-up interaction permanently deleted forever.", "success");
        setPermanentDeleteTarget(null);
        fetchFollowUps(currentPage, perPage, searchTerm, startDate, endDate, activeTab, recordView);
      } else {
        showToast(res.data?.message || "Failed to permanently delete follow-up.", "error");
      }
    } catch (err) {
      console.log("Delete follow-up error:", err);
      showToast("An error occurred while permanently deleting follow-up.", "error");
    } finally {
      setIsDeletingPermanent(false);
    }
  };

  // Open & load full customer follow-up interaction history dynamically from backend
  const handleOpenHistory = async (item) => {
    setViewHistoryCustomer({
      ...item,
      allFollowUps: [item],
    });
    setHistoryLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("auth_token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const leadId = item.lead_id;
      let url = `${API_URL}/follow-ups?grouped=false&per_page=all`;
      if (leadId) {
        url += `&lead_id=${leadId}`;
      } else if (item.phone) {
        url += `&search=${encodeURIComponent(item.phone)}`;
      }

      const res = await axios.get(url, { headers });
      const rawData = res.data?.data && Array.isArray(res.data.data) ? res.data.data : [];

      if (rawData.length > 0) {
        const formattedHistory = rawData.map((f, idx) => {
          const rawDate = f.follow_up_date || (f.created_at ? f.created_at.slice(0, 10) : "");
          const formattedDate = rawDate
            ? new Date(rawDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "-";
          const nextFormatted = f.next_follow_up_date
            ? new Date(f.next_follow_up_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : null;
          return {
            id: f.id,
            type: f.type || "Phone Call",
            outcome: f.status || f.type || "Follow-up Logged",
            outcomeDesc: f.notes || "",
            notes: f.notes || "",
            follow_up_date: f.follow_up_date || "",
            follow_up_time: f.follow_up_time || "",
            followUpDateFormatted: formattedDate,
            next_follow_up_date: f.next_follow_up_date || "",
            next_follow_up_time: f.next_follow_up_time || "",
            nextDueDateFormatted: nextFormatted,
            rep: f.user_name || f.user?.name || item.rep || "Representative",
            badgeClass: (f.status || "").toLowerCase() === "completed" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning",
            badgeIcon: (f.status || "").toLowerCase() === "completed" ? "bi bi-check2-circle" : "bi bi-telephone-outbound",
          };
        });

        setViewHistoryCustomer((prev) => ({
          ...prev,
          allFollowUps: formattedHistory,
        }));
      }
    } catch (err) {
      console.log("Error loading customer follow-up history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    axios
      .get(`${API_URL}/leads`)
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setLeadsList(res.data.data);
        }
      })
      .catch(() => { });
  }, []);

  // Real CSV Export Handler (Exports all records respecting filters directly from backend)
  const handleExportCSV = async () => {
    try {
      showToast("Preparing follow-up export...", "info");
      const exportParams = { per_page: 5000, grouped: "false" };
      if (startDate) {
        exportParams.from_date = startDate;
        exportParams.start_date = startDate;
      }
      if (endDate) {
        exportParams.to_date = endDate;
        exportParams.end_date = endDate;
      }
      if (searchTerm && searchTerm.trim()) {
        exportParams.search = searchTerm.trim();
      }
      if (activeTab && activeTab !== "all") {
        exportParams.tab = activeTab;
      }

      const res = await axios.get(`${API_URL}/follow-ups`, { params: exportParams });
      const rawList = res.data?.status && Array.isArray(res.data?.data) ? res.data.data : [];
      if (rawList.length === 0) {
        showToast("No follow-up records found to export.", "warning");
        return;
      }

      const headers = [
        "ID",
        "Customer Name",
        "Phone",
        "City",
        "Vehicle Interested",
        "Brand",
        "Call Outcome",
        "Notes",
        "Follow-up Date",
        "Follow-up Time",
        "Next Action Date",
        "Next Action Time",
        "Assigned Rep",
      ];

      const csvRows = [
        headers.join(","),
        ...rawList.map((item) => {
          const cust = item.lead?.name || item.customer_name || "";
          const phone = item.lead?.phone || item.phone || "";
          const city = item.lead?.city || "";
          const vehicle = item.lead?.model_variant || item.vehicle || "";
          const brand = item.lead?.brand_name || "";
          const outcome = item.status || item.type || "";
          const notes = (item.notes || "").replace(/"/g, '""');
          const rep = item.user_name || item.user?.name || item.lead?.assigned_user_name || "";
          return [
            item.id || "",
            `"${cust.replace(/"/g, '""')}"`,
            `"${phone}"`,
            `"${city.replace(/"/g, '""')}"`,
            `"${vehicle.replace(/"/g, '""')}"`,
            `"${brand.replace(/"/g, '""')}"`,
            `"${outcome.replace(/"/g, '""')}"`,
            `"${notes}"`,
            `"${item.follow_up_date || ""}"`,
            `"${item.follow_up_time || ""}"`,
            `"${item.next_follow_up_date || ""}"`,
            `"${item.next_follow_up_time || ""}"`,
            `"${rep.replace(/"/g, '""')}"`,
          ].join(",");
        }),
      ].join("\n");

      const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `follow_ups_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${rawList.length} follow-up records to CSV!`, "success");

      // Log follow-up export in Activity Logs
      logActivity("Follow-up", "export", {
        count: rawList.length,
        format: "CSV",
      });
    } catch (err) {
      console.log("Export error:", err);
      showToast("Failed to export follow-ups to CSV.", "error");
    }
  };

  // Display live items directly from backend server pagination
  const displayedList = followUpsList;

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
              <li className="breadcrumb-item active">Follow-Ups</li>
            </ul>
            <h1 className="page-title mt-1">Follow-Ups & Call Notes Hub</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2">
            <button
              className={`btn ${recordView === "trash" ? "btn-danger text-white shadow-sm" : "btn-outline-custom"}`}
              onClick={() => {
                const next = recordView === "trash" ? "active" : "trash";
                setRecordView(next);
                setActiveTab("all");
                setCurrentPage(1);
              }}
              title={recordView === "trash" ? "Back to Active Follow-Ups" : "View Deleted Follow-Ups"}
            >
              <i className={`bi ${recordView === "trash" ? "bi-arrow-left" : "bi-trash text-danger"}`}></i>
              <span>{recordView === "trash" ? "Active Follow-Ups" : "Trash"}</span>
            </button>

            {can("followup.export") && (
              <button
                className="btn btn-outline-custom"
                onClick={handleExportCSV}
                title="Download follow-up records as CSV"
              >
                <i className="bi bi-file-earmark-arrow-down"></i>
                <span>Export CSV</span>
              </button>
            )}
            {can("followup.log_call") && recordView === "active" && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedLead(null);
                  setCallLog({
                    lead_id: null,
                    customer: "",
                    phone: "",
                    vehicle: "",
                    outcome: "Interested / Call Back",
                    interaction_date: getTodayDate(),
                    interaction_time: getCurrentTimeFormatted(),
                    nextDate: "",
                    type: "Phone Call",
                    nextTime: "10:00 AM",
                    notes: "",
                    request_discount: false,
                    discount_amount: "",
                    proposed_price: "",
                    discount_reason: "",
                  });
                  setIsCustomerLocked(false);
                  setShowLogModal(true);
                }}
              >
                <i className="bi bi-telephone-plus-fill"></i>
                <span>Log Follow-Up Call</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div
              className={`card stat-card ${activeTab === "all" ? "border-success shadow-sm ring-1" : ""}`}
              style={{ borderLeft: "4px solid #22c55e", cursor: "pointer" }}
              onClick={() => {
                if (activeTab !== "all") {
                  setActiveTab("all");
                  setCurrentPage(1);
                }
              }}
              title="Click to view All Follow-Ups"
            >
              <div className="stat-card-header">
                <span className="stat-card-title">Total Follow-Ups</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-check2-all"></i>
                </div>
              </div>
              <div className="stat-card-value">{kpis.total ?? 0} Calls</div>
              <span className="text-success small fw-semibold">Active follow-up interactions</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div
              className={`card stat-card ${activeTab === "overdue" ? "border-danger shadow-sm ring-1" : ""}`}
              style={{ borderLeft: "4px solid #ef4444", cursor: "pointer" }}
              onClick={() => {
                if (activeTab !== "overdue") {
                  setActiveTab("overdue");
                  setCurrentPage(1);
                }
              }}
              title="Click to view Overdue Calls"
            >
              <div className="stat-card-header">
                <span className="stat-card-title">Overdue Calls</span>
                <div className="stat-icon-box danger">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{kpis.overdue ?? 0} Overdue</div>
              <span className="text-danger small fw-semibold">Action required urgently</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div
              className={`card stat-card ${activeTab === "today" ? "border-warning shadow-sm ring-1" : ""}`}
              style={{ borderLeft: "4px solid #fb923c", cursor: "pointer" }}
              onClick={() => {
                if (activeTab !== "today") {
                  setActiveTab("today");
                  setCurrentPage(1);
                }
              }}
              title="Click to view Calls Scheduled for Today"
            >
              <div className="stat-card-header">
                <span className="stat-card-title">Due Today</span>
                <div className="stat-icon-box warning">
                  <i className="bi bi-calendar-check-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{kpis.due_today ?? 0} Calls</div>
              <span className="text-warning small fw-semibold">Scheduled for today</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div
              className={`card stat-card ${activeTab === "upcoming" ? "border-info shadow-sm ring-1" : ""}`}
              style={{ borderLeft: "4px solid #38bdf8", cursor: "pointer" }}
              onClick={() => {
                if (activeTab !== "upcoming") {
                  setActiveTab("upcoming");
                  setCurrentPage(1);
                }
              }}
              title="Click to view Upcoming Calls"
            >
              <div className="stat-card-header">
                <span className="stat-card-title">Upcoming (7 Days)</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-clock-history"></i>
                </div>
              </div>
              <div className="stat-card-value">{kpis.upcoming ?? 0} Calls</div>
              <span className="text-info small fw-semibold">Pipeline nurturing</span>
            </div>
          </div>
        </div>

        {/* Tab Selector & Filter Card */}
        <div className="card mb-4">
          <div className="card-body py-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              {/* Tab Pills */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {[
                  { id: "all", label: "All Follow-ups", count: kpis.total ?? 0 },
                  { id: "overdue", label: "Overdue", count: kpis.overdue ?? 0 },
                  { id: "today", label: "Due Today", count: kpis.due_today ?? 0 },
                  { id: "upcoming", label: "Upcoming", count: kpis.upcoming ?? 0 },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`btn btn-sm px-3 py-1.5 rounded-pill fw-medium ${isActive ? "btn-primary shadow-sm" : "btn-outline-custom"
                        }`}
                      style={{
                        borderColor: isActive ? "var(--primary)" : "#e2e8f0",
                        gap: "6px",
                        fontSize: "0.82rem",
                      }}
                      onClick={() => {
                        if (activeTab !== tab.id) {
                          setActiveTab(tab.id);
                          setCurrentPage(1);
                        }
                      }}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`badge px-2 py-0.5 rounded-pill ${isActive
                          ? "bg-white text-dark fw-bold"
                          : "bg-light text-secondary border"
                          }`}
                        style={{ fontSize: "0.72rem" }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Filter Controls: Outcome Filter + Date Range (Start & End) + Search */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {/* Call Outcome Filter */}
                <div className="input-group input-group-sm" style={{ width: "190px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="Call Outcome">
                    <i className="bi bi-funnel me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>Outcome</span>
                  </span>
                  <select
                    className="form-select form-select-sm px-1"
                    value={outcomeFilter}
                    onChange={(e) => setOutcomeFilter(e.target.value)}
                  >
                    <option value="">All Outcomes</option>
                    <option value="Interested / Call Back">Interested / Call Back</option>
                    <option value="Quotation Requested">Quotation Requested</option>
                    <option value="Negotiation / Price Discussion">Negotiation / Price Discussion</option>
                    <option value="Not Reachable / Busy">Not Reachable / Busy</option>
                    <option value="Lost to Competitor / Lost of Lead">Lost to Competitor / Lost of Lead</option>
                    <option value="Deal Won / Booking">Deal Won / Booking</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="input-group input-group-sm" style={{ width: "165px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="Start Date">
                    <i className="bi bi-calendar-event me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>From</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    title="Filter from start date"
                  />
                </div>

                {/* End Date */}
                <div className="input-group input-group-sm" style={{ width: "160px" }}>
                  <span className="input-group-text bg-light text-muted px-2" title="End Date">
                    <i className="bi bi-calendar-check me-1"></i>
                    <span style={{ fontSize: "11px", fontWeight: "600" }}>To</span>
                  </span>
                  <input
                    type="date"
                    className="form-control form-control-sm px-1"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    title="Filter to end date"
                  />
                </div>

                {/* Clear Filter Button */}
                {(startDate || endDate || outcomeFilter || searchTerm) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-2 d-flex align-items-center gap-1"
                    style={{ fontSize: "0.8rem", height: "31px" }}
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setOutcomeFilter("");
                      setSearchTerm("");
                    }}
                    title="Clear All Filters"
                  >
                    <i className="bi bi-x-circle"></i>
                    <span>Reset</span>
                  </button>
                )}

                {/* Search Box */}
                <div className="input-group input-group-sm" style={{ width: "190px" }}>
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search follow-ups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setSearchTerm("")}
                      title="Clear Search"
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Follow-Ups List Table */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Follow-Up Schedule & Call Tracker</h5>
            <span className="text-muted small">Real-time interaction queue</span>
          </div>

          <div className="table-responsive">
            <table className="table table-custom align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: "50px" }} className="text-center">No</th>
                  <th style={{ width: "65px" }} className="text-center">Action</th>
                  <th>Customer & Contact</th>
                  <th>Vehicle Interested</th>
                  <th>Last Call Outcome</th>
                  <th>Follow-up Date</th>
                  <th>Assigned Rep & Urgency</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      <span className="text-muted small">Loading follow-ups...</span>
                    </td>
                  </tr>
                ) : displayedList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-3 d-block mb-2 text-secondary"></i>
                      No follow-up records found for this filter.
                    </td>
                  </tr>
                ) : (
                  displayedList.map((item, index) => (
                    <tr key={item.id}>
                      <td className="text-center">
                        <span className="text-muted small fw-semibold">
                          {(currentPage - 1) * perPage + index + 1}
                        </span>
                      </td>
                      {/* 1. Action Column with 3-Dots Dropdown Menu or Restore Button */}
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        {recordView === "trash" ? (
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 px-2.5 py-1 fw-bold rounded-pill shadow-xs"
                              onClick={() => handleRestoreFollowUp(item.id)}
                              title="Restore this deleted follow-up"
                            >
                              <i className="bi bi-arrow-counterclockwise"></i>
                              <span>Restore</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 px-2.5 py-1 fw-bold rounded-pill shadow-xs"
                              onClick={() => setPermanentDeleteTarget(item)}
                              title="Permanently delete this follow-up forever"
                            >
                              <i className="bi bi-trash3"></i>
                              <span>Delete</span>
                            </button>
                          </div>
                        ) : (
                          <div className="dropdown position-relative d-inline-block">
                            <button
                              type="button"
                              className="btn btn-sm btn-light border rounded-circle shadow-none p-0 d-inline-flex align-items-center justify-content-center"
                              style={{ width: "32px", height: "32px", cursor: "pointer" }}
                              title="Quick Actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id);
                              }}
                            >
                              <i className="bi bi-three-dots-vertical fs-6 text-dark"></i>
                            </button>

                            {activeActionMenuId === item.id && (
                              <div
                                className="dropdown-menu show shadow-lg border rounded-3 p-1 position-absolute start-0 text-start"
                                style={{
                                  minWidth: "210px",
                                  zIndex: 1050,
                                  top: "100%",
                                  backgroundColor: "#FFFFFF",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* View Follow-Up History */}
                                <button
                                  type="button"
                                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-dark"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    handleOpenHistory(item);
                                  }}
                                >
                                  <i className="bi bi-clock-history text-info"></i>
                                  <span>View History ({item.followUpsCount || 1})</span>
                                </button>

                                {/* Call Now / Log Call */}
                                {can("followup.call_now") && (
                                  <button
                                    type="button"
                                    className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2 fw-semibold text-primary"
                                    style={{ backgroundColor: "rgba(13, 110, 253, 0.08)" }}
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setSelectedLead(item.customer);
                                      const existingDisc = item.lead_id ? discountApprovalApi.getLeadApprovalStatus(item.lead_id) : null;
                                      setCallLog({
                                        lead_id: item.lead_id || item.id,
                                        customer: item.customer,
                                        phone: item.phone,
                                        vehicle: item.vehicle,
                                        outcome: item.outcome || "Interested / Call Back",
                                        interaction_date: getTodayDate(),
                                        interaction_time: getCurrentTimeFormatted(),
                                        nextDate: item.dueTime && /^\d{4}-\d{2}-\d{2}$/.test(item.dueTime) ? item.dueTime : "",
                                        type: "Phone Call",
                                        nextTime: "10:00 AM",
                                        notes: "",
                                        request_discount: existingDisc && existingDisc.status === "pending" ? true : false,
                                        discount_amount: existingDisc ? String(existingDisc.discount_amount || "") : "",
                                        proposed_price: existingDisc ? String(existingDisc.proposed_price || "") : "",
                                        discount_reason: existingDisc ? existingDisc.reason || "" : "",
                                      });
                                      setIsCustomerLocked(true);
                                      setShowLogModal(true);
                                    }}
                                  >
                                    <i className="bi bi-telephone-fill text-primary"></i>
                                    <span>Call Now / Log</span>
                                  </button>
                                )}

                                {/* Send Quotation */}
                                {can("followup.send_quotation") && (
                                  <Link
                                    href={item.lead_id ? `/admin/quotation/create?lead_id=${item.lead_id}` : `/admin/quotation`}
                                    className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-dark text-decoration-none"
                                    onClick={() => setActiveActionMenuId(null)}
                                  >
                                    <i className="bi bi-file-earmark-spreadsheet text-success"></i>
                                    <span>Send Quotation</span>
                                  </Link>
                                )}

                                {/* View Lead 360 Profile */}
                                {(item.lead_id || item.id) && (
                                  <Link
                                    href={getLeadProfileHref(item.lead_id || item.id)}
                                    className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-dark text-decoration-none"
                                    onClick={() => setActiveActionMenuId(null)}
                                  >
                                    <i className="bi bi-person-lines-fill text-info"></i>
                                    <span>View Lead Profile</span>
                                  </Link>
                                )}

                                {/* Task 5: Delete Follow-Up */}
                                <hr className="dropdown-divider my-1" />
                                <button
                                  type="button"
                                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 small text-danger"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    handleDeleteFollowUp(item.id);
                                  }}
                                >
                                  <i className="bi bi-trash3-fill text-danger"></i>
                                  <span>Delete Follow-Up</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 2. Customer & Contact */}
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <img
                            src={item.avatar}
                            alt={item.customer}
                            style={{ width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0 }}
                          />
                          <div>
                            <div className="d-flex align-items-center gap-1">
                              {item.lead_id || item.id ? (
                                <Link
                                  href={getLeadProfileHref(item.lead_id || item.id)}
                                  className="text-decoration-none"
                                  title="View Lead Details"
                                >
                                  <span className="text-primary fw-bold small" style={{ cursor: "pointer" }}>
                                    {item.customer}
                                  </span>
                                </Link>
                              ) : (
                                <span className="text-dark fw-bold small">{item.customer}</span>
                              )}
                              {item.followUpsCount > 0 && (
                                <span
                                  className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill ms-1"
                                  style={{ cursor: "pointer", fontSize: "10px", padding: "2px 6px" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenHistory(item);
                                  }}
                                  title="Click to view all interactions for this customer"
                                >
                                  <i className="bi bi-clock-history me-1"></i>{item.followUpsCount} Calls
                                </span>
                              )}
                            </div>
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                              {item.phone}{item.city ? ` • ${item.city}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Vehicle Interested */}
                      <td>
                        <span className="text-dark fw-semibold small">{item.vehicle}</span>
                        {item.variant ? (
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {item.variant}
                          </div>
                        ) : null}
                      </td>

                      {/* 4. Last Call Outcome */}
                      <td>
                        <span className={`badge ${item.badgeClass} small`}>
                          <i className={`${item.badgeIcon || "bi bi-telephone-outbound"} me-1`}></i>
                          {item.outcome}
                        </span>
                        {/* Discount Status Badge */}
                        {(() => {
                          const discInfo = getFollowUpDiscountInfo(item);
                          if (!discInfo) return null;
                          if (discInfo.status === "pending") {
                            return (
                              <div className="mt-1">
                                <span
                                  className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle fw-bold"
                                  style={{ fontSize: "10px", padding: "3px 7px" }}
                                  title={`Discount ₹${discInfo.amount.toLocaleString("en-IN")} pending approval`}
                                >
                                  <i className="bi bi-hourglass-split me-1 text-warning"></i>
                                  Disc: ₹{discInfo.amount.toLocaleString("en-IN")} (Pending)
                                </span>
                              </div>
                            );
                          }
                          if (discInfo.status === "approved") {
                            return (
                              <div className="mt-1">
                                <span
                                  className="badge bg-success text-white fw-bold"
                                  style={{ fontSize: "10px", padding: "3px 7px" }}
                                  title={`Discount ₹${discInfo.amount.toLocaleString("en-IN")} Approved`}
                                >
                                  <i className="bi bi-patch-check-fill me-1"></i>
                                  Disc: ₹{discInfo.amount.toLocaleString("en-IN")} (Approved)
                                </span>
                              </div>
                            );
                          }
                          if (discInfo.status === "rejected") {
                            return (
                              <div className="mt-1">
                                <span
                                  className="badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold"
                                  style={{ fontSize: "10px", padding: "3px 7px" }}
                                  title="Discount request was rejected"
                                >
                                  <i className="bi bi-x-circle-fill me-1"></i>
                                  Disc. Rejected
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div className="text-muted small mt-1 text-truncate" style={{ fontSize: "0.75rem", maxWidth: "220px" }} title={item.outcomeDesc}>
                          {item.outcomeDesc}
                        </div>
                      </td>

                      {/* 5. Follow-up / Created Date and Scheduled Next Due */}
                      <td>
                        <div className="text-dark fw-bold small d-flex align-items-center gap-1">
                          <i className="bi bi-calendar-check text-primary"></i>
                          <span>{item.followUpDateFormatted}</span>
                        </div>
                        {item.follow_up_time && (
                          <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                            <i className="bi bi-clock me-1"></i>
                            {item.follow_up_time}
                          </div>
                        )}
                        {item.nextDueDateFormatted && (
                          <div className="text-warning-emphasis small mt-1" style={{ fontSize: "0.72rem" }}>
                            <i className="bi bi-alarm-fill text-warning me-1"></i>
                            Next: <strong>{item.nextDueDateFormatted}</strong> {item.next_follow_up_time || ""}
                          </div>
                        )}
                      </td>

                      {/* 6. Assigned Rep & Urgency (Combined to eliminate horizontal scrolling) */}
                      <td>
                        <div className="d-flex flex-column align-items-start gap-1">
                          <span className="text-dark fw-semibold small">{item.rep}</span>
                          <span className={`badge ${item.urgencyClass} px-2 py-1 rounded-pill small`} style={{ fontSize: "11px" }}>
                            {item.urgencyIcon && <i className={`${item.urgencyIcon} me-1`}></i>}
                            {item.urgency}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls following backend contract */}
          {!loading && (pagination.total > 0 || displayedList.length > 0) && (
            <Pagination
              currentPage={pagination.current_page || currentPage}
              lastPage={pagination.last_page || 1}
              total={pagination.total || displayedList.length}
              perPage={pagination.per_page || perPage}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
              perPageOptions={[10, 20, 50, 100]}
              itemName="follow-ups"
            />
          )}
        </div>

        {/* Log Call Modal */}
        {showLogModal && (
          <div className="modal-backdrop-custom">
            <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold" style={{ color: "#FFFFFF" }}>
                  <i className="bi bi-telephone-outbound-fill text-primary"></i> Log Call Interaction
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowLogModal(false)}
                ></button>
              </div>

              <form onSubmit={handleLogSubmit}>
                <div className="modal-body-custom">
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <label className="form-label text-dark fw-semibold small mb-0">
                          Choose Existing Customer Lead (Optional)
                        </label>
                        {isCustomerLocked && (
                          <span className="badge bg-secondary-subtle text-dark border small" style={{ fontSize: "11px" }}>
                            <i className="bi bi-lock-fill text-primary me-1"></i>
                            Locked to Current Customer Lead
                          </span>
                        )}
                      </div>
                      <select
                        className="form-select"
                        value={callLog.lead_id || ""}
                        disabled={isCustomerLocked}
                        onChange={(e) => {
                          const lid = e.target.value;
                          const selected = leadsList.find((l) => String(l.id) === String(lid));
                          if (selected) {
                            setCallLog({
                              ...callLog,
                              lead_id: selected.id,
                              customer: selected.name,
                              phone: selected.phone,
                              vehicle: selected.model_variant || "",
                            });
                          } else {
                            setCallLog({ ...callLog, lead_id: null });
                          }
                        }}
                      >
                        <option value="">-- Choose Existing Lead to Auto-fill --</option>
                        {leadsList.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.phone}) - {l.model_variant || "General Inquiry"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Customer Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={callLog.customer}
                        readOnly={isCustomerLocked}
                        onChange={(e) => setCallLog({ ...callLog, customer: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={callLog.phone}
                        readOnly={isCustomerLocked}
                        onChange={(e) => setCallLog({ ...callLog, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Interaction Type</label>
                      <select
                        className="form-select"
                        value={callLog.type}
                        onChange={(e) => setCallLog({ ...callLog, type: e.target.value })}
                      >
                        <option value="Phone Call">Phone Call</option>
                        <option value="Showroom Visit">Showroom Visit</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Email">Email</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Call Outcome</label>
                      <select
                        className="form-select"
                        value={callLog.outcome}
                        onChange={(e) => setCallLog({ ...callLog, outcome: e.target.value })}
                      >
                        <option value="Interested / Call Back">Interested / Call Back</option>
                        <option value="Quotation Requested">Quotation Requested</option>
                        <option value="Negotiation / Price Discussion">Negotiation / Price Discussion</option>
                        <option value="Not Reachable / Busy">Not Reachable / Busy</option>
                        <option value="Lost to Competitor / Lost of Lead">Lost to Competitor / Lost of Lead</option>
                        <option value="Deal Won / Booking">Deal Won / Booking</option>
                      </select>
                    </div>

                    {/* Task 3: Interaction Date and Interaction Time defaulting to current */}
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">
                        Interaction Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={callLog.interaction_date}
                        onChange={(e) => setCallLog({ ...callLog, interaction_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">
                        Interaction Time <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 02:30 PM"
                        value={callLog.interaction_time}
                        onChange={(e) => setCallLog({ ...callLog, interaction_time: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Next Action Date</label>
                      <input
                        type="date"
                        className="form-control"
                        min={getTodayDate()}
                        onClick={(e) => {
                          try {
                            e.target.showPicker?.();
                          } catch (err) { }
                        }}
                        value={callLog.nextDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          const today = getTodayDate();
                          if (val && val < today) {
                            setCallLog({ ...callLog, nextDate: today });
                            return;
                          }
                          setCallLog({ ...callLog, nextDate: val });
                        }}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Next Action Time</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 10:00 AM"
                        value={callLog.nextTime}
                        onChange={(e) => setCallLog({ ...callLog, nextTime: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark fw-semibold small">Call Notes & Conversation Summary</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Detail customer reaction, discount discussed, accessories requested, or loan requirements..."
                        value={callLog.notes}
                        onChange={(e) => setCallLog({ ...callLog, notes: e.target.value })}
                      ></textarea>
                    </div>

                    {/* Customer Demanded Discount Switch & Fields */}
                    <div className="col-12">
                      <div className="p-3 rounded-3 border" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                        <div className="form-check form-switch d-flex align-items-center justify-content-between p-0 m-0">
                          <label className="form-check-label fw-bold text-dark d-flex align-items-center gap-2 mb-0" htmlFor="followUpReqDiscountSwitch" style={{ cursor: "pointer" }}>
                            <i className="bi bi-tag-fill text-danger"></i>
                            <span>Customer Demanded Discount? (Send to Sales Manager & Admin for Approval)</span>
                          </label>
                          <input
                            className="form-check-input ms-3"
                            type="checkbox"
                            role="switch"
                            id="followUpReqDiscountSwitch"
                            style={{ width: "2.6rem", height: "1.3rem", cursor: "pointer" }}
                            checked={callLog.request_discount}
                            onChange={(e) => setCallLog({ ...callLog, request_discount: e.target.checked })}
                          />
                        </div>

                        {callLog.request_discount && (
                          <div className="mt-3 pt-3 border-top">
                            <div className="row g-3">
                              <div className="col-12">
                                <label className="form-label text-dark fw-semibold small">
                                  Requested Discount Amount (₹) <span className="text-danger">*</span>
                                </label>
                                <div className="input-group">
                                  <span className="input-group-text bg-white fw-bold">₹</span>
                                  <input
                                    type="number"
                                    className="form-control"
                                    placeholder="e.g. 25000"
                                    value={callLog.discount_amount}
                                    onChange={(e) => setCallLog({ ...callLog, discount_amount: e.target.value })}
                                    required={callLog.request_discount}
                                  />
                                </div>
                              </div>
                              <div className="col-12">
                                <label className="form-label text-dark fw-semibold small">Discount Reason / Justification</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="e.g. Customer ready to pay token advance today if 25k discount approved"
                                  value={callLog.discount_reason}
                                  onChange={(e) => setCallLog({ ...callLog, discount_reason: e.target.value })}
                                />
                                <div className="form-text small text-muted mt-1">
                                  <i className="bi bi-info-circle me-1 text-primary"></i>
                                  Request status will default to <strong>Pending</strong> and appear on both Super Admin and Sales Manager Dashboards for approval.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer-custom">
                  <button type="button" className="btn btn-outline-custom" onClick={() => setShowLogModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-check-circle me-1"></i> Save Interaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Task 4: Customer Follow-Up History Modal */}
        {viewHistoryCustomer && (
          <div className="modal-backdrop-custom">
            <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold">
                    <i className="bi bi-clock-history text-info me-2"></i>
                    Follow-Up History: {viewHistoryCustomer.customer}
                  </h5>
                  <div className="text-white-50 small mt-1">
                    {viewHistoryCustomer.phone} {viewHistoryCustomer.vehicle ? ` • ${viewHistoryCustomer.vehicle}` : ""}
                    <span className="badge bg-light text-dark ms-2">{viewHistoryCustomer.allFollowUps?.length || 1} Interactions Logged</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setViewHistoryCustomer(null)}
                ></button>
              </div>

              <div className="modal-body-custom p-3" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {historyLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                    <span className="text-muted small">Loading complete interaction history...</span>
                  </div>
                ) : (
                  <div className="timeline-custom">
                    {(viewHistoryCustomer.allFollowUps || []).map((follow, idx) => (
                    <div key={follow.id || idx} className="card mb-3 border shadow-xs rounded-3">
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-primary text-white rounded-pill px-2 py-1" style={{ fontSize: "11px" }}>
                              #{(viewHistoryCustomer.allFollowUps?.length || 1) - idx}
                            </span>
                            <span className={`badge ${follow.badgeClass || "bg-info-subtle text-info"} px-2.5 py-1 rounded-pill small fw-bold`}>
                              <i className={`${follow.badgeIcon || "bi bi-telephone-outbound"} me-1`}></i>
                              {follow.outcome}
                            </span>
                            <span className="badge bg-light text-secondary border px-2 py-1 small">
                              {follow.type || "Phone Call"}
                            </span>
                          </div>
                          <div className="text-muted small d-flex align-items-center gap-2">
                            <span>
                              <i className="bi bi-calendar-check me-1 text-primary"></i>
                              <strong>{follow.followUpDateFormatted || follow.follow_up_date || "-"}</strong>
                            </span>
                            {follow.follow_up_time && (
                              <span>
                                <i className="bi bi-clock me-1 text-secondary"></i>
                                {follow.follow_up_time}
                              </span>
                            )}
                            {recordView === "active" && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger p-0 px-1 border-0"
                                title="Delete this interaction"
                                onClick={async () => {
                                  await handleDeleteFollowUp(follow.id);
                                  setViewHistoryCustomer(null);
                                }}
                              >
                                <i className="bi bi-trash3"></i>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-light border-start border-3 border-primary mb-2 text-dark small" style={{ whiteSpace: "pre-wrap" }}>
                          {follow.outcomeDesc || follow.notes || "No call notes recorded for this interaction."}
                        </div>

                        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap small text-muted pt-1">
                          <div>
                            {follow.nextDueDateFormatted || follow.next_follow_up_date ? (
                              <span className="text-warning-emphasis fw-semibold">
                                <i className="bi bi-alarm-fill text-warning me-1"></i>
                                Next Follow-Up: <strong>{follow.nextDueDateFormatted || follow.next_follow_up_date}</strong> {follow.next_follow_up_time || ""}
                              </span>
                            ) : (
                              <span>No next follow-up scheduled</span>
                            )}
                          </div>
                          <div className="text-dark fw-semibold">
                            <i className="bi bi-person-check me-1 text-primary"></i>
                            {follow.rep || "Representative"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>

              <div className="modal-footer-custom d-flex justify-content-between">
                <div>
                  {viewHistoryCustomer.lead_id && (
                    <Link
                      href={getLeadProfileHref(viewHistoryCustomer.lead_id)}
                      className="btn btn-sm btn-outline-primary"
                    >
                      <i className="bi bi-person-lines-fill me-1"></i> View Full Lead Profile
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary px-4"
                  onClick={() => setViewHistoryCustomer(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sweet Alert Confirmation Modal for Permanent Delete */}
        {permanentDeleteTarget && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", zIndex: 1080 }}
            onClick={() => !isDeletingPermanent && setPermanentDeleteTarget(null)}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              style={{ maxWidth: "420px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                <div className="modal-body p-4 text-center">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-xs"
                    style={{ width: "64px", height: "64px", background: "#FEE2E2", color: "#DC2626" }}
                  >
                    <i className="bi bi-exclamation-triangle-fill fs-2"></i>
                  </div>
                  <h5 className="modal-title fw-bold text-dark mb-2">Delete Permanently?</h5>
                  <p className="text-muted small mb-0 px-2" style={{ lineHeight: "1.5" }}>
                    Are you sure you want to permanently delete this follow-up record for <strong>&quot;{permanentDeleteTarget.customer || "this customer"}&quot;</strong>? This record will be deleted forever and <strong>cannot be restored</strong>.
                  </p>
                </div>
                <div className="modal-footer border-0 p-3 bg-light d-flex gap-2 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3 py-1.5 rounded-pill fw-medium"
                    onClick={() => setPermanentDeleteTarget(null)}
                    disabled={isDeletingPermanent}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger px-4 py-1.5 rounded-pill fw-semibold shadow-sm"
                    onClick={handlePermanentDelete}
                    disabled={isDeletingPermanent}
                  >
                    {isDeletingPermanent ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash3-fill me-1"></i>
                        <span>Yes, Delete Forever</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
