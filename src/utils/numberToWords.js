/**
 * Indian Number to Words & Currency Formatter
 * Formats numbers into Indian comma-separated format and converts numbers into words (English).
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertBelowThousand(n) {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + " ";
  }
  return str.trim();
}

/**
 * Convert number into Indian currency words
 * e.g., 1450000 -> "Fourteen Lakh Fifty Thousand Rupees Only"
 * e.g., 51000 -> "Fifty One Thousand Rupees Only"
 * e.g., 100 -> "One Hundred Rupees Only"
 * e.g., 1000 -> "One Thousand Rupees Only"
 *
 * @param {number|string} amount
 * @returns {string}
 */
export function numberToWords(amount) {
  if (amount === null || amount === undefined || amount === "") return "";
  const num = typeof amount === "string" ? parseFloat(amount.toString().replace(/,/g, "")) : Number(amount);
  if (isNaN(num) || num <= 0) return "";

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return "Zero Rupees";

  let words = "";
  let n = integerPart;

  // Crores (>= 1,00,00,000)
  if (n >= 10000000) {
    const crore = Math.floor(n / 10000000);
    words += convertBelowThousand(crore) + " Crore ";
    n %= 10000000;
  }

  // Lakhs (>= 1,00,000)
  if (n >= 100000) {
    const lakh = Math.floor(n / 100000);
    words += convertBelowThousand(lakh) + " Lakh ";
    n %= 100000;
  }

  // Thousands (>= 1,000)
  if (n >= 1000) {
    const thousand = Math.floor(n / 1000);
    words += convertBelowThousand(thousand) + " Thousand ";
    n %= 1000;
  }

  // Hundreds & Remaining (< 1,000)
  if (n > 0) {
    words += convertBelowThousand(n) + " ";
  }

  words = words.trim() + " Rupees";

  // Handle Paise
  if (decimalPart > 0) {
    words += " and " + convertBelowThousand(decimalPart) + " Paise";
  }

  words += " Only";
  return words;
}

/**
 * Format number into Indian comma format
 * e.g. 100 -> "100", 1000 -> "1,000", 1450000 -> "14,50,000"
 * @param {number|string} amount
 * @returns {string}
 */
export function formatIndianCurrency(amount) {
  if (amount === null || amount === undefined || amount === "") return "";
  const num = typeof amount === "string" ? parseFloat(amount.toString().replace(/,/g, "")) : Number(amount);
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN");
}
