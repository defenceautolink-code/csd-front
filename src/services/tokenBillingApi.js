import api from "@/lib/axios";

/**
 * Generate Invoice & Token Billing API Service
 * Base: /api/token-billing
 */
export const tokenBillingApi = {
  /**
   * GET /api/token-billing
   * Complete Token Billing Dashboard (KPI Cards, Tab 1 Tokens, Tab 2 Invoices)
   */
  getDashboard: async () => {
    const response = await api.get("/token-billing");
    return response.data;
  },

  /**
   * GET /api/token-billing/tokens
   * Customer Tokens Ledgers list with pagination and search
   */
  getTokens: async (params = {}) => {
    const response = await api.get("/token-billing/tokens", { params });
    return response.data;
  },

  /**
   * GET /api/token-billing/tokens/{id}
   * Single Customer Token Ledger details with full bill history
   */
  getTokenDetails: async (id) => {
    const response = await api.get(`/token-billing/tokens/${id}`);
    return response.data;
  },

  /**
   * POST /api/token-billing/tokens
   * Create New Customer Token Ledger
   */
  createToken: async (payload) => {
    const response = await api.post("/token-billing/tokens", payload);
    return response.data;
  },

  /**
   * GET /api/token-billing/invoices
   * Tab 2 - All Invoices Master Register with pagination
   */
  getInvoices: async (params = {}) => {
    const response = await api.get("/token-billing/invoices", { params });
    return response.data;
  },

  /**
   * POST /api/token-billing/generate-invoice
   * Creates a new sequential invoice (DAL-/YYYY/MM/XXXX) and updates token ledger
   */
  generateInvoice: async (payload) => {
    const response = await api.post("/token-billing/generate-invoice", payload);
    return response.data;
  },

  /**
   * GET /api/token-billing/export-csv
   */
  exportCsv: async () => {
    const response = await api.get("/token-billing/export-csv", {
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * POST /api/token-billing/reset-demo
   * Gracefully handled
   */
  resetDemo: async () => {
    const response = await api.post("/token-billing/reset-demo");
    return response.data;
  },
};

export default tokenBillingApi;
