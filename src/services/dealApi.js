import api from "@/lib/axios";

const CONVERTED_LEADS_KEY = "csd_converted_lead_ids";

/**
 * Normalizes deal data returned from Laravel Backend API
 */
export function normalizeDeal(d) {
  if (!d) return null;
  const totalAmount = Number(d.total_amount) || 0;
  const discountAmount = Number(d.discount_amount) || 0;
  const netAmount = Number(d.net_amount) || Math.max(0, totalAmount - discountAmount);
  const paidAmount = Number(d.total_paid ?? d.paid_amount ?? 0);
  const balanceAmount = Number(d.balance_due ?? d.balance_amount ?? Math.max(0, netAmount - paidAmount));

  // Determine computed payment status
  let paymentStatus = "Pending";
  if (balanceAmount === 0 && paidAmount > 0) {
    paymentStatus = "Fully Paid";
  } else if (paidAmount > 0) {
    paymentStatus = "Partially Paid";
  } else if (d.payment_status === "paid") {
    paymentStatus = "Fully Paid";
  } else if (d.payment_status === "partially_paid") {
    paymentStatus = "Partially Paid";
  }

  // Preserve true vehicle delivery stage
  const dealStage = d.deal_status || "booking_confirmed";

  return {
    ...d,
    id: d.id,
    deal_number: d.deal_number || `#DEAL-${d.id}`,
    customer_name: d.customer_name || d.lead?.name || "Customer",
    customer_phone: d.customer_phone || d.lead?.phone || "",
    customer_email: d.customer_email || d.lead?.email || "",
    model_variant: d.model_variant || d.lead?.model_variant || "Standard Variant",
    vehicle_segment: d.vehicle_segment || d.lead?.vehicle_segment || "4 Wheeler",
    color: d.color || "Standard",
    vin_chassis_number: d.vin_chassis_number || "",
    engine_number: d.engine_number || "",
    registration_number: d.registration_number || "",
    quotation_id: d.quotation_id || d.lead?.quotation_id || null,
    quotation: d.quotation || null,
    total_amount: totalAmount,
    discount_amount: discountAmount,
    net_amount: netAmount,
    paid_amount: paidAmount,
    total_paid: paidAmount,
    balance_amount: balanceAmount,
    balance_due: balanceAmount,
    deal_status: dealStage,
    payment_status: paymentStatus,
    raw_status: d.deal_status,
    expected_delivery_date: d.expected_delivery_date || "",
    actual_delivery_date: d.actual_delivery_date || "",
    notes: d.notes || "",
    payments: Array.isArray(d.payments) ? d.payments : [],
    created_at: d.created_at || new Date().toISOString(),
  };
}

// Helpers for tracking converted leads locally if needed
export function getConvertedLeadIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONVERTED_LEADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function markLeadAsConverted(leadId) {
  if (typeof window === "undefined" || !leadId) return;
  try {
    const ids = getConvertedLeadIds();
    if (!ids.includes(Number(leadId)) && !ids.includes(String(leadId))) {
      ids.push(leadId);
      localStorage.setItem(CONVERTED_LEADS_KEY, JSON.stringify(ids));
      window.dispatchEvent(new Event("csd_leads_converted_updated"));
    }
  } catch (e) {
    console.error("Error marking lead as converted:", e);
  }
}

export const dealApi = {
  /**
   * Convert Lead to Deal 
   * @param {Object} payload
   */
  convertLead: async (payload, leadContext = null) => {
    let currentUserId = 1;
    if (typeof window !== "undefined") {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          if (userObj?.id) currentUserId = Number(userObj.id);
        }
      } catch (e) {}
    }

    const validExecId =
      payload.sales_executive_id && Number(payload.sales_executive_id) !== 5
        ? Number(payload.sales_executive_id)
        : leadContext?.assigned_to && Number(leadContext.assigned_to) !== 5
        ? Number(leadContext.assigned_to)
        : currentUserId || 1;

    const apiPayload = {
      lead_id: Number(payload.lead_id),
      total_amount: Number(payload.total_amount),
      discount_amount: Number(payload.discount_amount || 0),
      color: payload.color ? String(payload.color).trim() : "Standard",
      vin_chassis_number: payload.vin_chassis_number ? String(payload.vin_chassis_number).trim() : "",
      expected_delivery_date: payload.expected_delivery_date || null,
      quotation_id: payload.quotation_id ? Number(payload.quotation_id) : null,
      sales_executive_id: validExecId,
      user_id: currentUserId,
      created_by: currentUserId,
    };

    const initialAmount = Number(payload.initial_payment?.amount || 0);
    if (initialAmount > 0) {
      let mode = payload.initial_payment.payment_mode || "upi";
      if (!["cash", "cheque", "upi", "neft_rtgs"].includes(mode)) {
        mode = "neft_rtgs";
      }
      let type = payload.initial_payment.payment_type || "token_advance";
      if (!["token_advance", "down_payment", "part_payment", "refund"].includes(type)) {
        type = "token_advance";
      }

      apiPayload.initial_payment = {
        amount: initialAmount,
        payment_type: type,
        payment_mode: mode,
        transaction_reference: payload.initial_payment.transaction_reference ? String(payload.initial_payment.transaction_reference).trim() : "",
        bank_name: payload.initial_payment.bank_name ? String(payload.initial_payment.bank_name).trim() : "",
        notes: payload.initial_payment.notes ? String(payload.initial_payment.notes).trim() : "Initial booking advance",
      };
    }

    try {
      const response = await api.post("/deals/convert-lead", apiPayload);
      markLeadAsConverted(payload.lead_id);
      window.dispatchEvent(new Event("csd_deals_updated"));
      return response.data;
    } catch (err) {
      console.error("convertLead API error:", err.response?.data || err.message);
      throw err;
    }
  },

  /**
   * Get all deals dynamically from backend with pagination
   */
  getDeals: async (params = {}) => {
    const response = await api.get("/deals", { params });
    if (response.data && Array.isArray(response.data.data)) {
      const normalizedList = response.data.data.map(normalizeDeal);
      return {
        status: true,
        data: normalizedList,
        pagination: response.data.pagination || null,
      };
    }
    return {
      status: true,
      data: [],
      pagination: null,
    };
  },

  /**
   * Get overall analytics & deal metrics directly from database
   */
  getDealStats: async () => {
    const response = await api.get("/deals/stats");
    return response.data;
  },

  /**
   * Get single deal details 
   * @param {number|string} id
   */
  getDeal: async (id) => {
    const response = await api.get(`/deals/${id}`);
    if (response.data?.data) {
      return {
        ...response.data,
        data: normalizeDeal(response.data.data),
      };
    }
    return response.data;
  },

  /**
   * Update an existing deal (delivery status, chassis no, delivery date, notes)
   * @param {number|string} id
   * @param {Object} data
   */
  updateDeal: async (id, data) => {
    const response = await api.put(`/deals/${id}`, data);
    window.dispatchEvent(new Event("csd_deals_updated"));
    return response.data;
  },

  /**
   * Delete a deal
   * @param {number|string} id
   */
  deleteDeal: async (id) => {
    const response = await api.delete(`/deals/${id}`);
    window.dispatchEvent(new Event("csd_deals_updated"));
    return response.data;
  },

  /**
   * Add a payment for a deal dynamically 
   * @param {Object} payload 
   */
  addPayment: async (payload) => {
    let mode = payload.payment_mode || "upi";
    if (!["cash", "cheque", "upi", "neft_rtgs"].includes(mode)) {
      mode = "neft_rtgs";
    }
    let type = payload.payment_type || "down_payment";
    if (!["token_advance", "down_payment", "part_payment", "refund"].includes(type)) {
      type = "part_payment";
    }

    const apiPayload = {
      deal_id: Number(payload.deal_id),
      amount: Number(payload.amount),
      payment_type: type,
      payment_mode: mode,
      payment_date: payload.payment_date || new Date().toISOString().split("T")[0],
      transaction_reference: payload.transaction_reference ? String(payload.transaction_reference).trim() : "",
      bank_name: payload.bank_name ? String(payload.bank_name).trim() : "",
      notes: payload.notes ? String(payload.notes).trim() : "",
    };

    const response = await api.post("/payments", apiPayload);
    window.dispatchEvent(new Event("csd_deals_updated"));
    return response.data;
  },

  /**
   * Verify / Clear or Reject a payment receipt
   * @param {number|string} paymentId
   * @param {string} action - 'clear' or 'reject'
   * @param {string} [rejectionReason]
   */
  verifyPayment: async (paymentId, action = "clear", rejectionReason = "") => {
    const payload = { action };
    if (rejectionReason) payload.rejection_reason = rejectionReason;
    const response = await api.post(`/payments/${paymentId}/verify`, payload);
    window.dispatchEvent(new Event("csd_deals_updated"));
    return response.data;
  },

  /**
   * Get all payments dynamically from backend 
   * @param {Object} [params]
   */
  getPayments: async (params = {}) => {
    const response = await api.get("/payments", { params });
    return response.data;
  },
};

export default dealApi;
