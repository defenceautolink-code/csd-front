import api from "./axios";

/**
 * Quotation API Service
 * Interacts with backend /api/quotations and /api/leads/{id}/quotation
 */
export const quotationApi = {
  /**
   * Get pre-filled customer & requirement details from a lead for quotation creation
   * @param {number|string} leadId - Lead ID
   */
  getLeadForQuotation: async (leadId) => {
    const response = await api.get(`/leads/${leadId}/quotation`);
    return response.data;
  },

  /**
   * Get list of quotations with filters and pagination
   * @param {Object} params - { search, status, lead_id, date, from_date, to_date, page, per_page }
   */
  getQuotations: async (params = {}) => {
    const response = await api.get("/quotations", { params });
    return response.data;
  },

  /**
   * Get single quotation details with items and lead info
   * @param {number|string} id - Quotation ID
   */
  getQuotation: async (id) => {
    const response = await api.get(`/quotations/${id}`);
    return response.data;
  },

  /**
   * Create a new quotation
   * @param {Object} data - Quotation payload including items array
   */
  createQuotation: async (data) => {
    const response = await api.post("/quotations", data);
    return response.data;
  },

  /**
   * Update an existing quotation
   * @param {number|string} id - Quotation ID
   * @param {Object} data - Updated quotation payload
   */
  updateQuotation: async (id, data) => {
    const response = await api.put(`/quotations/${id}`, data);
    return response.data;
  },

  /**
   * Delete a quotation
   * @param {number|string} id - Quotation ID
   */
  deleteQuotation: async (id) => {
    const response = await api.delete(`/quotations/${id}`);
    return response.data;
  },

  /**
   * Send quotation to customer via email with PDF attachment
   * @param {number|string} id - Quotation ID
   * @param {Object} payload - { recipient_email, custom_subject, custom_message }
   */
  sendQuotationEmail: async (id, payload = {}) => {
    const response = await api.post(`/quotations/${id}/send`, payload);
    return response.data;
  },

  /**
   * Download quotation PDF
   * @param {number|string} id - Quotation ID
   * @param {string} quotationNumber - Quotation reference number for filename
   */
  downloadPdf: async (id, quotationNumber = "Quotation") => {
    const response = await api.get(`/quotations/${id}/pdf`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Quotation-${quotationNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  },
};

export default quotationApi;
