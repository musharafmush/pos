import { formatCurrency } from "@/lib/currency";

interface ReceiptItem {
  id: number;
  name: string;
  sku?: string;
  quantity: number;
  price: string | number;
  total: number;
  mrp?: number;
  unit?: string;
  hsnCode?: string;
  discount?: number;
  gstRate?: number;
}

interface ReceiptData {
  billNumber: string;
  billDate?: string;
  customerDetails?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    doorNo?: string;
    street?: string;
    place?: string;
  };
  salesMan?: string;
  items: ReceiptItem[];
  subtotal: number | string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  taxRate?: number;
  taxAmount?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  roundingAdjustment?: number;
  grandTotal: number;
  total?: number;
  amountPaid: number;
  changeDue?: number;
  change?: number;
  paymentMethod: string;
  notes?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  customerLoyaltyBalance?: number;
}

interface ReceiptCustomization {
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  email?: string;
  taxId: string;
  receiptFooter: string;
  showLogo: boolean;
  autoPrint: boolean;
  paperWidth: 'thermal58' | 'thermal72' | 'thermal77' | 'thermal80' | 'a4';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'courier' | 'arial' | 'impact';
  headerStyle: 'centered' | 'left' | 'justified';
  showCustomerDetails: boolean;
  showItemSKU: boolean;
  showMRP: boolean;
  showSavings: boolean;
  showBarcode: boolean;
  showQRCode: boolean;
  headerBackground: boolean;
  boldTotals: boolean;
  separatorStyle: 'solid' | 'dashed' | 'dotted';
  showTermsConditions: boolean;
  termsConditions: string;
  showReturnPolicy: boolean;
  returnPolicy: string;
  language: 'english' | 'hindi' | 'tamil';
  currencySymbol: string;
  thermalOptimized?: boolean;
}

// Simplified thermal receipt printing function
export const printReceipt = (receiptData: ReceiptData, customOptions?: Partial<ReceiptCustomization>) => {
  console.log("Starting thermal receipt printing...");
  
  // Basic validation
  if (!receiptData?.items?.length) {
    console.error("No receipt items provided");
    throw new Error("Cannot print receipt without items");
  }

  if (!receiptData.billNumber) {
    console.error("No bill number provided");
    throw new Error("Cannot print receipt without bill number");
  }

  // Default settings
  const settings = {
    businessName: 'M MART',
    businessAddress: '47,SHOP NO.1&2,\nTHANDARAMPATTU MAIN ROAD,\nSAMUTHIRAM VILLAGE,\nTIRUVANNAMALAI-606603',
    phoneNumber: '+91-9876543210',
    email: 'info@mmart.com',
    taxId: '33QIWPS9348F1Z2',
    receiptFooter: 'Thank you for shopping with us!\nVisit again soon',
    paperWidth: 'thermal80',
    fontFamily: 'courier',
    currencySymbol: '₹',
    ...customOptions
  };

  // Convert number to words for Indian currency
  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    const convertGroup = (n: number): string => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        return result;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };
    
    const intNum = Math.floor(num);
    if (intNum < 1000) return convertGroup(intNum).trim();
    if (intNum < 100000) return convertGroup(Math.floor(intNum / 1000)).trim() + ' Thousand ' + convertGroup(intNum % 1000).trim();
    if (intNum < 10000000) return convertGroup(Math.floor(intNum / 100000)).trim() + ' Lakh ' + convertGroup(Math.floor((intNum % 100000) / 1000)).trim() + ' Thousand ' + convertGroup(intNum % 1000).trim();
    
    return intNum.toString();
  };

  // Create receipt content
  const createReceiptContent = (): string => {
    const paperWidth = settings.paperWidth;
    const fontSize = paperWidth === 'thermal58' ? '10px' : '11px';
    const headerSize = paperWidth === 'thermal58' ? '14px' : '16px';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${receiptData.billNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${settings.fontFamily}, monospace; 
      font-size: ${fontSize}; 
      line-height: 1.2; 
      color: #000; 
      background: #fff;
      width: ${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : '80mm'};
      margin: 0;
      padding: 2mm;
    }
    .header { text-align: center; font-weight: bold; font-size: ${headerSize}; margin-bottom: 2mm; border-bottom: 2px solid #000; padding-bottom: 1mm; }
    .business-info { text-align: center; font-size: ${fontSize}; margin: 1mm 0; }
    .line { border-bottom: 1px solid #000; margin: 1mm 0; }
    .dotted { border-bottom: 1px dotted #666; margin: 1mm 0; }
    .invoice-details { margin: 1.5mm 0; font-size: ${fontSize}; }
    .items-table { width: 100%; border-collapse: collapse; font-size: ${fontSize}; }
    .items-table th { text-align: left; padding: 0.5mm 0; border-bottom: 1px solid #000; font-weight: bold; }
    .items-table td { padding: 0.5mm 0; vertical-align: top; border-bottom: 1px dotted #666; }
    .totals-table { width: 100%; border-collapse: collapse; margin: 1.5mm 0; }
    .totals-table td { padding: 0.5mm 0; }
    .total-row { border-top: 1px solid #000; font-weight: bold; font-size: ${paperWidth === 'thermal58' ? '12px' : '14px'}; }
    .loyalty-section { margin: 1.5mm 0; text-align: center; }
    .loyalty-header { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 0.5mm; margin-bottom: 1mm; }
    .footer { text-align: center; margin: 2mm 0; border-top: 1px solid #000; padding-top: 1mm; }
    @media print {
      body { margin: 0; padding: 2mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">${settings.businessName}</div>
  
  <div class="business-info">
    ${settings.businessAddress.replace(/\n/g, '<br>')}<br>
    <strong>Phone:</strong> ${settings.phoneNumber}<br>
    ${settings.email ? `<strong>Email:</strong> ${settings.email}<br>` : ''}
    <strong>GST No:</strong> ${settings.taxId}
  </div>
  
  <div class="line"></div>
  
  <div class="invoice-details">
    <strong>Invoice Details:</strong><br>
    Bill No: <strong>${receiptData.billNumber}</strong><br>
    Date: <strong>${receiptData.billDate || new Date().toLocaleString()}</strong><br>
    ${receiptData.customerDetails?.name ? `Customer: <strong>${receiptData.customerDetails.name}</strong><br>` : ''}
    ${receiptData.customerDetails?.phone ? `Phone: <strong>${receiptData.customerDetails.phone}</strong><br>` : ''}
    Cashier: <strong>${receiptData.salesMan || 'Admin User'}</strong>
  </div>
  
  <div class="line"></div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 40%;">Item</th>
        <th style="width: 15%; text-align: center;">Qty</th>
        <th style="width: 20%; text-align: right;">Rate</th>
        <th style="width: 25%; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${receiptData.items.map((item: ReceiptItem) => {
        const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        const itemTotal = itemPrice * item.quantity;
        
        return `
        <tr>
          <td>
            <strong>${item.name || 'Unknown Item'}</strong><br>
            ${item.sku ? `<small>SKU: ${item.sku}</small><br>` : ''}
            ${item.hsnCode ? `<small>HSN: ${item.hsnCode}</small><br>` : ''}
            ${item.mrp ? `<small>MRP: ₹${item.mrp}</small>` : ''}
          </td>
          <td style="text-align: center;">
            <strong>${item.quantity}</strong>
            ${item.unit ? `<br><small>${item.unit}</small>` : ''}
          </td>
          <td style="text-align: right;">
            ₹${itemPrice.toFixed(2)}
            ${item.discount && item.discount > 0 ? `<br><small>-${item.discount}%</small>` : ''}
          </td>
          <td style="text-align: right;">
            <strong>₹${itemTotal.toFixed(2)}</strong>
            ${item.gstRate && item.gstRate > 0 ? `<br><small>+${item.gstRate}% GST</small>` : ''}
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  
  <div class="line"></div>
  
  <table class="totals-table">
    <tr>
      <td>Subtotal:</td>
      <td style="text-align: right;"><strong>₹${receiptData.subtotal}</strong></td>
    </tr>
    ${receiptData.discount > 0 ? `
      <tr>
        <td>Discount:</td>
        <td style="text-align: right;">-₹${receiptData.discount.toFixed(2)}</td>
      </tr>
    ` : ''}
    ${receiptData.taxAmount && receiptData.taxAmount > 0 ? `
      <tr>
        <td>Tax (${receiptData.taxRate || 0}%):</td>
        <td style="text-align: right;">₹${receiptData.taxAmount.toFixed(2)}</td>
      </tr>
    ` : ''}
    <tr class="total-row">
      <td>TOTAL:</td>
      <td style="text-align: right;">₹${receiptData.grandTotal || receiptData.total}</td>
    </tr>
    <tr>
      <td>Paid:</td>
      <td style="text-align: right;">₹${receiptData.amountPaid.toFixed(2)}</td>
    </tr>
    ${(receiptData.changeDue || receiptData.change) && (receiptData.changeDue || receiptData.change) > 0 ? `
      <tr>
        <td>Change:</td>
        <td style="text-align: right;">₹${(receiptData.changeDue || receiptData.change || 0).toFixed(2)}</td>
      </tr>
    ` : ''}
    <tr>
      <td>Payment:</td>
      <td style="text-align: right;"><strong>${receiptData.paymentMethod.toUpperCase()}</strong></td>
    </tr>
  </table>
  
  ${(receiptData.loyaltyPointsEarned && receiptData.loyaltyPointsEarned > 0) || receiptData.customerLoyaltyBalance !== undefined ? `
    <div class="dotted"></div>
    
    <div class="loyalty-section">
      <div class="loyalty-header">⭐ LOYALTY REWARDS ⭐</div>
      <table style="width: 100%; border-collapse: collapse;">
        ${receiptData.loyaltyPointsEarned && receiptData.loyaltyPointsEarned > 0 ? `
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">Points Earned Today:</td>
            <td style="text-align: right; padding: 0.5mm 0; font-weight: bold;">+${receiptData.loyaltyPointsEarned}</td>
          </tr>
        ` : ''}
        ${receiptData.customerLoyaltyBalance !== undefined ? `
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">Total Loyalty Points:</td>
            <td style="text-align: right; padding: 0.5mm 0; font-weight: bold;">${((Number(receiptData.customerLoyaltyBalance) || 0) + (Number(receiptData.loyaltyPointsEarned) || 0)).toFixed(2)}</td>
          </tr>
        ` : ''}
        ${receiptData.loyaltyPointsRedeemed && receiptData.loyaltyPointsRedeemed > 0 ? `
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">Points Redeemed:</td>
            <td style="text-align: right; padding: 0.5mm 0; font-weight: bold;">-${receiptData.loyaltyPointsRedeemed}</td>
          </tr>
        ` : ''}
      </table>
      <div style="font-size: ${paperWidth === 'thermal58' ? '8px' : '9px'}; margin-top: 1mm; font-style: italic;">
        Earn 1 point for every ₹100 spent!
      </div>
    </div>
  ` : ''}
  
  <div class="footer">
    <strong style="font-size: ${paperWidth === 'thermal58' ? '11px' : '12px'};">🛍️ Thank You for Shopping! 🛍️</strong><br>
    ${settings.receiptFooter.replace(/\n/g, '<br>')}<br>
    <small style="font-size: ${paperWidth === 'thermal58' ? '8px' : '9px'};">
      Amount in Words: ${numberToWords(receiptData.grandTotal || receiptData.total || 0)} Rupees Only
    </small>
  </div>
  
  ${receiptData.notes ? `
    <div style="text-align: center; margin: 1mm 0; font-size: ${paperWidth === 'thermal58' ? '8px' : '9px'}; font-style: italic;">
      ${receiptData.notes}
    </div>
  ` : ''}
</body>
</html>`;
  };

  // Print the receipt
  try {
    const receiptContent = createReceiptContent();
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups.');
    }

    // Write content to the new window
    printWindow.document.write(receiptContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    };

    console.log("✅ Thermal receipt sent to printer successfully");
    
  } catch (error) {
    console.error("❌ Thermal receipt printing failed:", error);
    throw error;
  }
};

// Sample receipt data for testing
export const sampleReceiptData: ReceiptData = {
  billNumber: "POS1750926123456",
  billDate: new Date().toLocaleString(),
  customerDetails: {
    name: "Amit Patel",
    phone: "+91-9876543210",
    address: "123 Main Street, City"
  },
  salesMan: "Administrator",
  items: [
    {
      id: 1,
      name: "Basmati Rice Premium",
      sku: "RICE-BASMATI-001",
      quantity: 2,
      price: "55.00",
      total: 110.00,
      mrp: 60,
      hsnCode: "1006",
      gstRate: 5
    },
    {
      id: 2,
      name: "Organic Wheat Flour",
      sku: "FLOUR-WHEAT-002",
      quantity: 1,
      price: "45.00",
      total: 45.00,
      mrp: 50,
      hsnCode: "1101",
      gstRate: 5
    }
  ],
  subtotal: 155.00,
  discount: 5.00,
  discountType: 'fixed',
  taxRate: 5,
  taxAmount: 7.50,
  grandTotal: 157.50,
  amountPaid: 160.00,
  changeDue: 2.50,
  paymentMethod: "cash",
  notes: "Thank you for your purchase!",
  loyaltyPointsEarned: 1.58,
  customerLoyaltyBalance: 25.50
};