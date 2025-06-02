
import React from 'react';
import { formatCurrency } from '@/lib/currency';

interface PrintReceiptData {
  billNumber: string;
  billDate: string;
  customerDetails: {
    name: string;
    doorNo: string;
    street: string;
    address: string;
    place: string;
  };
  salesMan: string;
  items: Array<{
    id: number;
    name: string;
    sku: string;
    quantity: number;
    price: string;
    total: number;
    mrp?: number;
  }>;
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

interface PrintReceiptProps {
  data: PrintReceiptData;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({ data }) => {
  const {
    billNumber,
    billDate,
    customerDetails,
    salesMan,
    items,
    subtotal,
    discount,
    discountType,
    taxRate,
    taxAmount,
    grandTotal,
    amountPaid,
    changeDue,
    paymentMethod,
    notes
  } = data;

  const totalDiscount = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;

  return (
    <div className="print-receipt" style={{ 
      width: '80mm', 
      fontFamily: 'monospace', 
      fontSize: '12px', 
      lineHeight: '1.2',
      padding: '10px',
      margin: '0 auto',
      backgroundColor: 'white',
      color: 'black'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
          AWESOME SHOP POS
        </div>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
          Professional Retail Solution
        </div>
        <div style={{ fontSize: '10px', marginTop: '5px' }}>
          GST No: 29ABCDE1234F1Z5 | Ph: +91-9876543210
        </div>
        <div style={{ fontSize: '10px' }}>
          123 Main Street, City - 560001
        </div>
      </div>

      {/* Bill Details */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ fontWeight: 'bold' }}>Bill No:</span>
          <span>{billNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ fontWeight: 'bold' }}>Date:</span>
          <span>{billDate}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ fontWeight: 'bold' }}>Time:</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ fontWeight: 'bold' }}>Cashier:</span>
          <span>{salesMan}</span>
        </div>
      </div>

      {/* Customer Details */}
      {(customerDetails.name || customerDetails.doorNo || customerDetails.street) && (
        <div style={{ marginBottom: '15px', borderTop: '1px dashed #000', paddingTop: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Customer Details:</div>
          {customerDetails.name && (
            <div style={{ fontSize: '10px', marginBottom: '2px' }}>
              Name: {customerDetails.name}
            </div>
          )}
          {customerDetails.doorNo && (
            <div style={{ fontSize: '10px', marginBottom: '2px' }}>
              Door No: {customerDetails.doorNo}
            </div>
          )}
          {customerDetails.street && (
            <div style={{ fontSize: '10px', marginBottom: '2px' }}>
              Street: {customerDetails.street}
            </div>
          )}
          {customerDetails.address && (
            <div style={{ fontSize: '10px', marginBottom: '2px' }}>
              Address: {customerDetails.address}
            </div>
          )}
          {customerDetails.place && (
            <div style={{ fontSize: '10px', marginBottom: '2px' }}>
              Place: {customerDetails.place}
            </div>
          )}
        </div>
      )}

      {/* Items Header */}
      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px solid #000', paddingTop: '5px', paddingBottom: '5px', marginBottom: '5px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', fontSize: '10px', fontWeight: 'bold' }}>
          <span>Item</span>
          <span style={{ textAlign: 'center' }}>Qty</span>
          <span style={{ textAlign: 'right' }}>Rate</span>
          <span style={{ textAlign: 'right' }}>Amt</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ marginBottom: '15px' }}>
        {items.map((item, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>
              {item.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', fontSize: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', color: '#666' }}>{item.sku}</span>
              <span style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
              <span style={{ textAlign: 'right' }}>{formatCurrency(parseFloat(item.price))}</span>
              <span style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.total)}</span>
            </div>
            {item.mrp && parseFloat(item.price) < item.mrp && (
              <div style={{ fontSize: '9px', color: '#666', textAlign: 'right' }}>
                MRP: {formatCurrency(item.mrp)} (You Save: {formatCurrency(item.mrp - parseFloat(item.price))})
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Sub Total:</span>
          <span style={{ fontWeight: 'bold' }}>{formatCurrency(subtotal)}</span>
        </div>
        
        {totalDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Discount ({discountType === 'percentage' ? `${discount}%` : 'Fixed'}):</span>
            <span>-{formatCurrency(totalDiscount)}</span>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Taxable Amount:</span>
          <span>{formatCurrency(subtotal - totalDiscount)}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>GST ({taxRate}%):</span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        
        <div style={{ borderTop: '1px solid #000', paddingTop: '5px', marginTop: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
            <span>GRAND TOTAL:</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Payment Method:</span>
          <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{paymentMethod}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Amount Paid:</span>
          <span style={{ fontWeight: 'bold' }}>{formatCurrency(amountPaid)}</span>
        </div>
        {changeDue > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>Change Due:</span>
            <span style={{ fontWeight: 'bold' }}>{formatCurrency(changeDue)}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {notes && (
        <div style={{ marginBottom: '15px', borderTop: '1px dashed #000', paddingTop: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '3px', fontSize: '10px' }}>Notes:</div>
          <div style={{ fontSize: '9px' }}>{notes}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '2px solid #000', paddingTop: '10px', textAlign: 'center', fontSize: '10px' }}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
          Thank you for shopping with us!
        </div>
        <div style={{ marginBottom: '3px' }}>
          Visit again soon
        </div>
        <div style={{ marginBottom: '8px' }}>
          Customer Care: support@awesomeshop.com
        </div>
        <div style={{ fontSize: '9px', color: '#666' }}>
          Items: {items.length} | Qty: {items.reduce((sum, item) => sum + item.quantity, 0)}
        </div>
        <div style={{ fontSize: '8px', color: '#666', marginTop: '8px' }}>
          Powered by Awesome Shop POS v6.5.9.2
        </div>
      </div>
    </div>
  );
};

// Print function
export const printReceipt = (data: PrintReceiptData) => {
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  
  if (!printWindow) {
    alert('Please allow popups to print the receipt');
    return;
  }

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${data.billNumber}</title>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Courier New', monospace;
          }
          @media print {
            body { 
              width: 80mm; 
              margin: 0;
              padding: 10px;
            }
            .no-print { display: none !important; }
          }
          .print-receipt {
            width: 80mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            padding: 10px;
            margin: 0 auto;
            background-color: white;
            color: black;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .bill-details {
            margin-bottom: 15px;
          }
          .customer-details {
            margin-bottom: 15px;
            border-top: 1px dashed #000;
            padding-top: 8px;
          }
          .items-header {
            border-top: 1px dashed #000;
            border-bottom: 1px solid #000;
            padding: 5px 0;
            margin-bottom: 5px;
          }
          .items {
            margin-bottom: 15px;
          }
          .item {
            margin-bottom: 8px;
          }
          .item-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            font-size: 10px;
            align-items: center;
          }
          .totals {
            border-top: 1px dashed #000;
            padding-top: 8px;
            margin-bottom: 15px;
          }
          .payment-details {
            margin-bottom: 15px;
          }
          .footer {
            border-top: 2px solid #000;
            padding-top: 10px;
            text-align: center;
            font-size: 10px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .grand-total {
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
            font-size: 14px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="print-receipt">
          <div class="header">
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">
              AWESOME SHOP POS
            </div>
            <div style="font-size: 14px; font-weight: bold;">
              Professional Retail Solution
            </div>
            <div style="font-size: 10px; margin-top: 5px;">
              GST No: 29ABCDE1234F1Z5 | Ph: +91-9876543210
            </div>
            <div style="font-size: 10px;">
              123 Main Street, City - 560001
            </div>
          </div>

          <div class="bill-details">
            <div class="row">
              <span style="font-weight: bold;">Bill No:</span>
              <span>${data.billNumber}</span>
            </div>
            <div class="row">
              <span style="font-weight: bold;">Date:</span>
              <span>${data.billDate}</span>
            </div>
            <div class="row">
              <span style="font-weight: bold;">Time:</span>
              <span>${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="row">
              <span style="font-weight: bold;">Cashier:</span>
              <span>${data.salesMan}</span>
            </div>
          </div>

          ${(data.customerDetails.name || data.customerDetails.doorNo || data.customerDetails.street) ? `
          <div class="customer-details">
            <div style="font-weight: bold; margin-bottom: 5px;">Customer Details:</div>
            ${data.customerDetails.name ? `<div style="font-size: 10px; margin-bottom: 2px;">Name: ${data.customerDetails.name}</div>` : ''}
            ${data.customerDetails.doorNo ? `<div style="font-size: 10px; margin-bottom: 2px;">Door No: ${data.customerDetails.doorNo}</div>` : ''}
            ${data.customerDetails.street ? `<div style="font-size: 10px; margin-bottom: 2px;">Street: ${data.customerDetails.street}</div>` : ''}
            ${data.customerDetails.address ? `<div style="font-size: 10px; margin-bottom: 2px;">Address: ${data.customerDetails.address}</div>` : ''}
            ${data.customerDetails.place ? `<div style="font-size: 10px; margin-bottom: 2px;">Place: ${data.customerDetails.place}</div>` : ''}
          </div>
          ` : ''}

          <div class="items-header">
            <div class="item-grid" style="font-size: 10px; font-weight: bold;">
              <span>Item</span>
              <span style="text-align: center;">Qty</span>
              <span style="text-align: right;">Rate</span>
              <span style="text-align: right;">Amt</span>
            </div>
          </div>

          <div class="items">
            ${data.items.map(item => `
              <div class="item">
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 2px;">
                  ${item.name}
                </div>
                <div class="item-grid">
                  <span style="font-size: 9px; color: #666;">${item.sku}</span>
                  <span style="text-align: center; font-weight: bold;">${item.quantity}</span>
                  <span style="text-align: right;">${formatCurrency(parseFloat(item.price))}</span>
                  <span style="text-align: right; font-weight: bold;">${formatCurrency(item.total)}</span>
                </div>
                ${item.mrp && parseFloat(item.price) < item.mrp ? `
                  <div style="font-size: 9px; color: #666; text-align: right;">
                    MRP: ${formatCurrency(item.mrp)} (You Save: ${formatCurrency(item.mrp - parseFloat(item.price))})
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <div class="totals">
            <div class="row">
              <span>Sub Total:</span>
              <span style="font-weight: bold;">${formatCurrency(data.subtotal)}</span>
            </div>
            
            ${data.discount > 0 ? `
            <div class="row">
              <span>Discount (${data.discountType === 'percentage' ? `${data.discount}%` : 'Fixed'}):</span>
              <span>-${formatCurrency(data.discountType === 'percentage' ? (data.subtotal * data.discount) / 100 : data.discount)}</span>
            </div>
            ` : ''}
            
            <div class="row">
              <span>Taxable Amount:</span>
              <span>${formatCurrency(data.subtotal - (data.discountType === 'percentage' ? (data.subtotal * data.discount) / 100 : data.discount))}</span>
            </div>
            
            <div class="row">
              <span>GST (${data.taxRate}%):</span>
              <span>${formatCurrency(data.taxAmount)}</span>
            </div>
            
            <div class="grand-total">
              <div class="row">
                <span>GRAND TOTAL:</span>
                <span>${formatCurrency(data.grandTotal)}</span>
              </div>
            </div>
          </div>

          <div class="payment-details">
            <div class="row">
              <span>Payment Method:</span>
              <span style="font-weight: bold; text-transform: uppercase;">${data.paymentMethod}</span>
            </div>
            <div class="row">
              <span>Amount Paid:</span>
              <span style="font-weight: bold;">${formatCurrency(data.amountPaid)}</span>
            </div>
            ${data.changeDue > 0 ? `
            <div class="row" style="font-size: 12px;">
              <span style="font-weight: bold;">Change Due:</span>
              <span style="font-weight: bold;">${formatCurrency(data.changeDue)}</span>
            </div>
            ` : ''}
          </div>

          ${data.notes ? `
          <div style="margin-bottom: 15px; border-top: 1px dashed #000; padding-top: 8px;">
            <div style="font-weight: bold; margin-bottom: 3px; font-size: 10px;">Notes:</div>
            <div style="font-size: 9px;">${data.notes}</div>
          </div>
          ` : ''}

          <div class="footer">
            <div style="margin-bottom: 5px; font-weight: bold;">
              Thank you for shopping with us!
            </div>
            <div style="margin-bottom: 3px;">
              Visit again soon
            </div>
            <div style="margin-bottom: 8px;">
              Customer Care: support@awesomeshop.com
            </div>
            <div style="font-size: 9px; color: #666;">
              Items: ${data.items.length} | Qty: ${data.items.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div style="font-size: 8px; color: #666; margin-top: 8px;">
              Powered by Awesome Shop POS v6.5.9.2
            </div>
          </div>
        </div>

        <div class="no-print" style="text-align: center; margin: 20px; padding: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
            Print Receipt
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Close
          </button>
        </div>

        <script>
          // Auto print after a short delay
          setTimeout(() => {
            window.print();
          }, 500);
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(receiptHtml);
  printWindow.document.close();
};
interface ReceiptData {
  billNumber: string;
  billDate: string;
  customerDetails: {
    name: string;
    phone: string;
    address: string;
    email?: string;
  };
  salesMan: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: string;
    total: number;
  }>;
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
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const receiptContent = `
    <div style="font-family: monospace; width: 300px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px;">
        <h2>🛍️ AWESOME SHOP</h2>
        <p>Professional Point of Sale</p>
        <p>Bill #${data.billNumber}</p>
        <p>${data.billDate}</p>
      </div>
      
      <div style="margin: 15px 0;">
        <strong>Customer:</strong> ${data.customerDetails.name}<br>
        <strong>Phone:</strong> ${data.customerDetails.phone}<br>
        <strong>Sales Person:</strong> ${data.salesMan}
      </div>
      
      <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 0;">
        <table style="width: 100%; font-size: 12px;">
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left;">Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
          ${data.items.map(item => `
            <tr>
              <td style="padding: 5px 0;">${item.name}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${formatCurrency(parseFloat(item.price))}</td>
              <td style="text-align: right;">${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
      
      <div style="margin: 15px 0;">
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Discount (${data.discountType === 'percentage' ? data.discount + '%' : formatCurrency(data.discount)}):</span>
          <span>-${formatCurrency(data.subtotal - (data.grandTotal - data.taxAmount))}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Tax (${data.taxRate}%):</span>
          <span>${formatCurrency(data.taxAmount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #000; padding-top: 5px;">
          <span>Total:</span>
          <span>${formatCurrency(data.grandTotal)}</span>
        </div>
      </div>
      
      <div style="margin: 15px 0;">
        <div style="display: flex; justify-content: space-between;">
          <span>Payment Method:</span>
          <span>${data.paymentMethod.toUpperCase()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Amount Paid:</span>
          <span>${formatCurrency(data.amountPaid)}</span>
        </div>
        ${data.changeDue > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>Change Due:</span>
          <span>${formatCurrency(data.changeDue)}</span>
        </div>
        ` : ''}
      </div>
      
      ${data.notes ? `
      <div style="margin: 15px 0; border-top: 1px solid #000; padding-top: 10px;">
        <strong>Notes:</strong> ${data.notes}
      </div>
      ` : ''}
      
      <div style="text-align: center; margin-top: 20px; border-top: 1px solid #000; padding-top: 10px;">
        <p>Thank you for shopping with us!</p>
        <p>Visit again!</p>
      </div>
    </div>
  `;

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${data.billNumber}</title>
          <style>
            body { margin: 0; padding: 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${receiptContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } else {
    // Fallback: Show receipt in current window
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write(receiptContent);
    }
  }
}
