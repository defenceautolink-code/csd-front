import axios from "axios";
import { clearAuthSession } from "@/utils/auth";

// Create Axios Instance with default settings
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor: Attach Bearer Token automatically & handle FormData
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Auto-handle FormData: remove Content-Type so browser sets multipart/form-data with proper boundary
    const isFormData =
      (typeof FormData !== "undefined" && config.data instanceof FormData) ||
      (config.data && typeof config.data.append === "function");

    if (isFormData && config.headers) {
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
        config.headers.delete("content-type");
      } else {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const msg = error.response?.data?.message || "";

    // Auto-heal if token is expired, missing, or triggered Laravel's user_id NOT NULL constraint
    const isAuthRelated500 =
      error.response?.status === 500 &&
      (msg.includes("user_id") || msg.includes("Integrity constraint violation: 1048"));

    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearAuthSession();
      if (window.location.pathname !== "/login" && window.location.pathname !== "/") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
