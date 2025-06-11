
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
}

export const printReceipt = (data: ReceiptData, customization?: Partial<ReceiptCustomization>) => {
  const printWindow = window.open('', '_blank', 'width=400,height=700');

  if (!printWindow) {
    console.error('Failed to open print window');
    alert('Unable to open print window. Please check your browser popup settings.');
    return;
  }

  // Load receipt settings from localStorage with defaults
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
    currencySymbol: '₹'
  };

  const receiptSettings = {
    ...defaultSettings,
    ...(savedSettings ? JSON.parse(savedSettings) : {}),
    ...customization
  };

  // Paper width configurations
  const paperConfigs = {
    thermal58: { width: '54mm', maxWidth: '50mm', fontSize: '9px' },
    thermal80: { width: '76mm', maxWidth: '72mm', fontSize: '11px' },
    a4: { width: '210mm', maxWidth: '200mm', fontSize: '12px' }
  };

  const config = paperConfigs[receiptSettings.paperWidth];

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

  const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt ${data.billNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: ${config.width} 297mm;
            margin: 2mm;
        }

        body {
            font-family: ${fontFamilies[receiptSettings.fontFamily]};
            font-size: ${fonts.base};
            font-weight: 500;
            line-height: 1.3;
            color: #000;
            background: #fff;
            width: ${config.maxWidth};
            margin: 0 auto;
            padding: 2mm;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
        }

        .receipt-container {
            width: 100%;
            margin: 0 auto;
            text-align: ${receiptSettings.headerStyle === 'centered' ? 'center' : 'left'};
        }

        .header {
            ${receiptSettings.headerStyle === 'centered' ? 'text-align: center;' : 'text-align: left;'}
            margin-bottom: 8px;
            padding: 6px;
            ${receiptSettings.headerBackground ? 'background: #f8f8f8;' : ''}
            border: ${receiptSettings.separatorStyle} 1px #000;
            border-radius: 3px;
        }

        .business-name {
            font-size: ${fonts.header};
            font-weight: bold;
            margin-bottom: 3px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .business-tagline {
            font-size: ${parseInt(fonts.base) - 1}px;
            margin-bottom: 3px;
            font-style: italic;
            color: #555;
        }

        .gst-line {
            font-size: ${parseInt(fonts.base) - 1}px;
            font-weight: bold;
            margin-bottom: 2px;
            color: #d63384;
        }

        .business-address {
            font-size: ${parseInt(fonts.base) - 2}px;
            line-height: 1.2;
            margin-bottom: 3px;
        }

        .contact-info {
            font-size: ${parseInt(fonts.base) - 1}px;
            margin-bottom: 3px;
        }

        .bill-details {
            margin: 6px 0;
            font-size: ${parseInt(fonts.base) - 1}px;
            background: #f9f9f9;
            padding: 4px;
            border-radius: 3px;
        }

        .bill-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            padding: 0 2px;
        }

        .separator {
            border-top: 1px ${receiptSettings.separatorStyle} #000;
            margin: 6px 0;
        }

        .customer-info {
            font-size: ${parseInt(fonts.base) - 1}px;
            margin: 4px 0;
            padding: 3px;
            background: #f0f8ff;
            border-radius: 3px;
        }

        .items-table {
            width: 100%;
            font-size: ${parseInt(fonts.base) - 1}px;
            margin: 6px 0;
        }

        .items-header {
            border-bottom: 2px solid #000;
            padding: 3px 0;
            font-weight: bold;
            display: flex;
            text-transform: uppercase;
            background: ${receiptSettings.headerBackground ? '#e9ecef' : 'transparent'};
            border-radius: 3px 3px 0 0;
        }

        .col-item { 
            flex: 2.8; 
            padding-left: 2px;
        }
        .col-qty { 
            flex: 0.8; 
            text-align: center; 
        }
        .col-rate { 
            flex: 1.2; 
            text-align: right; 
            padding-right: 3px;
        }
        .col-amount { 
            flex: 1.3; 
            text-align: right; 
            padding-right: 2px;
        }

        .item-row {
            padding: 3px 0;
            border-bottom: 1px ${receiptSettings.separatorStyle} #ccc;
            margin: 2px 0;
        }

        .item-main {
            display: flex;
            align-items: flex-start;
        }

        .item-name {
            font-weight: bold;
            font-size: ${parseInt(fonts.base)}px;
            line-height: 1.1;
            color: #2c3e50;
        }

        .item-sku {
            font-size: ${parseInt(fonts.base) - 3}px;
            color: #6c757d;
            margin-top: 1px;
            font-family: monospace;
        }

        .mrp-save {
            font-size: ${parseInt(fonts.base) - 2}px;
            color: #28a745;
            margin-top: 1px;
            font-weight: 500;
        }

        .totals {
            margin-top: 6px;
            font-size: ${parseInt(fonts.base)}px;
            background: #f8f9fa;
            padding: 4px;
            border-radius: 5px;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            padding: 1px 3px;
        }

        .grand-total {
            border: 2px solid #000;
            padding: 6px 4px;
            margin: 4px 0;
            font-weight: ${receiptSettings.boldTotals ? 'bold' : 'normal'};
            font-size: ${fonts.total};
            display: flex;
            justify-content: space-between;
            background: ${receiptSettings.headerBackground ? '#fff3cd' : 'transparent'};
            border-radius: 5px;
            ${receiptSettings.boldTotals ? 'text-transform: uppercase; letter-spacing: 0.5px;' : ''}
        }

        .highlight-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px;
            border-radius: 8px;
            text-align: center;
            margin: 6px 0;
            font-weight: bold;
        }

        .savings-highlight {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 4px 8px;
            border-radius: 15px;
            font-size: ${parseInt(fonts.base) - 2}px;
            font-weight: bold;
            display: inline-block;
            margin-top: 2px;
        }

        .premium-border {
            border: 3px double #000;
            padding: 8px;
            margin: 6px 0;
            border-radius: 8px;
        }

        .payment-info {
            margin: 6px 0;
            font-size: ${parseInt(fonts.base)}px;
            background: #e7f3ff;
            padding: 4px;
            border-radius: 3px;
        }

        .footer {
            text-align: center;
            margin-top: 8px;
            border-top: 2px ${receiptSettings.separatorStyle} #000;
            padding-top: 6px;
            font-size: ${parseInt(fonts.base) - 1}px;
        }

        .footer-line {
            margin: 2px 0;
            line-height: 1.2;
        }

        .system-info {
            font-size: ${parseInt(fonts.base) - 3}px;
            color: #6c757d;
            margin-top: 4px;
        }

        .thank-you {
            font-weight: bold;
            font-size: ${parseInt(fonts.base) + 1}px;
            margin-bottom: 4px;
            color: #198754;
        }

        .terms-conditions {
            font-size: ${parseInt(fonts.base) - 2}px;
            margin-top: 4px;
            padding: 3px;
            background: #fff3cd;
            border-radius: 3px;
            border: 1px solid #ffeaa7;
        }

        .return-policy {
            font-size: ${parseInt(fonts.base) - 2}px;
            margin-top: 3px;
            padding: 3px;
            background: #d1ecf1;
            border-radius: 3px;
            border: 1px solid #bee5eb;
        }

        @media print {
            @page {
                size: ${config.width} 297mm;
                margin: 1mm;
            }
            
            body {
                width: ${config.maxWidth};
                font-size: ${fonts.base};
                margin: 0;
                padding: 1mm;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            
            .receipt-container {
                width: 100%;
                margin: 0;
            }
            
            .business-name {
                font-size: ${fonts.header};
            }
            
            .grand-total {
                font-size: ${fonts.total};
                background: ${receiptSettings.headerBackground ? '#fff3cd !important' : 'transparent !important'};
            }
            
            .items-header {
                background: ${receiptSettings.headerBackground ? '#e9ecef !important' : 'transparent !important'};
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <!-- Header -->
        <div class="header">
            <div class="business-name">${receiptSettings.businessName}</div>
            <div class="business-tagline">Professional Retail Solution</div>
            <div class="gst-line">GST NO: ${receiptSettings.taxId}</div>
            <div class="business-address">
                ${receiptSettings.businessAddress.replace(/\n/g, '<br>')}
            </div>
            <div class="contact-info">
                Ph: ${receiptSettings.phoneNumber}
                ${receiptSettings.email ? `<br>Email: ${receiptSettings.email}` : ''}
            </div>
            ${receiptSettings.headerStyle === 'centered' ? '<div style="margin-top: 4px;">⭐ Welcome to Our Store ⭐</div>' : ''}
        </div>

        <!-- Bill Details -->
        <div class="bill-details">
            <div class="bill-row">
                <span><strong>Bill No:</strong></span>
                <span><strong>${data.billNumber}</strong></span>
            </div>
            <div class="bill-row">
                <span>Date:</span>
                <span>${data.billDate}</span>
            </div>
            <div class="bill-row">
                <span>Time:</span>
                <span>${new Date().toLocaleTimeString('en-IN', { 
                    hour12: true,
                    hour: '2-digit', 
                    minute: '2-digit'
                })}</span>
            </div>
            <div class="bill-row">
                <span>Cashier:</span>
                <span>${data.salesMan}</span>
            </div>
        </div>

        <!-- Customer Details -->
        ${receiptSettings.showCustomerDetails ? `
        <div class="customer-info">
            <div><strong>Customer Details</strong></div>
            <div>Name: ${data.customerDetails.name}</div>
            ${data.customerDetails.doorNo ? `<div>Contact: ${data.customerDetails.doorNo}</div>` : ''}
        </div>
        ` : ''}

        <div class="separator"></div>

        <!-- Items -->
        <div class="items-table">
            <div class="items-header">
                <div class="col-item">ITEM</div>
                <div class="col-qty">QTY</div>
                <div class="col-rate">RATE</div>
                <div class="col-amount">AMOUNT</div>
            </div>

            ${data.items.map(item => `
                <div class="item-row">
                    <div class="item-main">
                        <div class="col-item">
                            <div class="item-name">${item.name}</div>
                            ${receiptSettings.showItemSKU ? `<div class="item-sku">SKU: ${item.sku}</div>` : ''}
                            ${receiptSettings.showMRP && receiptSettings.showSavings ? `
                                <div class="mrp-save">
                                    MRP: ${receiptSettings.currencySymbol}${item.mrp} 
                                    (Save: ${receiptSettings.currencySymbol}${(item.mrp - parseFloat(item.price)).toFixed(2)})
                                </div>
                            ` : ''}
                        </div>
                        <div class="col-qty">${item.quantity}</div>
                        <div class="col-rate">${receiptSettings.currencySymbol}${parseFloat(item.price).toFixed(2)}</div>
                        <div class="col-amount">${receiptSettings.currencySymbol}${item.total.toFixed(2)}</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="separator"></div>

        <!-- Totals -->
        <div class="totals">
            <div class="total-row">
                <span>Sub Total:</span>
                <span>${receiptSettings.currencySymbol}${data.subtotal.toFixed(2)}</span>
            </div>
            ${data.discount > 0 ? `
                <div class="total-row">
                    <span>Discount ${data.discountType === 'percentage' ? `(${data.discount}%)` : ''}:</span>
                    <span>-${receiptSettings.currencySymbol}${(typeof data.discount === 'number' ? data.discount : 0).toFixed(2)}</span>
                </div>
            ` : ''}
            <div class="total-row">
                <span>Taxable Amount:</span>
                <span>${receiptSettings.currencySymbol}${(data.subtotal - (typeof data.discount === 'number' ? data.discount : 0)).toFixed(2)}</span>
            </div>
            <div class="total-row">
                <span>GST (${data.taxRate}%):</span>
                <span>${receiptSettings.currencySymbol}${data.taxAmount.toFixed(2)}</span>
            </div>
            
            <div class="grand-total">
                <span>GRAND TOTAL:</span>
                <span>${receiptSettings.currencySymbol}${data.grandTotal.toFixed(2)}</span>
            </div>
            
            ${data.items.reduce((sum, item) => sum + (item.mrp - parseFloat(item.price)) * item.quantity, 0) > 0 ? `
                <div class="highlight-box">
                    🎉 YOU SAVED ${receiptSettings.currencySymbol}${data.items.reduce((sum, item) => sum + (item.mrp - parseFloat(item.price)) * item.quantity, 0).toFixed(2)} TODAY! 🎉
                </div>
            ` : ''}
        </div>

        <!-- Payment -->
        <div class="payment-info">
            <div class="total-row">
                <span>Payment Method:</span>
                <span><strong>${data.paymentMethod.toUpperCase()}</strong></span>
            </div>
            <div class="total-row">
                <span>Amount Paid:</span>
                <span><strong>${receiptSettings.currencySymbol}${data.amountPaid.toFixed(2)}</strong></span>
            </div>
            ${data.changeDue > 0 ? `
                <div class="total-row">
                    <span>Change Due:</span>
                    <span><strong>${receiptSettings.currencySymbol}${data.changeDue.toFixed(2)}</strong></span>
                </div>
            ` : ''}
        </div>

        ${data.notes ? `
            <div class="separator"></div>
            <div class="customer-info">
                <div><strong>Notes:</strong></div>
                <div>${data.notes}</div>
            </div>
        ` : ''}

        <!-- Terms & Conditions -->
        ${receiptSettings.showTermsConditions ? `
            <div class="terms-conditions">
                <div><strong>Terms & Conditions:</strong></div>
                <div>${receiptSettings.termsConditions}</div>
            </div>
        ` : ''}

        <!-- Return Policy -->
        ${receiptSettings.showReturnPolicy ? `
            <div class="return-policy">
                <div><strong>Return Policy:</strong></div>
                <div>${receiptSettings.returnPolicy}</div>
            </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <div class="thank-you">🙏 धन्यवाद | Thank you for shopping with us! 🙏</div>
            ${receiptSettings.receiptFooter.split('\n').map(line => 
                `<div class="footer-line">${line}</div>`
            ).join('')}
            
            <div class="system-info">
                Items: ${data.items.length} | Total Qty: ${data.items.reduce((sum, item) => sum + item.quantity, 0)} | 
                Savings: ${receiptSettings.currencySymbol}${data.items.reduce((sum, item) => sum + (item.mrp - parseFloat(item.price)) * item.quantity, 0).toFixed(2)}
            </div>
            <div class="system-info">
                Receipt: ${data.billNumber} | Terminal: POS-Enhanced | ${new Date().toLocaleDateString('en-IN')}
            </div>
            <div class="system-info">
                ✨ Powered by Awesome Shop POS v7.0 ✨
            </div>
        </div>
    </div>
</body>
</html>`;

  try {
    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();

    // Wait for content to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        try {
          if (receiptSettings.autoPrint) {
            printWindow.print();
          }
          
          // Don't close immediately to allow user to see preview
          if (receiptSettings.autoPrint) {
            setTimeout(() => printWindow.close(), 2000);
          }
        } catch (error) {
          console.error('Print error:', error);
          printWindow.close();
        }
      }, 800);
    };
  } catch (error) {
    console.error('Receipt generation error:', error);
    printWindow.close();
    alert('Failed to generate receipt. Please try again.');
  }
};

// Export the customization interface for use in settings
export { type ReceiptCustomization };
