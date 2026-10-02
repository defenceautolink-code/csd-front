/**
 * Storage utility for Expense Master & Expense Details
 * Provides local persistence with pre-seeded realistic data.
 */

const EXPENSE_MASTER_KEY = "csd_expense_masters";
const EXPENSE_DETAIL_KEY = "csd_expense_details";

// Initial default expense categories for Master Data
export const DEFAULT_EXPENSE_MASTERS = [
  { id: "em-1", title: "Office Rent", status: "Active", created_at: "2024-01-10T10:00:00.000Z" },
  { id: "em-2", title: "Electricity & Utility Bills", status: "Active", created_at: "2024-01-12T11:30:00.000Z" },
  { id: "em-3", title: "Tea & Refreshments", status: "Active", created_at: "2024-01-15T09:15:00.000Z" },
  { id: "em-4", title: "Stationery & Printing", status: "Active", created_at: "2024-01-18T14:20:00.000Z" },
  { id: "em-5", title: "Internet & Telephones", status: "Active", created_at: "2024-01-20T16:45:00.000Z" },
  { id: "em-6", title: "Showroom Maintenance & Repairs", status: "Active", created_at: "2024-02-01T12:00:00.000Z" },
  { id: "em-7", title: "Staff Travel & Conveyance", status: "Active", created_at: "2024-02-05T10:30:00.000Z" },
  { id: "em-8", title: "Marketing & Advertisements", status: "Active", created_at: "2024-02-10T15:10:00.000Z" },
  { id: "em-9", title: "Vehicle Washing & Detailing", status: "Active", created_at: "2024-02-15T13:00:00.000Z" },
];

// Initial default expense records
export const DEFAULT_EXPENSE_DETAILS = [
  {
    id: "ed-101",
    title: "Office Rent",
    amount: 35000,
    invoice_no: "RENT-FEB-2024",
    party_name: "Shiv Properties & Commercial Leasing",
    pay_by: "Alexander Vance",
    payment_type: "Online",
    reference_no: "HDFC9823471029",
    remark: "Showroom rent for February 2024 paid via RTGS",
    date: "2024-02-01",
    created_at: "2024-02-01T10:00:00.000Z",
  },
  {
    id: "ed-102",
    title: "Electricity & Utility Bills",
    amount: 14250,
    invoice_no: "EB-9082341",
    party_name: "Torrent Power Limited",
    pay_by: "Alexander Vance",
    payment_type: "Online",
    reference_no: "UPI8872615243",
    remark: "Main showroom 3-phase commercial meter bill",
    date: "2024-02-05",
    created_at: "2024-02-05T11:30:00.000Z",
  },
  {
    id: "ed-103",
    title: "Tea & Refreshments",
    amount: 1850,
    invoice_no: "SNACK-104",
    party_name: "Shree Krishna Snacks & Tea Corner",
    pay_by: "Alexander Vance",
    payment_type: "Offline",
    reference_no: "",
    remark: "",
    date: "2024-02-08",
    created_at: "2024-02-08T17:15:00.000Z",
  },
  {
    id: "ed-104",
    title: "Stationery & Printing",
    amount: 3400,
    invoice_no: "INV-STAT-442",
    party_name: "Royal Paper & Stationery Works",
    pay_by: "Alexander Vance",
    payment_type: "Offline",
    reference_no: "",
    remark: "",
    date: "2024-02-12",
    created_at: "2024-02-12T14:40:00.000Z",
  },
  {
    id: "ed-105",
    title: "Internet & Telephones",
    amount: 2499,
    invoice_no: "AIR-994821",
    party_name: "Airtel Broadband & Telephony",
    pay_by: "Alexander Vance",
    payment_type: "Online",
    reference_no: "TXN77625109",
    remark: "Showroom high-speed fiber broadband bill",
    date: "2024-02-15",
    created_at: "2024-02-15T16:20:00.000Z",
  },
  {
    id: "ed-106",
    title: "Showroom Maintenance & Repairs",
    amount: 7800,
    invoice_no: "REP-2024-89",
    party_name: "Apex Electricals & AC Services",
    pay_by: "Alexander Vance",
    payment_type: "Online",
    reference_no: "NEFT44091823",
    remark: "HVAC cooling filter replacement and service",
    date: "2024-02-18",
    created_at: "2024-02-18T12:00:00.000Z",
  },
];

// Helper to get Expense Masters
export function getExpenseMasters() {
  if (typeof window === "undefined") return DEFAULT_EXPENSE_MASTERS;
  try {
    const raw = localStorage.getItem(EXPENSE_MASTER_KEY);
    if (!raw) {
      localStorage.setItem(EXPENSE_MASTER_KEY, JSON.stringify(DEFAULT_EXPENSE_MASTERS));
      return DEFAULT_EXPENSE_MASTERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EXPENSE_MASTERS;
  } catch (e) {
    console.error("Error reading expense masters:", e);
    return DEFAULT_EXPENSE_MASTERS;
  }
}

// Helper to save Expense Masters
export function saveExpenseMasters(masters) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXPENSE_MASTER_KEY, JSON.stringify(masters));
    window.dispatchEvent(new Event("csd_expense_masters_updated"));
  } catch (e) {
    console.error("Error saving expense masters:", e);
  }
}

// Helper to get Expense Details
export function getExpenseDetails() {
  if (typeof window === "undefined") return DEFAULT_EXPENSE_DETAILS;
  try {
    const raw = localStorage.getItem(EXPENSE_DETAIL_KEY);
    if (!raw) {
      localStorage.setItem(EXPENSE_DETAIL_KEY, JSON.stringify(DEFAULT_EXPENSE_DETAILS));
      return DEFAULT_EXPENSE_DETAILS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_EXPENSE_DETAILS;
  } catch (e) {
    console.error("Error reading expense details:", e);
    return DEFAULT_EXPENSE_DETAILS;
  }
}

// Helper to save Expense Details
export function saveExpenseDetails(details) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXPENSE_DETAIL_KEY, JSON.stringify(details));
    window.dispatchEvent(new Event("csd_expense_details_updated"));
  } catch (e) {
    console.error("Error saving expense details:", e);
  }
}
