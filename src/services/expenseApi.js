import api from "@/lib/axios";

export const expenseApi = {
  // ==========================================
  // 1. EXPENSE CATEGORIES MASTER API
  // ==========================================

  /**
   * Get all expense categories
   * @param {Object} [params] { search, status }
   */
  getCategories: async (params = {}) => {
    const response = await api.get("/expense-categories", { params });
    return response.data;
  },

  /**
   * Get single category details
   * @param {number|string} id
   */
  getCategory: async (id) => {
    const response = await api.get(`/expense-categories/${id}`);
    return response.data;
  },

  /**
   * Create a new expense category
   * @param {Object} data { name, description, status }
   */
  createCategory: async (data) => {
    const cleanDesc = (data.description ? String(data.description).trim() : "") || "desc";
    const response = await api.post("/expense-categories", {
      name: data.name || data.title,
      description: cleanDesc,
      status: data.status !== undefined ? Number(data.status) : 1,
    });
    return response.data;
  },

  /**
   * Update category
   * @param {number|string} id
   * @param {Object} data { name, description, status }
   */
  updateCategory: async (id, data) => {
    const cleanDesc = (data.description ? String(data.description).trim() : "") || "desc";
    const response = await api.put(`/expense-categories/${id}`, {
      name: data.name || data.title,
      description: cleanDesc,
      status: data.status !== undefined ? Number(data.status) : 1,
    });
    return response.data;
  },

  /**
   * Toggle Active / Inactive status
   * @param {number|string} id
   */
  toggleCategoryStatus: async (id) => {
    const response = await api.patch(`/expense-categories/${id}/toggle-status`);
    return response.data;
  },

  /**
   * Delete category
   * @param {number|string} id
   */
  deleteCategory: async (id) => {
    const response = await api.delete(`/expense-categories/${id}`);
    return response.data;
  },

  // ==========================================
  // 2. EXPENSES TRACKING & STATS API
  // ==========================================

  /**
   * Get expense records with optional filters
   * @param {Object} [params] { category_id, payment_method, status, from_date, to_date, search, page, per_page }
   */
  getExpenses: async (params = {}) => {
    const response = await api.get("/expenses", { params });
    return response.data;
  },

  /**
   * Get expense statistics & analytics
   */
  getExpenseStats: async () => {
    const response = await api.get("/expenses/stats");
    return response.data;
  },

  /**
   * Get single expense details
   * @param {number|string} id
   */
  getExpense: async (id) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },

  /**
   * Create an expense entry
   * @param {Object|FormData} data
   */
  createExpense: async (data) => {
    let headers = {};
    let payload = data;

    // Check if FormData is passed for file upload
    if (typeof FormData !== "undefined" && data instanceof FormData) {
      headers["Content-Type"] = "multipart/form-data";
    }

    const response = await api.post("/expenses", payload, { headers });
    return response.data;
  },

  /**
   * Update an expense entry
   * @param {number|string} id
   * @param {Object|FormData} data
   */
  updateExpense: async (id, data) => {
    let headers = {};
    let payload = data;

    if (typeof FormData !== "undefined" && data instanceof FormData) {
      headers["Content-Type"] = "multipart/form-data";
      // Laravel sometimes expects POST with _method=PUT for multipart forms
      const response = await api.post(`/expenses/${id}?_method=PUT`, payload, { headers });
      return response.data;
    }

    const response = await api.put(`/expenses/${id}`, payload);
    return response.data;
  },

  /**
   * Delete an expense
   * @param {number|string} id
   */
  deleteExpense: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
};

export default expenseApi;
