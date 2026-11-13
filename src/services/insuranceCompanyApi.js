import api from "@/lib/axios";
import { getStoredInsuranceCompanies } from "@/app/admin/insurance-companies/page";

export const insuranceCompanyApi = {
  /**
   * Get active list of insurance companies for select dropdowns
   */
  getActiveCompanies: async () => {
    try {
      const res = await api.get("/insurance-companies/active-list").catch(() => null);
      if (res && res.data && res.data.status && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data;
      }
    } catch (_) {}

    // Fallback to local storage companies that are active
    const local = getStoredInsuranceCompanies();
    return local.filter((c) => (c.status || "active").toLowerCase() === "active");
  },
};

export default insuranceCompanyApi;

