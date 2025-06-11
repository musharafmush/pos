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

export function printReceipt(data: ReceiptData) {
  const printWindow = window.open('', '_blank', 'width=400,height=700');

  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

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
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 10px;
            max-width: 300px;
            margin: 0 auto;
        }

        .receipt-container {
            width: 100%;
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }

        .business-name {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 4px;
        }

        .business-tagline {
            font-size: 11px;
            margin-bottom: 6px;
        }

        .business-details {
            font-size: 10px;
            line-height: 1.3;
        }

        .bill-info {
            margin: 10px 0;
            font-size: 11px;
        }

        .bill-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }

        .separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
        }

        .customer-section {
            margin: 10px 0;
            font-size: 11px;
        }

        .section-title {
            font-weight: bold;
            margin-bottom: 4px;
        }

        .items-header {
            display: flex;
            font-weight: bold;
            border-bottom: 1px solid #000;
            padding: 4px 0;
            font-size: 10px;
        }

        .item-name-col { flex: 3; }
        .item-qty-col { flex: 1; text-align: center; }
        .item-rate-col { flex: 2; text-align: right; }
        .item-amt-col { flex: 2; text-align: right; }

        .item-row {
            margin: 6px 0;
            font-size: 10px;
        }

        .item-main {
            display: flex;
            padding: 2px 0;
        }

        .item-details {
            font-size: 9px;
            color: #666;
            margin-left: 0;
            margin-bottom: 2px;
        }

        .item-mrp {
            font-size: 9px;
            color: #666;
            text-align: center;
            margin-top: 2px;
        }

        .totals-section {
            margin-top: 15px;
            border-top: 1px dashed #000;
            padding-top: 8px;
            font-size: 11px;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }

        .grand-total {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            border-bottom: 2px solid #000;
            padding: 6px 0;
            margin: 8px 0;
        }

        .payment-section {
            margin: 10px 0;
            font-size: 11px;
        }

        .footer {
            text-align: center;
            margin-top: 15px;
            border-top: 1px dashed #000;
            padding-top: 8px;
            font-size: 10px;
        }

        .footer-note {
            margin: 4px 0;
        }

        .system-info {
            font-size: 9px;
            color: #666;
            margin-top: 8px;
        }

        @media print {
            body {
                padding: 0;
                margin: 0;
            }
            .receipt-container {
                width: 58mm;
                max-width: none;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <!-- Header Section -->
        <div class="header">
            <div class="business-name">AWESOME SHOP POS</div>
            <div class="business-tagline">Professional Retail Solution</div>
            <div class="business-details">
                GST No: 29ABCDE1234F1Z5 | Ph: +91-9876543210<br>
                123 Main Street, City - 560001
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

        <div class="separator"></div>

        <!-- Customer Details -->
        <div class="customer-section">
            <div class="section-title">Customer Details:</div>
            <div>Name: ${data.customerDetails.name}</div>
        </div>

        <div class="separator"></div>

        <!-- Items Header -->
        <div class="items-header">
            <div class="item-name-col">Item</div>
            <div class="item-qty-col">Qty</div>
            <div class="item-rate-col">Rate</div>
            <div class="item-amt-col">Amt</div>
        </div>

        <!-- Items List -->
        ${data.items.map(item => `
            <div class="item-row">
                <div class="item-main">
                    <div class="item-name-col">${item.name}</div>
                    <div class="item-qty-col">${item.quantity}</div>
                    <div class="item-rate-col">${formatCurrency(parseFloat(item.price))}</div>
                    <div class="item-amt-col">${formatCurrency(item.total)}</div>
                </div>
                <div class="item-details">
                    ${item.sku}<br>
                    ${item.sku}
                </div>
                <div class="item-mrp">
                    MRP: ${formatCurrency(item.mrp)} (You Save: ${formatCurrency(item.mrp - parseFloat(item.price))})
                </div>
            </div>
        `).join('')}

        <div class="separator"></div>

        <!-- Totals Section -->
        <div class="totals-section">
            <div class="total-row">
                <span>Sub Total:</span>
                <span>${formatCurrency(data.subtotal)}</span>
            </div>

            ${data.discount > 0 ? `
                <div class="total-row">
                    <span>Taxable Amount:</span>
                    <span>${formatCurrency(data.subtotal - data.discount)}</span>
                </div>
            ` : `
                <div class="total-row">
                    <span>Taxable Amount:</span>
                    <span>${formatCurrency(data.subtotal)}</span>
                </div>
            `}

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
                    <span>Change:</span>
                    <span>${formatCurrency(data.changeDue)}</span>
                </div>
            ` : ''}
        </div>

        <div class="separator"></div>

        <!-- Notes -->
        ${data.notes ? `
            <div class="customer-section">
                <div class="section-title">Notes:</div>
                <div>${data.notes}</div>
            </div>
            <div class="separator"></div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <div class="footer-note">Thank you for shopping with us!</div>
            <div class="footer-note">Visit again soon</div>
            <div class="footer-note">Customer Care: support@awesomeshop.com</div>

            <div class="system-info">
                Items: ${data.items.length} | Qty: ${data.items.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div class="system-info">
                Powered by Awesome Shop POS v6.5.2
            </div>
        </div>
    </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(receiptHtml);
  printWindow.document.close();

  // Wait for content to load before printing
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
}