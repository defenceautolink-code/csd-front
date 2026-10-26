/**
 * Activity Logging Utility for Client-Side Operations (Exports, Imports, etc.)
 */
export async function logActivity(module, action = "export", options = {}) {
  try {
    let detail = "";
    let count = 0;
    let format = "CSV";

    if (typeof options === "string") {
      detail = options;
    } else if (typeof options === "number") {
      count = options;
      detail = `${action} of ${module.toLowerCase()} - ${count} records`;
    } else if (typeof options === "object" && options !== null) {
      count = options.count || 0;
      format = options.format || "CSV";
      if (options.detail) {
        detail = options.detail;
      } else {
        const countText = count > 0 ? `${count} records` : `all records`;
        detail = `${action} of ${module.toLowerCase()} - ${countText} (${format})`;
      }
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("auth_token") || localStorage.getItem("token")
        : null;

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    await fetch(`${API_URL}/activity-logs/log-action`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        module,
        action,
        detail,
      }),
    });
  } catch (err) {
    // Non-blocking background log
    console.warn("Failed to log activity:", err);
  }
}
