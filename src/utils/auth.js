/**
 * Get the currently logged-in user object from localStorage
 * @returns {Object|null}
 */
export function getAuthenticatedUser() {
  if (typeof window === "undefined") return null;
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Error reading authenticated user from localStorage:", error);
    return null;
  }
}

/**
 * Get the current auth token
 * @returns {string|null}
 */
export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

/**
 * Check if the current session is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Normalize role string for reliable comparison
 * e.g. "Super Admin" -> "super_admin", "Sales Executive" -> "sales_executive"
 * @param {string} role
 * @returns {string}
 */
export function normalizeRole(role) {
  if (!role) return "";
  return String(role)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Check if the authenticated user has one of the specified roles
 * Example: hasRole('admin') or hasRole(['admin', 'manager'])
 *
 * @param {string|string[]} roles - Single role string or array of allowed roles
 * @param {Object} [customUser] - Optional user object to test against
 * @returns {boolean}
 */
export function hasRole(roles, customUser = null) {
  const user = customUser || getAuthenticatedUser();
  if (!user || !user.role) return false;

  const currentRole = normalizeRole(user.role);

  // Normalize allowed roles
  const allowedRoles = (Array.isArray(roles) ? roles : [roles]).map(normalizeRole);

  // Super admin matches 'admin' or 'super_admin'
  const isMatch = allowedRoles.some((role) => {
    if (role === "admin" && (currentRole === "super_admin" || currentRole === "admin")) return true;
    if (role === "manager" && (currentRole === "sales_manager" || currentRole === "manager")) return true;
    if (role === "sales_executive" && (currentRole === "sales_executive" || currentRole === "sales")) return true;
    return currentRole === role;
  });

  return isMatch;
}

/**
 * Role to Permissions Mapping
 */
const ROLE_PERMISSIONS = {
  super_admin: [
    "dashboard.view",
    "lead.view_all",
    "lead.view_assigned",
    "lead.create",
    "lead.edit",
    "lead.delete",
    "lead.assign",
    "lead.status",
    "lead.priority",
    "lead.followup",
    "lead.send_quotation",
    "lead.send_wishes",
    "lead.import",
    "lead.export",
    "lead.export_selected",
    "lead.bulk_status",
    "lead.bulk_assign",
    "lead.bulk_priority",
    "lead.bulk_delete",
    "followup.export",
    "followup.call_now",
    "followup.send_quotation",
    "followup.log_call",
    "user.view",
    "user.create",
    "user.edit",
    "user.delete",
    "user.export",
    "user.manage",
    "quotation.view",
    "quotation.create",
    "quotation.edit",
    "quotation.delete",
    "quotation.send",
    "quotation.auto_fill",
    "quotation.print_pdf",
    "quotation.email",
    "quotation.reset",
    "quotation.saved_view",
    "calculator.use",
    "price.export",
    "price.update",
    "reports.view",
    "reports.export_pdf",
    "reports.export_csv",
    "brand.create",
    "brand.edit",
    "brand.delete",
    "brand.export",
    "model.create",
    "model.edit",
    "model.delete",
    "model.export",
    "variant.create",
    "variant.edit",
    "variant.delete",
    "variant.export",
    "lead_source.manage",
    "lead_status.manage",
    "settings.manage",
    "support.view",
    "invoice.generate",
    "invoice.view",
    "invoice.export",
    "insurance.reminder",
  ],
  sales_manager: [
    "dashboard.view",
    "lead.view_all",
    "lead.view_assigned",
    "lead.create",
    "lead.edit",
    "lead.assign",
    "lead.status",
    "lead.priority",
    "lead.import",
    "lead.export",
    "lead.followup",
    "lead.send_quotation",
    "lead.send_wishes",
    "lead.bulk_status",
    "lead.bulk_assign",
    "lead.bulk_priority",
    "followup.call_now",
    "followup.send_quotation",
    "followup.log_call",
    "user.view",
    "quotation.view",
    "quotation.create",
    "quotation.edit",
    "quotation.send",
    "quotation.auto_fill",
    "quotation.email",
    "quotation.reset",
    "quotation.saved_view",
    "calculator.use",
    "reports.view",
    "brand.export",
    "model.export",
    "variant.edit",
    "variant.delete",
    "variant.export",
    "support.view",
    "insurance.reminder",
  ],
  sales_executive: [
    "dashboard.view",
    "lead.view_assigned",
    "lead.view_all",
    "lead.create",
    "lead.edit",
    "lead.edit_assigned",
    "lead.status",
    "lead.priority",
    "lead.followup",
    "lead.send_quotation",
    "lead.send_wishes",
    "lead.bulk_status",
    "followup.call_now",
    "followup.send_quotation",
    "followup.log_call",
    "quotation.view",
    "quotation.create",
    "quotation.edit_assigned",
    "quotation.send",
    "quotation.auto_fill",
    "quotation.email",
    "quotation.reset",
    "quotation.saved_view",
    "calculator.use",
    "brand.export",
    "model.export",
    "variant.edit",
    "variant.delete",
    "variant.export",
    "support.view",
    "insurance.reminder",
  ],
  receptionist: [
    "dashboard.view",
    "lead.view_all",
    "lead.view_assigned",
    "lead.create",
    "lead.edit",
    "lead.assign",
    "lead.status",
    "lead.priority",
    "lead.followup",
    "lead.send_quotation",
    "lead.send_wishes",
    "lead.bulk_status",
    "lead.bulk_assign",
    "lead.bulk_priority",
    "followup.call_now",
    "followup.send_quotation",
    "followup.log_call",
    "calculator.use",
    "quotation.create",
    "quotation.auto_fill",
    "quotation.send",
    "quotation.print_pdf",
    "quotation.export_pdf",
    "quotation.email",
    "quotation.reset",
    "brand.create",
    "brand.edit",
    "brand.delete",
    "brand.export",
    "variant.create",
    "variant.edit",
    "variant.delete",
    "variant.export",
    "support.view",
    "invoice.generate",
    "invoice.view",
    "insurance.reminder",
  ],
  accountant: [
    "dashboard.view",
    "reports.view",
    "reports.export_pdf",
    "reports.export_csv",
    "price.update",
    "invoice.generate",
    "invoice.view",
    "invoice.export",
  ],
};

/**
 * Check if the authenticated user has a specific permission
 * Example: hasPermission('lead.assign')
 *
 * @param {string} permission - Permission key
 * @param {Object} [customUser] - Optional user object to test against
 * @returns {boolean}
 */
export function hasPermission(permission, customUser = undefined) {
  const user = customUser !== undefined ? customUser : getAuthenticatedUser();
  if (!user || !user.role) return false;

  const currentRole = normalizeRole(user.role);

  // Fallback for aliases
  let roleKey = currentRole;
  if (roleKey === "admin") roleKey = "super_admin";
  if (roleKey === "manager") roleKey = "sales_manager";

  if (roleKey === "super_admin") return true;

  const permissions = ROLE_PERMISSIONS[roleKey] || [];

  // Direct check
  if (permissions.includes(permission)) return true;

  // General edit permission satisfies edit_assigned for managers/admins
  if (permission === "lead.edit_assigned" && permissions.includes("lead.edit")) return true;
  if (permission === "lead.view_assigned" && permissions.includes("lead.view_all")) return true;

  return false;
}

export function hasAnyPermission(permissions, customUser = undefined) {
  return permissions.some((permission) => hasPermission(permission, customUser));
}

/**
 * Get the dedicated dashboard path based on user role
 * @param {string|Object} role
 * @returns {string}
 */
export function getRoleDashboardPath(role) {
  const roleName = typeof role === "object" ? (role?.name || role?.title || "") : (role || "");
  const r = normalizeRole(roleName);
  if (r === "sales_manager" || r === "manager") return "/sales-manager/dashboard";
  if (r === "sales_executive" || r === "executive" || r === "sales") return "/sales-executive/dashboard";
  if (r === "receptionist") return "/receptionist/dashboard";
  if (r === "accountant") return "/accountant/dashboard";
  return "/admin/dashboard";
}

export function canAccessAdminPath(pathname, customUser = undefined) {
  const user = customUser !== undefined ? customUser : getAuthenticatedUser();
  if (!user || !user.role) return false;

  const currentRole = normalizeRole(user.role);

  // Determine prefix role requirement and normalize to /admin/*
  let normalizedPath = pathname;
  let requiredPrefixRole = null;

  if (pathname.startsWith("/sales-manager")) {
    requiredPrefixRole = "sales_manager";
    normalizedPath = pathname.replace("/sales-manager", "/admin");
  } else if (pathname.startsWith("/sales-executive")) {
    requiredPrefixRole = "sales_executive";
    if (pathname === "/sales-executive/leads" || pathname.startsWith("/sales-executive/leads/")) {
      return hasPermission("lead.view_assigned", user) || hasPermission("lead.view_all", user);
    }
    normalizedPath = pathname.replace("/sales-executive", "/admin");
  } else if (pathname.startsWith("/receptionist")) {
    requiredPrefixRole = "receptionist";
    normalizedPath = pathname.replace("/receptionist", "/admin");
  } else if (pathname.startsWith("/accountant")) {
    requiredPrefixRole = "accountant";
    normalizedPath = pathname.replace("/accountant", "/admin");
  } else if (pathname.startsWith("/admin")) {
    requiredPrefixRole = "super_admin";
  }

  // Strict role prefix check
  if (requiredPrefixRole) {
    if (requiredPrefixRole === "sales_manager" && currentRole !== "sales_manager" && currentRole !== "manager") return false;
    if (requiredPrefixRole === "sales_executive" && currentRole !== "sales_executive" && currentRole !== "executive" && currentRole !== "sales") return false;
    if (requiredPrefixRole === "receptionist" && currentRole !== "receptionist") return false;
    if (requiredPrefixRole === "accountant" && currentRole !== "accountant") return false;
    if (requiredPrefixRole === "super_admin" && currentRole !== "super_admin" && currentRole !== "admin") return false;
  }

  if (
    !normalizedPath ||
    normalizedPath === "/admin" ||
    normalizedPath === "/admin/dashboard"
  ) {
    return hasPermission("dashboard.view", user);
  }

  if (normalizedPath === "/admin/quotation" || normalizedPath.startsWith("/admin/quotation/")) {
    return hasPermission("quotation.view", user) || hasPermission("calculator.use", user);
  }

  const requiredPermission = [
    ["/admin/leads", "lead.view_assigned"],
    ["/admin/pipeline", "lead.view_all"],
    ["/admin/deals", "lead.view_assigned"],
    ["/admin/follow-up", "followup.call_now"],
    ["/admin/users", "user.view"],
    ["/admin/reports", "reports.view"],
    ["/admin/brand", "brand.export"],
    ["/admin/model", "model.export"],
    ["/admin/variant", "variant.export"],
    ["/admin/update-price", "price.update"],
    ["/admin/invoice", "invoice.view"],
    ["/admin/expense-master", "reports.view"],
    ["/admin/expense-detail", "reports.view"],
    ["/admin/lead-source", "lead_source.manage"],
    ["/admin/lead-status", "lead_status.manage"],
    ["/admin/settings", "settings.manage"],
  ].find(([path]) => normalizedPath === path || normalizedPath.startsWith(`${path}/`));

  return requiredPermission ? hasPermission(requiredPermission[1], user) : true;
}

/**
 * Return formatted badge class for user role
 * @param {string} role
 * @returns {string}
 */
export function getRoleBadgeClass(role) {
  const r = normalizeRole(role);
  switch (r) {
    case "super_admin":
    case "admin":
      return "bg-danger-subtle text-danger";
    case "sales_manager":
    case "manager":
      return "bg-warning-subtle text-warning";
    case "sales_executive":
    case "sales":
      return "bg-primary-subtle text-primary";
    case "receptionist":
      return "bg-info-subtle text-info";
    case "accountant":
      return "bg-secondary-subtle text-white";
    default:
      return "bg-secondary-subtle text-muted";
  }
}
