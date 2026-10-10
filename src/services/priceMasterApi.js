import api from "@/lib/axios";

/**
 * Vehicle Price Master & Calculator API Service
 * Base: /api/price-master
 */
export const priceMasterApi = {
  /**
   * GET /api/price-master
   * Returns selected variant, live calculated breakdown, recent revisions, and master brand/model tree
   */
  getPriceMasterData: async (params = {}) => {
    const response = await api.get("/price-master", { params });
    return response.data;
  },

  /**
   * POST /api/price-master/calculate-on-road
   * Recalculates on-road price in real time as user types in inputs
   */
  calculateOnRoad: async (payload) => {
    const response = await api.post("/price-master/calculate-on-road", payload);
    return response.data;
  },

  /**
   * POST /api/price-master/update-price
   * Updates base rates, recalculates on-road total, and creates price revision log
   */
  updatePrice: async (payload) => {
    const response = await api.post("/price-master/update-price", payload);
    return response.data;
  },

  /**
   * GET /api/price-master/variant/{id}
   */
  getVariantPrice: async (variantId) => {
    const response = await api.get(`/price-master/variant/${variantId}`);
    return response.data;
  },

  /**
   * GET /api/price-master/revisions
   * Supports pagination: page, per_page
   */
  getRevisions: async (params = {}) => {
    const response = await api.get("/price-master/revisions", { params });
    return response.data;
  },

  /**
   * POST /api/price-master/send-quotation
   */
  sendQuotation: async (payload = {}) => {
    const response = await api.post("/price-master/send-quotation", payload);
    return response.data;
  },

  /**
   * GET /api/price-master/export
   */
  exportPriceMaster: async (params = {}) => {
    const response = await api.get("/price-master/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * GET /api/variants
   * Fetches variants list with optional brand_id, model_id, search, per_page
   */
  getVariants: async (params = {}) => {
    const response = await api.get("/variants", { params });
    return response.data;
  },

  /**
   * POST /api/variants/bulk-update-prices
   * Bulk updates multiple variant prices with resilient fallback
   */
  bulkUpdatePrices: async (payload) => {
    try {
      const response = await api.post("/variants/bulk-update-prices", payload);
      return response.data;
    } catch (err) {
      // Graceful fallback if backend bulk endpoint is not yet live:
      // Loop through and update individual variants via PUT /variants/:id
      if (err.response?.status === 404 && Array.isArray(payload?.variants)) {
        console.warn("[priceMasterApi] Bulk endpoint not found (404), falling back to individual PUTs...");
        await Promise.all(
          payload.variants.map((v) =>
            api.put(`/variants/${v.id}`, {
              price: v.revised_price,
              ex_showroom_price: v.revised_price,
            })
          )
        );
        return {
          status: true,
          message: `${payload.variants.length} Variant prices updated successfully!`,
          updated_count: payload.variants.length,
        };
      }
      throw err;
    }
  },

  /**
   * PUT /api/variants/:id
   * Single variant price update
   */
  updateSingleVariantPrice: async (variantId, revisedPrice, additionalData = {}) => {
    const payload = {
      ...additionalData,
      price: Number(revisedPrice),
      ex_showroom_price: Number(revisedPrice),
    };
    const response = await api.put(`/variants/${variantId}`, payload);
    return response.data;
  },
};

export default priceMasterApi;
