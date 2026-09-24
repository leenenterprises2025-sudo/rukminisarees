/**
 * Rukmini Sarees - Global Configuration & Google Sheet Settings
 * Prasadampadu, Vijayawada - 521108
 * Phone / WhatsApp: +91 79816 88516
 */

const RUKMINI_CONFIG = {
  // Store Details
  storeName: "Rukmini Sarees",
  phone: "+91 79816 88516",
  whatsappNumber: "917981688516",
  address: "Near Kasturibhai School, Prasadampadu, Vijayawada - 521108",
  timings: "Mon – Sat: 10:00 AM – 9:00 PM | Sun: 11:00 AM – 8:00 PM",

  /**
   * Google Sheet Sync Configuration
   * 
   * HOW TO CONNECT YOUR LIVE GOOGLE SHEET:
   * 1. Create a Google Sheet with the standard product columns.
   * 2. Go to File -> Share -> Anyone with the link can view.
   * 3. Copy the Sheet ID from the URL:
   *    https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
   * 4. Paste it below into `googleSheetId`.
   * 5. If left empty (""), the website automatically uses `data/products.json` as offline fallback!
   */
  googleSheetId: "1PWkCtYvNIRbL9ddKv5CuuX5UC2U1f6b4HXiA4EeMOCs",
  sheetTabName: "Products", // Default tab name in your spreadsheet
  cacheExpiryMinutes: 10,   // Cache live sheet data in browser for 10 minutes for fast loads

  // Fallback data file path
  fallbackDataUrl: "data/products.json"
};
