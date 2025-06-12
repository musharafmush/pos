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
  paperWidth: 'thermal58' | 'thermal80' | 'a4';
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

  // Paper configurations
    const paperConfigs = {
      thermal58: { width: '54mm', maxWidth: '50mm', fontSize: '9px' },
      thermal80: { width: '76mm', maxWidth: '72mm', fontSize: '11px' },
      '80mm': { width: '76mm', maxWidth: '72mm', fontSize: '11px' },
      '58mm': { width: '54mm', maxWidth: '50mm', fontSize: '9px' },
      '112mm': { width: '108mm', maxWidth: '104mm', fontSize: '12px' },
      a4: { width: '210mm', maxWidth: '200mm', fontSize: '12px' }
    };

  // Font configurations
  const fontSizes = {
    small: { base: '12px', header: '18px', total: '14px' },
    medium: { base: '14px', header: '20px', total: '16px' },
    large: { base: '16px', header: '22px', total: '18px' }
  };

  const fonts = fontSizes[receiptSettings?.fontSize || 'medium'];

  // Font family options
  const fontFamilies = {
    courier: "'Courier New', 'Consolas', 'Lucida Console', monospace",
    arial: "'Arial', 'Helvetica', sans-serif",
    impact: "'Impact', 'Arial Black', sans-serif"
  };

  const receiptHtml = generateThermalReceiptHTML({
        orderNumber: data.billNumber,
        createdAt: data.billDate,
        user: { name: data.salesMan },
        customer: { name: data.customerDetails.name },
        items: data.items.map(item => ({
            productName: item.name,
            productSku: item.sku,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price),
            subtotal: item.total,
            discount: data.discountType === 'percentage' ? data.discount : 0
        })),
        total: data.grandTotal,
        discount: data.discount,
        tax: data.taxAmount,
        paymentMethod: data.paymentMethod
    }, receiptSettings);

  // Create print window with enhanced settings
  const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
  if (!printWindow) {
    console.error('Could not open print window. Please allow popups for this site.');
    document.body.removeChild(printContainer);
    return;
  }

  const paperWidth = receiptSettings?.paperWidth || '80mm';
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
        font-size: ${paperWidth === 'thermal58' ? '13px' : paperWidth === 'thermal80' ? '15px' : '16px'} !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }
      
      .receipt { 
        width: ${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal80' ? '80mm' : '112mm'} !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 2mm !important;
        border: none !important;
        background: white !important;
        page-break-inside: avoid !important;
        display: block !important;
      }

      /* Thermal Printer Optimized Styles */
      @page { 
        size: ${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal80' ? '80mm' : '112mm'} auto !important;
        margin: 0mm !important; 
        padding: 0mm !important;
        border: none !important;
      }

      @media print {
        html, body { 
          margin: 0 !important; 
          padding: 0 !important; 
          background: white !important;
          font-size: ${paperWidth === 'thermal58' ? '11pt' : paperWidth === 'thermal80' ? '13pt' : '15pt'} !important;
          width: 100% !important;
          height: auto !important;
        }
        
        .receipt { 
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 1.5mm !important;
          border: none !important;
          box-shadow: none !important;
          page-break-inside: avoid !important;
        }

        /* Hide all non-essential elements for thermal printing */
        .no-print, .print-instructions { 
          display: none !important; 
        }
        
        /* Ensure single page output */
        * { 
          page-break-inside: avoid !important; 
        }
      }

      /* Screen preview styles - minimal for thermal format */
      @media screen {
        body {
          background: #f8f9fa !important;
          padding: 10px !important;
          display: flex !important;
          justify-content: center !important;
          align-items: flex-start !important;
          min-height: 100vh !important;
        }
        
        .receipt {
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
          background: white !important;
          border: 1px solid #e0e0e0 !important;
          border-radius: 2px !important;
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

      /* Thermal specific typography */
      .thermal-header {
        font-weight: bold !important;
        text-align: center !important;
        font-size: ${paperWidth === 'thermal58' ? '16px' : '18px'} !important;
        letter-spacing: 1px !important;
        margin-bottom: 2mm !important;
      }
      
      .thermal-line {
        border-top: 1px solid #000 !important;
        margin: 1.5mm 0 !important;
        height: 0 !important;
      }
      
      .thermal-dotted {
        border-top: 1px dotted #000 !important;
        margin: 1.5mm 0 !important;
        height: 0 !important;
      }
      
      .thermal-text {
        font-size: ${paperWidth === 'thermal58' ? '13px' : '14px'} !important;
        line-height: 1.2 !important;
      }
      
      .thermal-total {
        font-weight: bold !important;
        font-size: ${paperWidth === 'thermal58' ? '15px' : '16px'} !important;
        border: 1px solid #000 !important;
        padding: 1mm !important;
        text-align: center !important;
        margin: 2mm 0 !important;
      }
    </style>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Thermal Receipt - ${data.billNumber}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal80' ? '80mm' : '112mm'}, initial-scale=1.0">
        ${printCSS}
      </head>
      <body>
        <div class="print-instructions no-print">
          🖨️ Thermal Receipt: ${data.billNumber} | ${paperWidth}
          <br><button onclick="window.print()" style="margin: 2px; padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 2px; cursor: pointer; font-size: 11px;">Print</button>
          <button onclick="window.close()" style="margin: 2px; padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 2px; cursor: pointer; font-size: 11px;">Close</button>
        </div>
        
        <div class="receipt">${receiptHtml}</div>

        <script>
          // Thermal printer optimized script
          window.focus();

          function thermalPrint() {
            try {
              // Set print preferences for thermal printer
              if (window.print) {
                window.print();
              }
            } catch (e) {
              console.error('Thermal print failed:', e);
            }
          }

          // Auto-print for thermal printers
          ${receiptSettings?.autoPrint !== false ? 'setTimeout(thermalPrint, 800);' : ''}

          // Optimized keyboard handling
          document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
              e.preventDefault();
              thermalPrint();
            }
            if (e.key === 'Escape') {
              window.close();
            }
          });

          // Handle after print
          window.onafterprint = function() {
            console.log('Thermal print completed');
          };
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
    // Safely handle date parsing
    let formattedDate = new Date().toLocaleDateString('en-IN');
    let formattedTime = new Date().toLocaleTimeString('en-IN', { hour12: true });

    try {
      if (sale?.createdAt) {
        const date = new Date(sale.createdAt);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleDateString('en-IN');
          formattedTime = date.toLocaleTimeString('en-IN', { hour12: true });
        }
      }
    } catch (error) {
      console.warn('Date parsing error:', error);
    }

    // Ensure sale has proper structure with defaults and safe property access
    const safeData = {
      orderNumber: sale?.orderNumber || 'PREVIEW-123456',
      createdAt: sale?.createdAt || new Date().toISOString(),
      user: {
        name: sale?.user?.name || 'Admin User'
      },
      customer: {
        name: sale?.customer?.name || 'Preview Customer'
      },
      items: Array.isArray(sale?.items) ? sale.items.map((item: any) => ({
        productName: item?.productName || item?.name || 'Sample Product',
        quantity: Number(item?.quantity) || 1,
        unitPrice: Number(item?.unitPrice || item?.price) || 100,
        subtotal: Number(item?.subtotal || item?.total) || 100,
        productSku: item?.productSku || item?.sku || 'ITM000000'
      })) : [
        { productName: 'Premium Rice (5kg)', quantity: 2, unitPrice: 125, subtotal: 250, productSku: 'ITM264973991' },
        { productName: 'Cooking Oil (1L)', quantity: 1, unitPrice: 75, subtotal: 75, productSku: 'ITM264973992' },
        { productName: 'Sugar (1kg)', quantity: 3, unitPrice: 45, subtotal: 135, productSku: 'ITM264973993' }
      ],
      total: Number(sale?.total) || 460,
      tax: Number(sale?.tax) || 0,
      taxAmount: Number(sale?.taxAmount) || 0,
      paymentMethod: sale?.paymentMethod || 'CASH'
    };

    return `
      <div class="thermal-header">
        ${settings.businessName || 'M MART'}
      </div>
      
      <div style="text-align: center; font-size: 14px; margin-bottom: 2mm;">
        Professional Retail Solution
      </div>
      
      <div style="text-align: center; font-size: 12px; font-weight: bold; color: #333; margin-bottom: 1mm;">
        GST: ${settings.taxId || '33GSPDB3311F1ZZ'}
      </div>
      
      <div style="text-align: center; font-size: 12px; margin-bottom: 2mm;">
        ${(settings.businessAddress || 'Business Address').replace(/\n/g, '<br>')}
      </div>
      
      <div style="text-align: center; font-size: 12px; margin-bottom: 2mm;">
        Tel: ${settings.phoneNumber || '+91-9876543210'}
      </div>
      
      <div class="thermal-line"></div>
      
      <div class="thermal-text" style="margin-bottom: 2mm;">
        <div style="display: flex; justify-content: space-between;">
          <span>Bill:</span><strong>${safeData.orderNumber}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Date:</span><span>${formattedDate}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Time:</span><span>${formattedTime}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Cashier:</span><span>${safeData.user.name}</span>
        </div>
      </div>
      
      <div class="thermal-dotted"></div>
      
      ${settings.showCustomerDetails ? `
      <div class="thermal-text" style="margin-bottom: 2mm;">
        <strong>Customer:</strong> ${safeData.customer.name}
      </div>
      <div class="thermal-dotted"></div>
      ` : ''}
      
      <div style="display: flex; font-weight: bold; font-size: 13px; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 1mm;">
        <div style="flex: 2;">Item</div>
        <div style="flex: 1; text-align: center;">Qty</div>
        <div style="flex: 1; text-align: right;">Rate</div>
        <div style="flex: 1; text-align: right;">Total</div>
      </div>
      
      ${safeData.items.map((item: any) => `
        <div style="margin-bottom: 2mm; font-size: 12px;">
          <div style="font-weight: bold; margin-bottom: 1mm; font-size: 13px;">
            ${(item.productName || item.name || 'Item').substring(0, settings.paperWidth === 'thermal58' ? 20 : 30)}
          </div>
          ${settings.showItemSKU ? `
          <div style="font-size: 11px; color: #666; margin-bottom: 1mm;">
            ${item.productSku || item.sku || 'ITM000000'}
          </div>
          ` : ''}
          <div style="display: flex; font-size: 12px;">
            <div style="flex: 2;"></div>
            <div style="flex: 1; text-align: center;">${item.quantity || 1}</div>
            <div style="flex: 1; text-align: right;">${settings.currencySymbol}${Number(item.unitPrice || item.price || 100).toFixed(0)}</div>
            <div style="flex: 1; text-align: right; font-weight: bold;">${settings.currencySymbol}${Number(item.subtotal || item.total || ((item.quantity || 1) * (item.unitPrice || item.price || 100))).toFixed(0)}</div>
          </div>
          ${settings.showMRP && settings.showSavings ? `
          <div style="text-align: right; font-size: 10px; margin-top: 1mm; color: #4caf50;">
            MRP: ${settings.currencySymbol}${Number((item.unitPrice || item.price || 100) + 20).toFixed(0)} | Save: ${settings.currencySymbol}${((item.unitPrice || item.price || 100) * 0.2).toFixed(0)}
          </div>
          ` : ''}
        </div>
      `).join('')}
      
      <div class="thermal-dotted"></div>
      
      <div class="thermal-text" style="margin-bottom: 2mm;">
        <div style="display: flex; justify-content: space-between;">
          <span>Sub Total:</span>
          <span>${settings.currencySymbol}${Number(safeData.total).toFixed(0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Taxable:</span>
          <span>${settings.currencySymbol}${Number(safeData.total).toFixed(0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>GST (${safeData.tax}%):</span>
          <span>${settings.currencySymbol}${Number(safeData.taxAmount).toFixed(0)}</span>
        </div>
      </div>
      
      <div class="thermal-total">
        <div style="display: flex; justify-content: space-between; font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'};">
          <span>TOTAL:</span>
          <span>${settings.currencySymbol}${Number(safeData.total).toFixed(0)}</span>
        </div>
      </div>
      
      ${safeData.paymentMethod ? `
      <div class="thermal-text" style="margin: 2mm 0;">
        <div style="display: flex; justify-content: space-between;">
          <span>Payment:</span>
          <strong>${safeData.paymentMethod.toUpperCase()}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Paid:</span>
          <strong>${settings.currencySymbol}${Number(safeData.total).toFixed(0)}</strong>
        </div>
      </div>
      ` : ''}
      
      <div class="thermal-dotted"></div>
      
      <div style="text-align: center; margin: 2mm 0;">
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 1mm;">
          🙏 Thank You! 🙏
        </div>
        <div style="font-size: 12px; margin-bottom: 1mm;">
          ${(settings.receiptFooter || 'Visit Again Soon!').split('\n')[0]}
        </div>
        <div style="font-size: 10px; color: #666;">
          Items: ${safeData.items.length} | Qty: ${safeData.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)}
        </div>
        <div style="font-size: 10px; color: #666;">
          ${safeData.orderNumber} | POS-Thermal
        </div>
      </div>
    `;
  };

// Export the customization interface for use in settings
export { type ReceiptCustomization };