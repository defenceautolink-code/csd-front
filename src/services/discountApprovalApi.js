import api from "@/lib/axios";

const APPROVALS_STORAGE_KEY = "csd_discount_approvals_cache";

/**
 * Approvals cache key
 */
const DEFAULT_APPROVALS = [];

/**
 * Helper to get approvals from local cache
 */
export function getLocalApprovals() {
  if (typeof window === "undefined") return DEFAULT_APPROVALS;
  try {
    const raw = localStorage.getItem(APPROVALS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify(DEFAULT_APPROVALS));
      return DEFAULT_APPROVALS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_APPROVALS;
  }
}

/**
 * Helper to save approvals to local cache
 */
export function saveLocalApprovals(approvals) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify(approvals));
    window.dispatchEvent(new Event("csd_approvals_updated"));
  } catch (e) {
    console.error("Failed to save approvals cache:", e);
  }
}

export const discountApprovalApi = {
  /**
   * Get all pending discount approvals for Admin & Sales Manager Dashboard
   */
  getPendingApprovals: async () => {
    try {
      const response = await api.get("/discount-approvals/pending").catch(() => null);
      if (response && response.data && response.data.status && Array.isArray(response.data.data)) {
        return response.data.data;
      }
    } catch (_) {}

    // Fallback to local cache filtered by pending
    const all = getLocalApprovals();
    return all.filter((a) => a.status === "pending");
  },

  /**
   * Create a new discount request (called during Log Follow-up)
   * @param {Object} payload
   */
  createDiscountRequest: async (payload) => {
    let currentUserName = "Sales Executive";
    if (typeof window !== "undefined") {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        if (u.name) currentUserName = u.name + (u.role ? ` (${u.role})` : "");
      } catch (_) {}
    }

    const newRequest = {
      id: Date.now(),
      lead_id: Number(payload.lead_id),
      customer_name: payload.customer_name || "Customer",
      customer_phone: payload.customer_phone || "",
      vehicle_name: payload.vehicle_name || payload.model_variant || "Vehicle",
      requested_by_name: payload.requested_by_name || currentUserName,
      discount_amount: Number(payload.discount_amount || 0),
      proposed_price: payload.proposed_price ? Number(payload.proposed_price) : null,
      reason: payload.reason || "Customer requested special pricing",
      status: "pending",
      created_at: new Date().toISOString(),
    };

    // Attempt backend API call
    try {
      const response = await api.post("/discount-approvals", newRequest).catch(() => null);
      if (response && response.data && response.data.status) {
        window.dispatchEvent(new Event("csd_approvals_updated"));
        return response.data;
      }
    } catch (_) {}

    // Fallback save in local cache
    const current = getLocalApprovals();
    // Replace any existing pending for this lead or prepend
    const filtered = current.filter((a) => !(Number(a.lead_id) === Number(payload.lead_id) && a.status === "pending"));
    filtered.unshift(newRequest);
    saveLocalApprovals(filtered);

    return { status: true, data: newRequest, message: "Discount approval request sent to Sales Manager & Admin!" };
  },

  /**
   * Approve or Reject an approval request
   * @param {number|string} id
   * @param {'approve'|'reject'} action
   * @param {string} [remarks]
   */
  takeApprovalAction: async (id, action, remarks = "") => {
    let reviewerName = "Manager / Admin";
    if (typeof window !== "undefined") {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        if (u.name) reviewerName = u.name;
      } catch (_) {}
    }

    const payload = {
      action: action.toLowerCase(),
      remarks: remarks || (action.toLowerCase() === "approve" ? "Approved by " + reviewerName : "Rejected by " + reviewerName),
    };

    try {
      const response = await api.post(`/discount-approvals/${id}/action`, payload).catch(() => null);
      if (response && response.data && response.data.status) {
        window.dispatchEvent(new Event("csd_approvals_updated"));
        return response.data;
      }
    } catch (_) {}

    // Fallback update in local cache
    const current = getLocalApprovals();
    const updated = current.map((item) => {
      if (String(item.id) === String(id)) {
        return {
          ...item,
          status: action.toLowerCase() === "approve" ? "approved" : "rejected",
          action_by: reviewerName,
          action_at: new Date().toISOString(),
          action_remarks: payload.remarks,
        };
      }
      return item;
    });

    saveLocalApprovals(updated);
    return {
      status: true,
      message: action.toLowerCase() === "approve" ? "Discount request approved!" : "Discount request rejected.",
    };
  },

  /**
   * Get discount status for a specific lead
   * @param {number|string} leadId
   */
  getLeadApprovalStatus: (leadId) => {
    const list = getLocalApprovals();
    const match = list.find((a) => String(a.lead_id) === String(leadId));
    return match || null;
  },
};

export default discountApprovalApi;
