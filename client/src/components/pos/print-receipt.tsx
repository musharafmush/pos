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

export interface ReceiptCustomization {
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

export const printReceipt = (data: ReceiptData, customization?: Partial<ReceiptCustomization>) => {
  console.log("🖨️ Thermal receipt function called with loyalty data:", {
    loyaltyPointsEarned: data.loyaltyPointsEarned,
    loyaltyPointsRedeemed: data.loyaltyPointsRedeemed,
    customerLoyaltyBalance: data.customerLoyaltyBalance,
    customerName: data.customerDetails?.name,
    billNumber: data.billNumber,
    itemsCount: data.items?.length || 0
  });

  // Validate receipt data before processing
  if (!data || !data.items || data.items.length === 0) {
    console.error("❌ Cannot print receipt: No items found");
    throw new Error("Cannot print receipt without items. Please add items to cart first.");
  }

  if (!data.billNumber) {
    console.error("❌ Cannot print receipt: No bill number");
    throw new Error("Cannot print receipt without bill number.");
  }

  const printContainer = document.createElement('div');
  printContainer.style.position = 'fixed';
  printContainer.style.top = '-9999px';
  printContainer.style.left = '-9999px';
  document.body.appendChild(printContainer);

  try {
    const savedSettings = localStorage.getItem('receiptSettings');
    const defaultSettings: ReceiptCustomization = {
      businessName: 'M MART',
      businessAddress: '47,SHOP NO.1&2,\nTHANDARAMPATTU MAIN ROAD,\nSAMUTHIRAM VILLAGE,\nTIRUVANNAMALAI-606603',
      phoneNumber: '+91-9876543210',
      email: 'info@mmart.com',
      taxId: '33QIWPS9348F1Z2',
      receiptFooter: 'Thank you for shopping with us!\nVisit again soon\nCustomer Care: support@mmart.com',
      showLogo: false,
      autoPrint: true,
      paperWidth: 'thermal80',
      fontSize: 'medium',
      fontFamily: 'courier',
      headerStyle: 'centered',
      showCustomerDetails: true,
      showItemSKU: true,
      showMRP: true,
      showSavings: true,
      showBarcode: false,
      showQRCode: false,
      headerBackground: true,
      boldTotals: true,
      separatorStyle: 'solid',
      showTermsConditions: false,
      termsConditions: 'All sales are final. No returns without receipt.',
      showReturnPolicy: false,
      returnPolicy: '7 days return policy. Terms apply.',
      language: 'english',
      currencySymbol: '₹',
      thermalOptimized: true
    };

    const receiptSettings = {
      ...defaultSettings,
      ...(savedSettings ? JSON.parse(savedSettings) : {}),
      ...customization
    };

    const paperWidth = receiptSettings.paperWidth;

    // Helper function to convert numbers to words (Indian format)
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

    // Generate receipt HTML
    const receiptHtml = `
      <div class="thermal-header" style="text-align: center; font-weight: bold; font-size: ${paperWidth === 'thermal58' ? '16px' : '18px'}; margin-bottom: 2mm; border-bottom: 2px solid #000; padding-bottom: 1mm;">
        ${receiptSettings.businessName}
      </div>
      
      <div class="thermal-text" style="text-align: center; font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; margin: 1mm 0; line-height: 1.1;">
        ${receiptSettings.businessAddress.replace(/\n/g, '<br>')}<br>
        <strong>Phone:</strong> ${receiptSettings.phoneNumber}<br>
        ${receiptSettings.email ? `<strong>Email:</strong> ${receiptSettings.email}<br>` : ''}
        <strong>GST No:</strong> ${receiptSettings.taxId}
      </div>
      
      <div class="thermal-line"></div>
      
      <div class="thermal-text" style="margin: 1.5mm 0; font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; line-height: 1.2;">
        <strong>Invoice Details:</strong><br>
        Bill No: <strong>${data.billNumber}</strong><br>
        Date: <strong>${data.billDate || new Date().toLocaleString()}</strong><br>
        ${data.customerDetails?.name ? `Customer: <strong>${data.customerDetails.name}</strong><br>` : ''}
        ${data.customerDetails?.phone ? `Phone: <strong>${data.customerDetails.phone}</strong><br>` : ''}
        ${data.customerDetails?.email ? `Email: ${data.customerDetails.email}<br>` : ''}
        ${data.customerDetails?.address ? `Address: ${data.customerDetails.address}<br>` : ''}
        Cashier: <strong>${data.salesMan || 'Sales Staff'}</strong>
      </div>
      
      <div class="thermal-line"></div>
      
      <div class="thermal-text">
        <table style="width: 100%; border-collapse: collapse; font-size: ${paperWidth === 'thermal58' ? '9px' : '10px'};">
          <thead>
            <tr style="border-bottom: 1px solid #000; font-weight: bold;">
              <th style="text-align: left; padding: 1mm 0; width: 40%;">Item</th>
              <th style="text-align: center; padding: 1mm 0; width: 15%;">Qty</th>
              <th style="text-align: right; padding: 1mm 0; width: 20%;">Rate</th>
              <th style="text-align: right; padding: 1mm 0; width: 25%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item: ReceiptItem) => {
              const itemDiscount = item.discount || 0;
              const itemGst = item.gstRate || data.taxRate || 0;
              const baseAmount = parseFloat(item.price.toString()) * item.quantity;
              const discountAmount = itemDiscount > 0 ? (baseAmount * itemDiscount / 100) : 0;
              const taxableAmount = baseAmount - discountAmount;
              const gstAmount = taxableAmount * itemGst / 100;
              const finalAmount = taxableAmount + gstAmount;
              
              return `
              <tr class="item-row" style="border-bottom: 1px dotted #666;">
                <td style="padding: 1mm 0; line-height: 1.1; vertical-align: top;">
                  <strong>${item.name || 'Unknown Item'}</strong><br>
                  ${item.sku ? `<small>SKU: ${item.sku}</small><br>` : ''}
                  ${item.hsnCode ? `<small>HSN: ${item.hsnCode}</small><br>` : ''}
                  ${item.mrp ? `<small>MRP: ₹${item.mrp}</small>` : ''}
                </td>
                <td style="text-align: center; padding: 1mm 0; vertical-align: top;">
                  <strong>${item.quantity}</strong>
                  ${item.unit ? `<br><small>${item.unit}</small>` : ''}
                </td>
                <td style="text-align: right; padding: 1mm 0; vertical-align: top;">
                  ₹${item.price}
                  ${itemDiscount > 0 ? `<br><small>-${itemDiscount}%</small>` : ''}
                </td>
                <td style="text-align: right; padding: 1mm 0; vertical-align: top;">
                  <strong>₹${finalAmount.toFixed(2)}</strong>
                  ${itemGst > 0 ? `<br><small>+GST ${itemGst}%</small>` : ''}
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="thermal-dotted"></div>
      
      <div class="thermal-text" style="font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; line-height: 1.2; margin: 1.5mm 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="text-align: left; padding: 0.5mm 0; border-bottom: 1px dotted #666;"><strong>Subtotal (Before Tax):</strong></td>
            <td style="text-align: right; padding: 0.5mm 0; border-bottom: 1px dotted #666;"><strong>₹${(parseFloat(data.subtotal.toString()) - (data.taxAmount || 0)).toFixed(2)}</strong></td>
          </tr>
          ${data.discount > 0 ? `
            <tr>
              <td style="text-align: left; padding: 0.5mm 0;">Item Discount${data.discountType === 'percentage' ? ` (${data.discount}%)` : ''}:</td>
              <td style="text-align: right; padding: 0.5mm 0; color: #d32f2f;">-₹${
                data.discountType === 'percentage' 
                  ? (parseFloat(data.subtotal.toString()) * data.discount / 100).toFixed(2)
                  : data.discount.toFixed(2)
              }</td>
            </tr>
          ` : ''}
          ${data.taxAmount && data.taxAmount > 0 ? `
            <tr>
              <td style="text-align: left; padding: 0.5mm 0;">
                <strong>GST Summary:</strong><br>
                ${data.cgstRate ? `CGST (${data.cgstRate}%): ₹${(data.taxAmount / 2).toFixed(2)}<br>` : ''}
                ${data.sgstRate ? `SGST (${data.sgstRate}%): ₹${(data.taxAmount / 2).toFixed(2)}<br>` : ''}
                ${data.igstRate ? `IGST (${data.igstRate}%): ₹${data.taxAmount}<br>` : ''}
                ${!data.cgstRate && !data.sgstRate && !data.igstRate ? `GST (${data.taxRate}%):` : ''}
              </td>
              <td style="text-align: right; padding: 0.5mm 0; vertical-align: top;">
                <strong>₹${data.taxAmount.toFixed(2)}</strong>
              </td>
            </tr>
          ` : ''}
          ${data.roundingAdjustment ? `
            <tr>
              <td style="text-align: left; padding: 0.5mm 0;">Rounding Adjustment:</td>
              <td style="text-align: right; padding: 0.5mm 0;">₹${data.roundingAdjustment.toFixed(2)}</td>
            </tr>
          ` : ''}
        </table>
      </div>
      
      <div class="thermal-total" style="margin: 1.5mm 0; padding: 1mm; font-size: ${paperWidth === 'thermal58' ? '14px' : '16px'}; font-weight: bold; text-align: center; border: 2px solid #000; background: #f0f0f0;">
        GRAND TOTAL: ₹${parseFloat((data.grandTotal || data.total || 0).toString()).toFixed(2)}
        <br><small style="font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; font-weight: normal;">
          (${numberToWords(parseFloat((data.grandTotal || data.total || 0).toString()))} Only)
        </small>
      </div>
      
      <div class="thermal-text" style="margin: 1.5mm 0; font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; line-height: 1.2;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;"><strong>Payment Method:</strong></td>
            <td style="text-align: right; padding: 0.5mm 0;"><strong>${data.paymentMethod.toUpperCase()}</strong></td>
          </tr>
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">Amount Paid:</td>
            <td style="text-align: right; padding: 0.5mm 0;">₹${parseFloat((data.amountPaid || data.total || 0).toString()).toFixed(2)}</td>
          </tr>
          ${(data.changeDue || data.change || 0) > 0 ? `
            <tr>
              <td style="text-align: left; padding: 0.5mm 0;"><strong>Change Due:</strong></td>
              <td style="text-align: right; padding: 0.5mm 0; font-weight: bold; color: #2e7d32;">₹${parseFloat((data.changeDue || data.change || 0).toString()).toFixed(2)}</td>
            </tr>
          ` : ''}
          ${data.loyaltyPointsEarned ? `
            <tr>
              <td style="text-align: left; padding: 0.5mm 0;">Loyalty Points Earned:</td>
              <td style="text-align: right; padding: 0.5mm 0; color: #ff9800;"><strong>+${data.loyaltyPointsEarned}</strong></td>
            </tr>
          ` : ''}
          ${data.customerLoyaltyBalance !== undefined ? `
            <tr>
              <td style="text-align: left; padding: 0.5mm 0;">Total Loyalty Points:</td>
              <td style="text-align: right; padding: 0.5mm 0; color: #2e7d32;"><strong>${((Number(data.customerLoyaltyBalance) || 0) + (Number(data.loyaltyPointsEarned) || 0)).toFixed(2)}</strong></td>
            </tr>
          ` : ''}
          ${data.loyaltyPointsRedeemed && data.loyaltyPointsRedeemed > 0 ? `
            <tr>
              <td style="text-align: left; padding: 0.5mm 0;">Loyalty Points Redeemed:</td>
              <td style="text-align: right; padding: 0.5mm 0; color: #d32f2f;">-${data.loyaltyPointsRedeemed}</td>
            </tr>
          ` : ''}
        </table>
      </div>
      
      ${(data.loyaltyPointsEarned && data.loyaltyPointsEarned > 0) || data.customerLoyaltyBalance !== undefined ? `
        <div class="thermal-dotted"></div>
        
        <div class="thermal-text" style="margin: 1.5mm 0; font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; line-height: 1.2;">
          <div style="text-align: center; font-weight: bold; margin-bottom: 1mm; border-bottom: 1px solid #000; padding-bottom: 0.5mm;">
            ⭐ LOYALTY REWARDS ⭐
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.loyaltyPointsEarned && data.loyaltyPointsEarned > 0 ? `
              <tr>
                <td style="text-align: left; padding: 0.5mm 0;">Points Earned Today:</td>
                <td style="text-align: right; padding: 0.5mm 0; color: #ff9800; font-weight: bold;">+${data.loyaltyPointsEarned}</td>
              </tr>
            ` : ''}
            ${data.customerLoyaltyBalance !== undefined ? `
              <tr>
                <td style="text-align: left; padding: 0.5mm 0;">Total Loyalty Points:</td>
                <td style="text-align: right; padding: 0.5mm 0; color: #2e7d32; font-weight: bold;">${((Number(data.customerLoyaltyBalance) || 0) + (Number(data.loyaltyPointsEarned) || 0)).toFixed(2)}</td>
              </tr>
            ` : ''}
            ${data.loyaltyPointsRedeemed && data.loyaltyPointsRedeemed > 0 ? `
              <tr>
                <td style="text-align: left; padding: 0.5mm 0;">Points Redeemed:</td>
                <td style="text-align: right; padding: 0.5mm 0; color: #d32f2f; font-weight: bold;">-${data.loyaltyPointsRedeemed}</td>
              </tr>
            ` : ''}
          </table>
          <div style="text-align: center; font-size: ${paperWidth === 'thermal58' ? '8px' : '9px'}; margin-top: 1mm; font-style: italic;">
            Earn 1 point for every ₹100 spent!
          </div>
        </div>
      ` : ''}
      
      <div class="thermal-dotted"></div>
      
      <div class="thermal-text" style="text-align: center; margin: 2mm 0; font-size: ${paperWidth === 'thermal58' ? '9px' : '10px'}; line-height: 1.1; border-top: 1px solid #000; padding-top: 1mm;">
        <strong style="font-size: ${paperWidth === 'thermal58' ? '11px' : '12px'};">🛍️ Thank You for Shopping! 🛍️</strong><br>
        ${receiptSettings.receiptFooter.replace(/\n/g, '<br>')}<br>
        <br>
        <strong>Store Timings:</strong> 9:00 AM - 10:00 PM<br>
        <strong>Customer Care:</strong> ${receiptSettings.phoneNumber}<br>
        ${receiptSettings.email ? `<strong>Email:</strong> ${receiptSettings.email}<br>` : ''}
        <br>
        <div style="font-size: 8px; border-top: 1px dotted #666; padding-top: 1mm; margin-top: 1mm;">
          <strong>Invoice ID:</strong> ${data.billNumber}<br>
          <strong>Printed:</strong> ${new Date().toLocaleString()}<br>
          <strong>POS Terminal:</strong> Thermal Receipt System v2.0<br>
          <em>This is a computer generated invoice</em>
        </div>
      </div>
      
      ${data.notes ? `
        <div class="thermal-text" style="text-align: center; font-size: ${paperWidth === 'thermal58' ? '8px' : '9px'}; margin: 1mm 0; font-style: italic;">
          <strong>Notes:</strong> ${data.notes}
        </div>
      ` : ''}
    `;

    // Create print frame instead of popup window to avoid blocking
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    document.body.appendChild(printFrame);
    
    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!printDocument) {
      console.error('Could not access print frame document.');
      document.body.removeChild(printContainer);
      document.body.removeChild(printFrame);
      return;
    }

    const printCSS = `
      <style>
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        html, body { 
          margin: 0 !important; 
          padding: 0 !important; 
          background: white !important; 
          color: black !important;
          font-family: 'Courier New', 'Consolas', 'Lucida Console', monospace !important;
          font-size: ${paperWidth === 'thermal58' ? '16px' : paperWidth === 'thermal72' ? '17px' : paperWidth === 'thermal77' ? '18px' : paperWidth === 'thermal80' ? '18px' : '19px'} !important;
          line-height: 1.2 !important;
        }

        .thermal-receipt { 
          width: ${paperWidth === 'thermal58' ? '54mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : paperWidth === 'thermal80' ? '80mm' : '108mm'} !important;
          max-width: ${paperWidth === 'thermal58' ? '54mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : paperWidth === 'thermal80' ? '80mm' : '108mm'} !important;
          padding: 2mm !important;
          margin: 0 auto !important;
          background: white !important;
          color: black !important;
          font-family: 'Courier New', 'Consolas', 'Lucida Console', monospace !important;
        }

        @page {
          size: ${paperWidth === 'thermal58' ? '58mm 200mm' : paperWidth === 'thermal72' ? '72mm 200mm' : paperWidth === 'thermal77' ? '77mm 200mm' : paperWidth === 'thermal80' ? '80mm 200mm' : '112mm 250mm'} !important;
          margin: 0 !important;
        }

        @media print {
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', 'Consolas', 'Lucida Console', monospace !important;
            font-size: ${paperWidth === 'thermal58' ? '13pt' : paperWidth === 'thermal72' ? '13.5pt' : paperWidth === 'thermal77' ? '14pt' : paperWidth === 'thermal80' ? '14pt' : '16pt'} !important;
            line-height: 1.2 !important;
          }

          .thermal-receipt {
            width: ${paperWidth === 'thermal58' ? '56mm' : paperWidth === 'thermal72' ? '70mm' : paperWidth === 'thermal77' ? '75mm' : paperWidth === 'thermal80' ? '78mm' : '110mm'} !important;
            max-width: ${paperWidth === 'thermal58' ? '56mm' : paperWidth === 'thermal72' ? '70mm' : paperWidth === 'thermal77' ? '75mm' : paperWidth === 'thermal80' ? '78mm' : '110mm'} !important;
            padding: 1mm !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            max-height: ${paperWidth === 'thermal58' ? '190mm' : '190mm'} !important;
          }

          .thermal-text, .thermal-header, .thermal-total {
            font-size: ${paperWidth === 'thermal58' ? '10px' : paperWidth === 'thermal72' ? '11px' : paperWidth === 'thermal77' ? '12px' : paperWidth === 'thermal80' ? '12px' : '13px'} !important;
            line-height: 1.1 !important;
            margin: 0.5mm 0 !important;
            padding: 0 !important;
            color: black !important;
            background: transparent !important;
          }

          .thermal-line {
            width: 100% !important;
            height: 1px !important;
            background: black !important;
            margin: 1mm 0 !important;
            border: none !important;
          }

          .thermal-dotted {
            width: 100% !important;
            height: 1px !important;
            border-top: 1px dotted black !important;
            margin: 1mm 0 !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          th, td {
            border: none !important;
            padding: 0.5mm !important;
            margin: 0 !important;
            font-size: inherit !important;
            color: black !important;
            background: transparent !important;
          }

          .thermal-header {
            font-size: ${paperWidth === 'thermal58' ? '14px' : '16px'} !important;
            font-weight: bold !important;
            text-align: center !important;
            margin-bottom: 1mm !important;
            border-bottom: 2px solid black !important;
            padding-bottom: 0.5mm !important;
          }

          .thermal-total {
            font-size: ${paperWidth === 'thermal58' ? '11px' : '12px'} !important;
            font-weight: bold !important;
            text-align: center !important;
            border: 2px solid black !important;
            padding: 1mm !important;
            margin: 1mm 0 !important;
            background: #f0f0f0 !important;
          }

          .item-row {
            font-size: ${paperWidth === 'thermal58' ? '13px' : '14px'} !important;
            border-bottom: 1px dotted #666 !important;
          }

          small {
            font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'} !important;
          }
        }
      </style>
    `;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : paperWidth === 'thermal80' ? '80mm' : '112mm'}, initial-scale=1.0">
        <title>🖨️ Professional Thermal Receipt: ${data.billNumber || 'BILL'} | ${paperWidth}</title>
        ${printCSS}
      </head>
      <body>
        <div class="thermal-receipt">
          ${receiptHtml}
        </div>
        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
            }, 500);
          });
        </script>
      </body>
      </html>
    `;

    printDocument.write(printContent);
    printDocument.close();

    // Trigger print after content loads
    setTimeout(() => {
      try {
        if (printFrame.contentWindow) {
          printFrame.contentWindow.print();
        }
      } catch (printError) {
        console.error('Print execution failed:', printError);
      }
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(printContainer);
        document.body.removeChild(printFrame);
      }, 2000);
    }, 1000);

  } catch (error: unknown) {
    console.error('Error generating receipt:', error);
    if (document.body.contains(printContainer)) {
      document.body.removeChild(printContainer);
    }
    // Clean up print frame if it exists
    const printFrames = document.querySelectorAll('iframe[style*="-9999px"]');
    printFrames.forEach(frame => {
      if (document.body.contains(frame)) {
        document.body.removeChild(frame);
      }
    });
  }
};

export const generateReceiptPreview = (settings: Partial<ReceiptCustomization>) => {
  const sampleData: ReceiptData = {
    billNumber: 'POS1234567890',
    billDate: new Date().toLocaleString(),
    customerDetails: {
      name: 'Sample Customer',
      phone: '+91-9876543210',
      email: 'customer@example.com',
      address: '123 Sample Street, Sample City'
    },
    salesMan: 'Sample Staff',
    items: [
      {
        id: 1,
        name: 'Sample Product 1',
        sku: 'SKU001',
        quantity: 2,
        price: '100.00',
        total: 200,
        mrp: 120,
        unit: 'pcs',
        hsnCode: '1234',
        discount: 5,
        gstRate: 18
      },
      {
        id: 2,
        name: 'Sample Product 2',
        sku: 'SKU002',
        quantity: 1,
        price: '250.00',
        total: 250,
        mrp: 300,
        unit: 'kg',
        hsnCode: '5678',
        gstRate: 12
      }
    ],
    subtotal: 450,
    discount: 10,
    discountType: 'fixed',
    taxRate: 18,
    taxAmount: 79.2,
    grandTotal: 519.2,
    amountPaid: 520,
    changeDue: 0.8,
    paymentMethod: 'cash',
    loyaltyPointsEarned: 5.19
  };

  return `
    <div style="max-width: 400px; margin: 0 auto; font-family: 'Courier New', monospace; background: white; padding: 10px; border: 1px solid #ccc;">
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '18px' : '20px'}; font-weight: bold; margin-bottom: 2mm;">
        ${settings.businessName || 'M MART'}
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 1mm;">
        ${(settings.businessAddress || '47,SHOP NO.1&2,\nTHANDARAMPATTU MAIN ROAD').replace(/\n/g, '<br>')}
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; font-weight: bold; margin-bottom: 1mm;">
        Phone: ${settings.phoneNumber || '+91-9876543210'}
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'}; margin-bottom: 1mm;">
        GST No: ${settings.taxId || '33QIWPS9348F1Z2'}
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'}; margin-bottom: 2mm;">
        Email: ${settings.email || 'info@mmart.com'}
      </div>
      
      <hr style="border: 1px solid #000; margin: 2mm 0;">
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 2mm;">
        <strong>Invoice Details:</strong><br>
        Bill No: <strong>${sampleData.billNumber}</strong><br>
        Date: <strong>${sampleData.billDate}</strong><br>
        Customer: <strong>${sampleData.customerDetails?.name}</strong><br>
        Cashier: <strong>${sampleData.salesMan}</strong>
      </div>
      
      <hr style="border: 1px solid #000; margin: 2mm 0;">
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 2mm;">
        <div style="display: flex; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'}; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 2mm;">
          <div style="flex: 2;">Item</div>
          <div style="width: 40px; text-align: center;">Qty</div>
          <div style="width: 60px; text-align: right;">Rate</div>
          <div style="width: 80px; text-align: right;">Amount</div>
        </div>
        
        ${sampleData.items.map(item => `
        <div style="margin-bottom: 2mm; font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'};">
          <div style="display: flex; align-items: flex-start;">
            <div style="flex: 2;">
              <strong>${item.name}</strong><br>
              <small>SKU: ${item.sku} | HSN: ${item.hsnCode}</small>
            </div>
            <div style="width: 25px; text-align: center; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'};">
              ${item.quantity}
            </div>
            <div style="width: 50px; text-align: center; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'};">
              ₹${item.price}
            </div>
            <div style="width: 50px; text-align: right; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'};">
              ₹${item.total}
            </div>
          </div>
          <div style="font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; color: #666; margin-bottom: 1mm; font-style: italic;">
            MRP: ₹${item.mrp} | Unit: ${item.unit} | GST: ${item.gstRate}%
          </div>
          <div style="text-align: right; font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; color: #666;">
            ${item.discount ? `Discount: ${item.discount}%` : ''}
          </div>
        </div>
        `).join('')}
      </div>
      
      <hr style="border: 1px dotted #666; margin: 2mm 0;">
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 2mm;">
        Subtotal: <span style="float: right;">₹${sampleData.subtotal}</span><br>
        Discount: <span style="float: right; color: #d32f2f;">-₹${sampleData.discount}</span><br>
        Tax (GST): <span style="float: right;">₹${sampleData.taxAmount}</span><br>
      </div>
      
      <div style="border: 2px solid #000; padding: 2mm; text-align: center; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '16px' : '18px'}; margin: 2mm 0;">
        GRAND TOTAL: ₹${sampleData.grandTotal}
      </div>
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin: 2mm 0;">
        Payment Method: <span style="float: right;"><strong>${sampleData.paymentMethod.toUpperCase()}</strong></span><br>
        Amount Paid: <span style="float: right;">₹${sampleData.amountPaid}</span><br>
        Change Due: <span style="float: right; font-weight: bold; color: #2e7d32;">₹${sampleData.changeDue}</span><br>
        Loyalty Points: <span style="float: right; color: #ff9800;"><strong>+${sampleData.loyaltyPointsEarned}</strong></span>
      </div>
      
      <hr style="border: 1px solid #000; margin: 2mm 0;">
      
      <div style="text-align: center; margin: 2mm 0;">
        <div style="font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '16px' : '18px'}; margin-bottom: 1mm;">
          🛍️ Thank You for Shopping! 🛍️
        </div>
        <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 1mm;">
          ${(settings.receiptFooter || 'Thank you for shopping with us!').replace(/\n/g, '<br>')}
        </div>
        <div style="font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'}; color: #666;">
          Store Timings: 9:00 AM - 10:00 PM<br>
          Customer Care: ${settings.phoneNumber || '+91-9876543210'}
        </div>
        <div style="font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'}; color: #666;">
          This is a computer generated invoice
        </div>
      </div>
    </div>
  `;
};