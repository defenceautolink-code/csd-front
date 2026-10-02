import api from "./axios";

/**
 * Sales Executive API Service
 * Interacts with backend /api/sales-executive routes
 */
export const salesExecutiveApi = {
  /**
   * Get all leads assigned to authenticated Sales Executive
   * @param {Object} params - { search, status, priority, date, page, per_page }
   */
  getAssignedLeads: async (params = {}) => {
    const response = await api.get("/sales-executive/leads", { params });
    return response.data;
  },

  /**
   * Get details for an assigned lead
   * @param {number|string} id - Lead ID
   */
  getLeadDetails: async (id) => {
    const response = await api.get(`/sales-executive/leads/${id}`);
    return response.data;
  },

  /**
   * Get follow-up interaction history for an assigned lead
   * @param {number|string} leadId - Lead ID
   */
  getFollowUps: async (leadId) => {
    const response = await api.get(`/sales-executive/leads/${leadId}/follow-ups`);
    return response.data;
  },

  /**
   * Create/log a new follow-up interaction for an assigned lead
   * @param {number|string} leadId - Lead ID
   * @param {Object} data - Follow-up form data
   */
  createFollowUp: async (leadId, data) => {
    const response = await api.post(`/sales-executive/leads/${leadId}/follow-ups`, data);
    return response.data;
  },

  /**
   * Get master lead statuses for dropdowns
   */
  getLeadStatuses: async () => {
    const response = await api.get("/lead-statuses");
    return response.data;
  },
};

export default salesExecutiveApi;
