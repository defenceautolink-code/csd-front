import api from "@/lib/axios";

/**
 * Business Logic Calculation Helpers
 * 
 * - Insurance Expire Date: Exactly 365 days (1 year) after delivery_date.
 * - Reminder Date: Exactly 15 days before expiration (350 days after delivery_date).
 * - Renewal Calculation: When renewed, 365 days are added to existing expire date,
 *   and reminder date is set 15 days before new expire date.
 */
export function calculateExpireDate(deliveryDateStr) {
  if (!deliveryDateStr) return "";
  const d = new Date(deliveryDateStr);
  d.setDate(d.getDate() + 365);
  return d.toISOString().split("T")[0];
}

export function calculateReminderDate(expireDateStr) {
  if (!expireDateStr) return "";
  const d = new Date(expireDateStr);
  d.setDate(d.getDate() - 15);
  return d.toISOString().split("T")[0];
}

export function calculateRenewalDates(currentExpireDateStr) {
  if (!currentExpireDateStr) {
    const today = new Date();
    today.setDate(today.getDate() + 365);
    const newExp = today.toISOString().split("T")[0];
    const newRem = calculateReminderDate(newExp);
    return { newExpireDate: newExp, newReminderDate: newRem };
  }
  const d = new Date(currentExpireDateStr);
  d.setDate(d.getDate() + 365);
  const newExpireDate = d.toISOString().split("T")[0];
  const newReminderDate = calculateReminderDate(newExpireDate);
  return { newExpireDate, newReminderDate };
}

// Helper to execute request with automatic retry on momentary 500 DB connection drops
async function fetchWithRetry(requestFn, retries = 1, delayMs = 600) {
  try {
    return await requestFn();
  } catch (err) {
    if (retries > 0 && (err.response?.status === 500 || !err.response)) {
      console.warn(`[insuranceApi] Retrying request due to status ${err.response?.status || "network"}...`);
      await new Promise((res) => setTimeout(res, delayMs));
      return fetchWithRetry(requestFn, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

const insuranceApi = {
  /**
   * 1️⃣ List Insurance Records (Table View)
   * Method: GET
   * Endpoint: /api/insurances
   * 
   * Query Parameters:
   * - search: Searches across deal_id, customer_name, customer_number, customer_city, model_variant, and color.
   * - city / customer_city: Filter by customer city (case-insensitive partial match).
   * - model / model_variant: Filter by vehicle model & variant name.
   * - color: Filter by vehicle color (fetched from deals table).
   * - deal_id: Filter by specific deal ID.
   * - status: Filter by status: expiring_soon (reminder due), expired, active.
   * - date_field: Field to filter dates by (delivery_date, insurance_expire_date, reminder_date). Default: insurance_expire_date
   * - from_date: Start date filter (YYYY-MM-DD)
   * - to_date: End date filter (YYYY-MM-DD)
   * - page: Page number for pagination (default: 1)
   * - per_page: Number of items per page (default: 15. Pass all or -1 to disable pagination)
   */
  getInsurances: async (params = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach((key) => {
      const val = params[key];
      if (val !== undefined && val !== null && val !== "" && val !== "all_status") {
        cleanParams[key] = val;
      }
    });

    try {
      const response = await fetchWithRetry(() =>
        api.get("/insurances", {
          params: cleanParams,
          headers: {
            Accept: "application/json",
          },
        })
      );

      return response.data;
    } catch (err) {
      console.error("[insuranceApi.getInsurances Error]:", err.response?.data || err.message);
      // Return safe fallback format if backend database has a momentary hitch
      return {
        status: false,
        message: err.response?.data?.message || err.message || "Failed to retrieve insurance records",
        data: [],
        pagination: {
          current_page: Number(cleanParams.page || 1),
          last_page: 1,
          per_page: Number(cleanParams.per_page || 15),
          total: 0,
          from: 0,
          to: 0,
        },
        error: err.response?.data || err.message,
      };
    }
  },

  /**
   * 2️⃣ Store / Create New Insurance Record
   * Method: POST
   * Endpoint: /api/insurances/store
   * 
   * Body:
   * - customer_name (Required)
   * - customer_phone / customer_number (Required)
   * - deal_id (Optional)
   * - customer_email (Optional)
   * - customer_city / customer_address (Optional)
   * - model_variant / vehicle_name (Optional)
   * - color (Optional)
   * - delivery_date (Optional, YYYY-MM-DD. Defaults to current date if omitted)
   * - premium_amount (Optional, number)
   * - idv_amount (Optional, number)
   * - registration_number (Optional)
   * - vin_chassis_number (Optional)
   * - engine_number (Optional)
   * - notes (Optional)
   */
  createInsurance: async (data) => {
    const payload = {
      customer_name: data.customer_name?.trim(),
      customer_phone: (data.customer_phone || data.customer_number || "")?.trim(),
      customer_number: (data.customer_number || data.customer_phone || "")?.trim(),
      customer_email: data.customer_email?.trim() || null,
      customer_city: (data.customer_city || data.customer_address || "")?.trim() || null,
      customer_address: (data.customer_address || data.customer_city || "")?.trim() || null,
      model_variant: (data.model_variant || data.vehicle_name || "")?.trim() || null,
      vehicle_name: (data.model_variant || data.vehicle_name || "")?.trim() || null,
      color: data.color?.trim() || "Standard",
      delivery_date: data.delivery_date || new Date().toISOString().split("T")[0],
      deal_id: data.deal_id ? Number(data.deal_id) : null,
      notes: data.notes || null,
    };

    if (data.premium_amount !== undefined && data.premium_amount !== "") {
      payload.premium_amount = Number(data.premium_amount);
    }
    if (data.idv_amount !== undefined && data.idv_amount !== "") {
      payload.idv_amount = Number(data.idv_amount);
    }
    if (data.registration_number) {
      payload.registration_number = data.registration_number.trim();
    }
    if (data.vin_chassis_number) {
      payload.vin_chassis_number = data.vin_chassis_number.trim();
    }
    if (data.engine_number) {
      payload.engine_number = data.engine_number.trim();
    }

    const response = await fetchWithRetry(() =>
      api.post("/insurances/store", payload, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
    );

    return response.data;
  },

  /**
   * 3️⃣ Renew / Update Insurance Policy
   * Method: POST (or PUT)
   * Endpoint: /api/insurances/{id}/renew
   * 
   * Path Parameter: id
   * Request Body: {}
   */
  renewInsurance: async (id, data = {}) => {
    const response = await fetchWithRetry(() =>
      api.post(`/insurances/${id}/renew`, data, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
    );

    return response.data;
  },
};

export default insuranceApi;
