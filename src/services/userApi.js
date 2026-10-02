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
    const headers =
      formData instanceof FormData
        ? { "Content-Type": "multipart/form-data" }
        : {};
    const response = await api.post("/users", formData, { headers });
    return response.data;
  },

  updateUser: async (id, formData) => {
    const headers =
      formData instanceof FormData
        ? { "Content-Type": "multipart/form-data" }
        : {};
    const response = await api.post(`/users/${id}`, formData, { headers });
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export default userApi;
