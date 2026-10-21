import axios from "axios";
import { clearAuthSession, isSessionExpired } from "@/utils/auth";

// Create Axios Instance with default settings
const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://api.defenceautolink.com/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Helper to handle 401 unauthenticated error across any axios request (excluding auth endpoints)
const handle401Unauthorized = (error) => {
  const url = error.config?.url || "";
  const isAuthEndpoint =
    url.includes("/auth/login") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/reset-password");

  if (!isAuthEndpoint && error.response?.status === 401 && typeof window !== "undefined") {
    clearAuthSession();
    if (!window.location.pathname.includes("/login") && window.location.pathname !== "/") {
      window.location.href = "/login?terminated=1";
    }
  }
  return Promise.reject(error);
};

// Request Interceptor: Attach Bearer Token automatically & handle FormData
const requestInterceptor = (config) => {
  if (typeof window !== "undefined") {
    const url = config.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password");

    // Only attach authorization token if available and not already set
    if (!isAuthEndpoint) {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
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
};

// Attach to configured 'api' instance
api.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
api.interceptors.response.use((response) => response, handle401Unauthorized);

// Also attach to global axios instance safely
axios.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
axios.interceptors.response.use((response) => response, handle401Unauthorized);

export default api;
