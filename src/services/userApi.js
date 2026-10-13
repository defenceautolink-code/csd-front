import api from "@/lib/axios";

/**
 * Unified User & Team API Service
 */
export const userApi = {
  getUsers: async (params = {}) => {
    const response = await api.get("/users", { params });
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (formData) => {
    const response = await api.post("/users", formData);
    return response.data;
  },

  updateUser: async (id, formData) => {
    if (formData instanceof FormData) {
      const response = await api.post(`/users/${id}`, formData);
      return response.data;
    }
    const response = await api.put(`/users/${id}`, formData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  updateProfile: async (id, data) => {
    try {
      const response = await api.put(`/users/${id}`, data);
      return response.data;
    } catch (err) {
      try {
        const response = await api.put("/auth/profile", data);
        return response.data;
      } catch (_) {
        throw err;
      }
    }
  },

  changePassword: async (payload) => {
    try {
      const response = await api.post("/auth/change-password", payload);
      return response.data;
    } catch (err) {
      if (payload.userId || payload.user_id) {
        const uid = payload.userId || payload.user_id;
        try {
          const response = await api.post(`/users/${uid}/change-password`, payload);
          return response.data;
        } catch (_) {}
      }
      throw err;
    }
  },
};

export default userApi;
