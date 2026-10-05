"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { usePathname } from "next/navigation";
import AdminLayout from "@/app/components/AdminLayout";
import { useToast } from "@/app/components/Toast";
import { hasPermission, hasRole } from "@/utils/auth";
import LeadImportModal from "./LeadImportModal";
import ConvertDealModal from "./ConvertDealModal";
import { getConvertedLeadIds } from "@/services/dealApi";

export default function LeadsPage() {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const user = localStorage.getItem("user");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) setCurrentUser(JSON.parse(user));
  }, []);
  const can = (permission) => hasPermission(permission, currentUser);
  const isSalesManager =
    hasRole(["sales_manager", "manager"], currentUser) ||
    (typeof pathname === "string" && pathname.startsWith("/sales-manager"));

  // API Base URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  // 1. Component States
  const [leads, setLeads] = useState([]);
  const [brands, setBrands] = useState([]);
  const [sources, setSources] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Convert Deal State & Three dots menu state
  const [convertDealTarget, setConvertDealTarget] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [convertedLeadIds, setConvertedLeadIds] = useState([]);

  // Selection & Bulk Action States
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignUser, setBulkAssignUser] = useState("");
  const [bulkAssignRemarks, setBulkAssignRemarks] = useState("");
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);
  const [openPriorityDropdown, setOpenPriorityDropdown] = useState(false);

  // Assignment History State for View Modal
  const [leadAssignmentHistory, setLeadAssignmentHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewLead, setViewLead] = useState(null);
  const [editLead, setEditLead] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Follow-Up Interaction Modal States
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState(null);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [leadFollowUpHistory, setLeadFollowUpHistory] = useState([]);
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);

  const [followUpForm, setFollowUpForm] = useState({
    customer: "",
    phone: "",
    outcome: "Interested / Call Back",
    type: "Phone Call",
    follow_up_date: new Date().toISOString().split("T")[0],
    follow_up_time: "02:30 PM",
    next_follow_up_date: "",
    next_follow_up_time: "10:00 AM",
    notes: "",
  });

  // Form State for Adding New Lead (matches user screenshot)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    birth_date: "",
    anniversary_date: "",
    vehicle_segment: "4 Wheeler", // "2 Wheeler" or "4 Wheeler"
    brand_id: "",
    model_variant: "",
    priority: "Hot", // "Hot", "Warm", "Cold"
    purchase_timeline: "Immediate (Within 7 Days)",
    budget: "",
    source_id: "",
    status_id: "",
    assigned_user_name: "David Miller (Sales Executive)",
  });
  const [isTriggeringWishes, setIsTriggeringWishes] = useState(false);

  // 2. Fetch Leads & Master Dropdowns from Laravel backend
  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/leads`);
      if (response.data && response.data.status) {
        setLeads(response.data.data);
      }
    } catch (error) {
      console.log("Error fetching leads:", error);
      showToast("Unable to fetch leads from API.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [brandRes, sourceRes, statusRes, userRes] = await Promise.all([
        axios.get(`${API_URL}/brands`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_URL}/lead-sources`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_URL}/lead-statuses`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_URL}/users`).catch(() => ({ data: { data: [] } })),
      ]);

      if (brandRes.data?.data) setBrands(brandRes.data.data);
      if (sourceRes.data?.data) setSources(sourceRes.data.data);
      if (statusRes.data?.data) setStatuses(statusRes.data.data);
      if (userRes.data?.data) setUsersList(userRes.data.data);
    } catch (error) {
      console.log("Error fetching master dropdowns:", error);
    }
  };

  // Run on page mount
  useEffect(() => {
    // The fetch helpers update component state after the API response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeads();
    fetchMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Create (Store) Lead
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Please enter customer name.", "error");
      return;
    }
    if (!formData.phone.trim()) {
      showToast("Please enter phone number.", "error");
      return;
    }
    if (!formData.model_variant.trim()) {
      showToast("Please enter desired variant/model.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/leads`, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        birth_date: formData.birth_date || null,
        anniversary_date: formData.anniversary_date || null,
        vehicle_segment: formData.vehicle_segment,
        brand_id: formData.brand_id || null,
        model_variant: formData.model_variant.trim(),
        priority: formData.priority,
        purchase_timeline: formData.purchase_timeline,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        total_deal_amount: formData.budget ? parseFloat(formData.budget) : null,
        source_id: formData.source_id || null,
        status_id: formData.status_id || null,
        assigned_user_name: formData.assigned_user_name,
      });

      if (response.data && response.data.status) {
        showToast(`Lead created for "${formData.name}"!`, "success");
        setFormData({
          name: "",
          email: "",
          phone: "",
          city: "",
          state: "",
          birth_date: "",
          anniversary_date: "",
          vehicle_segment: "4 Wheeler",
          brand_id: "",
          model_variant: "",
          priority: "Hot",
          purchase_timeline: "Immediate (Within 7 Days)",
          source_id: "",
          status_id: "",
          assigned_user_name: "David Miller (Sales Executive)",
        });
        setShowAddModal(false);
        fetchLeads(); // Refresh list
      }
    } catch (error) {
      console.log("Create Error:", error);
      const msg = error.response?.data?.message || "Failed to create customer lead.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Update (Edit) Lead
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editLead.name.trim()) {
      showToast("Please enter customer name.", "error");
      return;
    }
    if (!editLead.phone.trim()) {
      showToast("Please enter phone number.", "error");
      return;
    }
    if (!editLead.model_variant.trim()) {
      showToast("Please enter desired variant/model.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.put(`${API_URL}/leads/${editLead.id}`, {
        name: editLead.name.trim(),
        email: editLead.email ? editLead.email.trim() : "",
        phone: editLead.phone.trim(),
        city: editLead.city ? editLead.city.trim() : "",
        state: editLead.state ? editLead.state.trim() : "",
        birth_date: editLead.birth_date || null,
        anniversary_date: editLead.anniversary_date || null,
        vehicle_segment: editLead.vehicle_segment || "4 Wheeler",
        brand_id: editLead.brand_id || null,
        model_variant: editLead.model_variant.trim(),
        priority: editLead.priority || "Hot",
        purchase_timeline: editLead.purchase_timeline,
        budget: editLead.budget || null,
        source_id: editLead.source_id || null,
        status_id: editLead.status_id || null,
        assigned_user_name: editLead.assigned_user_name,
      });

      if (response.data && response.data.status) {
        showToast(`Lead for "${editLead.name}" updated!`, "success");
        setEditLead(null);
        fetchLeads(); // Refresh list
      }
    } catch (error) {
      console.log("Update Error:", error);
      const msg = error.response?.data?.message || "Failed to update lead.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete Lead
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;

    try {
      const response = await axios.delete(`${API_URL}/leads/${deleteTarget.id}`);
      if (response.data && response.data.status) {
        showToast(`Lead record for "${deleteTarget.name}" deleted!`, "success");
        setDeleteTarget(null);
        fetchLeads(); // Refresh list
      }
    } catch (error) {
      console.log("Delete Error:", error);
      const msg = error.response?.data?.message || "Failed to delete lead.";
      showToast(msg, "error");
    }
  };

  // 6. Trigger Birthday & Anniversary Greetings Automation on Demand
  const handleTriggerGreetings = async () => {
    setIsTriggeringWishes(true);
    try {
      showToast("Running Birthday & Anniversary wishes automation...", "info");
      let res;
      try {
        res = await axios.get(`${API_URL}/leads/send-greetings-now`);
      } catch {
        res = await axios.post(`${API_URL}/leads/send-greetings-now`);
      }
      if (res.data && res.data.status) {
        showToast(res.data.message || "Greetings sent successfully!", "success");
        fetchLeads();
      }
    } catch (err) {
      console.error("Trigger greetings error:", err);
      showToast(err.response?.data?.message || "Failed to trigger greetings.", "error");
    } finally {
      setIsTriggeringWishes(false);
    }
  };

  // Sync converted lead IDs and close action menu on outside click
  useEffect(() => {
    setConvertedLeadIds(getConvertedLeadIds());
    const handleConv = () => setConvertedLeadIds(getConvertedLeadIds());
    window.addEventListener("csd_leads_converted_updated", handleConv);
    return () => window.removeEventListener("csd_leads_converted_updated", handleConv);
  }, []);

  useEffect(() => {
    const handleOutsideClick = () => setActiveActionMenuId(null);
    if (activeActionMenuId) {
      window.addEventListener("click", handleOutsideClick);
      return () => window.removeEventListener("click", handleOutsideClick);
    }
  }, [activeActionMenuId]);

  // Filter leads based on user selection (excluding converted deals)
  const filteredLeads = leads.filter((item) => {
    if (convertedLeadIds.some((cid) => String(cid) === String(item.id))) {
      return false;
    }

    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model_variant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.city?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = !priorityFilter || item.priority === priorityFilter;
    const matchesSegment = !segmentFilter || item.vehicle_segment === segmentFilter;
    const matchesStatus = !statusFilter || item.status_name === statusFilter;

    return matchesSearch && matchesPriority && matchesSegment && matchesStatus;
  });

  // Selection calculations
  const isAllSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((item) => selectedLeadIds.includes(item.id));
  const isSomeSelected =
    filteredLeads.some((item) => selectedLeadIds.includes(item.id)) && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredLeads.map((l) => l.id));
      setSelectedLeadIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const newSelected = new Set(selectedLeadIds);
      filteredLeads.forEach((l) => newSelected.add(l.id));
      setSelectedLeadIds(Array.from(newSelected));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedLeadIds([]);
    setOpenStatusDropdown(false);
    setOpenPriorityDropdown(false);
  };

  // Bulk Operations Handlers
  const handleBulkStatusUpdate = async (statusId, statusName) => {
    if (selectedLeadIds.length === 0) return;
    setIsSubmitting(true);
    setOpenStatusDropdown(false);
    try {
      const response = await axios.post(`${API_URL}/leads/bulk-status`, {
        ids: selectedLeadIds,
        status_id: statusId,
        status_name: statusName,
      });
      if (response.data && response.data.status) {
        showToast(response.data.message || `Updated status to "${statusName}"!`, "success");
        setSelectedLeadIds([]);
        fetchLeads();
      }
    } catch (error) {
      console.log("Bulk status error:", error);
      try {
        await Promise.all(
          selectedLeadIds.map((id) => {
            const lead = leads.find((l) => l.id === id);
            if (!lead) return Promise.resolve();
            return axios.put(`${API_URL}/leads/${id}`, {
              name: lead.name,
              phone: lead.phone,
              email: lead.email || "",
              city: lead.city || "",
              state: lead.state || "",
              vehicle_segment: lead.vehicle_segment || "4 Wheeler",
              brand_id: lead.brand_id || null,
              model_variant: lead.model_variant,
              priority: lead.priority || "Hot",
              purchase_timeline: lead.purchase_timeline,
              source_id: lead.source_id || null,
              status_id: statusId,
              status_name: statusName,
              assigned_user_name: lead.assigned_user_name,
            });
          })
        );
        showToast(`Updated status for ${selectedLeadIds.length} leads to "${statusName}"!`, "success");
        setSelectedLeadIds([]);
        fetchLeads();
      } catch (fallbackErr) {
        showToast("Failed to update status for selected leads.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkPriorityUpdate = async (priority) => {
    if (selectedLeadIds.length === 0) return;
    setIsSubmitting(true);
    setOpenPriorityDropdown(false);
    try {
      const response = await axios.post(`${API_URL}/leads/bulk-priority`, {
        ids: selectedLeadIds,
        priority: priority,
      });
      if (response.data && response.data.status) {
        showToast(response.data.message || `Set priority to ${priority}!`, "success");
        setSelectedLeadIds([]);
        fetchLeads();
      }
    } catch (error) {
      console.log("Bulk priority error:", error);
      try {
        await Promise.all(
          selectedLeadIds.map((id) => {
            const lead = leads.find((l) => l.id === id);
            if (!lead) return Promise.resolve();
            return axios.put(`${API_URL}/leads/${id}`, {
              name: lead.name,
              phone: lead.phone,
              email: lead.email || "",
              city: lead.city || "",
              state: lead.state || "",
              vehicle_segment: lead.vehicle_segment || "4 Wheeler",
              brand_id: lead.brand_id || null,
              model_variant: lead.model_variant,
              priority: priority,
              purchase_timeline: lead.purchase_timeline,
              source_id: lead.source_id || null,
              status_id: lead.status_id || null,
              assigned_user_name: lead.assigned_user_name,
            });
          })
        );
        showToast(`Set priority for ${selectedLeadIds.length} leads to "${priority}"!`, "success");
        setSelectedLeadIds([]);
        fetchLeads();
      } catch (fallbackErr) {
        showToast("Failed to update priority for selected leads.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSinglePriorityUpdate = async (leadId, priority) => {
    try {
      const response = await axios.post(`${API_URL}/leads/bulk-priority`, {
        ids: [leadId],
        priority: priority,
      });
      if (response.data && response.data.status) {
        showToast(`Lead priority updated to ${priority}!`, "success");
        fetchLeads();
        return;
      }
    } catch {
      try {
        const lead = leads.find((l) => l.id === leadId);
        if (!lead) return;
        await axios.put(`${API_URL}/leads/${leadId}`, {
          name: lead.name,
          phone: lead.phone,
          email: lead.email || "",
          city: lead.city || "",
          state: lead.state || "",
          vehicle_segment: lead.vehicle_segment || "4 Wheeler",
          brand_id: lead.brand_id || null,
          model_variant: lead.model_variant,
          priority: priority,
          purchase_timeline: lead.purchase_timeline,
          source_id: lead.source_id || null,
          status_id: lead.status_id || null,
          assigned_user_name: lead.assigned_user_name,
        });
        showToast(`Lead priority updated to ${priority}!`, "success");
        fetchLeads();
      } catch (e) {
        showToast("Failed to update priority.", "error");
      }
    }
  };

  const handleSingleStatusUpdate = async (leadId, statusId, statusName) => {
    try {
      const response = await axios.post(`${API_URL}/leads/bulk-status`, {
        ids: [leadId],
        status_id: statusId || null,
        status_name: statusName || null,
      });
      if (response.data && response.data.status) {
        showToast(`Lead status updated to ${statusName || "selected status"}!`, "success");
        fetchLeads();
        return;
      }
    } catch {
      try {
        const lead = leads.find((l) => l.id === leadId);
        if (!lead) return;
        await axios.put(`${API_URL}/leads/${leadId}`, {
          name: lead.name,
          phone: lead.phone,
          email: lead.email || "",
          city: lead.city || "",
          state: lead.state || "",
          vehicle_segment: lead.vehicle_segment || "4 Wheeler",
          brand_id: lead.brand_id || null,
          model_variant: lead.model_variant,
          priority: lead.priority || "Hot",
          purchase_timeline: lead.purchase_timeline,
          source_id: lead.source_id || null,
          status_id: statusId || null,
          assigned_user_name: lead.assigned_user_name,
        });
        showToast(`Lead status updated to ${statusName || "selected status"}!`, "success");
        fetchLeads();
      } catch (e) {
        showToast("Failed to update status.", "error");
      }
    }
  };

  const handleOpenFollowUpModal = (lead) => {
    setFollowUpTarget(lead);
    const today = new Date().toISOString().split("T")[0];
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

    // Default next follow-up date 3 days later
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3);
    const nextDateStr = nextDate.toISOString().split("T")[0];

    setFollowUpForm({
      customer: lead.name || "",
      phone: lead.phone || "",
      outcome: "Interested / Call Back",
      type: "Phone Call",
      follow_up_date: today,
      follow_up_time: nowTime,
      next_follow_up_date: nextDateStr,
      next_follow_up_time: "10:00 AM",
      notes: "",
    });
    setShowFollowUpModal(true);
  };

  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();
    if (!followUpTarget) return;
    setIsSubmittingFollowUp(true);

    try {
      const payload = {
        lead_id: followUpTarget.id,
        follow_up_date: followUpForm.follow_up_date || new Date().toISOString().split("T")[0],
        follow_up_time: followUpForm.follow_up_time || "02:30 PM",
        type: followUpForm.type || "Phone Call",
        notes: followUpForm.notes || "",
        next_follow_up_date: followUpForm.next_follow_up_date || null,
        next_follow_up_time: followUpForm.next_follow_up_time || "10:00 AM",
        status: followUpForm.outcome || "Interested",
        lead_status_name: "In Follow-Up",
      };

      const response = await axios.post(`${API_URL}/follow-ups`, payload);
      if (response.data && response.data.status) {
        showToast(response.data.message || `Follow-up call interaction logged for ${followUpForm.customer}!`, "success");
        setShowFollowUpModal(false);
        fetchLeads();
      } else {
        showToast(response.data?.message || "Failed to log follow-up.", "error");
      }
    } catch (error) {
      console.error("Follow-up error:", error);
      // Fallback endpoint: POST /leads/{id}/follow-ups
      try {
        const payload = {
          follow_up_date: followUpForm.follow_up_date || new Date().toISOString().split("T")[0],
          follow_up_time: followUpForm.follow_up_time || "02:30 PM",
          type: followUpForm.type || "Phone Call",
          notes: followUpForm.notes || "",
          next_follow_up_date: followUpForm.next_follow_up_date || null,
          next_follow_up_time: followUpForm.next_follow_up_time || "10:00 AM",
          status: followUpForm.outcome || "Interested",
          lead_status_name: "In Follow-Up",
        };
        const fbRes = await axios.post(`${API_URL}/leads/${followUpTarget.id}/follow-ups`, payload);
        if (fbRes.data && fbRes.data.status) {
          showToast(`Follow-up call interaction logged for ${followUpForm.customer}!`, "success");
          setShowFollowUpModal(false);
          fetchLeads();
          return;
        }
      } catch (fbErr) {
        console.error("Fallback follow-up error:", fbErr);
      }
      showToast(error.response?.data?.message || "Failed to log follow-up call.", "error");
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const handleOpenViewLead = async (lead) => {
    setViewLead(lead);
    setLeadAssignmentHistory([]);
    setLeadFollowUpHistory([]);
    setIsLoadingHistory(true);
    setIsLoadingFollowUps(true);
    try {
      const [assignRes, followUpRes] = await Promise.all([
        axios.get(`${API_URL}/leads/${lead.id}/assignments`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_URL}/leads/${lead.id}/follow-ups`).catch(() => ({ data: { data: [] } })),
      ]);
      if (assignRes.data && assignRes.data.status) {
        setLeadAssignmentHistory(assignRes.data.data || []);
      }
      if (followUpRes.data && followUpRes.data.status) {
        setLeadFollowUpHistory(followUpRes.data.data || []);
      }
    } catch (err) {
      console.log("Error fetching lead history:", err);
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingFollowUps(false);
    }
  };

  const handleBulkAssignSubmit = async () => {
    if (selectedLeadIds.length === 0 || !bulkAssignUser) return;
    setIsSubmitting(true);
    try {
      const selectedUserObj = usersList.find((u) => String(u.id) === String(bulkAssignUser) || u.name === bulkAssignUser);
      const userName = selectedUserObj ? selectedUserObj.name : bulkAssignUser;
      const userId = selectedUserObj ? selectedUserObj.id : (isFinite(bulkAssignUser) ? Number(bulkAssignUser) : null);

      const response = await axios.post(`${API_URL}/leads/bulk-assign`, {
        ids: selectedLeadIds,
        assigned_to: userId,
        assigned_user_name: userName,
        remarks: bulkAssignRemarks.trim() || undefined,
      });
      if (response.data && response.data.status) {
        showToast(response.data.message || `Assigned to ${userName}!`, "success");
        setShowBulkAssignModal(false);
        setBulkAssignUser("");
        setBulkAssignRemarks("");
        setSelectedLeadIds([]);
        fetchLeads();
      }
    } catch (error) {
      console.log("Bulk assign error:", error);
      try {
        const selectedUserObj = usersList.find((u) => String(u.id) === String(bulkAssignUser) || u.name === bulkAssignUser);
        const userName = selectedUserObj ? selectedUserObj.name : bulkAssignUser;
        const userId = selectedUserObj ? selectedUserObj.id : (isFinite(bulkAssignUser) ? Number(bulkAssignUser) : null);

        await Promise.all(
          selectedLeadIds.map((id) => {
            const lead = leads.find((l) => l.id === id);
            if (!lead) return Promise.resolve();
            return axios.put(`${API_URL}/leads/${id}`, {
              name: lead.name,
              phone: lead.phone,
              email: lead.email || "",
              city: lead.city || "",
              state: lead.state || "",
              vehicle_segment: lead.vehicle_segment || "4 Wheeler",
              brand_id: lead.brand_id || null,
              model_variant: lead.model_variant,
              priority: lead.priority || "Hot",
              purchase_timeline: lead.purchase_timeline,
              source_id: lead.source_id || null,
              status_id: lead.status_id || null,
              assigned_to: userId,
              assigned_user_name: userName,
              assignment_remarks: bulkAssignRemarks.trim() || undefined,
            });
          })
        );
        showToast(`Assigned ${selectedLeadIds.length} leads to "${userName}"!`, "success");
        setShowBulkAssignModal(false);
        setBulkAssignUser("");
        setBulkAssignRemarks("");
        setSelectedLeadIds([]);
        fetchLeads();
      } catch (fallbackErr) {
        showToast("Failed to assign selected leads.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDeleteSubmit = async () => {
    if (selectedLeadIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/leads/bulk-delete`, {
        ids: selectedLeadIds,
      });
      if (response.data && response.data.status) {
        showToast(response.data.message || `Deleted ${selectedLeadIds.length} leads!`, "success");
        setShowBulkDeleteModal(false);
        setSelectedLeadIds([]);
        fetchLeads();
      }
    } catch (error) {
      console.log("Bulk delete error:", error);
      try {
        await Promise.all(
          selectedLeadIds.map((id) => axios.delete(`${API_URL}/leads/${id}`))
        );
        showToast(`Deleted ${selectedLeadIds.length} leads!`, "success");
        setShowBulkDeleteModal(false);
        setSelectedLeadIds([]);
        fetchLeads();
      } catch (fallbackErr) {
        showToast("Failed to delete selected leads.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = (exportSelectedOnly = false) => {
    if (isSalesManager) {
      showToast("You do not have permission to export leads.", "error");
      return;
    }
    const list = exportSelectedOnly
      ? leads.filter((l) => selectedLeadIds.includes(l.id))
      : filteredLeads;

    if (list.length === 0) {
      showToast("No leads available to export.", "warning");
      return;
    }

    const headers = [
      "ID",
      "Customer Name",
      "Phone",
      "Email",
      "City",
      "State",
      "Vehicle Segment",
      "Brand",
      "Model Variant",
      "Priority",
      "Purchase Timeline",
      "Source",
      "Status",
      "Assign To",
      "Assign By",
      "Created At",
    ];

    const csvRows = [
      headers.join(","),
      ...list.map((item) =>
        [
          item.id || "",
          `"${(item.name || "").replace(/"/g, '""')}"`,
          `"${(item.phone || "").replace(/"/g, '""')}"`,
          `"${(item.email || "").replace(/"/g, '""')}"`,
          `"${(item.city || "").replace(/"/g, '""')}"`,
          `"${(item.state || "").replace(/"/g, '""')}"`,
          `"${(item.vehicle_segment || "").replace(/"/g, '""')}"`,
          `"${(item.brand?.name || item.brand_name || "").replace(/"/g, '""')}"`,
          `"${(item.model_variant || "").replace(/"/g, '""')}"`,
          `"${(item.priority || "").replace(/"/g, '""')}"`,
          `"${(item.purchase_timeline || "").replace(/"/g, '""')}"`,
          `"${(item.source?.title || item.source_name || "Direct").replace(/"/g, '""')}"`,
          `"${(item.status?.name || item.status_name || "New").replace(/"/g, '""')}"`,
          `"${(item.assigned_to_display || item.assigned_user?.name || item.assigned_user_name || "-").replace(/"/g, '""')}"`,
          `"${(item.assigned_by_display || item.assigned_by_user?.name || "-").replace(/"/g, '""')}"`,
          `"${(item.created_at || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      exportSelectedOnly
        ? `selected_leads_${new Date().toISOString().slice(0, 10)}.csv`
        : `all_leads_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(
      `Exported ${list.length} ${exportSelectedOnly ? "selected " : ""}leads to CSV!`,
      "success"
    );
  };

  // Extract executive names list for assignment
  const defaultExecutives = [
    "David Miller (Sales Executive)",
    "Alexander Vance (Sales Director)",
    "Rajesh Kumar (Sales Executive)",
  ];
  const userExecList = usersList
    .filter((u) => u.status === "Active" || !u.status)
    .map((u) => `${u.name} (${u.role || "Executive"})`);
  const executiveOptions = Array.from(new Set([...userExecList, ...defaultExecutives]));

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
              <li className="breadcrumb-item active">Leads Pipeline</li>
            </ul>
            <h1 className="page-title mt-1">Leads & Prospects Pipeline</h1>
          </div>

          <div className="page-header-actions d-flex align-items-center gap-2 flex-wrap">
            {can("lead.send_wishes") && <button
              className="btn btn-outline-custom d-flex align-items-center gap-1"
              style={{ color: "#f43f5e", borderColor: "rgba(244, 63, 94, 0.4)" }}
              onClick={handleTriggerGreetings}
              disabled={isTriggeringWishes}
              title="Dispatch automated Birthday & Anniversary greetings scheduled for today"
            >
              <i className="bi bi-gift-fill"></i>
              <span>{isTriggeringWishes ? "Sending..." : "Send Today's Wishes"}</span>
            </button>}

            <Link href="/admin/follow-up" className="btn btn-outline-custom">
              <i className="bi bi-telephone-outbound-fill text-warning"></i>
              <span>Follow-Ups Hub</span>
            </Link>

            {can("lead.send_quotation") && <Link href="/admin/quotation" className="btn btn-outline-custom">
              <i className="bi bi-file-earmark-spreadsheet-fill text-primary"></i>
              <span>Send Quotation</span>
            </Link>}

            {!isSalesManager && can("lead.export") && <button
              className="btn btn-outline-custom"
              onClick={() => handleExportCSV(false)}
              title="Download entire leads database as CSV"
            >
              <i className="bi bi-file-earmark-arrow-down"></i>
              <span>Export CSV</span>
            </button>}

            {(can("lead.import") || (!isSalesManager && can("lead.export")) || can("lead.create")) && (
              <button
                className="btn btn-outline-custom d-flex align-items-center gap-1"
                onClick={() => setShowImportModal(true)}
                title="Import leads from CSV/Excel file"
              >
                <i className="bi bi-file-earmark-arrow-up text-success"></i>
                <span>Import Leads</span>
              </button>
            )}

            {can("lead.create") && <button
              className="btn btn-primary"
              onClick={() => {
                setFormData({
                  name: "",
                  email: "",
                  phone: "",
                  city: "",
                  state: "",
                  birth_date: "",
                  anniversary_date: "",
                  vehicle_segment: "4 Wheeler",
                  brand_id: brands[0]?.id || "",
                  model_variant: "",
                  priority: "Hot",
                  purchase_timeline: "Immediate (Within 7 Days)",
                  source_id: sources[0]?.id || "",
                  status_id: statuses[0]?.id || "",
                  assigned_user_name: "David Miller (Sales Executive)",
                });
                setShowAddModal(true);
              }}
            >
              <i className="bi bi-plus-circle"></i>
              <span>Add Customer Lead</span>
            </button>}
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Total Active Pipeline</span>
                <div className="stat-icon-box primary">
                  <i className="bi bi-funnel-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">{leads.length} Leads</div>
              <span className="text-primary small fw-semibold">Live Database Records</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Hot Inquiries</span>
                <div className="stat-icon-box danger">
                  <i className="bi bi-fire"></i>
                </div>
              </div>
              <div className="stat-card-value">{leads.filter((l) => l.priority === "Hot").length} Hot</div>
              <span className="text-danger small fw-semibold">Immediate Buying Interest</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">4W Vehicles Inquired</span>
                <div className="stat-icon-box success">
                  <i className="bi bi-car-front-fill"></i>
                </div>
              </div>
              <div className="stat-card-value">
                {leads.filter((l) => l.vehicle_segment === "4 Wheeler").length} Leads
              </div>
              <span className="text-success small fw-semibold">Cars & SUVs Inquiries</span>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card stat-card">
              <div className="stat-card-header">
                <span className="stat-card-title">Selected Leads</span>
                <div className="stat-icon-box info">
                  <i className="bi bi-check-all"></i>
                </div>
              </div>
              <div className="stat-card-value">{selectedLeadIds.length} Selected</div>
              <span className="text-info small fw-semibold">
                {selectedLeadIds.length > 0 ? "Batch Actions Active" : "Click table checkboxes"}
              </span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            FLOATING / DOCKED BULK ACTIONS BAR (Visible when leads are selected)
            ------------------------------------------------------------------ */}
        {selectedLeadIds.length > 0 && (
          <div className="bulk-actions-bar">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-check-circle-fill text-warning fs-5"></i>
                <span className="text-white fw-bold">
                  <span className="badge bg-warning text-dark px-2 py-1 me-1 fs-6">
                    {selectedLeadIds.length}
                  </span>
                  {selectedLeadIds.length === 1 ? "Lead" : "Leads"} Selected
                </span>
              </div>
              <span className="text-muted small d-none d-md-inline">|</span>
              <span className="text-white-50 small d-none d-md-inline">
                Apply batch actions across selected records
              </span>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Assign to Executive */}
              {can("lead.bulk_assign") && <button
                className="btn btn-sm btn-outline-custom text-white"
                onClick={() => {
                  setBulkAssignUser(executiveOptions[0] || "");
                  setShowBulkAssignModal(true);
                }}
              >
                <i className="bi bi-person-check-fill text-info me-1"></i>
                <span>Assign Executive</span>
              </button>}

              {/* Bulk Status Update Dropdown */}
              {can("lead.bulk_status") && <div className="dropdown position-relative">
                <button
                  className="btn btn-sm btn-outline-custom dropdown-toggle text-white"
                  type="button"
                  onClick={() => {
                    setOpenStatusDropdown(!openStatusDropdown);
                    setOpenPriorityDropdown(false);
                  }}
                >
                  <i className="bi bi-tags-fill text-warning me-1"></i>
                  <span>Update Status</span>
                </button>
                {openStatusDropdown && (
                  <div
                    className="bulk-dropdown-menu dropdown-menu show"
                    style={{ position: "absolute", right: 0, top: "110%" }}
                  >
                    <h6 className="dropdown-header text-white-50 px-2 py-1 small">Change Status To:</h6>
                    {statuses.length > 0 ? (
                      statuses.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          className="dropdown-item"
                          onClick={() => handleBulkStatusUpdate(st.id, st.name)}
                        >
                          <i className="bi bi-arrow-right-circle text-primary"></i>
                          {st.name}
                        </button>
                      ))
                    ) : (
                      ["New", "Contacted", "Qualified", "In Negotiation", "Deal Won", "Deal Lost"].map(
                        (stName) => (
                          <button
                            key={stName}
                            type="button"
                            className="dropdown-item"
                            onClick={() => handleBulkStatusUpdate(null, stName)}
                          >
                            <i className="bi bi-arrow-right-circle text-primary"></i>
                            {stName}
                          </button>
                        )
                      )
                    )}
                  </div>
                )}
              </div>}

              {/* Bulk Priority Update Dropdown */}
              {can("lead.bulk_priority") && <div className="dropdown position-relative">
                <button
                  className="btn btn-sm btn-outline-custom dropdown-toggle text-white"
                  type="button"
                  onClick={() => {
                    setOpenPriorityDropdown(!openPriorityDropdown);
                    setOpenStatusDropdown(false);
                  }}
                >
                  <i className="bi bi-fire text-danger me-1"></i>
                  <span>Set Priority</span>
                </button>
                {openPriorityDropdown && (
                  <div
                    className="bulk-dropdown-menu dropdown-menu show"
                    style={{ position: "absolute", right: 0, top: "110%" }}
                  >
                    <h6 className="dropdown-header text-white-50 px-2 py-1 small">Set Temperature:</h6>
                    <button
                      type="button"
                      className="dropdown-item text-danger fw-semibold"
                      onClick={() => handleBulkPriorityUpdate("Hot")}
                    >
                      🔥 Hot Priority
                    </button>
                    <button
                      type="button"
                      className="dropdown-item text-warning fw-semibold"
                      onClick={() => handleBulkPriorityUpdate("Warm")}
                    >
                      ☀️ Warm Priority
                    </button>
                    <button
                      type="button"
                      className="dropdown-item text-info fw-semibold"
                      onClick={() => handleBulkPriorityUpdate("Cold")}
                    >
                      ❄️ Cold Priority
                    </button>
                  </div>
                )}
              </div>}

              {/* Export Selected to CSV */}
              {!isSalesManager && can("lead.export_selected") && <button
                className="btn btn-sm btn-outline-custom text-white"
                onClick={() => handleExportCSV(true)}
                title="Download CSV for selected leads only"
              >
                <i className="bi bi-file-earmark-arrow-down text-success me-1"></i>
                <span>Export ({selectedLeadIds.length})</span>
              </button>}

              {/* Bulk Delete */}
              {can("lead.bulk_delete") && <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => setShowBulkDeleteModal(true)}
              >
                <i className="bi bi-trash me-1"></i>
                <span>Delete</span>
              </button>}

              {/* Clear selection */}
              <button
                className="btn btn-sm btn-link text-white-50 text-decoration-none p-1"
                onClick={handleClearSelection}
                title="Clear all selected"
              >
                <i className="bi bi-x-lg me-1"></i>Clear
              </button>
            </div>
          </div>
        )}

        {/* Leads Table Card */}
        <div className="card">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <h5 className="card-title mb-0">Customer Prospects</h5>
              <span className="badge bg-primary-subtle text-white rounded-pill px-2">
                {filteredLeads.length} Leads
              </span>
              {selectedLeadIds.length > 0 && (
                <span className="badge bg-warning-subtle text-warning border border-warning rounded-pill px-2">
                  {selectedLeadIds.length} Selected
                </span>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2" style={{ maxWidth: "600px" }}>
              <select
                className="form-select form-select-sm"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ width: "130px" }}
              >
                <option value="">All Priorities</option>
                <option value="Hot">🔥 Hot</option>
                <option value="Warm">☀️ Warm</option>
                <option value="Cold">❄️ Cold</option>
              </select>

              <select
                className="form-select form-select-sm"
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                style={{ width: "130px" }}
              >
                <option value="">All Segments</option>
                <option value="4 Wheeler">4 Wheeler</option>
                <option value="2 Wheeler">2 Wheeler</option>
              </select>

              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "130px" }}
              >
                <option value="">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search name, phone, model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "180px" }}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr>
                  <th style={{ width: "42px" }} className="text-center">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={handleSelectAll}
                      title={isAllSelected ? "Deselect all visible leads" : "Select all visible leads"}
                      aria-label="Select all leads"
                    />
                  </th>
                  <th style={{ width: "45px" }}>#</th>
                  <th>Customer</th>
                  <th>Vehicle Requirement</th>
                  <th>Priority</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Assign To</th>
                  <th>Assign By</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading leads from API...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-4 text-muted">
                      No leads found. Click <strong>Add Customer Lead</strong> to register a new prospect.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, index) => {
                    const isSelected = selectedLeadIds.includes(lead.id);
                    return (
                      <tr key={lead.id} className={isSelected ? "selected-row" : ""}>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isSelected}
                            onChange={() => handleSelectRow(lead.id)}
                            aria-label={`Select lead ${lead.name}`}
                          />
                        </td>
                        <td>
                          <span className="text-muted small">{index + 1}</span>
                        </td>
                        <td>
                          <div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <h6 className="mb-0 text-dark fw-bold">{lead.name}</h6>
                              {lead.is_birthday_today && (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0" style={{ fontSize: "10px" }}>
                                  🎂 Birthday Today
                                </span>
                              )}
                              {lead.is_anniversary_today && (
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0" style={{ fontSize: "10px" }}>
                                  💐 Anniversary Today
                                </span>
                              )}
                            </div>
                            <div className="d-flex align-items-center gap-2 mt-1">
                              <span className="text-muted small">
                                <i className="bi bi-telephone me-1"></i>
                                {lead.phone}
                              </span>
                              {lead.city && (
                                <span className="text-muted small">
                                  <i className="bi bi-geo-alt me-1"></i>
                                  {lead.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="text-dark fw-semibold">{lead.model_variant}</div>
                            <span className="badge bg-secondary-subtle text-black small" style={{ fontSize: "11px" }}>
                              {lead.brand?.name || lead.brand_name || lead.vehicle_segment}
                            </span>
                          </div>
                        </td>
                        <td>
                          {can("lead.priority") ? (
                            <select
                              className={`form-select form-select-sm fw-semibold ${
                                lead.priority === "Hot"
                                  ? "text-danger bg-danger-subtle border-danger-subtle"
                                  : lead.priority === "Warm"
                                    ? "text-warning bg-warning-subtle border-warning-subtle"
                                    : "text-info bg-info-subtle border-info-subtle"
                              }`}
                              style={{ width: "105px", fontSize: "12px", padding: "2px 8px", cursor: "pointer" }}
                              value={lead.priority || "Hot"}
                              onChange={(e) => handleSinglePriorityUpdate(lead.id, e.target.value)}
                              title="Update Lead Priority"
                            >
                              <option value="Hot">🔥 Hot</option>
                              <option value="Warm">☀️ Warm</option>
                              <option value="Cold">❄️ Cold</option>
                            </select>
                          ) : (
                            <span
                              className={`badge ${
                                lead.priority === "Hot"
                                  ? "bg-danger-subtle text-danger"
                                  : lead.priority === "Warm"
                                    ? "bg-warning-subtle text-warning"
                                    : "bg-info-subtle text-info"
                              }`}
                            >
                              {lead.priority === "Hot" ? "🔥 Hot" : lead.priority === "Warm" ? "☀️ Warm" : "❄️ Cold"}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-dark border text-light">{lead.source?.title || lead.source_name || "Direct"}</span>
                        </td>
                        <td>
                          {can("lead.status") ? (
                            <select
                              className="form-select form-select-sm fw-semibold text-dark bg-light border-secondary-subtle"
                              style={{ minWidth: "120px", maxWidth: "155px", fontSize: "12px", padding: "2px 8px", cursor: "pointer" }}
                              value={lead.status_id || ""}
                              onChange={(e) => {
                                const selectedSt = statuses.find((st) => String(st.id) === String(e.target.value));
                                handleSingleStatusUpdate(lead.id, e.target.value, selectedSt ? selectedSt.name : "");
                              }}
                              title="Update Lead Status"
                            >
                              <option value="" disabled>{lead.status?.name || lead.status_name || "New"}</option>
                              {statuses.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="badge-custom badge-active">
                              <span className="badge-dot-indicator"></span>
                              {lead.status?.name || lead.status_name || "New"}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="text-dark small fw-medium">
                            {lead.assigned_to_display || lead.assigned_user?.name || lead.assigned_user_name || "-"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${lead.assigned_by_display && lead.assigned_by_display !== "-"
                              ? "bg-secondary-subtle text-black border border-secondary fw-semibold"
                              : "text-muted"
                              } small px-2 py-1`}
                            style={{ fontSize: "11px" }}
                          >
                            {lead.assigned_by_display && lead.assigned_by_display !== "-" ? (
                              <>
                                <i className="bi bi-person-check-fill text-dark me-1"></i>
                                {lead.assigned_by_display}
                              </>
                            ) : (
                              "-"
                            )}
                          </span>
                        </td>
                        <td className="text-end" onClick={(e) => e.stopPropagation()}>
                          <div className="dropdown position-relative d-inline-block">
                            <button
                              type="button"
                              className="btn btn-sm btn-light border rounded-circle shadow-none p-0 d-inline-flex align-items-center justify-content-center"
                              style={{ width: "32px", height: "32px", cursor: "pointer" }}
                              title="Lead Actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === lead.id ? null : lead.id);
                              }}
                            >
                              <i className="bi bi-three-dots-vertical fs-6 text-dark"></i>
                            </button>

                            {activeActionMenuId === lead.id && (
                              <div
                                className="dropdown-menu show shadow-lg border rounded-3 p-1 position-absolute end-0 text-start"
                                style={{
                                  minWidth: "195px",
                                  zIndex: 1050,
                                  top: "100%",
                                  backgroundColor: "#FFFFFF",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* 1. Convert to Deal */}
                                <button
                                  type="button"
                                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2 fw-bold text-success"
                                  style={{ backgroundColor: "rgba(21, 128, 61, 0.1)" }}
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setConvertDealTarget(lead);
                                  }}
                                >
                                  <i className="bi bi-trophy-fill text-success"></i>
                                  <span>Convert to Deal</span>
                                </button>

                                <div className="dropdown-divider my-1"></div>

                                {/* 2. Log Follow-Up Call */}
                                {(can("lead.followup") || can("followup.log_call") || !currentUser) && (
                                  <button
                                    type="button"
                                    className="dropdown-item d-flex align-items-center gap-2 py-1 px-3 small text-dark"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleOpenFollowUpModal(lead);
                                    }}
                                  >
                                    <i className="bi bi-telephone-plus text-primary"></i>
                                    <span>Log Follow-Up</span>
                                  </button>
                                )}

                                {/* 3. Send Quotation */}
                                {can("lead.send_quotation") && (
                                  <Link
                                    href={`/admin/quotation/create?lead_id=${lead.id}`}
                                    className="dropdown-item d-flex align-items-center gap-2 py-1 px-3 small text-dark text-decoration-none"
                                    onClick={() => setActiveActionMenuId(null)}
                                  >
                                    <i className="bi bi-file-earmark-spreadsheet text-info"></i>
                                    <span>Send Quotation</span>
                                  </Link>
                                )}

                                {/* 4. View Details */}
                                {(can("lead.view_assigned") || can("lead.view_all")) && (
                                  <button
                                    type="button"
                                    className="dropdown-item d-flex align-items-center gap-2 py-1 px-3 small text-dark"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleOpenViewLead(lead);
                                    }}
                                  >
                                    <i className="bi bi-eye text-secondary"></i>
                                    <span>View Details</span>
                                  </button>
                                )}

                                {/* 5. Edit Lead */}
                                {can("lead.edit") && (
                                  <button
                                    type="button"
                                    className="dropdown-item d-flex align-items-center gap-2 py-1 px-3 small text-dark"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setEditLead({
                                        id: lead.id,
                                        name: lead.name,
                                        email: lead.email || "",
                                        phone: lead.phone,
                                        city: lead.city || "",
                                        state: lead.state || "",
                                        vehicle_segment: lead.vehicle_segment || "4 Wheeler",
                                        brand_id: lead.brand_id || "",
                                        model_variant: lead.model_variant,
                                        priority: lead.priority || "Hot",
                                        purchase_timeline: lead.purchase_timeline || "Immediate (Within 7 Days)",
                                        source_id: lead.source_id || "",
                                        status_id: lead.status_id || "",
                                        assigned_user_name: lead.assigned_user_name || "David Miller (Sales Executive)",
                                      });
                                    }}
                                  >
                                    <i className="bi bi-pencil text-warning"></i>
                                    <span>Edit Lead</span>
                                  </button>
                                )}

                                <div className="dropdown-divider my-1"></div>

                                {/* 6. Delete Lead */}
                                {can("lead.delete") && (
                                  <button
                                    type="button"
                                    className="dropdown-item d-flex align-items-center gap-2 py-1 px-3 small text-danger"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setDeleteTarget(lead);
                                    }}
                                  >
                                    <i className="bi bi-trash text-danger"></i>
                                    <span>Delete Lead</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            ADD LEAD MODAL (Matches user's exact UI screenshot)
            ------------------------------------------------------------------ */}
        {showAddModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowAddModal(false)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-person-plus-fill text-info"></i> Add New Customer Lead
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="modal-body-custom py-3">
                  {/* SECTION 1: Customer Details */}
                  <h6 className="text-dark fw-bold mb-3 pb-1 border-bottom border-secondary">
                    1. Customer Details
                  </h6>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        Customer Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Captain Vikram Rathore"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        autoFocus
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="vikram.rathore@defmail.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">
                        Phone Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="+91 98765 43210"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">City</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Pune, Delhi, Jaipur"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">State</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Maharashtra, Rajasthan"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        <i className="bi bi-cake2-fill text-danger me-1"></i> Birth Date (Birthday)
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.birth_date}
                        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        <i className="bi bi-heart-fill text-primary me-1"></i> Anniversary Date
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.anniversary_date}
                        onChange={(e) => setFormData({ ...formData, anniversary_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* SECTION 2: Vehicle Requirement & Lead Priority */}
                  <h6 className="text-dark fw-bold mb-3 pb-1 border-bottom border-secondary mt-4">
                    2. Vehicle Requirement & Lead Priority
                  </h6>

                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small mb-1">
                      Vehicle Segment <span className="text-danger">*</span>
                    </label>
                    <div
                      className="p-2 rounded-2 d-flex align-items-center gap-4 dark-selection-box"
                      style={{ background: "#181A1B", border: "1px solid #33383B" }}
                    >
                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="addSeg"
                          id="addSeg2W"
                          value="2 Wheeler"
                          checked={formData.vehicle_segment === "2 Wheeler"}
                          onChange={(e) => setFormData({ ...formData, vehicle_segment: e.target.value })}
                        />
                        <label className="form-check-label small" style={{ color: "#FFFFFF" }} htmlFor="addSeg2W">
                          <i className="bi bi-bicycle text-info me-1"></i> 2 Wheeler (Bike / Scooter)
                        </label>
                      </div>

                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="addSeg"
                          id="addSeg4W"
                          value="4 Wheeler"
                          checked={formData.vehicle_segment === "4 Wheeler"}
                          onChange={(e) => setFormData({ ...formData, vehicle_segment: e.target.value })}
                        />
                        <label className="form-check-label small" style={{ color: "#FFFFFF" }} htmlFor="addSeg4W">
                          <i className="bi bi-car-front-fill text-primary me-1"></i> 4 Wheeler (Car / SUV)
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Brand Name</label>
                      <select
                        className="form-select"
                        value={formData.brand_id}
                        onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                      >
                        <option value="">Select Brand</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        Variant / Model <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Brezza ZDI, Classic 350, Apache RR310"
                        required
                        value={formData.model_variant}
                        onChange={(e) => setFormData({ ...formData, model_variant: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small mb-1">
                        Lead Priority / Temperature <span className="text-danger">*</span>
                      </label>
                      <div
                        className="p-2 rounded-2 d-flex align-items-center gap-3 dark-selection-box"
                        style={{ background: "#181A1B", border: "1px solid #33383B" }}
                      >
                        <div className="form-check mb-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="addPriority"
                            id="addPrioHot"
                            value="Hot"
                            checked={formData.priority === "Hot"}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          />
                          <label className="form-check-label small fw-bold" style={{ color: "#EF4444" }} htmlFor="addPrioHot">
                            🔥 Hot
                          </label>
                        </div>

                        <div className="form-check mb-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="addPriority"
                            id="addPrioWarm"
                            value="Warm"
                            checked={formData.priority === "Warm"}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          />
                          <label className="form-check-label small fw-bold" style={{ color: "#F59E0B" }} htmlFor="addPrioWarm">
                            ☀️ Warm
                          </label>
                        </div>

                        <div className="form-check mb-0">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="addPriority"
                            id="addPrioCold"
                            value="Cold"
                            checked={formData.priority === "Cold"}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          />
                          <label className="form-check-label small fw-bold" style={{ color: "#38BDF8" }} htmlFor="addPrioCold">
                            ❄️ Cold
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        Planning In (Purchase Timeline)
                      </label>
                      <select
                        className="form-select"
                        value={formData.purchase_timeline}
                        onChange={(e) => setFormData({ ...formData, purchase_timeline: e.target.value })}
                      >
                        <option value="Immediate (Within 7 Days)">Immediate (Within 7 Days)</option>
                        <option value="15-30 Days">15-30 Days</option>
                        <option value="1-3 Months">1-3 Months</option>
                        <option value="Exploring / Later">Exploring / Later</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        Total Deal Price / Budget (₹)
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light fw-bold">₹</span>
                        <input
                          type="number"
                          className="form-control fw-bold"
                          placeholder="e.g. 1450000"
                          value={formData.budget || ""}
                          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Lead Tracking & Assignment */}
                  <h6 className="text-dark fw-bold mb-3 pb-1 border-bottom border-secondary mt-4">
                    3. Lead Tracking & Assignment
                  </h6>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">Lead Source</label>
                      <select
                        className="form-select"
                        value={formData.source_id}
                        onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
                      >
                        <option value="">Choose Source</option>
                        {sources.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">Lead Status</label>
                      <select
                        className="form-select"
                        value={formData.status_id}
                        onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                      >
                        <option value="">Choose Status</option>
                        {statuses.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">Assigned Executive</label>
                      <select
                        className="form-select"
                        value={formData.assigned_user_name}
                        onChange={(e) => setFormData({ ...formData, assigned_user_name: e.target.value })}
                      >
                        <option value="David Miller (Sales Executive)">David Miller (Sales Executive)</option>
                        <option value="Alexander Vance (Sales Director)">Alexander Vance (Sales Director)</option>
                        <option value="Rajesh Kumar (Sales Executive)">Rajesh Kumar (Sales Executive)</option>
                      </select>
                    </div> */}
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
                    <span>{isSubmitting ? "Saving..." : "Save Lead"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            EDIT LEAD MODAL
            ------------------------------------------------------------------ */}
        {editLead && (
          <div className="modal-backdrop-custom" onClick={() => setEditLead(null)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-pencil-square text-info"></i> Edit Customer Lead
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditLead(null)}
                ></button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body-custom py-3">
                  {/* Customer Details */}
                  <h6 className="text-dark fw-bold mb-3 pb-1 border-bottom border-secondary">
                    1. Customer Details
                  </h6>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        Customer Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editLead.name}
                        onChange={(e) => setEditLead({ ...editLead, name: e.target.value })}
                        autoFocus
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editLead.email}
                        onChange={(e) => setEditLead({ ...editLead, email: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">
                        Phone Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        required
                        value={editLead.phone}
                        onChange={(e) => setEditLead({ ...editLead, phone: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editLead.city}
                        onChange={(e) => setEditLead({ ...editLead, city: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">State</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editLead.state || ""}
                        onChange={(e) => setEditLead({ ...editLead, state: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        <i className="bi bi-cake2-fill text-danger me-1"></i> Birth Date
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={editLead.birth_date ? (editLead.birth_date.split('T')[0] || editLead.birth_date) : ""}
                        onChange={(e) => setEditLead({ ...editLead, birth_date: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        <i className="bi bi-heart-fill text-primary me-1"></i> Anniversary Date
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={editLead.anniversary_date ? (editLead.anniversary_date.split('T')[0] || editLead.anniversary_date) : ""}
                        onChange={(e) => setEditLead({ ...editLead, anniversary_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Vehicle Requirement */}
                  <h6 className="text-dark fw-bold mb-3 pb-1 border-bottom border-secondary mt-4">
                    2. Vehicle Requirement & Priority
                  </h6>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Brand Name</label>
                      <select
                        className="form-select"
                        value={editLead.brand_id}
                        onChange={(e) => setEditLead({ ...editLead, brand_id: e.target.value })}
                      >
                        <option value="">Select Brand</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        Variant / Model <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editLead.model_variant}
                        onChange={(e) => setEditLead({ ...editLead, model_variant: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Lead Priority</label>
                      <select
                        className="form-select"
                        value={editLead.priority}
                        onChange={(e) => setEditLead({ ...editLead, priority: e.target.value })}
                      >
                        <option value="Hot">🔥 Hot</option>
                        <option value="Warm">☀️ Warm</option>
                        <option value="Cold">❄️ Cold</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">Purchase Timeline</label>
                      <select
                        className="form-select"
                        value={editLead.purchase_timeline}
                        onChange={(e) => setEditLead({ ...editLead, purchase_timeline: e.target.value })}
                      >
                        <option value="Immediate (Within 7 Days)">Immediate (Within 7 Days)</option>
                        <option value="15-30 Days">15-30 Days</option>
                        <option value="1-3 Months">1-3 Months</option>
                        <option value="Exploring / Later">Exploring / Later</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-bold small">
                        Total Deal Price / Budget (₹)
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light fw-bold">₹</span>
                        <input
                          type="number"
                          className="form-control fw-bold"
                          placeholder="e.g. 1450000"
                          value={editLead.budget || ""}
                          onChange={(e) => setEditLead({ ...editLead, budget: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tracking */}
                  <h6 className="text-dark fw-bold mb-3 pb-1 border-bottom border-secondary mt-4">
                    3. Tracking & Assignment
                  </h6>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">Lead Source</label>
                      <select
                        className="form-select"
                        value={editLead.source_id}
                        onChange={(e) => setEditLead({ ...editLead, source_id: e.target.value })}
                      >
                        <option value="">Choose Source</option>
                        {sources.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">Lead Status</label>
                      <select
                        className="form-select"
                        value={editLead.status_id}
                        onChange={(e) => setEditLead({ ...editLead, status_id: e.target.value })}
                      >
                        <option value="">Choose Status</option>
                        {statuses.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-dark fw-bold small">Assigned Executive</label>
                      <select
                        className="form-select"
                        value={editLead.assigned_user_name}
                        onChange={(e) => setEditLead({ ...editLead, assigned_user_name: e.target.value })}
                      >
                        <option value="David Miller (Sales Executive)">David Miller (Sales Executive)</option>
                        <option value="Alexander Vance (Sales Director)">Alexander Vance (Sales Director)</option>
                        <option value="Rajesh Kumar (Sales Executive)">Rajesh Kumar (Sales Executive)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-3">
                  <button
                    type="button"
                    className="btn btn-outline-custom"
                    onClick={() => setEditLead(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-check2"></i>
                    <span>{isSubmitting ? "Updating..." : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            VIEW LEAD DETAILS MODAL
            ------------------------------------------------------------------ */}
        {viewLead && (
          <div className="modal-backdrop-custom" onClick={() => setViewLead(null)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-person-badge text-info"></i> Customer Lead Profile
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setViewLead(null)}
                ></button>
              </div>

              <div className="modal-body-custom py-3">
                <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-secondary">
                  <div>
                    <h5 className="text-dark fw-bold mb-0">{viewLead.name}</h5>
                    <span className="text-muted small">{viewLead.city ? `${viewLead.city}, ${viewLead.state || ""}` : "Location not specified"}</span>
                  </div>
                  <span
                    className={`badge ${viewLead.priority === "Hot"
                      ? "bg-danger-subtle text-danger"
                      : viewLead.priority === "Warm"
                        ? "bg-warning-subtle text-warning"
                        : "bg-info-subtle text-info"
                      }`}
                  >
                    {viewLead.priority} Priority
                  </span>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <span className="text-muted small d-block">Phone Number</span>
                    <strong className="text-dark">{viewLead.phone}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted small d-block">Email Address</span>
                    <strong className="text-dark">{viewLead.email || "N/A"}</strong>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted small d-block">Vehicle Inquired</span>
                    <strong className="text-info">{viewLead.model_variant}</strong>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted small d-block">Birth Date</span>
                    <strong className="text-dark d-flex align-items-center gap-1">
                      {viewLead.birth_date ? new Date(viewLead.birth_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                      {viewLead.is_birthday_today && (
                        <span className="badge bg-danger-subtle text-danger small">🎂 Today!</span>
                      )}
                    </strong>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted small d-block">Anniversary Date</span>
                    <strong className="text-dark d-flex align-items-center gap-1">
                      {viewLead.anniversary_date ? new Date(viewLead.anniversary_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                      {viewLead.is_anniversary_today && (
                        <span className="badge bg-primary-subtle text-primary small">💐 Today!</span>
                      )}
                    </strong>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted small d-block">Brand / Segment</span>
                    <strong className="text-dark">{viewLead.brand?.name || viewLead.brand_name || viewLead.vehicle_segment}</strong>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted small d-block">Pipeline Stage</span>
                    <span className="badge bg-success-subtle text-success">{viewLead.status?.name || viewLead.status_name || "New"}</span>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted small d-block">Assigned Executive</span>
                    <strong className="text-dark">{viewLead.assigned_to_display || viewLead.assigned_user?.name || viewLead.assigned_user_name || "-"}</strong>
                  </div>
                  <div className="col-6 mt-2">
                    <span className="text-muted small d-block">Assigned By</span>
                    <strong className="text-dark">{viewLead.assigned_by_display || viewLead.assigned_by_user?.name || "-"}</strong>
                  </div>
                </div>

                {/* Assignment History Section */}
                <div className="mt-4 pt-3 border-top border-secondary">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="text-dark fw-bold mb-0 small">
                      <i className="bi bi-clock-history text-warning me-1"></i> Assignment History
                    </h6>
                    <span className="badge bg-secondary-subtle text-black small">
                      {leadAssignmentHistory.length} {leadAssignmentHistory.length === 1 ? "Record" : "Records"}
                    </span>
                  </div>

                  {isLoadingHistory ? (
                    <div className="text-center py-3 text-muted small">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading history...
                    </div>
                  ) : leadAssignmentHistory.length === 0 ? (
                    <div className="text-muted small py-2 px-3 rounded-2 bg-dark border">
                      No reassignment history recorded yet.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2" style={{ maxHeight: "180px", overflowY: "auto" }}>
                      {leadAssignmentHistory.map((hist) => (
                        <div
                          key={hist.id}
                          className="p-2 rounded-2"
                          style={{ background: "#161819", border: "1px solid #33383B" }}
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-white fw-bold small">
                              <i className="bi bi-person-check text-info me-1"></i>
                              {hist.assign_to_name || "Unassigned"}
                            </span>
                            <span className="text-muted" style={{ fontSize: "11px" }}>
                              {new Date(hist.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between mt-1">
                            <span className="text-muted" style={{ fontSize: "12px" }}>
                              By: <strong className="text-secondary">{hist.assign_by_name || "System"}</strong>
                            </span>
                            {hist.remarks && (
                              <span className="badge bg-dark border text-light" style={{ fontSize: "11px" }}>
                                {hist.remarks}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Follow-Up Interaction History */}
                <div className="mt-4 pt-3 border-top border-secondary">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="text-dark fw-bold mb-0 small">
                      <i className="bi bi-telephone-outbound-fill text-primary me-1"></i> Follow-Up Interaction History
                    </h6>
                    <span className="badge bg-primary-subtle text-primary small">
                      {leadFollowUpHistory.length} {leadFollowUpHistory.length === 1 ? "Call Log" : "Call Logs"}
                    </span>
                  </div>

                  {isLoadingFollowUps ? (
                    <div className="text-center py-3 text-muted small">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Loading follow-ups...
                    </div>
                  ) : leadFollowUpHistory.length === 0 ? (
                    <div className="text-muted small py-2 px-3 rounded-2 bg-dark border">
                      No follow-up interaction logged yet for this lead.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                      {leadFollowUpHistory.map((fu) => (
                        <div
                          key={fu.id}
                          className="p-2 rounded-2"
                          style={{ background: "#161819", border: "1px solid #33383B" }}
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-white fw-bold small">
                              <i className="bi bi-telephone-forward text-success me-1"></i>
                              {fu.type || "Phone Call"}: <span className="badge bg-info-subtle text-info border ms-1">{fu.status || "Follow-up"}</span>
                            </span>
                            <span className="text-muted" style={{ fontSize: "11px" }}>
                              {fu.follow_up_date} {fu.follow_up_time ? `• ${fu.follow_up_time}` : ""}
                            </span>
                          </div>
                          {fu.notes && (
                       <div className="text-light small mt-1"style={{ fontSize: "12px", opacity: 0.9 }}>
                         {fu.notes}
                        </div>
                          )}
                          <div className="d-flex align-items-center justify-content-between mt-1 text-muted" style={{ fontSize: "11px" }}>
                            <span>Logged by: <strong className="text-secondary">{fu.user_name || fu.user?.name || "Rep"}</strong></span>
                            {fu.next_follow_up_date && (
                              <span className="text-warning">
                                <i className="bi bi-calendar-event me-1"></i>
                                Next: {fu.next_follow_up_date} {fu.next_follow_up_time || ""}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer-custom d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  className="btn btn-outline-custom"
                  onClick={() => setViewLead(null)}
                >
                  Close
                </button>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-success d-inline-flex align-items-center gap-1"
                    onClick={() => {
                      const cur = viewLead;
                      setViewLead(null);
                      handleOpenFollowUpModal(cur);
                    }}
                  >
                    <i className="bi bi-telephone-plus-fill me-1"></i>
                    <span>Log Call</span>
                  </button>
                  <Link
                    href={`/admin/quotation/create?lead_id=${viewLead.id}`}
                    className="btn btn-primary d-inline-flex align-items-center gap-1"
                  >
                    <i className="bi bi-file-earmark-spreadsheet-fill me-1"></i>
                    <span>Send Quotation</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            DELETE CONFIRMATION MODAL
            ------------------------------------------------------------------ */}
        {deleteTarget && (
          <div className="modal-backdrop-custom" onClick={() => setDeleteTarget(null)}>
            <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-danger">
                  <i className="bi bi-exclamation-triangle-fill text-danger me-1"></i> Delete Customer Lead
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteTarget(null)}
                ></button>
              </div>

              <div className="modal-body-custom">
                <p className="text-dark mb-0">
                  Are you sure you want to delete lead for <strong>&quot;{deleteTarget.name}&quot;</strong>?
                </p>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-outline-custom"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteSubmit}>
                  Delete Lead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            BULK ASSIGN EXECUTIVE MODAL
            ------------------------------------------------------------------ */}
        {showBulkAssignModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowBulkAssignModal(false)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "480px" }}
            >
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom d-flex align-items-center gap-2 text-white mb-0 fs-5 fw-bold">
                  <i className="bi bi-person-check-fill text-info"></i> Bulk Assign Executives
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowBulkAssignModal(false)}
                ></button>
              </div>

              <div className="modal-body-custom py-3">
                <div
                  className="p-3 mb-3 rounded-2 dark-selection-box"
                  style={{ background: "#181A1B", border: "1px solid #33383B" }}
                >
                  <span className="small" style={{ color: "#FFFFFF" }}>
                    Assigning <strong style={{ color: "#FBBF24" }}>{selectedLeadIds.length}</strong> selected customer {selectedLeadIds.length === 1 ? "lead" : "leads"} to sales representative.
                  </span>
                </div>

                <div className="mb-3">
                  <label className="form-label text-dark fw-bold small">
                    Choose Sales Executive <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={bulkAssignUser}
                    onChange={(e) => setBulkAssignUser(e.target.value)}
                    autoFocus
                  >
                    <option value="">-- Choose Sales Executive --</option>
                    {usersList.length > 0 ? (
                      usersList.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} {user.role ? `(${user.role})` : ""}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="David Miller (Sales Executive)">David Miller (Sales Executive)</option>
                        <option value="Alexander Vance (Sales Director)">Alexander Vance (Sales Director)</option>
                        <option value="Rajesh Kumar (Sales Executive)">Rajesh Kumar (Sales Executive)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="form-label text-dark fw-bold small">
                    Remarks / Assignment Note <span className="text-muted small fw-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Assigned for immediate follow-up on SUV requirement"
                    value={bulkAssignRemarks}
                    onChange={(e) => setBulkAssignRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer-custom d-flex justify-content-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-outline-custom"
                  onClick={() => setShowBulkAssignModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary d-inline-flex align-items-center gap-1"
                  disabled={!bulkAssignUser || isSubmitting}
                  onClick={handleBulkAssignSubmit}
                >
                  <i className="bi bi-check2"></i>
                  <span>{isSubmitting ? "Assigning..." : `Assign ${selectedLeadIds.length} Leads`}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            BULK DELETE CONFIRMATION MODAL
            ------------------------------------------------------------------ */}
        {showBulkDeleteModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowBulkDeleteModal(false)}>
            <div
              className="modal-dialog-custom"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "450px" }}
            >
              <div className="modal-header-custom">
                <h5 className="modal-title-custom text-danger">
                  <i className="bi bi-exclamation-triangle-fill text-danger me-1"></i> Delete Selected Leads
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowBulkDeleteModal(false)}
                ></button>
              </div>

              <div className="modal-body-custom">
                <p className="text-dark mb-0">
                  Are you sure you want to permanently delete <strong>{selectedLeadIds.length}</strong> selected lead {selectedLeadIds.length === 1 ? "record" : "records"}? This action cannot be reversed.
                </p>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-outline-custom"
                  onClick={() => setShowBulkDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={isSubmitting}
                  onClick={handleBulkDeleteSubmit}
                >
                  {isSubmitting ? "Deleting..." : `Delete ${selectedLeadIds.length} Leads`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Convert Lead to Deal Modal */}
        {convertDealTarget && (
          <ConvertDealModal
            isOpen={Boolean(convertDealTarget)}
            lead={convertDealTarget}
            onClose={() => setConvertDealTarget(null)}
            onSuccess={(convertedId) => {
              setConvertedLeadIds((prev) => [...prev, convertedId]);
              fetchLeads();
            }}
            showToast={showToast}
          />
        )}

        {/* ------------------------------------------------------------------
            SMART IMPORT LEADS MODAL WITH COLUMN / FIELD MAPPING
            ------------------------------------------------------------------ */}
        <LeadImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            fetchLeads();
          }}
          apiUrl={API_URL}
          usersList={usersList}
          sources={sources}
          brands={brands}
          statuses={statuses}
          showToast={showToast}
        />

        {/* ------------------------------------------------------------------
            LOG CALL INTERACTION MODAL (Matches user's screenshot exactly)
            ------------------------------------------------------------------ */}
        {showFollowUpModal && (
          <div className="modal-backdrop-custom" onClick={() => setShowFollowUpModal(false)}>
            <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title-custom text-white mb-0 fs-5 fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-telephone-outbound-fill text-primary"></i> Log Call Interaction
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowFollowUpModal(false)}
                ></button>
              </div>

              <form onSubmit={handleFollowUpSubmit}>
                <div className="modal-body-custom">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Customer Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={followUpForm.customer}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, customer: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={followUpForm.phone}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Call Outcome</label>
                      <select
                        className="form-select"
                        value={followUpForm.outcome}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, outcome: e.target.value })}
                      >
                        <option value="Interested / Call Back">Interested / Call Back</option>
                        <option value="Test Drive Requested">Test Drive Requested</option>
                        <option value="Quotation Requested">Quotation Requested</option>
                        <option value="Ready for Booking">Ready for Booking</option>
                        <option value="Not Answering / Busy">Not Answering / Busy</option>
                        <option value="Price Too High">Price Too High</option>
                        <option value="Bought Competitor Car">Bought Competitor Car</option>
                        <option value="Showroom Visit Done">Showroom Visit Done</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Next Action Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={followUpForm.next_follow_up_date}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up_date: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Interaction Type</label>
                      <select
                        className="form-select"
                        value={followUpForm.type}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })}
                      >
                        <option value="Phone Call">Phone Call</option>
                        <option value="Showroom Visit">Showroom Visit</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Email">Email</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label text-dark fw-semibold small">Next Action Time</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 10:00 AM"
                        value={followUpForm.next_follow_up_time}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up_time: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label text-dark fw-semibold small">Call Notes & Conversation Summary</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Detail customer reaction, discount discussed, accessories requested, or loan requirements..."
                        value={followUpForm.notes}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer-custom d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-custom" onClick={() => setShowFollowUpModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success d-inline-flex align-items-center gap-1"
                    style={{ backgroundColor: "#4D5D25", borderColor: "#4D5D25" }}
                    disabled={isSubmittingFollowUp}
                  >
                    {isSubmittingFollowUp ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-1"></i> Save Interaction
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
