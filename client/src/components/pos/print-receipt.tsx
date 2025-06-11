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

export const printReceipt = (data: ReceiptData) => {
  const printWindow = window.open('', '_blank', 'width=400,height=700');

  if (!printWindow) {
    console.error('Failed to open print window');
    alert('Unable to open print window. Please check your browser popup settings.');
    return;
  }

  // Load receipt settings from localStorage
  const savedSettings = localStorage.getItem('receiptSettings');
  const receiptSettings = savedSettings ? JSON.parse(savedSettings) : {
    businessName: 'M MART',
    businessAddress: '47,SHOP NO.1&2,\nTHANDARAMPATTU MAIN ROAD,\nSAMUTHIRAM VILLAGE,\nTIRUVANNAMALAI-606603',
    phoneNumber: '+91-9876543210',
    taxId: '33QIWPS9348F1Z2',
    receiptFooter: 'Thank you for shopping with us!\nVisit again soon\nCustomer Care: support@mmart.com',
    showLogo: false,
    autoPrint: true
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

        body {
            font-family: 'Courier New', 'monospace', sans-serif;
            font-size: 10px;
            line-height: 1.3;
            color: #000;
            background: #fff;
            padding: 8px;
            max-width: 280px;
            margin: 0 auto;
            word-wrap: break-word;
        }

        .receipt-container {
            width: 100%;
            padding: 6px;
            background: #fff;
            border: 1px solid #ddd;
        }

        .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }

        .business-name {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
        }

        .business-tagline {
            font-size: 8px;
            font-style: italic;
            margin-bottom: 5px;
            color: #666;
        }

        .business-details {
            font-size: 8px;
            line-height: 1.2;
            color: #444;
        }

        .bill-info {
            margin: 6px 0;
            font-size: 9px;
            padding: 3px 0;
        }

        .bill-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }

        .bill-info-row span:first-child {
            font-weight: 600;
        }

        .separator {
            border-top: 1px dashed #000;
            margin: 5px 0;
        }

        .customer-section {
            margin: 4px 0;
            font-size: 8px;
            padding: 2px 0;
        }

        .section-title {
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 2px;
        }

        .items-section {
            margin: 8px 0;
        }

        .items-header {
            display: flex;
            font-weight: bold;
            padding: 3px 0;
            font-size: 8px;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
        }

        .item-name-col { flex: 3; }
        .item-qty-col { flex: 0.8; text-align: center; }
        .item-rate-col { flex: 1.2; text-align: right; }
        .item-amt-col { flex: 1.2; text-align: right; }

        .item-row {
            margin: 3px 0;
            font-size: 9px;
            border-bottom: 1px dotted #ccc;
            padding-bottom: 3px;
        }

        .item-main {
            display: flex;
            padding: 2px 0;
            align-items: center;
        }

        .item-details {
            font-size: 7px;
            color: #666;
            margin: 2px 0;
            font-style: italic;
        }

        .item-mrp {
            font-size: 7px;
            color: #28a745;
            margin-top: 2px;
        }

        .totals-section {
            margin-top: 8px;
            padding: 3px 0;
            font-size: 9px;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            padding: 1px 0;
        }

        .grand-total {
            font-weight: bold;
            font-size: 11px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px;
            margin: 4px 0;
            text-align: center;
        }

        .payment-section {
            margin: 6px 0;
            font-size: 9px;
            padding: 3px 0;
        }

        .footer {
            text-align: center;
            margin-top: 8px;
            border-top: 1px dashed #000;
            padding-top: 6px;
            font-size: 8px;
        }

        .footer-note {
            margin: 2px 0;
            color: #666;
        }

        .system-info {
            font-size: 7px;
            color: #999;
            margin-top: 3px;
        }

        .thank-you {
            font-weight: bold;
            color: #000;
            font-size: 9px;
            margin-bottom: 3px;
        }

        @media print {
            body {
                padding: 2mm;
                margin: 0;
                max-width: 80mm;
                font-size: 9px;
            }
            .receipt-container {
                width: 80mm;
                max-width: none;
                padding: 3mm;
                border: none;
            }
            .header, .footer, .separator {
                border-color: #000 !important;
            }
            .business-name {
                font-size: 16px;
            }
            .items-header, .total-row {
                font-size: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <!-- Header Section -->
        <div class="header">
            <div class="business-name">${receiptSettings.businessName}</div>
            <div class="business-tagline">Professional Retail Solution</div>
            <div class="business-details">
                ${receiptSettings.taxId ? `GST No: ${receiptSettings.taxId}<br>` : ''}
                Ph: ${receiptSettings.phoneNumber}<br>
                ${receiptSettings.businessAddress.replace(/\n/g, '<br>')}
            </div>
        </div>

        <!-- Bill Information -->
        <div class="bill-info">
            <div class="bill-info-row">
                <span>Bill No:</span>
                <span>${data.billNumber}</span>
            </div>
            <div class="bill-info-row">
                <span>Date:</span>
                <span>${data.billDate}</span>
            </div>
            <div class="bill-info-row">
                <span>Time:</span>
                <span>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <div class="bill-info-row">
                <span>Cashier:</span>
                <span>${data.salesMan}</span>
            </div>
        </div>

        <!-- Customer Details -->
        <div class="customer-section">
            <div class="section-title">Customer Details</div>
            <div>Name: ${data.customerDetails.name}</div>
        </div>

        <div class="separator"></div>

        <!-- Items Section -->
        <div class="items-section">
            <div class="items-header">
                <div class="item-name-col">Item</div>
                <div class="item-qty-col">Qty</div>
                <div class="item-rate-col">Rate</div>
                <div class="item-amt-col">Amount</div>
            </div>

            ${data.items.map(item => `
                <div class="item-row">
                    <div class="item-main">
                        <div class="item-name-col">${item.name}</div>
                        <div class="item-qty-col">${item.quantity}</div>
                        <div class="item-rate-col">${formatCurrency(parseFloat(item.price))}</div>
                        <div class="item-amt-col">${formatCurrency(item.total)}</div>
                    </div>
                    <div class="item-details">
                        ${item.sku}
                    </div>
                    <div class="item-mrp">
                        MRP: ${formatCurrency(item.mrp)} (Save: ${formatCurrency(item.mrp - parseFloat(item.price))})
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="separator"></div>

        <!-- Totals Section -->
        <div class="totals-section">
            <div class="total-row">
                <span>Sub Total:</span>
                <span>${formatCurrency(data.subtotal)}</span>
            </div>

            <div class="total-row">
                <span>Taxable Amount:</span>
                <span>${formatCurrency(data.subtotal - data.discount)}</span>
            </div>

            <div class="total-row">
                <span>GST (0%):</span>
                <span>${formatCurrency(0)}</span>
            </div>

            <div class="total-row grand-total">
                <span>GRAND TOTAL:</span>
                <span>${formatCurrency(data.grandTotal)}</span>
            </div>
        </div>

        <!-- Payment Section -->
        <div class="payment-section">
            <div class="total-row">
                <span>Payment Method:</span>
                <span>${data.paymentMethod.toUpperCase()}</span>
            </div>
            <div class="total-row">
                <span>Amount Paid:</span>
                <span>${formatCurrency(data.amountPaid)}</span>
            </div>
            ${data.changeDue > 0 ? `
                <div class="total-row">
                    <span>Change Due:</span>
                    <span>${formatCurrency(data.changeDue)}</span>
                </div>
            ` : ''}
        </div>

        <!-- Notes -->
        ${data.notes ? `
            <div class="separator"></div>
            <div class="customer-section">
                <div class="section-title">Notes:</div>
                <div>${data.notes}</div>
            </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <div class="thank-you">Thank you for shopping with us!</div>
            ${receiptSettings.receiptFooter.split('\n').map(line => `<div class="footer-note">${line}</div>`).join('')}

            <div class="system-info">
                Items: ${data.items.length} | Total Qty: ${data.items.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div class="system-info">
                Bill: ${data.billNumber} | Terminal: POS-Enhanced
            </div>
            <div class="system-info">
                Powered by Awesome Shop POS v6.5.2
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
          printWindow.print();
          printWindow.close();
        } catch (error) {
          console.error('Print error:', error);
          printWindow.close();
        }
      }, 500);
    };
  } catch (error) {
    console.error('Receipt generation error:', error);
    printWindow.close();
    alert('Failed to generate receipt. Please try again.');
  }
};