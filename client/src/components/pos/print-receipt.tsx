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
    let savedSettings = null;
    try {
      savedSettings = localStorage.getItem('receiptSettings');
    } catch (storageError) {
      console.warn('localStorage access failed:', storageError);
    }
    
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

    let receiptSettings = { ...defaultSettings };
    
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        receiptSettings = { ...receiptSettings, ...parsedSettings };
      } catch (parseError) {
        console.warn('Failed to parse receipt settings:', parseError);
      }
    }
    
    if (customization) {
      receiptSettings = { ...receiptSettings, ...customization };
    }

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
                  ${itemGst > 0 ? `<br><small>+${itemGst}% GST</small>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="thermal-line"></div>
      
      <div class="thermal-text" style="margin: 1.5mm 0; font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'}; line-height: 1.2;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">Subtotal:</td>
            <td style="text-align: right; padding: 0.5mm 0;"><strong>₹${data.subtotal}</strong></td>
          </tr>
          ${data.discount > 0 ? `
            <tr>
              <td style="text-align: left; padding: 0.5mm 0;">Discount:</td>
              <td style="text-align: right; padding: 0.5mm 0;">-₹${data.discount.toFixed(2)}</td>
            </tr>
          ` : ''}
          ${data.taxAmount && data.taxAmount > 0 ? `
            <tr>
              <td style="text-align: left; padding: 0.5mm 0;">Tax (${data.taxRate || 0}%):</td>
              <td style="text-align: right; padding: 0.5mm 0;">₹${data.taxAmount.toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr style="border-top: 1px solid #000; font-weight: bold; font-size: ${paperWidth === 'thermal58' ? '12px' : '14px'};">
            <td style="text-align: left; padding: 1mm 0;">TOTAL:</td>
            <td style="text-align: right; padding: 1mm 0;">₹${data.grandTotal || data.total}</td>
          </tr>
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">Paid:</td>
            <td style="text-align: right; padding: 0.5mm 0;">₹${data.amountPaid.toFixed(2)}</td>
          </tr>
          ${(data.changeDue || data.change) && (data.changeDue || data.change) > 0 ? `
            <tr>
              <td style="text-align: left; padding: 0.5mm 0;">Change:</td>
              <td style="text-align: right; padding: 0.5mm 0;">₹${(data.changeDue || data.change || 0).toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="text-align: left; padding: 0.5mm 0;">Payment:</td>
            <td style="text-align: right; padding: 0.5mm 0;"><strong>${data.paymentMethod.toUpperCase()}</strong></td>
          </tr>
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
        <small style="font-size: ${paperWidth === 'thermal58' ? '8px' : '9px'};">
          Amount in Words: ${numberToWords(data.grandTotal || data.total || 0)} Rupees Only
        </small>
      </div>
      
      ${data.notes ? `
        <div class="thermal-text" style="text-align: center; margin: 1mm 0; font-size: ${paperWidth === 'thermal58' ? '8px' : '9px'}; font-style: italic;">
          ${data.notes}
        </div>
      ` : ''}
      
      <style>
        .thermal-header { font-family: ${receiptSettings.fontFamily}, monospace; }
        .thermal-text { font-family: ${receiptSettings.fontFamily}, monospace; }
        .thermal-line { border-bottom: 1px solid #000; margin: 1mm 0; }
        .thermal-dotted { border-bottom: 1px dotted #666; margin: 1mm 0; }
        @media print {
          body { margin: 0; padding: 0; }
          .thermal-header, .thermal-text { color: #000 !important; }
        }
      </style>
    `;

    // Create iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : '80mm';
    printFrame.style.height = 'auto';
    document.body.appendChild(printFrame);

    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (printDocument) {
      try {
        printDocument.open();
        printDocument.write(receiptHtml);
        printDocument.close();
      } catch (documentError) {
        console.error('Document write failed:', documentError);
        throw new Error('Failed to generate receipt document');
      }
    } else {
      throw new Error('Unable to access print document');
    }

    // Auto print after a delay
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
        if (document.body.contains(printContainer)) {
          document.body.removeChild(printContainer);
        }
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
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
    throw error;
  }
};

// Sample receipt data for testing
export const sampleReceiptData: ReceiptData = {
  billNumber: "POS1750923123456",
  billDate: new Date().toLocaleString(),
  customerDetails: {
    name: "Priya Sharma",
    phone: "+91-9876543210",
    address: "123 Main Street, City"
  },
  salesMan: "Admin User",
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