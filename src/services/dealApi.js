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

  // Harmonize deal status for UI badges & filtering
  let displayStatus = "Booked";
  if (balanceAmount === 0 && paidAmount > 0) {
    displayStatus = "Fully Paid";
  } else if (paidAmount > 0) {
    displayStatus = "Partially Paid";
  } else if (d.deal_status === "booking_confirmed" || d.deal_status === "Booked") {
    displayStatus = "Booked";
  } else if (d.deal_status) {
    displayStatus = d.deal_status;
  }

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
    quotation_id: d.quotation_id || d.lead?.quotation_id || null,
    quotation: d.quotation || null,
    total_amount: totalAmount,
    discount_amount: discountAmount,
    net_amount: netAmount,
    paid_amount: paidAmount,
    total_paid: paidAmount,
    balance_amount: balanceAmount,
    balance_due: balanceAmount,
    deal_status: displayStatus,
    raw_status: d.deal_status,
    expected_delivery_date: d.expected_delivery_date || "",
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
    // Determine safe 
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

    // Determine safe 
    const validExecId =
      payload.sales_executive_id && Number(payload.sales_executive_id) !== 5
        ? Number(payload.sales_executive_id)
        : leadContext?.assigned_to && Number(leadContext.assigned_to) !== 5
        ? Number(leadContext.assigned_to)
        : currentUserId || 1;

    // 1. Build clean backend payload strictly conforming to Laravel API rules
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

    // If no initial advance 
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
      // Call live API directly
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
   * Get all deals dynamically from backend 
   */
  getDeals: async () => {
    const response = await api.get("/deals");
    if (response.data && Array.isArray(response.data.data)) {
      const normalizedList = response.data.data.map(normalizeDeal);
      return {
        ...response.data,
        data: normalizedList,
      };
    }
    return {
      status: true,
      data: [],
    };
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

    // Call live API directly
    const response = await api.post("/payments", apiPayload);
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
