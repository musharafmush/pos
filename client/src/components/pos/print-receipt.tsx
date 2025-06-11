
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

        @page {
            size: A4;
            margin: 20mm;
        }

        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            width: 100%;
            max-width: 170mm;
            margin: 0 auto;
            padding: 10mm;
        }

        .receipt-container {
            width: 100%;
            max-width: 150mm;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 2px dashed #000;
        }

        .business-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 4px;
        }

        .business-tagline {
            font-size: 12px;
            margin-bottom: 6px;
            font-style: italic;
        }

        .gst-line {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 4px;
        }

        .business-address {
            font-size: 11px;
            line-height: 1.3;
            margin-bottom: 6px;
        }

        .contact-info {
            font-size: 12px;
            margin-bottom: 6px;
        }

        .bill-details {
            margin: 8px 0;
            font-size: 12px;
        }

        .bill-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }

        .separator {
            border-top: 2px dashed #000;
            margin: 8px 0;
        }

        .customer-info {
            font-size: 12px;
            margin: 6px 0;
        }

        .items-table {
            width: 100%;
            font-size: 12px;
            margin: 8px 0;
        }

        .items-header {
            border-bottom: 2px solid #000;
            padding: 4px 0;
            font-weight: bold;
            display: flex;
            text-transform: uppercase;
        }

        .col-item { flex: 3; }
        .col-qty { flex: 1; text-align: center; }
        .col-rate { flex: 1.5; text-align: right; }
        .col-amount { flex: 1.5; text-align: right; }

        .item-row {
            padding: 4px 0;
            border-bottom: 1px dotted #ccc;
            margin: 3px 0;
        }

        .item-main {
            display: flex;
            align-items: center;
        }

        .item-name {
            font-weight: 500;
            font-size: 12px;
        }

        .item-sku {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
        }

        .mrp-save {
            font-size: 10px;
            color: #28a745;
            margin-top: 2px;
        }

        .totals {
            margin-top: 8px;
            font-size: 12px;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }

        .grand-total {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 6px 0;
            margin: 6px 0;
            font-weight: bold;
            font-size: 16px;
            display: flex;
            justify-content: space-between;
        }

        .payment-info {
            margin: 8px 0;
            font-size: 12px;
        }

        .footer {
            text-align: center;
            margin-top: 12px;
            border-top: 2px dashed #000;
            padding-top: 8px;
            font-size: 10px;
        }

        .footer-line {
            margin: 3px 0;
        }

        .system-info {
            font-size: 9px;
            color: #666;
            margin-top: 6px;
        }

        .thank-you {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 6px;
        }

        @media print {
            body {
                width: 100%;
                max-width: 170mm;
                font-size: 12px;
                margin: 0;
                padding: 10mm;
            }
            
            .receipt-container {
                max-width: 150mm;
            }
            
            .business-name {
                font-size: 20px;
            }
            
            .grand-total {
                font-size: 16px;
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
            <div class="contact-info">Ph: ${receiptSettings.phoneNumber}</div>
        </div>

        <!-- Bill Details -->
        <div class="bill-details">
            <div class="bill-row">
                <span>Bill No:</span>
                <span>${data.billNumber}</span>
            </div>
            <div class="bill-row">
                <span>Date:</span>
                <span>${data.billDate}</span>
            </div>
            <div class="bill-row">
                <span>Time:</span>
                <span>${new Date().toLocaleTimeString('en-IN', { 
                    hour12: false,
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
        <div class="customer-info">
            <div><strong>Customer Details</strong></div>
            <div>Name: ${data.customerDetails.name}</div>
        </div>

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
                            <div class="item-sku">${item.sku}</div>
                            <div class="mrp-save">MRP: ${formatCurrency(item.mrp)} (Save: ${formatCurrency(item.mrp - parseFloat(item.price))})</div>
                        </div>
                        <div class="col-qty">${item.quantity}</div>
                        <div class="col-rate">${formatCurrency(parseFloat(item.price))}</div>
                        <div class="col-amount">${formatCurrency(item.total)}</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="separator"></div>

        <!-- Totals -->
        <div class="totals">
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
            
            <div class="grand-total">
                <span>GRAND TOTAL:</span>
                <span>${formatCurrency(data.grandTotal)}</span>
            </div>
        </div>

        <!-- Payment -->
        <div class="payment-info">
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

        ${data.notes ? `
            <div class="separator"></div>
            <div class="customer-info">
                <div><strong>Notes:</strong></div>
                <div>${data.notes}</div>
            </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <div class="thank-you">Thank you for shopping with us!</div>
            ${receiptSettings.receiptFooter.split('\n').map(line => 
                `<div class="footer-line">${line}</div>`
            ).join('')}
            
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
