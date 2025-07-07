// GST Calculator Utility for Dynamic Tax Calculations
export interface GSTBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total: number;
  isInterState: boolean;
}

export interface HSNCodeData {
  code: string;
  description: string;
  gstRate: number;
  category: string;
}

// Common HSN codes with their GST rates
export const HSN_CODE_DATABASE: HSNCodeData[] = [
  { code: "1001", description: "Wheat", gstRate: 0, category: "Food Grains" },
  { code: "1006", description: "Rice", gstRate: 0, category: "Food Grains" },
  { code: "1701", description: "Sugar", gstRate: 0, category: "Food Items" },
  { code: "1704", description: "Confectionery", gstRate: 18, category: "Food Items" },
  { code: "1905", description: "Bread & Bakery", gstRate: 18, category: "Food Items" },
  { code: "2201", description: "Water", gstRate: 18, category: "Beverages" },
  { code: "2202", description: "Soft Drinks", gstRate: 28, category: "Beverages" },
  { code: "2710", description: "Petroleum Products", gstRate: 28, category: "Fuel" },
  { code: "3004", description: "Medicines", gstRate: 12, category: "Healthcare" },
  { code: "3401", description: "Soap", gstRate: 18, category: "Personal Care" },
  { code: "4901", description: "Books", gstRate: 12, category: "Stationery" },
  { code: "6109", description: "T-Shirts", gstRate: 12, category: "Clothing" },
  { code: "6203", description: "Men's Suits", gstRate: 12, category: "Clothing" },
  { code: "6204", description: "Women's Suits", gstRate: 12, category: "Clothing" },
  { code: "6402", description: "Footwear", gstRate: 18, category: "Footwear" },
  { code: "7321", description: "Stoves", gstRate: 18, category: "Appliances" },
  { code: "8471", description: "Computers", gstRate: 18, category: "Electronics" },
  { code: "8517", description: "Mobile Phones", gstRate: 18, category: "Electronics" },
  { code: "8703", description: "Cars", gstRate: 28, category: "Automobiles" },
  { code: "9404", description: "Mattresses", gstRate: 18, category: "Furniture" },
];

// State codes for inter-state determination
export const STATE_CODES = [
  "AN", "AP", "AR", "AS", "BR", "CH", "CT", "DN", "DD", "DL", "GA", "GJ", "HR", "HP", "JK", "JH", "KA", "KL", "LD", "MP", "MH", "MN", "ML", "MZ", "NL", "OR", "PY", "PB", "RJ", "SK", "TN", "TG", "TR", "UP", "UT", "WB"
];

export function getHSNCodeData(hsnCode: string): HSNCodeData | null {
  return HSN_CODE_DATABASE.find(item => item.code === hsnCode) || null;
}

export function suggestGSTRate(hsnCode: string): number {
  const hsnData = getHSNCodeData(hsnCode);
  return hsnData ? hsnData.gstRate : 18; // Default to 18% if not found
}

export function calculateGSTBreakdown(
  amount: number, 
  gstRate: number, 
  supplierState: string = "MH", 
  buyerState: string = "MH"
): GSTBreakdown {
  const isInterState = supplierState !== buyerState;
  const gstAmount = (amount * gstRate) / 100;
  
  if (isInterState) {
    // Inter-state: Only IGST
    return {
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      cess: 0,
      total: gstAmount,
      isInterState: true
    };
  } else {
    // Intra-state: CGST + SGST
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    
    return {
      cgst,
      sgst,
      igst: 0,
      cess: 0,
      total: gstAmount,
      isInterState: false
    };
  }
}

export function generateAlias(brand: string, department: string, itemName: string): string {
  const parts = [brand, department, itemName].filter(Boolean);
  if (parts.length === 0) return "";
  
  // Create a clean alias from the parts
  return parts
    .join(" ")
    .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize spaces
    .trim()
    .substring(0, 50); // Limit length
}

export function formatGSTBreakdown(breakdown: GSTBreakdown): string {
  if (breakdown.isInterState) {
    return `IGST: ${breakdown.igst.toFixed(2)}`;
  } else {
    return `CGST: ${breakdown.cgst.toFixed(2)} + SGST: ${breakdown.sgst.toFixed(2)}`;
  }
}

export function validateHSNCode(hsnCode: string): boolean {
  // HSN codes are typically 4, 6, or 8 digits
  const cleanCode = hsnCode.replace(/\D/g, "");
  return cleanCode.length >= 4 && cleanCode.length <= 8;
}