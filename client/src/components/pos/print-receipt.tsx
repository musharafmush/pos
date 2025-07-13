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
  loyaltyDiscount?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyInfo?: {
    pointsEarned: number;
    totalPoints: number;
    availablePoints: number;
    pointsRedeemed?: number;
  };
}

export interface ReceiptCustomization {
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  email?: string;
  taxId: string;
  receiptFooter: string;
  showLogo: boolean;
  logoUrl?: string;
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
  showLoyaltyPoints: boolean;
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
      showLoyaltyPoints: true,
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

  // Generate comprehensive thermal receipt with all data
  const receiptHtml = generateEnhancedThermalReceiptHTML(data, receiptSettings);

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

      /* Xprinter XP-420B Optimized Styles - Force Single Sheet */
      @page { 
        size: ${paperWidth === 'thermal58' ? '58mm auto' : paperWidth === 'thermal72' ? '72mm auto' : paperWidth === 'thermal77' ? '77mm auto' : paperWidth === 'thermal80' ? '80mm auto' : '112mm auto'} !important;
        margin: 0 !important; 
        padding: 0 !important;
        border: none !important;
        /* Auto height to accommodate all content */
        page-break-inside: auto !important;
        page-break-after: auto !important;
        page-break-before: auto !important;
        /* Ensure background graphics are printed */
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
          width: ${paperWidth === 'thermal58' ? '54mm' : paperWidth === 'thermal72' ? '68mm' : paperWidth === 'thermal77' ? '73mm' : paperWidth === 'thermal80' ? '76mm' : '108mm'} !important;
          max-width: ${paperWidth === 'thermal58' ? '54mm' : paperWidth === 'thermal72' ? '68mm' : paperWidth === 'thermal77' ? '73mm' : paperWidth === 'thermal80' ? '76mm' : '108mm'} !important;
          margin: 0 auto !important;
          padding: 1.5mm !important;
          border: none !important;
          box-shadow: none !important;
          /* Allow content to flow naturally */
          page-break-inside: auto !important;
          page-break-after: auto !important;
          page-break-before: auto !important;
          height: auto !important;
          min-height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          /* Compact layout for single sheet */
          line-height: 1.1 !important;
          font-size: ${paperWidth === 'thermal58' ? '11px' : paperWidth === 'thermal72' ? '12px' : paperWidth === 'thermal77' ? '12px' : paperWidth === 'thermal80' ? '13px' : '14px'} !important;
          /* Ensure proper scaling for Xprinter */
          transform: scale(1.0) !important;
          transform-origin: top center !important;
          background: white !important;
        }

        /* Hide all non-essential elements for thermal printing */
        .no-print, .print-instructions { 
          display: none !important; 
        }

        /* Natural content flow */
        * { 
          page-break-inside: auto !important;
          page-break-after: auto !important;
          page-break-before: auto !important;
          orphans: 1 !important;
          widows: 1 !important;
        }

        /* Optimized spacing for thermal printing */
        .receipt * {
          page-break-inside: auto !important;
          page-break-after: auto !important;
          page-break-before: auto !important;
          margin: 0 !important;
          line-height: 1.2 !important;
        }

        /* Compact item rows */
        .receipt table, .receipt tr, .receipt td {
          margin: 0 !important;
          padding: 1mm !important;
          border-spacing: 0 !important;
          font-size: ${paperWidth === 'thermal58' ? '10px' : '11px'} !important;
        }

        /* Ultra-compact headers and footers */
        .receipt h1, .receipt h2, .receipt h3 {
          margin: 0.5mm 0 !important;
          font-size: ${paperWidth === 'thermal58' ? '12px' : '13px'} !important;
          line-height: 1.1 !important;
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
          🖨️ Xprinter XP-420B Receipt: ${data.billNumber} | ${paperWidth}
          <br><small>Paper: ${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : paperWidth === 'thermal80' ? '80mm' : '112mm'} x 297mm | Scale: 100% | Margins: 0mm (All sides)</small>
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
                '✅ Paper Size: ${paperWidth === 'thermal58' ? '58mm' : paperWidth === 'thermal72' ? '72mm' : paperWidth === 'thermal77' ? '77mm' : paperWidth === 'thermal80' ? '80mm' : '112mm'} x 297mm (or "Thermal Receipt")\\n' +
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
                  receipt.style.width = '${paperWidth === 'thermal58' ? '54mm' : paperWidth === 'thermal72' ? '68mm' : paperWidth === 'thermal77' ? '73mm' : paperWidth === 'thermal80' ? '76mm' : '104mm'}';
                  receipt.style.maxWidth = '${paperWidth === 'thermal58' ? '54mm' : paperWidth === 'thermal72' ? '68mm' : paperWidth === 'thermal77' ? '73mm' : paperWidth === 'thermal80' ? '76mm' : '104mm'}';
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
    // Always use current date and time for proper receipt display - FORCE CURRENT DATE
    const now = new Date();
    console.log('🕒 Current time for receipt:', now.toISOString());

    // Format date as DD/MM/YYYY - ALWAYS CURRENT
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    // Format time as HH:MM AM/PM
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const formattedTime = `${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`;

    console.log('📅 Formatted date for receipt:', formattedDate);
    console.log('⏰ Formatted time for receipt:', formattedTime);

    // Ensure sale has proper structure with defaults and safe property access
    const safeData = {
      orderNumber: sale?.orderNumber || 'POS1749705290189',
      createdAt: sale?.createdAt || new Date().toISOString(),
      user: {
        name: sale?.user?.name || 'Admin User'
      },
      customer: {
        name: sale?.customer?.name || sale?.customerName || sale?.customer_name || 'Walk-in Customer'
      },
      items: Array.isArray(sale?.items) ? sale.items.map((item: any) => ({
        productName: item?.productName || item?.name || 'Sample Product',
        quantity: Number(item?.quantity) || 1,
        unitPrice: Number(item?.unitPrice || item?.price) || 100,
        subtotal: Number(item?.subtotal || item?.total) || 100,
        productSku: item?.productSku || item?.sku || 'ITM000000',
        mrp: Number(item?.mrp) || 0
      })) : [
        { productName: 'salte 250 (250g Pack)', quantity: 1, unitPrice: 100, subtotal: 100, productSku: 'ITM007797849-REPACK-250G-17494473112' },
        { productName: 'rice 250g', quantity: 1, unitPrice: 100, subtotal: 100, productSku: 'ITM688883976' },
        { productName: 'dal 250g', quantity: 1, unitPrice: 100, subtotal: 100, productSku: 'ITM6127761836' },
        { productName: 'badam', quantity: 1, unitPrice: 1000, subtotal: 1000, productSku: 'ITM94816680' }
      ],
      total: Number(sale?.total) || 1300,
      tax: Number(sale?.tax) || 0,
      taxAmount: Number(sale?.taxAmount) || 0,
      paymentMethod: sale?.paymentMethod || 'CASH',
      loyaltyDiscount: Number(sale?.loyaltyDiscount) || 0,
      loyaltyPointsRedeemed: Number(sale?.loyaltyPointsRedeemed) || 0,
      loyaltyInfo: sale?.loyaltyInfo || null
    };

    return `
      ${settings.showLogo && settings.logoUrl ? `
        <div style="text-align: center; margin-bottom: 2mm;">
          <img src="${settings.logoUrl}" alt="Business Logo" style="max-width: ${settings.paperWidth === 'thermal58' ? '50mm' : settings.paperWidth === 'thermal72' ? '60mm' : settings.paperWidth === 'thermal77' ? '65mm' : '70mm'}; max-height: 20mm; object-fit: contain; margin: 0 auto; display: block;">
        </div>
      ` : ''}

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
        <div><strong>Customer:</strong> ${
          // Enhanced customer name extraction with multiple fallbacks
          safeData.customer?.name || 
          safeData.customerName || 
          safeData.customer_name ||
          safeData.selectedCustomer?.name ||
          sale?.customer?.name ||
          sale?.customerName ||
          sale?.customer_name ||
          'Walk-in Customer'
        }</div>
        ${(() => {
          // Enhanced phone number extraction with comprehensive fallback logic
          const phoneNumber = 
            // Primary sources from POS data
            safeData.customerDetails?.phone || 
            safeData.customer?.phone || 
            safeData.customerPhone ||
            // Secondary sources from selected customer
            (safeData.selectedCustomer && safeData.selectedCustomer.phone) ||
            // Direct property access fallbacks
            safeData.phone ||
            safeData.customer_phone ||
            // Raw sale data phone fields
            sale?.customer?.phone ||
            sale?.customerPhone ||
            sale?.customer_phone ||
            sale?.phone ||
            // Customer object nested access
            (sale?.customer && sale.customer.phone) ||
            (sale?.selectedCustomer && sale.selectedCustomer.phone) ||
            // Receipt data customer details
            (sale?.customerDetails && sale.customerDetails.phone);
          
          // Debug logging to console for troubleshooting
          console.log('🔍 Receipt Phone Debug - All Data Sources:', {
            'safeData.customerDetails': safeData.customerDetails,
            'safeData.customer': safeData.customer,
            'safeData.customerPhone': safeData.customerPhone,
            'safeData.selectedCustomer': safeData.selectedCustomer,
            'safeData.phone': safeData.phone,
            'safeData.customer_phone': safeData.customer_phone,
            'sale.customer': sale?.customer,
            'sale.customerPhone': sale?.customerPhone,
            'sale.customer_phone': sale?.customer_phone,
            'sale.phone': sale?.phone,
            'sale.selectedCustomer': sale?.selectedCustomer,
            'sale.customerDetails': sale?.customerDetails,
            'finalPhoneNumber': phoneNumber
          });
          
          // Always show phone section with proper data
          if (phoneNumber && phoneNumber.trim() !== '' && phoneNumber.trim() !== 'undefined' && phoneNumber.trim() !== 'null') {
            return `
            <div style="font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'}; color: #333; margin-top: 1mm; font-weight: bold;">
              📞 ${phoneNumber.trim()}
            </div>
            `;
          } else {
            // Only show placeholder if truly no phone data available
            return `
            <div style="font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'}; color: #999; margin-top: 1mm; font-style: italic;">
              📞 Phone: Contact store for details
            </div>
            `;
          }
        })()}
        ${(() => {
          // Enhanced email extraction from multiple possible sources
          const emailAddress = safeData.customerDetails?.email || 
                               safeData.customer?.email || 
                               safeData.customerEmail ||
                               (safeData.selectedCustomer && safeData.selectedCustomer.email) ||
                               // Additional fallback sources
                               safeData.email ||
                               safeData.customer_email;
          
          if (emailAddress && emailAddress.trim() !== '') {
            return `
            <div style="font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'}; color: #333; margin-top: 1mm;">
              ✉️ ${emailAddress.trim()}
            </div>
            `;
          }
          return '';
        })()}
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
          ${settings.showMRP ? `
          <div style="color: #059669; font-size: ${settings.paperWidth === 'thermal58' ? '11px' : '12px'}; margin-top: 1px;">
            ${(() => {
              // Get MRP from multiple possible sources
              const actualMRP = Number(item.mrp || item.product_mrp || item.originalPrice || 0);
              const sellingPrice = Number(item.unitPrice || item.price || 0);

              console.log('MRP Display Debug:', {
                item_mrp: item.mrp,
                product_mrp: item.product_mrp,
                originalPrice: item.originalPrice,
                actualMRP,
                sellingPrice,
                itemName: item.productName || item.name
              });

              if (actualMRP > 0 && sellingPrice > 0) {
                const savings = actualMRP - sellingPrice;
                if (savings > 0) {
                  return `MRP: ${settings.currencySymbol || '₹'}${actualMRP.toFixed(0)} | Save: ${settings.currencySymbol || '₹'}${savings.toFixed(0)}`;
                } else if (savings < 0) {
                  return `MRP: ${settings.currencySymbol || '₹'}${actualMRP.toFixed(0)} | Above MRP: ${settings.currencySymbol || '₹'}${Math.abs(savings).toFixed(0)}`;
                } else {
                  return `MRP: ${settings.currencySymbol || '₹'}${actualMRP.toFixed(0)}`;
                }
              } else if (actualMRP > 0) {
                return `MRP: ${settings.currencySymbol || '₹'}${actualMRP.toFixed(0)}`;
              }
              // Fallback: if no MRP data available, show a placeholder
              return sellingPrice > 0 ? `MRP: ${settings.currencySymbol || '₹'}${(sellingPrice * 1.2).toFixed(0)}` : '';
            })()}
          </div>` : ''}
        </div>
      `).join('')}

      <div style="border-top: 1px dotted #666; margin: 2mm 0; height: 0;"></div>

      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'}; margin-bottom: 2mm;">
        <div style="display: flex; justify-content: space-between;">
          <span>Sub Total:</span>
          <span style="text-align: right;">${settings.currencySymbol}${Number(safeData.total).toFixed(0)}</span>
        </div>
        ${safeData.loyaltyDiscount && Number(safeData.loyaltyDiscount) > 0 ? `
        <div style="display: flex; justify-content: space-between; color: #059669;">
          <span>Loyalty Discount:</span>
          <span style="text-align: right;">-${settings.currencySymbol}${Number(safeData.loyaltyDiscount).toFixed(0)}</span>
        </div>
        ` : ''}
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

      ${settings.showLoyaltyPoints !== false ? `
      <div style="border-top: 1px dotted #666; margin: 2mm 0; height: 0;"></div>

      <div style="font-size: ${settings.paperWidth === 'thermal58' ? '12px' : '13px'}; margin: 2mm 0; background: #f0f8ff; padding: 1.5mm; border: 1px solid #d0e7ff; border-radius: 2px;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 1.5mm; color: #1a365d; font-size: ${settings.paperWidth === 'thermal58' ? '13px' : '14px'};">
          ⭐ LOYALTY POINTS ⭐
        </div>
        
        <!-- Points to Earn from this purchase -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 1mm; color: #059669; font-weight: bold;">
          <span>Points to Earn:</span>
          <strong style="color: #047857;">+${(() => {
            // Calculate points earned from the final total (after all discounts)
            const finalTotal = parseFloat(safeData.total?.toString() || '0');
            const pointsEarned = Math.round((finalTotal * 0.01) * 100) / 100;
            return pointsEarned.toFixed(2);
          })()}</strong>
        </div>
        
        <!-- Loyalty Discount Applied (if any) -->
        ${safeData.loyaltyDiscount && Number(safeData.loyaltyDiscount) > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 1mm; color: #dc2626; font-weight: bold;">
          <span>Loyalty Discount:</span>
          <strong style="color: #dc2626;">-${settings.currencySymbol}${Number(safeData.loyaltyDiscount).toFixed(2)}</strong>
        </div>
        ` : ''}
        
        <!-- Points Redeemed this transaction -->
        ${safeData.loyaltyPointsRedeemed && Number(safeData.loyaltyPointsRedeemed) > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 1mm; color: #dc2626; font-weight: bold;">
          <span>Points Redeemed:</span>
          <strong style="color: #dc2626;">-${Number(safeData.loyaltyPointsRedeemed).toFixed(2)}</strong>
        </div>
        ` : ''}
        
        <!-- Balance Points after this transaction -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 1mm; color: #2563eb; font-weight: bold;">
          <span>Balance Points:</span>
          <strong style="color: #1d4ed8;">${(() => {
            // Calculate balance: existing available points + points earned - points redeemed
            const existingPoints = safeData.loyaltyInfo ? Number(safeData.loyaltyInfo.availablePoints || 0) : 0;
            const finalTotal = parseFloat(safeData.total?.toString() || '0');
            const pointsEarned = Math.round((finalTotal * 0.01) * 100) / 100;
            const pointsRedeemed = Number(safeData.loyaltyPointsRedeemed || 0);
            
            // If customer had points redeemed, their current balance would be: existing - redeemed + earned
            // If no redemption, it's: existing + earned
            let finalBalance;
            if (pointsRedeemed > 0) {
              // Points were redeemed, so the existing points already reflect the deduction
              finalBalance = existingPoints + pointsEarned;
            } else {
              // No redemption, just add earned points to existing
              finalBalance = existingPoints + pointsEarned;
            }
            
            return Math.max(0, finalBalance).toFixed(2);
          })()}</strong>
        </div>
        
        <!-- Loyalty Program Information -->
        <div style="border-top: 1px dashed #cbd5e1; margin-top: 1.5mm; padding-top: 1mm;">
          <div style="text-align: center; font-size: ${settings.paperWidth === 'thermal58' ? '10px' : '11px'}; color: #6b7280; font-style: italic; line-height: 1.2;">
            Earn 1 point per ${settings.currencySymbol}100 spent • 1 point = ${settings.currencySymbol}1 discount
          </div>
        </div>
      </div>` : ''}

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