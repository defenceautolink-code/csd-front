import { canAccessAdminPath } from "./auth.js";

/**
 * Returns accessible sidebar navigation pages for the current user/role
 * Used by Header global search to allow quick searching & navigation of sidebar pages.
 */
export function getSidebarPages(currentUser) {
  const roleStr = typeof currentUser?.role === "object"
    ? (currentUser.role.title || currentUser.role.name || "Super Admin")
    : (currentUser?.role || "Super Admin");

  const normalized = String(roleStr).trim().toLowerCase().replace(/[\s-]+/g, "_");

  let pages = [];

  if (normalized === "sales_executive") {
    pages = [
      // Conversion Desk
      { title: "Sales Dashboard", path: "/sales-executive/dashboard", icon: "bi bi-grid-1x2-fill", section: "Conversion Desk", keywords: ["dashboard", "home", "stats", "kpi"] },
      { title: "My Assigned Leads", path: "/sales-executive/leads", icon: "bi bi-funnel-fill", section: "Conversion Desk", keywords: ["leads", "my leads", "customers", "inquiries"] },
      { title: "Leads Pipeline", path: "/sales-executive/pipeline", icon: "bi bi-funnel", section: "Conversion Desk", keywords: ["pipeline", "stages", "kanban", "funnel"] },
      { title: "Follow-Ups & Notes", path: "/sales-executive/follow-up", icon: "bi bi-telephone-outbound-fill", section: "Conversion Desk", keywords: ["calls", "follow up", "tracker", "call log", "notes", "schedule"] },
      { title: "Call Recordings", path: "/sales-executive/call-recordings", icon: "bi bi-mic-fill", section: "Conversion Desk", keywords: ["recording", "audio", "upload", "call proof", "voice"] },
      { title: "Send Quotation", path: "/sales-executive/quotation", icon: "bi bi-file-earmark-spreadsheet-fill", section: "Conversion Desk", keywords: ["quote", "quotation", "price quote", "estimate"] },
      { title: "Deals & Bookings", path: "/sales-executive/deals", icon: "bi bi-trophy-fill", section: "Conversion Desk", keywords: ["deals", "bookings", "won", "orders", "sales"] },
      { title: "Insurance Reminders", path: "/sales-executive/insurance", icon: "bi bi-shield-check", section: "Conversion Desk", keywords: ["insurance", "reminders", "renewals", "policy"] },
      // Vehicle Inventory
      { title: "Brands", path: "/sales-executive/brand", icon: "bi bi-shield-shaded", section: "Vehicle Inventory", keywords: ["brand", "manufacturer", "oem", "car brand"] },
      { title: "Models", path: "/sales-executive/model", icon: "bi bi-car-front-fill", section: "Vehicle Inventory", keywords: ["model", "cars", "vehicles"] },
      { title: "Variants & Prices", path: "/sales-executive/variant", icon: "bi bi-tag-fill", section: "Vehicle Inventory", keywords: ["variant", "pricing", "trims", "price list"] },
      // Account
      { title: "My Profile", path: "/admin/profile", icon: "bi bi-person-badge-fill", section: "Account", keywords: ["profile", "account", "settings", "password", "user"] },
    ];
  } else if (normalized === "sales_manager") {
    pages = [
      // Main Menu
      { title: "Dashboard", path: "/sales-manager/dashboard", icon: "bi bi-grid-1x2-fill", section: "Main Menu", keywords: ["dashboard", "home", "stats", "overview"] },
      { title: "Leads Pipeline", path: "/sales-manager/leads", icon: "bi bi-funnel-fill", section: "Main Menu", keywords: ["leads", "team leads", "pipeline", "customers"] },
      { title: "Follow-Ups", path: "/sales-manager/follow-up", icon: "bi bi-telephone-outbound-fill", section: "Main Menu", keywords: ["calls", "follow up", "call logs", "tracker", "interactions"] },
      { title: "Call Recordings", path: "/sales-manager/call-recordings", icon: "bi bi-mic-fill", section: "Main Menu", keywords: ["recording", "audio", "audit", "verify", "call proof"] },
      { title: "Send Quotation", path: "/sales-manager/quotation", icon: "bi bi-file-earmark-spreadsheet-fill", section: "Main Menu", keywords: ["quotations", "approvals", "quote", "discount"] },
      { title: "Generate Invoice", path: "/sales-manager/invoice", icon: "bi bi-receipt-cutoff", section: "Main Menu", keywords: ["invoice", "generate invoice", "deals register", "billing", "tax invoice"] },
      { title: "Pending Insurance", path: "/sales-manager/deals/pending-insurance", icon: "bi bi-shield-plus", section: "Main Menu", keywords: ["insurance", "pending insurance", "policy", "coverage"] },
      { title: "Insurance Reminders", path: "/sales-manager/insurance", icon: "bi bi-shield-check", section: "Main Menu", keywords: ["insurance", "renewals", "reminders", "policy"] },
      { title: "Insurance Records", path: "/sales-manager/insurance-records", icon: "bi bi-file-earmark-medical-fill", section: "Main Menu", keywords: ["insurance records", "policies", "policy list"] },
      { title: "Users & Team", path: "/sales-manager/users", icon: "bi bi-people-fill", section: "Main Menu", keywords: ["users", "team", "sales reps", "staff", "employees"] },
      { title: "Expense Details", path: "/sales-manager/expense-detail", icon: "bi bi-journal-text", section: "Main Menu", keywords: ["expense details", "expenses", "costs", "spending", "vouchers"] },
      // Master Data
      { title: "Brands", path: "/sales-manager/brand", icon: "bi bi-shield-shaded", section: "Master Data", keywords: ["brand", "manufacturer", "oem"] },
      { title: "Models", path: "/sales-manager/model", icon: "bi bi-car-front-fill", section: "Master Data", keywords: ["model", "cars", "vehicles"] },
      { title: "Variants", path: "/sales-manager/variant", icon: "bi bi-tag-fill", section: "Master Data", keywords: ["variant", "pricing", "trims", "prices"] },
      { title: "Update Price", path: "/sales-manager/update-price", icon: "bi bi-currency-rupee", section: "Master Data", keywords: ["update price", "price list", "bulk price", "rates"] },
      { title: "Insurance Companies", path: "/sales-manager/insurance-companies", icon: "bi bi-building-fill-check", section: "Master Data", keywords: ["insurance companies", "providers", "insurers", "companies"] },
      { title: "Expense", path: "/sales-manager/expense-master", icon: "bi bi-wallet2", section: "Master Data", keywords: ["expense", "expense master", "expense categories", "heads"] },
      { title: "Lead Sources", path: "/sales-manager/lead-source", icon: "bi bi-diagram-3-fill", section: "Master Data", keywords: ["lead sources", "campaigns", "channels", "source"] },
      // Account
      { title: "My Profile", path: "/admin/profile", icon: "bi bi-person-badge-fill", section: "Account", keywords: ["profile", "account", "settings", "password", "user"] },
    ];
  } else if (normalized === "receptionist") {
    pages = [
      // Front Desk
      { title: "Reception Concierge", path: "/receptionist/dashboard", icon: "bi bi-door-open-fill", section: "Front Desk", keywords: ["dashboard", "reception", "desk", "home"] },
      { title: "Walk-Ins & Leads", path: "/receptionist/leads", icon: "bi bi-funnel-fill", section: "Front Desk", keywords: ["leads", "walk ins", "visitors", "inquiries"] },
      { title: "Scheduled Visits", path: "/receptionist/follow-up", icon: "bi bi-calendar2-check-fill", section: "Front Desk", keywords: ["visits", "appointments", "follow up", "schedule"] },
      { title: "Call Recordings", path: "/receptionist/call-recordings", icon: "bi bi-mic-fill", section: "Front Desk", keywords: ["recording", "audio", "upload", "call proof", "voice"] },
      { title: "Auto Calculator & Quote", path: "/receptionist/quotation", icon: "bi bi-calculator-fill", section: "Front Desk", keywords: ["calculator", "quote", "quotation", "price"] },
      // Vehicle Inventory
      { title: "Brands", path: "/receptionist/brand", icon: "bi bi-shield-shaded", section: "Vehicle Inventory", keywords: ["brand", "manufacturer"] },
      { title: "Models", path: "/receptionist/model", icon: "bi bi-car-front-fill", section: "Vehicle Inventory", keywords: ["model", "cars"] },
      { title: "Variants & Pricing", path: "/receptionist/variant", icon: "bi bi-tag-fill", section: "Vehicle Inventory", keywords: ["variant", "pricing", "trims"] },
      // Website & CMS (Blogs & Contact Inquiries only — CRM stays Admin-only)
      { title: "Blogs", path: "/receptionist/blogs", icon: "bi bi-newspaper", section: "Website & CMS", keywords: ["blogs", "articles", "news", "posts", "cms"] },
      { title: "Contact Inquiries", path: "/receptionist/contacts", icon: "bi bi-envelope-paper-fill", section: "Website & CMS", keywords: ["contact", "inquiries", "messages", "leads", "contact us"] },
      // Account
      { title: "My Profile", path: "/admin/profile", icon: "bi bi-person-badge-fill", section: "Account", keywords: ["profile", "account", "settings", "password", "user"] },
    ];
  } else if (normalized === "accountant") {
    pages = [
      // Finance & Billing
      { title: "Accounts Dashboard", path: "/accountant/dashboard", icon: "bi bi-calculator-fill", section: "Finance & Billing", keywords: ["dashboard", "accounts", "finance", "home"] },
      { title: "Financial Reports", path: "/accountant/reports", icon: "bi bi-bar-chart-line-fill", section: "Finance & Billing", keywords: ["reports", "finance", "revenue", "ledger"] },
      { title: "Generate Invoice", path: "/accountant/invoice", icon: "bi bi-receipt-cutoff", section: "Finance & Billing", keywords: ["invoice", "billing", "bill", "tax invoice"] },
      { title: "Expense Master", path: "/accountant/expense-master", icon: "bi bi-wallet2", section: "Finance & Billing", keywords: ["expense master", "expenses", "categories"] },
      { title: "Expense Details", path: "/accountant/expense-detail", icon: "bi bi-journal-text", section: "Finance & Billing", keywords: ["expense details", "expenses", "vouchers", "spending"] },
      // Account
      { title: "My Profile", path: "/admin/profile", icon: "bi bi-person-badge-fill", section: "Account", keywords: ["profile", "account", "settings", "password", "user"] },
    ];
  } else {
    // Super Admin / Default Full Panel
    pages = [
      // Main Menu
      { title: "Dashboard", path: "/admin/dashboard", icon: "bi bi-grid-1x2-fill", section: "Main Menu", keywords: ["home", "stats", "overview", "analytics"] },
      { title: "Leads Pipeline", path: "/admin/leads", icon: "bi bi-funnel-fill", section: "Main Menu", keywords: ["leads", "pipeline", "inquiries", "customers", "prospects"] },
      { title: "Lead Dates Manager", path: "/admin/leads/dates", icon: "bi bi-calendar2-heart-fill", section: "Main Menu", keywords: ["birthday", "anniversary", "dates", "leads", "dob", "lead dates"] },
      { title: "Follow-Ups", path: "/admin/follow-up", icon: "bi bi-telephone-outbound-fill", section: "Main Menu", keywords: ["follow up", "calls", "call tracker", "notes", "interactions", "schedule"] },
      { title: "Call Recordings", path: "/admin/call-recordings", icon: "bi bi-mic-fill", section: "Main Menu", keywords: ["recording", "audio", "audit", "verify", "call proof"] },
      { title: "Send Quotation", path: "/admin/quotation", icon: "bi bi-file-earmark-spreadsheet-fill", section: "Main Menu", keywords: ["quotation", "quote", "price estimate", "proposal"] },
      { title: "Deals & Bookings", path: "/admin/deals", icon: "bi bi-trophy-fill", section: "Main Menu", keywords: ["deals", "bookings", "won", "orders", "deliveries", "sales"] },
      { title: "Generate Invoice", path: "/admin/invoice", icon: "bi bi-receipt-cutoff", section: "Main Menu", keywords: ["invoice", "generate invoice", "bill", "billing", "tax invoice"] },
      { title: "Pending Insurance", path: "/admin/deals/pending-insurance", icon: "bi bi-shield-plus", section: "Main Menu", keywords: ["insurance", "pending insurance", "policy", "coverage"] },
      { title: "Insurance Reminders", path: "/admin/insurance", icon: "bi bi-shield-check", section: "Main Menu", keywords: ["insurance reminders", "renewals", "due", "expiring"] },
      { title: "Insurance Records", path: "/admin/insurance-records", icon: "bi bi-file-earmark-medical-fill", section: "Main Menu", keywords: ["insurance records", "policies", "policy list"] },
      { title: "Users & Team", path: "/admin/users", icon: "bi bi-people-fill", section: "Main Menu", keywords: ["users", "team", "staff", "employees", "sales reps", "roles", "permissions"] },
      { title: "Reports & Analytics", path: "/admin/reports", icon: "bi bi-bar-chart-line-fill", section: "Main Menu", keywords: ["reports", "analytics", "charts", "kpi", "performance", "sales"] },
      { title: "Expense Details", path: "/admin/expense-detail", icon: "bi bi-journal-text", section: "Main Menu", keywords: ["expense details", "expenses", "costs", "spending", "vouchers"] },
      // Master Data
      { title: "Brands", path: "/admin/brand", icon: "bi bi-shield-shaded", section: "Master Data", keywords: ["brands", "manufacturers", "oem", "car brand"] },
      { title: "Models", path: "/admin/model", icon: "bi bi-car-front-fill", section: "Master Data", keywords: ["models", "cars", "vehicles"] },
      { title: "Variants", path: "/admin/variant", icon: "bi bi-tag-fill", section: "Master Data", keywords: ["variants", "trims", "specifications", "pricing"] },
      { title: "Update Price", path: "/admin/update-price", icon: "bi bi-currency-rupee", section: "Master Data", keywords: ["update price", "price list", "bulk price", "rates"] },
      { title: "Insurance Companies", path: "/admin/insurance-companies", icon: "bi bi-building-fill-check", section: "Master Data", keywords: ["insurance companies", "providers", "insurers", "companies"] },
      { title: "Expense", path: "/admin/expense-master", icon: "bi bi-wallet2", section: "Master Data", keywords: ["expense", "expense master", "expense categories", "heads"] },
      { title: "Lead Sources", path: "/admin/lead-source", icon: "bi bi-diagram-3-fill", section: "Master Data", keywords: ["lead sources", "campaigns", "channels", "source"] },
      // Website & CMS
      { title: "Blogs", path: "/admin/blogs", icon: "bi bi-newspaper", section: "Website & CMS", keywords: ["blogs", "articles", "news", "posts", "cms"] },
      { title: "CRM (Useful Links)", path: "/admin/crm", icon: "bi bi-file-earmark-richtext", section: "Website & CMS", keywords: ["crm", "pages", "useful links", "cms", "content", "terms", "privacy"] },
      { title: "Contact Inquiries", path: "/admin/contacts", icon: "bi bi-envelope-paper-fill", section: "Website & CMS", keywords: ["contact", "inquiries", "messages", "leads", "contact us"] },
      // Management
      { title: "Activity Logs", path: "/admin/logs", icon: "bi bi-clock-history", section: "Management", keywords: ["activity logs", "audit", "system logs", "history"] },
      { title: "Settings", path: "/admin/settings", icon: "bi bi-gear-fill", section: "Management", keywords: ["settings", "configuration", "preferences"] },
      // Account
      { title: "My Profile", path: "/admin/profile", icon: "bi bi-person-badge-fill", section: "Account", keywords: ["profile", "my profile", "account", "password", "user"] },
    ];
  }

  // Filter only accessible pages
  return pages.filter((page) => canAccessAdminPath(page.path, currentUser));
}
