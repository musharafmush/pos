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
    small: { base: '9px', header: '14px', total: '11px' },
    medium: { base: '11px', header: '16px', total: '12px' },
    large: { base: '13px', header: '18px', total: '14px' }
  };

  const fonts = fontSizes[receiptSettings.fontSize];

  // Font family options
  const fontFamilies = {
    courier: "'Courier New', 'Consolas', 'Lucida Console', monospace",
    arial: "'Arial', 'Helvetica', sans-serif",
    impact: "'Impact', 'Arial Black', sans-serif"
  };

  const receiptHtml = generateReceiptHTML({
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
      * { box-sizing: border-box; }
      body { 
        margin: 0; 
        padding: 8px; 
        font-family: 'Courier New', monospace;
        background: white;
        color: black;
        line-height: 1.2;
      }
      .receipt { 
        width: 100%; 
        max-width: ${paperWidth === 'thermal58' ? '220px' : paperWidth === 'thermal80' ? '300px' : '400px'};
        margin: 0 auto;
        padding: 4px;
        border: 1px solid #ddd;
        background: white;
      }

      /* Print-specific styles */
      @media print {
        body { 
          margin: 0 !important; 
          padding: 0 !important; 
          background: white !important;
        }
        .receipt { 
          width: ${paperWidth} !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 2mm !important;
          border: none !important;
          font-size: ${paperWidth === 'thermal58' ? '8pt' : paperWidth === 'thermal80' ? '9pt' : '10pt'} !important;
        }
        @page { 
          size: ${paperWidth} auto; 
          margin: 0mm !important; 
        }

        /* Hide browser UI elements */
        .no-print { display: none !important; }
      }

      /* Screen preview styles */
      @media screen {
        body {
          background: #f5f5f5;
          padding: 20px;
        }
        .receipt {
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          background: white;
        }
        .print-instructions {
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          background: #e3f2fd;
          border-radius: 4px;
          font-family: Arial, sans-serif;
          font-size: 14px;
        }
      }
    </style>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${data.billNumber}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${printCSS}
      </head>
      <body>
        <div class="print-instructions no-print">
          <strong>Receipt Preview - ${data.billNumber}</strong><br>
          Paper Size: ${paperWidth} | Use Ctrl+P to print<br>
          <button onclick="window.print()" style="margin: 5px; padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">🖨️ Print Now</button>
          <button onclick="window.close()" style="margin: 5px; padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">❌ Close</button>
        </div>
        <div class="receipt">${receiptHtml}</div>

        <script>
          // Auto-focus the print window
          window.focus();

          // Enhanced print handling
          function autoPrint() {
            try {
              window.print();
            } catch (e) {
              console.error('Auto-print failed:', e);
              alert('Please use Ctrl+P to print or click the Print button above.');
            }
          }

          // Auto-print after a short delay (optional)
          ${receiptSettings?.autoPrint !== false ? 'setTimeout(autoPrint, 1000);' : ''}

          // Handle print completion
          window.onafterprint = function() {
            console.log('Print dialog closed');
            // Optionally auto-close after printing
            // setTimeout(() => window.close(), 2000);
          };

          // Keyboard shortcuts
          document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
              e.preventDefault();
              window.print();
            }
            if (e.key === 'Escape') {
              window.close();
            }
          });
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
};

  const generateReceiptHTML = (sale: any, settings: any) => {
    const date = new Date(sale.createdAt);
    const formattedDate = date.toLocaleDateString('en-IN');
    const formattedTime = date.toLocaleTimeString('en-IN', { hour12: true });

    return `
      <div style="
        width: ${settings.paperWidth === 'thermal58' ? '58mm' : settings.paperWidth === 'thermal80' ? '80mm' : '112mm'};
        font-family: 'Courier New', monospace;
        font-size: ${settings.paperWidth === 'thermal58' ? '9px' : '10px'};
        line-height: 1.3;
        margin: 0;
        padding: 2mm;
        background: white;
        color: black;
      ">
        <!-- Business Header -->
        <div style="text-align: center; margin-bottom: 4mm;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 2mm; letter-spacing: 2px;">
            ${settings.businessName || 'M MART'}
          </div>
          <div style="font-size: 12px; margin-bottom: 2mm;">
            Professional Retail Solution
          </div>
          <div style="font-size: 9px; margin-bottom: 1mm; font-weight: bold; color: #d32f2f;">
            GST NO: ${settings.taxId || '33GSPDB3311F1ZZ'}
          </div>
          <div style="font-size: 9px; margin-bottom: 1mm;">
            ${(settings.businessAddress || '123 Business Street, City, State').replace(/\n/g, '<br>')}
          </div>
          <div style="font-size: 9px; margin-bottom: 2mm;">
            Tel: ${settings.phoneNumber || '+91-9876543210'}
          </div>
        </div>

        <!-- Horizontal Line -->
        <div style="border-top: 1px solid #000; margin: 3mm 0;"></div>

        <!-- Bill Details -->
        <div style="margin-bottom: 3mm;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
            <span>Bill No:</span>
            <span style="font-weight: bold;">${sale.orderNumber || 'PREVIEW-123456'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
            <span>Date:</span>
            <span>${formattedDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
            <span>Time:</span>
            <span>${formattedTime}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
            <span>Cashier:</span>
            <span>${sale.user?.name || 'Admin User'}</span>
          </div>
        </div>

        <!-- Dotted Line -->
        <div style="border-top: 1px dotted #000; margin: 3mm 0;"></div>

        ${settings.showCustomerDetails ? `
        <!-- Customer Details -->
        <div style="margin-bottom: 3mm;">
          <div style="font-weight: bold; margin-bottom: 1mm;">Customer Details:</div>
          <div>Name: ${sale.customer?.name || 'Preview Customer'}</div>
        </div>

        <!-- Dotted Line -->
        <div style="border-top: 1px dotted #000; margin: 3mm 0;"></div>
        ` : ''}

        <!-- Items Header -->
        <div style="display: flex; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 2mm;">
          <div style="flex: 2;">Item</div>
          <div style="flex: 1; text-align: center;">Qty</div>
          <div style="flex: 1; text-align: right;">Rate</div>
          <div style="flex: 1; text-align: right;">Amt</div>
        </div>

        <!-- Items List -->
        ${(sale.items && sale.items.length > 0 ? sale.items : [
          { productName: 'Premium Rice (5kg)', quantity: 2, unitPrice: 125, subtotal: 250, productSku: 'ITM264973991' },
          { productName: 'Cooking Oil (1L)', quantity: 1, unitPrice: 75, subtotal: 75, productSku: 'ITM264973992' },
          { productName: 'Sugar (1kg)', quantity: 3, unitPrice: 45, subtotal: 135, productSku: 'ITM264973993' }
        ]).map((item: any) => `
          <div style="margin-bottom: 3mm;">
            <div style="font-weight: bold; margin-bottom: 1mm;">
              ${item.productName || item.name}
            </div>
            ${settings.showItemSKU ? `
            <div style="font-size: 8px; color: #666; margin-bottom: 1mm;">
              ${item.productSku || item.sku || 'ITM264973991'}
            </div>
            ` : ''}
            <div style="display: flex;">
              <div style="flex: 2;"></div>
              <div style="flex: 1; text-align: center;">${item.quantity || 1}</div>
              <div style="flex: 1; text-align: right;">${settings.currencySymbol}${Number(item.unitPrice || item.price || 100).toFixed(0)}</div>
              <div style="flex: 1; text-align: right;">${settings.currencySymbol}${Number(item.subtotal || item.total || (item.quantity * item.unitPrice) || 100).toFixed(0)}</div>
            </div>
            ${settings.showMRP && settings.showSavings ? `
            <div style="text-align: right; font-size: 8px; margin-top: 1mm; color: #4caf50;">
              MRP: ${settings.currencySymbol}${Number((item.unitPrice || item.price || 100) + 20).toFixed(0)} Save: ${settings.currencySymbol}${((item.unitPrice || item.price || 100) * 0.2).toFixed(0)}
            </div>
            ` : ''}
          </div>
        `).join('')}

        <!-- Dotted Line -->
        <div style="border-top: 1px dotted #000; margin: 3mm 0;"></div>

        <!-- Totals Section -->
        <div style="margin-bottom: 3mm;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
            <span>Sub Total:</span>
            <span>${settings.currencySymbol}${Number(sale.total || 460).toFixed(0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
            <span>Taxable Amount:</span>
            <span>${settings.currencySymbol}${Number(sale.total || 460).toFixed(0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2mm;">
            <span>GST (${sale.tax || 0}%):</span>
            <span>${settings.currencySymbol}${Number(sale.taxAmount || 0).toFixed(0)}</span>
          </div>

          <div style="display: flex; justify-content: space-between; ${settings.boldTotals ? 'font-weight: bold;' : ''} font-size: 12px; border: 2px solid #000; padding: 2mm; margin: 2mm 0; ${settings.headerBackground ? 'background: #f5f5f5;' : ''}">
            <span>Total:</span>
            <span>${settings.currencySymbol}${Number(sale.total || 460).toFixed(0)}</span>
          </div>
        </div>

        <!-- Payment Details -->
        ${sale.paymentMethod ? `
        <div style="margin-bottom: 3mm;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
            <span>Payment Method:</span>
            <span style="font-weight: bold;">${(sale.paymentMethod || 'CASH').toUpperCase()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
            <span>Amount Paid:</span>
            <span style="font-weight: bold;">${settings.currencySymbol}${Number(sale.total || 460).toFixed(0)}</span>
          </div>
        </div>
        ` : ''}

        <!-- Dotted Line -->
        <div style="border-top: 1px dotted #000; margin: 3mm 0;"></div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 3mm;">
          <div style="font-weight: bold; margin-bottom: 2mm; font-size: 12px;">
            🙏 धन्यवाद | Thank you! 🙏
          </div>
          <div style="font-size: 9px; margin-bottom: 2mm;">
            ${(settings.receiptFooter || 'Thank you for shopping with us!').replace(/\n/g, '<br>')}
          </div>
          <div style="font-size: 8px; color: #666; margin-bottom: 1mm;">
            Items: ${(sale.items || []).length || 3} | Total Qty: ${(sale.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 6} | Savings: ${settings.currencySymbol}${((sale.items || []).reduce((sum: number) => sum + 20, 0) || 50).toFixed(2)}
          </div>
          <div style="font-size: 8px; color: #666; margin-bottom: 1mm;">
            Receipt: ${sale.orderNumber || 'PREVIEW-123456'} | Terminal: POS-Enhanced
          </div>
          <div style="font-size: 8px; color: #666;">
            ✨ Powered by Awesome Shop POS ✨
          </div>
        </div>
      </div>
    `;
  };

// Export the customization interface for use in settings
export { type ReceiptCustomization };