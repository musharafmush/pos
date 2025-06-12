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
        width: ${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal80' ? '72mm' : '112mm'} !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 1mm !important;
        border: none !important;
        background: white !important;
        page-break-inside: avoid !important;
        display: block !important;
      }

      /* Xprinter XP-420B Optimized Styles */
      @page { 
        size: ${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal80' ? '72mm' : '112mm'} 297mm !important;
        margin: 0mm !important; 
        padding: 0mm !important;
        border: none !important;
        /* Ensure background graphics are printed */
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      @media print {
        html, body { 
          margin: 0 !important; 
          padding: 0 !important; 
          background: white !important;
          font-size: ${paperWidth === 'thermal58' ? '11pt' : paperWidth === 'thermal80' ? '12pt' : '15pt'} !important;
          width: 100% !important;
          height: auto !important;
          /* Enable background graphics for Xprinter */
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .receipt { 
          width: 100% !important;
          max-width: ${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal80' ? '72mm' : '112mm'} !important;
          margin: 0 !important;
          padding: 0.5mm !important;
          border: none !important;
          box-shadow: none !important;
          page-break-inside: avoid !important;
          /* Ensure proper scaling for Xprinter */
          transform: scale(1.0) !important;
          transform-origin: top left !important;
        }

        /* Hide all non-essential elements for thermal printing */
        .no-print, .print-instructions { 
          display: none !important; 
        }
        
        /* Ensure single page output and proper margins */
        * { 
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
          🖨️ Xprinter XP-420B Receipt: ${data.billNumber} | ${paperWidth}
          <br><small>Paper: 72mm x 297mm | Scale: 100% | Margins: None</small>
          <br><button onclick="xprinterOptimizedPrint()" style="margin: 2px; padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 2px; cursor: pointer; font-size: 11px;">Print (Optimized)</button>
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
                '✅ Paper Size: 72mm x 297mm (or "Thermal Receipt")\\n' +
                '✅ Margins: None\\n' +
                '✅ Scale: 100%\\n' +
                '✅ Background Graphics: Enabled\\n' +
                '✅ Driver: Official Xprinter XP-420B\\n\\n' +
                'Continue with optimized print?'
              );
              
              if (confirmed) {
                // Apply Xprinter-specific print settings
                document.body.style.transform = 'scale(1.0)';
                document.body.style.transformOrigin = 'top left';
                
                // Ensure all graphics elements are visible
                const elements = document.querySelectorAll('.thermal-line, .thermal-dotted, .thermal-total');
                elements.forEach(el => {
                  el.style.background = 'black';
                  el.style.borderColor = 'black';
                  el.style.webkitPrintColorAdjust = 'exact';
                  el.style.colorAdjust = 'exact';
                  el.style.printColorAdjust = 'exact';
                });
                
                setTimeout(() => {
                  window.print();
                }, 200);
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
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '14px' : '16px'}; font-weight: bold; margin-bottom: 2mm;">
        ${settings.businessName || 'M MART'}
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; margin-bottom: 1mm;">
        Professional Retail Solution
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; font-weight: bold; margin-bottom: 1mm;">
        GST: ${settings.taxId || '33GSPDB3311F1ZZ'}
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '9px' : '10px'}; margin-bottom: 1mm;">
        123 Business Street, City, State
      </div>
      
      <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '9px' : '10px'}; margin-bottom: 2mm;">
        Tel: ${settings.phoneNumber || '+91-9876543210'}
      </div>
      
      <div style="border-top: 1px solid #000; margin: 2mm 0; height: 0;"></div>
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; margin-bottom: 2mm;">
        <div style="display: flex; justify-content: space-between;">
          <span>Bill:</span><strong style="text-align: right;">${safeData.orderNumber}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Date:</span><span style="text-align: right;">${formattedDate}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Time:</span><span style="text-align: right;">${formattedTime}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Cashier:</span><span style="text-align: right;">${safeData.user.name}</span>
        </div>
      </div>
      
      <div style="border-top: 1px dotted #666; margin: 2mm 0; height: 0;"></div>
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; margin-bottom: 2mm;">
        <strong>Customer:</strong> ${safeData.customer.name}
      </div>
      
      <div style="border-top: 1px dotted #666; margin: 2mm 0; height: 0;"></div>
      
      <div style="display: flex; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 2mm;">
        <div style="flex: 1;">Item</div>
        <div style="flex: 1; text-align: center;">Qty</div>
        <div style="flex: 1; text-align: center;">Rate</div>
        <div style="flex: 1; text-align: right;">Total</div>
      </div>
      
      ${safeData.items.map((item: any) => `
        <div style="margin-bottom: 3mm; font-size: ${settings.paperWidth === 'thermal58' ? '9px' : '10px'};">
          <div style="font-weight: bold; margin-bottom: 1mm;">
            ${(item.productName || item.name || 'Item')}
          </div>
          <div style="font-size: ${settings.paperWidth === 'thermal58' ? '8px' : '9px'}; color: #666; margin-bottom: 1mm; font-style: italic;">
            ${item.productSku || item.sku || 'ITM000000'}
          </div>
          <div style="display: flex; align-items: center;">
            <div style="flex: 1;"></div>
            <div style="flex: 1; text-align: center; font-weight: bold;">${item.quantity || 1}</div>
            <div style="flex: 1; text-align: center; font-weight: bold;">${settings.currencySymbol}${Number(item.unitPrice || item.price || 100).toFixed(0)}</div>
            <div style="flex: 1; text-align: right; font-weight: bold;">${settings.currencySymbol}${Number(item.subtotal || item.total || ((item.quantity || 1) * (item.unitPrice || item.price || 100))).toFixed(0)}</div>
          </div>
          <div style="text-align: right; font-size: ${settings.paperWidth === 'thermal58' ? '8px' : '9px'}; margin-top: 1mm; color: #666;">
            MRP: ${settings.currencySymbol}${Number((item.unitPrice || item.price || 100) + 20).toFixed(0)} | Save: ${settings.currencySymbol}${((item.unitPrice || item.price || 100) * 0.2).toFixed(0)}
          </div>
        </div>
      `).join('')}
      
      <div style="border-top: 1px dotted #666; margin: 2mm 0; height: 0;"></div>
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; margin-bottom: 2mm;">
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
      
      <div style="border: 2px solid #000; padding: 2mm; text-align: center; font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '14px'}; margin: 2mm 0;">
        TOTAL: ${settings.currencySymbol}${Number(safeData.total).toFixed(0)}
      </div>
      
      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; margin: 2mm 0;">
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
        <div style="font-weight: bold; font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '14px'}; margin-bottom: 1mm;">
          🙏 Thank You! 🙏
        </div>
        <div style="font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; margin-bottom: 1mm;">
          Thank you for shopping with us!
        </div>
        <div style="font-size: ${settings.paperWidth === 'thermal58' ? '8px' : '9px'}; color: #666;">
          Items: ${safeData.items.length} | Qty: ${safeData.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)}
        </div>
        <div style="font-size: ${settings.paperWidth === 'thermal58' ? '8px' : '9px'}; color: #666;">
          ${safeData.orderNumber} | POS-Thermal
        </div>
      </div>
    `;
  };

// Export the customization interface for use in settings
export { type ReceiptCustomization };