import api from "@/lib/axios";

/**
 * Unified Lead API Service
 * Single API service for retrieving and managing dealership leads.
 * Backend automatically handles role-based authorization for the authenticated user.
 */
export const leadApi = {
  /**
   * Get leads with optional filtering, search, and pagination
   * @param {Object} [params={}] - { search, priority, vehicle_segment, status, status_id, brand_id, source_id, page, per_page }
   * @returns {Promise<Object>} { status: true, data: Array, pagination: Object }
   */
  getLeads: async (params = {}) => {
    const response = await api.get("/leads", { params });
    return response.data;
  },

  /**
   * Get single lead details by ID
   * @param {number|string} id - Lead ID
   * @returns {Promise<Object>} { status: true, data: Object }
   */
  getLead: async (id) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  /**
   * Create a new customer lead
   * @param {Object} data - Lead payload
   * @returns {Promise<Object>}
   */
  createLead: async (data) => {
    const response = await api.post("/leads", data);
    return response.data;
  },

  /**
   * Update an existing customer lead
   * @param {number|string} id - Lead ID
   * @param {Object} data - Updated lead payload
   * @returns {Promise<Object>}
   */
  updateLead: async (id, data) => {
    const response = await api.put(`/leads/${id}`, data);
    return response.data;
  },

  /**
   * Delete a single lead
   * @param {number|string} id - Lead ID
   * @returns {Promise<Object>}
   */
  deleteLead: async (id) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  /**
   * Bulk Delete leads
   * @param {Array<number|string>} leadIds
   * @returns {Promise<Object>}
   */
  bulkDelete: async (leadIds) => {
    const response = await api.post("/leads/bulk-delete", { lead_ids: leadIds });
    return response.data;
  },

  /**
   * Bulk Import customer leads from Excel/CSV
   * @param {Array<Object>} leads - Array of mapped lead objects
   * @returns {Promise<Object>} 
   */
  bulkImport: async (leads) => {
    const response = await api.post("/leads/bulk-import", { leads });
    return response.data;
  },

  /**
   * Bulk Update Lead Status
   * @param {Array<number|string>} leadIds
   * @param {number|string} statusId
   * @param {string} [statusName]
   * @returns {Promise<Object>}
   */
  bulkStatus: async (leadIds, statusId, statusName = "") => {
    const response = await api.post("/leads/bulk-status", {
      lead_ids: leadIds,
      status_id: statusId,
      status_name: statusName,
    });
    return response.data;
  },

  /**
   * Bulk Update Lead Priority
   * @param {Array<number|string>} leadIds
   * @param {string} priority - 'Hot' | 'Warm' | 'Cold'
   * @returns {Promise<Object>}
   */
  bulkPriority: async (leadIds, priority) => {
    const response = await api.post("/leads/bulk-priority", {
      lead_ids: leadIds,
      priority,
    });
    return response.data;
  },

  /**
   * Bulk Assign Leads to a Sales Representative
   * @param {Array<number|string>} leadIds
   * @param {number|string} assignToUserId
   * @param {string} [remarks='']
   * @returns {Promise<Object>}
   */
  bulkAssign: async (leadIds, assignToUserId, remarks = "") => {
    const response = await api.post("/leads/bulk-assign", {
      lead_ids: leadIds,
      assign_to: assignToUserId,
      remarks,
    });
    return response.data;
  },

  /**
   * Get assignment history records for a specific lead
   * @param {number|string} leadId
   * @returns {Promise<Object>}
   */
  getAssignmentHistory: async (leadId) => {
    const response = await api.get(`/leads/${leadId}/assignments`);
    return response.data;
  },

  /**
   * Trigger immediate Birthday & Anniversary greeting dispatch
   * @returns {Promise<Object>}
   */
  sendGreetingsNow: async () => {
    const response = await api.get("/leads/send-greetings-now");
    return response.data;
  },

  /**
   * Create/log a follow-up interaction for a lead
   * @param {number|string} leadId
   * @param {Object} data - { outcome, remarks, next_follow_up_date, ... }
   * @returns {Promise<Object>}
   */
  createFollowUp: async (leadId, data) => {
    const response = await api.post(`/sales-executive/leads/${leadId}/follow-ups`, data);
    return response.data;
  },

  /**
   * Fetch all master dropdown records in parallel
   * (Brands, Lead Sources, Lead Statuses, Users)
   * @returns {Promise<Object>} { brands, sources, statuses, users }
   */
  getMasterData: async () => {
    const [brandRes, sourceRes, statusRes, userRes] = await Promise.all([
      api.get("/brands").catch(() => ({ data: { data: [] } })),
      api.get("/lead-sources").catch(() => ({ data: { data: [] } })),
      api.get("/lead-statuses").catch(() => ({ data: { data: [] } })),
      api.get("/users").catch(() => ({ data: { data: [] } })),
    ]);

    return {
      brands: brandRes.data?.data || [],
      sources: sourceRes.data?.data || [],
      statuses: statusRes.data?.data || [],
      users: userRes.data?.data || [],
    };
  },
};

export default leadApi;
