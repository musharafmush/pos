import { formatCurrency } from "@/lib/currency";

interface ReceiptItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: string;
  total: number;
  mrp: number;
}

interface ReceiptData {
  billNumber: string;
  billDate: string;
  customerDetails: {
    name: string;
    doorNo?: string;
    street?: string;
    address?: string;
    place?: string;
  };
  salesMan: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  changeDue: number;
  paymentMethod: string;
  notes?: string;
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

  // Layout Customization
  paperWidth: 'thermal58' | 'thermal72' | 'thermal77' | 'thermal80' | 'a4';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'courier' | 'arial' | 'impact';
  headerStyle: 'centered' | 'left' | 'justified';

  // Content Options
  showCustomerDetails: boolean;
  showItemSKU: boolean;
  showMRP: boolean;
  showSavings: boolean;
  showBarcode: boolean;
  showQRCode: boolean;

  // Colors and Styling
  headerBackground: boolean;
  boldTotals: boolean;
  separatorStyle: 'solid' | 'dashed' | 'dotted';

  // Additional Info
  showTermsConditions: boolean;
  termsConditions: string;
  showReturnPolicy: boolean;
  returnPolicy: string;

  // Multi-language Support
  language: 'english' | 'hindi' | 'tamil';
  currencySymbol: string;

  // Thermal Printer Optimization
  thermalOptimized?: boolean;
}

export const printReceipt = (data: ReceiptData, customization?: Partial<ReceiptCustomization>) => {
  // Create a dedicated print container
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
      paperWidth: 'thermal77',
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

  // Paper configurations with 77mm support
    const paperConfigs = {
      thermal58: { width: '54mm', maxWidth: '50mm', fontSize: '12px' },
      thermal72: { width: '72mm', maxWidth: '68mm', fontSize: '13px' },
      thermal77: { width: '77mm', maxWidth: '73mm', fontSize: '14px' },
      thermal80: { width: '80mm', maxWidth: '76mm', fontSize: '14px' },
      '58mm': { width: '54mm', maxWidth: '50mm', fontSize: '12px' },
      '72mm': { width: '72mm', maxWidth: '68mm', fontSize: '13px' },
      '77mm': { width: '77mm', maxWidth: '73mm', fontSize: '14px' },
      '80mm': { width: '80mm', maxWidth: '76mm', fontSize: '14px' },
      '112mm': { width: '108mm', maxWidth: '104mm', fontSize: '15px' },
      a4: { width: '210mm', maxWidth: '200mm', fontSize: '15px' }
    };

  // Font configurations
  const fontSizes = {
    small: { base: '14px', header: '20px', total: '16px' },
    medium: { base: '16px', header: '22px', total: '18px' },
    large: { base: '18px', header: '24px', total: '20px' }
  };

  const fonts = fontSizes[receiptSettings?.fontSize || 'medium'];

  // Font family options
  const fontFamilies = {
    courier: "'Courier New', 'Consolas', 'Lucida Console', monospace",
    arial: "'Arial', 'Helvetica', sans-serif",
    impact: "'Impact', 'Arial Black', sans-serif"
  };

  // Helper function to convert numbers to words (Indian format)
  function numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    function convertGroup(n: number): string {
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
    }
    
    const intNum = Math.floor(num);
    if (intNum < 1000) return convertGroup(intNum).trim();
    if (intNum < 100000) return convertGroup(Math.floor(intNum / 1000)).trim() + ' Thousand ' + convertGroup(intNum % 1000).trim();
    if (intNum < 10000000) return convertGroup(Math.floor(intNum / 100000)).trim() + ' Lakh ' + convertGroup(Math.floor((intNum % 100000) / 1000)).trim() + ' Thousand ' + convertGroup(intNum % 1000).trim();
    
    return intNum.toString();
  }

  // Generate comprehensive professional thermal receipt HTML
  const receiptHtml = `
    <!-- Professional Header Section -->
    <div class="thermal-header" style="text-align: center; font-weight: bold; font-size: ${paperWidth === 'thermal58' ? '16px' : '18px'}; margin-bottom: 2mm; border-bottom: 2px solid #000; padding-bottom: 1mm;">
      ${receiptSettings?.businessName || 'M MART'}
    </div>
    
    <!-- Business Information Section -->
    <div class="thermal-text" style="text-align: center; font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; margin: 1mm 0; line-height: 1.1;">
      ${receiptSettings?.businessAddress ? receiptSettings.businessAddress.replace(/\n/g, '<br>') : '47,SHOP NO.1&2,<br>THANDARAMPATTU MAIN ROAD,<br>SAMUDHIRAM VILLAGE,<br>TIRUVANNAMALAI-606603'}<br>
      <strong>Phone:</strong> ${receiptSettings?.phoneNumber || '+91-9876543210'}<br>
      ${receiptSettings?.email ? `<strong>Email:</strong> ${receiptSettings.email}<br>` : ''}
      <strong>GST No:</strong> ${receiptSettings?.taxId || '33QIWPS9348F1Z2'}
    </div>
    
    <div class="thermal-line"></div>
    
    <!-- Invoice Details Section -->
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
    
    <!-- Products List Section -->
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
          ${data.items.map((item: any, index: number) => {
            const itemDiscount = item.discount || 0;
            const itemGst = item.gstRate || data.taxRate || 0;
            const baseAmount = parseFloat(item.price) * item.quantity;
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
    
    <!-- GST & Tax Summary Section -->
    <div class="thermal-text" style="font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; line-height: 1.2; margin: 1.5mm 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: left; padding: 0.5mm 0; border-bottom: 1px dotted #666;"><strong>Subtotal (Before Tax):</strong></td>
          <td style="text-align: right; padding: 0.5mm 0; border-bottom: 1px dotted #666;"><strong>₹${(parseFloat(data.subtotal) - (data.taxAmount || 0)).toFixed(2)}</strong></td>
        </tr>
        ${data.discount > 0 ? `
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">Item Discount${data.discountType === 'percentage' ? ` (${data.discount}%)` : ''}:</td>
            <td style="text-align: right; padding: 0.5mm 0; color: #d32f2f;">-₹${
              data.discountType === 'percentage' 
                ? (parseFloat(data.subtotal) * data.discount / 100).toFixed(2)
                : parseFloat(data.discount).toFixed(2)
            }</td>
          </tr>
        ` : ''}
        ${data.taxAmount > 0 ? `
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">
              <strong>GST Summary:</strong><br>
              ${data.cgstRate ? `CGST (${data.cgstRate}%): ₹${(data.taxAmount / 2).toFixed(2)}<br>` : ''}
              ${data.sgstRate ? `SGST (${data.sgstRate}%): ₹${(data.taxAmount / 2).toFixed(2)}<br>` : ''}
              ${data.igstRate ? `IGST (${data.igstRate}%): ₹${data.taxAmount}<br>` : ''}
              ${!data.cgstRate && !data.sgstRate && !data.igstRate ? `GST (${data.taxRate}%):` : ''}
            </td>
            <td style="text-align: right; padding: 0.5mm 0; vertical-align: top;">
              <strong>₹${parseFloat(data.taxAmount).toFixed(2)}</strong>
            </td>
          </tr>
        ` : ''}
        ${data.roundingAdjustment ? `
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">Rounding Adjustment:</td>
            <td style="text-align: right; padding: 0.5mm 0;">₹${parseFloat(data.roundingAdjustment).toFixed(2)}</td>
          </tr>
        ` : ''}
      </table>
    </div>
    
    <!-- Grand Total Section -->
    <div class="thermal-total" style="margin: 1.5mm 0; padding: 1mm; font-size: ${paperWidth === 'thermal58' ? '14px' : '16px'}; font-weight: bold; text-align: center; border: 2px solid #000; background: #f0f0f0;">
      GRAND TOTAL: ₹${parseFloat(data.grandTotal || data.total || 0).toFixed(2)}
      <br><small style="font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; font-weight: normal;">
        (${numberToWords(parseFloat(data.grandTotal || data.total || 0))} Only)
      </small>
    </div>
    
    <!-- Payment Details Section -->
    <div class="thermal-text" style="margin: 1.5mm 0; font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; line-height: 1.2;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: left; padding: 0.5mm 0;"><strong>Payment Method:</strong></td>
          <td style="text-align: right; padding: 0.5mm 0;"><strong>${(data.paymentMethod || 'CASH').toUpperCase()}</strong></td>
        </tr>
        <tr>
          <td style="text-align: left; padding: 0.5mm 0;">Amount Paid:</td>
          <td style="text-align: right; padding: 0.5mm 0;">₹${parseFloat(data.amountPaid || data.total || 0).toFixed(2)}</td>
        </tr>
        ${(data.changeDue || data.change) > 0 ? `
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;"><strong>Change Due:</strong></td>
            <td style="text-align: right; padding: 0.5mm 0; font-weight: bold; color: #2e7d32;">₹${parseFloat(data.changeDue || data.change || 0).toFixed(2)}</td>
          </tr>
        ` : ''}
        ${data.loyaltyPointsEarned ? `
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">Loyalty Points Earned:</td>
            <td style="text-align: right; padding: 0.5mm 0; color: #ff9800;"><strong>+${data.loyaltyPointsEarned}</strong></td>
          </tr>
        ` : ''}
      </table>
    </div>
    
    <div class="thermal-dotted"></div>
    
    <!-- Professional Footer Section -->
    <div class="thermal-text" style="text-align: center; margin: 2mm 0; font-size: ${paperWidth === 'thermal58' ? '9px' : '10px'}; line-height: 1.1; border-top: 1px solid #000; padding-top: 1mm;">
      <strong style="font-size: ${paperWidth === 'thermal58' ? '11px' : '12px'};">🛍️ Thank You for Shopping! 🛍️</strong><br>
      ${receiptSettings?.receiptFooter ? receiptSettings.receiptFooter.replace(/\n/g, '<br>') : 'Thank you for shopping with us!<br>Visit again soon<br>Customer Care: support@mmart.com'}<br>
      <br>
      <strong>Store Timings:</strong> 9:00 AM - 10:00 PM<br>
      <strong>Customer Care:</strong> ${receiptSettings?.phoneNumber || '+91-9876543210'}<br>
      ${receiptSettings?.email ? `<strong>Email:</strong> ${receiptSettings.email}<br>` : ''}
      <br>
      <div style="font-size: 8px; border-top: 1px dotted #666; padding-top: 1mm; margin-top: 1mm;">
        <strong>Invoice ID:</strong> ${data.billNumber}<br>
        <strong>Printed:</strong> ${new Date().toLocaleString()}<br>
        <strong>POS Terminal:</strong> Thermal Receipt System v2.0<br>
        <em>This is a computer generated invoice</em>
      </div>
    </div>
    
    ${data.notes ? `
      <div class="thermal-line"></div>
      <div class="thermal-text" style="text-align: center; font-size: ${paperWidth === 'thermal58' ? '8px' : '9px'}; margin: 1mm 0; font-style: italic;">
        <strong>Special Notes:</strong><br>
        ${data.notes}
      </div>
    ` : ''}
    
    ${receiptSettings?.showTermsConditions ? `
      <div class="thermal-line"></div>
      <div class="thermal-text" style="font-size: 8px; text-align: center; margin: 1mm 0;">
        <strong>Terms & Conditions:</strong><br>
        ${receiptSettings.termsConditions || 'All sales are final. No returns without receipt.'}
      </div>
    ` : ''}
    
    ${receiptSettings?.showReturnPolicy ? `
      <div class="thermal-text" style="font-size: 8px; text-align: center; margin: 1mm 0;">
        <strong>Return Policy:</strong><br>
        ${receiptSettings.returnPolicy || '7 days return policy. Terms apply.'}
      </div>
    ` : ''}
  `;

  // Create print window with enhanced settings
  const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
  if (!printWindow) {
    console.error('Could not open print window. Please allow popups for this site.');
    document.body.removeChild(printContainer);
    return;
  }

  const paperWidth = receiptSettings?.paperWidth || '77mm';
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
        font-family: 'Courier New', 'Consolas', monospace !important;
        background: white !important;
        color: black !important;
        line-height: 1.1 !important;
        font-size: ${paperWidth === 'thermal58' ? '16px' : paperWidth === 'thermal72' ? '17px' : paperWidth === 'thermal77' ? '18px' : paperWidth === 'thermal80' ? '18px' : '19px'} !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }
      
      .receipt { 
        width: ${paperWidth === 'thermal58' ? '54mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : paperWidth === 'thermal80' ? '80mm' : '108mm'} !important;
        max-width: ${paperWidth === 'thermal58' ? '54mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : paperWidth === 'thermal80' ? '80mm' : '108mm'} !important;
        margin: 0 auto !important;
        padding: 2mm !important;
        border: none !important;
        background: white !important;
        page-break-inside: avoid !important;
        display: block !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }

      /* Professional Thermal Receipt - Optimized for Single Sheet */
      @page { 
        size: ${paperWidth === 'thermal58' ? '58mm 200mm' : paperWidth === 'thermal72' ? '72mm 200mm' : paperWidth === 'thermal77' ? '77mm 200mm' : paperWidth === 'thermal80' ? '80mm 200mm' : '112mm 250mm'} !important;
        margin: 0 !important; 
        padding: 0 !important;
        border: none !important;
        /* Critical single page constraints */
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        page-break-before: avoid !important;
        orphans: 1000 !important;
        widows: 1000 !important;
        /* Enhanced graphics support */
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      @media print {
        * {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }
        
        html, body { 
          margin: 0 !important; 
          padding: 0 !important; 
          background: white !important;
          font-size: ${paperWidth === 'thermal58' ? '13pt' : paperWidth === 'thermal72' ? '13.5pt' : paperWidth === 'thermal77' ? '14pt' : paperWidth === 'thermal80' ? '14pt' : '16pt'} !important;
          width: 100% !important;
          height: auto !important;
          min-height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          /* Force single page */
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
          /* Enable background graphics for Xprinter */
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .receipt { 
          width: ${paperWidth === 'thermal58' ? '56mm' : paperWidth === 'thermal72' ? '70mm' : paperWidth === 'thermal77' ? '75mm' : paperWidth === 'thermal80' ? '78mm' : '110mm'} !important;
          max-width: ${paperWidth === 'thermal58' ? '56mm' : paperWidth === 'thermal72' ? '70mm' : paperWidth === 'thermal77' ? '75mm' : paperWidth === 'thermal80' ? '78mm' : '110mm'} !important;
          margin: 0 auto !important;
          padding: 2mm !important;
          border: none !important;
          box-shadow: none !important;
          /* Professional single page layout */
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
          height: auto !important;
          min-height: auto !important;
          max-height: ${paperWidth === 'thermal58' ? '190mm' : '190mm'} !important;
          overflow: visible !important;
          /* Enhanced typography */
          line-height: 1.2 !important;
          font-size: ${paperWidth === 'thermal58' ? '10px' : paperWidth === 'thermal72' ? '11px' : paperWidth === 'thermal77' ? '12px' : paperWidth === 'thermal80' ? '12px' : '13px'} !important;
          font-family: 'Courier New', monospace !important;
          /* Professional appearance */
          background: white !important;
          color: black !important;
        }

        /* Hide all non-essential elements for thermal printing */
        .no-print, .print-instructions { 
          display: none !important; 
        }
        
        /* Aggressive single page constraints */
        * { 
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
          orphans: 1000 !important;
          widows: 1000 !important;
        }
        
        /* Professional spacing and layout */
        .receipt * {
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
        }
        
        /* Enhanced table styling */
        .receipt table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 0.5mm 0 !important;
        }
        
        .receipt th, .receipt td {
          padding: 0.5mm !important;
          border: none !important;
          font-size: inherit !important;
          line-height: 1.2 !important;
        }
        
        /* Professional headers */
        .receipt h1, .receipt h2, .receipt h3, .thermal-header {
          margin: 1mm 0 !important;
          font-weight: bold !important;
          line-height: 1.2 !important;
        }
        
        /* Enhanced separator lines */
        .thermal-line {
          border-top: 1px solid #000 !important;
          margin: 1mm 0 !important;
          height: 0 !important;
          page-break-inside: avoid !important;
        }
        
        .thermal-dotted {
          border-top: 1px dotted #666 !important;
          margin: 1mm 0 !important;
          height: 0 !important;
          page-break-inside: avoid !important;
        }
        
        /* Xprinter specific optimizations */
        .thermal-line, .thermal-dotted {
          background: black !important;
          border-color: black !important;
        }
      }

      /* Screen preview styles - minimal for thermal format */
      @media screen {
        body {
          background: #f8f9fa !important;
          padding: 5px !important;
          display: flex !important;
          justify-content: center !important;
          align-items: flex-start !important;
          min-height: 100vh !important;
          margin: 0 !important;
        }
        
        .receipt {
          box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
          background: white !important;
          border: 1px solid #ddd !important;
          border-radius: 2px !important;
          margin: 5px auto !important;
        }
        
        .print-instructions {
          position: fixed !important;
          top: 10px !important;
          right: 10px !important;
          background: rgba(33, 150, 243, 0.9) !important;
          color: white !important;
          padding: 8px 12px !important;
          border-radius: 4px !important;
          font-family: Arial, sans-serif !important;
          font-size: 12px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
          z-index: 1000 !important;
        }
      }

      /* Ultra-compact thermal typography for single sheet */
      .thermal-header {
        font-weight: bold !important;
        text-align: center !important;
        font-size: ${paperWidth === 'thermal58' ? '14px' : '16px'} !important;
        letter-spacing: 0.5px !important;
        margin-bottom: 1mm !important;
        line-height: 1.1 !important;
      }
      
      .thermal-line {
        border-top: 1px solid #000 !important;
        margin: 0.5mm 0 !important;
        height: 0 !important;
      }
      
      .thermal-dotted {
        border-top: 1px dotted #000 !important;
        margin: 0.5mm 0 !important;
        height: 0 !important;
      }
      
      .thermal-text {
        font-size: ${paperWidth === 'thermal58' ? '11px' : '12px'} !important;
        line-height: 1.1 !important;
        margin: 0 !important;
      }
      
      .thermal-total {
        font-weight: bold !important;
        font-size: ${paperWidth === 'thermal58' ? '13px' : '14px'} !important;
        border: 1px solid #000 !important;
        padding: 0.5mm !important;
        text-align: center !important;
        margin: 1mm 0 !important;
        line-height: 1.1 !important;
      }
      
      /* Ultra-compact item list */
      .item-row {
        font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'} !important;
        line-height: 1.0 !important;
        margin: 0 !important;
        padding: 0.2mm 0 !important;
      }
    </style>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Thermal Receipt - ${data.billNumber}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : paperWidth === 'thermal80' ? '80mm' : '112mm'}, initial-scale=1.0">
        ${printCSS}
      </head>
      <body>
        <div class="print-instructions no-print">
          🖨️ Professional Thermal Receipt: ${data.billNumber || 'BILL'} | ${paperWidth}
          <br><small>Paper: ${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : paperWidth === 'thermal80' ? '80mm' : '112mm'} x 200mm | Scale: 100% | Margins: 0mm (All sides)</small>
          <br><small style="color: #d32f2f;">⚠️ IMPORTANT: Set Margins to 0mm in print dialog → More Settings</small>
          <br><button onclick="xprinterOptimizedPrint()" style="margin: 2px; padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 2px; cursor: pointer; font-size: 11px;">Print (Zero Margins)</button>
          <button onclick="window.print()" style="margin: 2px; padding: 4px 8px; background: #4CAF50; color: white; border: none; border-radius: 2px; cursor: pointer; font-size: 11px;">Standard Print</button>
          <button onclick="window.close()" style="margin: 2px; padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 2px; cursor: pointer; font-size: 11px;">Close</button>
        </div>
        
        <div class="receipt">${receiptHtml}</div>

        <script>
          // Xprinter XP-420B optimized script
          window.focus();

          function xprinterOptimizedPrint() {
            try {
              // Show Xprinter configuration reminder
              const confirmed = confirm(
                'Xprinter XP-420B Settings Check:\\n\\n' +
                '✅ Paper Size: ${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : paperWidth === 'thermal80' ? '80mm' : '112mm'} x 200mm (or "Thermal Receipt")\\n' +
                '✅ Margins: 0mm (All sides)\\n' +
                '✅ Scale: 100%\\n' +
                '✅ Background Graphics: Enabled\\n' +
                '✅ Driver: Official Xprinter XP-420B\\n\\n' +
                'Continue with optimized print?'
              );
              
              if (confirmed) {
                // Apply Xprinter-specific print settings
                const receipt = document.querySelector('.receipt');
                if (receipt) {
                  receipt.style.margin = '0';
                  receipt.style.padding = '2mm';
                  receipt.style.width = '${paperWidth === 'thermal58' ? '56mm' : paperWidth === 'thermal72' ? '70mm' : paperWidth === 'thermal77' ? '75mm' : paperWidth === 'thermal80' ? '78mm' : '108mm'}';
                  receipt.style.maxWidth = '${paperWidth === 'thermal58' ? '56mm' : paperWidth === 'thermal72' ? '70mm' : paperWidth === 'thermal77' ? '75mm' : paperWidth === 'thermal80' ? '78mm' : '108mm'}';
                }
                
                // Ensure all graphics elements are visible
                const elements = document.querySelectorAll('.thermal-line, .thermal-dotted, .thermal-total');
                elements.forEach(el => {
                  el.style.background = 'black';
                  el.style.borderColor = 'black';
                  el.style.webkitPrintColorAdjust = 'exact';
                  el.style.colorAdjust = 'exact';
                  el.style.printColorAdjust = 'exact';
                });
                
                // Force page margins to 0
                const style = document.createElement('style');
                style.textContent = '@page { margin: 0 !important; }';
                document.head.appendChild(style);
                
                setTimeout(() => {
                  window.print();
                  document.head.removeChild(style);
                }, 300);
              }
            } catch (e) {
              console.error('Xprinter optimized print failed:', e);
              alert('Print failed. Using standard print instead.');
              window.print();
            }
          }

          function thermalPrint() {
            try {
              if (window.print) {
                window.print();
              }
            } catch (e) {
              console.error('Thermal print failed:', e);
            }
          }

          // Auto-print for thermal printers (with Xprinter optimization)
          ${receiptSettings?.autoPrint !== false ? 'setTimeout(xprinterOptimizedPrint, 800);' : ''}

          // Optimized keyboard handling
          document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
              e.preventDefault();
              xprinterOptimizedPrint();
            }
            if (e.key === 'Escape') {
              window.close();
            }
          });

          // Handle after print with status feedback
          window.onafterprint = function() {
            console.log('Xprinter thermal print completed');
            // Optional: Show success message
            setTimeout(() => {
              if (confirm('Print completed! Close window?')) {
                window.close();
              }
            }, 1000);
          };

          // Add print configuration helper
          function showXprinterConfig() {
            alert(
              'Xprinter XP-420B Configuration Guide:\\n\\n' +
              '1. Control Panel > Devices and Printers\\n' +
              '2. Right-click Xprinter XP-420B > Printing Preferences\\n' +
              '3. Advanced/Page Setup:\\n' +
              '   - Width: 72mm\\n' +
              '   - Height: 297mm\\n' +
              '   - Save as "Thermal Receipt"\\n\\n' +
              '4. In Print Dialog:\\n' +
              '   - More Settings > Margins: None\\n' +
              '   - Background Graphics: Enabled\\n' +
              '   - Scale: 100%'
            );
          }
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();

  // Cleanup
    setTimeout(() => {
      if (printContainer.parentNode) {
        document.body.removeChild(printContainer);
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Error in printReceipt:', error);

    // Show user-friendly error message
    alert(`Receipt preview failed: ${error.message || 'Unknown error'}. Please check console for details.`);

    // Cleanup
    if (printContainer && printContainer.parentNode) {
      document.body.removeChild(printContainer);
    }
  }
};

  const generateThermalReceiptHTML = (sale: any, settings: any) => {
    // Safely handle date parsing with proper Indian format
    let formattedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
    let formattedTime = new Date().toLocaleTimeString('en-IN', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true 
    });

    try {
      if (sale?.createdAt) {
        const date = new Date(sale.createdAt);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          formattedTime = date.toLocaleTimeString('en-IN', { 
            hour: '2-digit',
            minute: '2-digit',
            hour12: true 
          });
        }
      }
    } catch (error) {
      console.warn('Date parsing error:', error);
      // Fallback to manual formatting
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      formattedDate = `${day}/${month}/${year}`;
      
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      const displayHours = hours % 12 || 12;
      formattedTime = `${displayHours}:${minutes} ${ampm}`;
    }

    // Ensure sale has proper structure with defaults and safe property access
    const safeData = {
      orderNumber: sale?.orderNumber || 'POS1749705290189',
      createdAt: sale?.createdAt || new Date().toISOString(),
      user: {
        name: sale?.user?.name || 'Admin User'
      },
      customer: {
        name: sale?.customer?.name || 'Walk-in Customer'
      },
      items: Array.isArray(sale?.items) ? sale.items.map((item: any) => ({
        productName: item?.productName || item?.name || 'Sample Product',
        quantity: Number(item?.quantity) || 1,
        unitPrice: Number(item?.unitPrice || item?.price) || 100,
        subtotal: Number(item?.subtotal || item?.total) || 100,
        productSku: item?.productSku || item?.sku || 'ITM000000'
      })) : [
        { productName: 'salte 250 (250g Pack)', quantity: 1, unitPrice: 100, subtotal: 100, productSku: 'ITM007797849-REPACK-250G-17494473112' },
        { productName: 'rice 250g', quantity: 1, unitPrice: 100, subtotal: 100, productSku: 'ITM688883976' },
        { productName: 'dal 250g', quantity: 1, unitPrice: 100, subtotal: 100, productSku: 'ITM6127761836' },
        { productName: 'badam', quantity: 1, unitPrice: 1000, subtotal: 1000, productSku: 'ITM94816680' }
      ],
      total: Number(sale?.total) || 1300,
      tax: Number(sale?.tax) || 0,
      taxAmount: Number(sale?.taxAmount) || 0,
      paymentMethod: sale?.paymentMethod || 'CASH'
    };

    return `
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '18px' : '20px'}; font-weight: bold; margin-bottom: 2mm;">
        ${settings.businessName || 'M MART'}
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 1mm;">
        Professional Retail Solution
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; font-weight: bold; margin-bottom: 1mm;">
        GST: ${settings.taxId || '33GSPDB3311F1ZZ'}
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'}; margin-bottom: 1mm;">
        123 Business Street, City, State
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'}; margin-bottom: 2mm;">
        Tel: ${settings.phoneNumber || '+91-9876543210'}
      </div>
      
      <div style="border-top: 1px solid #000; margin: 2mm 0; height: 0;"></div>
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 2mm;">
        <div style="display: flex; justify-content: space-between;">
          <span>Bill:</span><strong style="text-align: right;">${safeData.orderNumber}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Date:</span><span style="text-align: right; font-weight: bold;">${formattedDate}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Time:</span><span style="text-align: right; font-weight: bold;">${formattedTime}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Cashier:</span><span style="text-align: right;">${safeData.user.name}</span>
        </div>
      </div>
      
      <div style="border-top: 1px dotted #666; margin: 2mm 0; height: 0;"></div>
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 2mm;">
        <strong>Customer:</strong> ${safeData.customer.name}
      </div>
      
      <div style="border-top: 1px dotted #666; margin: 2mm 0; height: 0;"></div>
      
      <div style="display: flex; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'}; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 2mm;">
        <div style="flex: 2;">Item</div>
        <div style="width: 25px; text-align: center;">Qty</div>
        <div style="width: 50px; text-align: center;">Rate</div>
        <div style="width: 50px; text-align: right;">Total</div>
      </div>
      
      ${safeData.items.map((item: any) => `
        <div style="margin-bottom: 2mm; font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1mm;">
            <div style="flex: 2; font-weight: bold; line-height: 1.2;">
              ${(item.productName || item.name || 'Sample Product')}
            </div>
            <div style="width: 25px; text-align: center; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'};">
              ${item.quantity || 1}
            </div>
            <div style="width: 50px; text-align: center; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'};">
              ${settings.currencySymbol || '₹'}${Number(item.unitPrice || item.price || 30).toFixed(0)}
            </div>
            <div style="width: 50px; text-align: right; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'};">
              ${settings.currencySymbol || '₹'}${Number(item.subtotal || item.total || ((item.quantity || 1) * (item.unitPrice || item.price || 30))).toFixed(0)}
            </div>
          </div>
          <div style="font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; color: #666; margin-bottom: 1mm; font-style: italic;">
            ${item.productSku || item.sku || 'SAMPLE-001'}
          </div>
          <div style="text-align: right; font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; color: #666;">
            MRP: ${settings.currencySymbol || '₹'}${Number((item.unitPrice || item.price || 30) + 20).toFixed(0)} | Save: ${settings.currencySymbol || '₹'}${Number((item.unitPrice || item.price || 30) * 0.2).toFixed(0)}
          </div>
        </div>
      `).join('')}
      
      <div style="border-top: 1px dotted #666; margin: 2mm 0; height: 0;"></div>
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 2mm;">
        <div style="display: flex; justify-content: space-between;">
          <span>Sub Total:</span>
          <span style="text-align: right;">${settings.currencySymbol}${Number(safeData.total).toFixed(0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Taxable:</span>
          <span style="text-align: right;">${settings.currencySymbol}${Number(safeData.total).toFixed(0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>GST (0%):</span>
          <span style="text-align: right;">${settings.currencySymbol}0</span>
        </div>
      </div>
      
      <div style="border: 2px solid #000; padding: 2mm; text-align: center; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '16px' : '18px'}; margin: 2mm 0;">
        TOTAL: ${settings.currencySymbol}${Number(safeData.total).toFixed(0)}
      </div>
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin: 2mm 0;">
        <div style="display: flex; justify-content: space-between;">
          <span>Payment:</span>
          <strong style="text-align: right;">${safeData.paymentMethod.toUpperCase()}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Paid:</span>
          <strong style="text-align: right;">${settings.currencySymbol}${Number(safeData.total).toFixed(0)}</strong>
        </div>
      </div>
      
      <div style="border-top: 1px dotted #666; margin: 2mm 0; height: 0;"></div>
      
      <div style="text-align: center; margin: 2mm 0;">
        <div style="font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '16px' : '18px'}; margin-bottom: 1mm;">
          🙏 Thank You! 🙏
        </div>
        <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 1mm;">
          Thank you for shopping with us!
        </div>
        <div style="font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'}; color: #666;">
          Items: ${safeData.items.length} | Qty: ${safeData.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)}
        </div>
        <div style="font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'}; color: #666;">
          ${safeData.orderNumber} | POS-Thermal
        </div>
      </div>
    `;
  };

// Enhanced thermal receipt HTML generator - alias for unified printer settings
export const generateEnhancedThermalReceiptHTML = (sale: any, settings: any) => {
  // Ensure settings has currencySymbol
  const enhancedSettings = {
    ...settings,
    currencySymbol: settings.currencySymbol || '₹'
  };
  return generateThermalReceiptHTML(sale, enhancedSettings);
};

// Export the customization interface for use in settings
export { type ReceiptCustomization };