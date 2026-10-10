import api from "@/lib/axios";

/**
 * Dealership Analytics & Performance Reports API Service
 * Base: /api/reports
 */
export const reportApi = {
  /**
   * GET /api/reports/dealership-analytics
   * Returns all metrics (KPI Cards, Funnel, Lead Source, Leaderboard)
   */
  getDealershipAnalytics: async (params = {}) => {
    const cleanParams = {};
    if (params.period) cleanParams.period = params.period;
    if (params.time_range) cleanParams.time_range = params.time_range;
    if (params.start_date) cleanParams.start_date = params.start_date;
    if (params.from_date) cleanParams.from_date = params.from_date;
    if (params.end_date) cleanParams.end_date = params.end_date;
    if (params.to_date) cleanParams.to_date = params.to_date;
    if (params.brand_id) cleanParams.brand_id = params.brand_id;
    if (params.sales_executive_id) cleanParams.sales_executive_id = params.sales_executive_id;
    if (params.vehicle_segment) cleanParams.vehicle_segment = params.vehicle_segment;

    const response = await api.get("/reports/dealership-analytics", {
      params: cleanParams,
    });
    return response.data;
  },

  /**
   * GET /api/reports/kpi-summary
   */
  getKpiSummary: async (params = {}) => {
    const response = await api.get("/reports/kpi-summary", { params });
    return response.data;
  },

  /**
   * GET /api/reports/conversion-funnel
   */
  getConversionFunnel: async (params = {}) => {
    const response = await api.get("/reports/conversion-funnel", { params });
    return response.data;
  },

  /**
   * GET /api/reports/lead-source-attribution
   */
  getLeadSourceAttribution: async (params = {}) => {
    const response = await api.get("/reports/lead-source-attribution", { params });
    return response.data;
  },

  /**
   * GET /api/reports/executive-leaderboard
   */
  getExecutiveLeaderboard: async (params = {}) => {
    const response = await api.get("/reports/executive-leaderboard", { params });
    return response.data;
  },

  /**
   * GET /api/reports/export
   */
  exportReport: async (params = {}) => {
    const response = await api.get("/reports/export", { params });
    return response.data;
  },
};

export default reportApi;
