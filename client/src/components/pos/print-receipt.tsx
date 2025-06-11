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
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
            background: #fff;
            padding: 8px;
            max-width: 280px;
            margin: 0 auto;
        }

        .receipt-container {
            width: 100%;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 12px;
            background: #fff;
        }

        .header {
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }

        .business-name {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
        }

        .business-tagline {
            font-size: 9px;
            font-style: italic;
            margin-bottom: 8px;
            color: #666;
        }

        .business-details {
            font-size: 8px;
            line-height: 1.2;
            color: #444;
        }

        .bill-info {
            margin: 8px 0;
            font-size: 9px;
            background: #f8f9fa;
            padding: 6px;
            border-radius: 3px;
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
            border-top: 1px dashed #ccc;
            margin: 6px 0;
        }

        .customer-section {
            margin: 8px 0;
            font-size: 9px;
            background: #f0f8ff;
            padding: 4px;
            border-radius: 3px;
        }

        .section-title {
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 2px;
        }

        .items-section {
            margin: 12px 0;
        }

        .items-header {
            display: flex;
            font-weight: bold;
            background: #e9ecef;
            padding: 4px;
            border-radius: 3px;
            font-size: 8px;
            text-transform: uppercase;
        }

        .item-name-col { flex: 2.5; }
        .item-qty-col { flex: 0.8; text-align: center; }
        .item-rate-col { flex: 1.2; text-align: right; }
        .item-amt-col { flex: 1.2; text-align: right; }

        .item-row {
            margin: 4px 0;
            font-size: 9px;
            border-bottom: 1px dotted #eee;
            padding-bottom: 4px;
        }

        .item-main {
            display: flex;
            padding: 2px 0;
            align-items: center;
        }

        .item-details {
            font-size: 7px;
            color: #888;
            margin: 2px 0;
            font-style: italic;
        }

        .item-mrp {
            font-size: 7px;
            color: #28a745;
            margin-top: 1px;
        }

        .totals-section {
            margin-top: 12px;
            background: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
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
            font-size: 12px;
            background: #2c5aa0;
            color: white;
            padding: 6px;
            border-radius: 3px;
            margin: 6px 0;
        }

        .payment-section {
            margin: 8px 0;
            font-size: 9px;
            background: #e8f5e8;
            padding: 6px;
            border-radius: 3px;
        }

        .footer {
            text-align: center;
            margin-top: 12px;
            border-top: 1px solid #ddd;
            padding-top: 8px;
            font-size: 8px;
        }

        .footer-note {
            margin: 3px 0;
            color: #666;
        }

        .system-info {
            font-size: 7px;
            color: #999;
            margin-top: 6px;
        }

        .thank-you {
            font-weight: bold;
            color: #2c5aa0;
            font-size: 10px;
            margin-bottom: 4px;
        }

        @media print {
            body {
                padding: 0;
                margin: 0;
            }
            .receipt-container {
                width: 58mm;
                max-width: none;
                border: none;
                border-radius: 0;
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
                ${receiptSettings.businessAddress}
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