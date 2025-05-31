
import React from 'react';
import { formatCurrency } from '@/lib/currency';
import type { Product, Customer } from '@shared/schema';

interface CartItem extends Product {
  quantity: number;
  total: number;
  itemDiscount?: number;
  mrp?: number;
  stock?: number;
}

interface PrintReceiptProps {
  cart: CartItem[];
  customer: {
    name: string;
    doorNo: string;
    street: string;
    address: string;
    place: string;
  };
  billNumber: string;
  billDate: string;
  salesMan: string;
  subtotal: number;
  totalDiscount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  amountPaid: number;
  changeDue: number;
  notes?: string;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({
  cart,
  customer,
  billNumber,
  billDate,
  salesMan,
  subtotal,
  totalDiscount,
  taxAmount,
  grandTotal,
  paymentMethod,
  amountPaid,
  changeDue,
  notes
}) => {
  const printStyles = `
    @media print {
      @page {
        size: A4;
        margin: 0.5in;
      }
      
      body {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
        color: #000;
        background: white;
      }
      
      .print-container {
        width: 100%;
        max-width: none;
        margin: 0;
        padding: 0;
        background: white;
      }
      
      .no-print {
        display: none !important;
      }
      
      .print-header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      
      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
      }
      
      .print-table th,
      .print-table td {
        border: 1px solid #000;
        padding: 4px;
        text-align: left;
        font-size: 10px;
      }
      
      .print-table th {
        background-color: #f0f0f0;
        font-weight: bold;
      }
      
      .text-right {
        text-align: right;
      }
      
      .text-center {
        text-align: center;
      }
      
      .font-bold {
        font-weight: bold;
      }
      
      .border-top {
        border-top: 2px solid #000;
        padding-top: 5px;
      }
      
      .signature-section {
        margin-top: 30px;
        display: flex;
        justify-content: space-between;
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="print-container">
        {/* Header */}
        <div className="print-header">
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            AWESOME SHOP POS
          </h1>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>
            Professional Point of Sale System
          </p>
          <p style={{ margin: '5px 0', fontSize: '10px' }}>
            GST No: 29ABCDE1234F1Z5 | Phone: +91 9876543210
          </p>
        </div>

        {/* Bill Details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <strong>Bill No:</strong> {billNumber}<br/>
            <strong>Date:</strong> {billDate}<br/>
            <strong>Sales Person:</strong> {salesMan}
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>Time:</strong> {new Date().toLocaleTimeString()}<br/>
            <strong>Payment:</strong> {paymentMethod.toUpperCase()}
          </div>
        </div>

        {/* Customer Details */}
        {(customer.name || customer.doorNo || customer.street || customer.address || customer.place) && (
          <div style={{ marginBottom: '15px', padding: '5px', border: '1px solid #000' }}>
            <strong>Customer Details:</strong><br/>
            {customer.name && <span>Name: {customer.name}<br/></span>}
            {customer.doorNo && <span>Door No: {customer.doorNo}<br/></span>}
            {customer.street && <span>Street: {customer.street}<br/></span>}
            {customer.address && <span>Address: {customer.address}<br/></span>}
            {customer.place && <span>Place: {customer.place}<br/></span>}
          </div>
        )}

        {/* Items Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>S.No</th>
              <th style={{ width: '15%' }}>Code</th>
              <th style={{ width: '35%' }}>Description</th>
              <th style={{ width: '8%' }}>Qty</th>
              <th style={{ width: '12%' }}>Rate</th>
              <th style={{ width: '12%' }}>Amount</th>
              <th style={{ width: '13%' }}>M.R.P</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, index) => (
              <tr key={item.id}>
                <td className="text-center">{index + 1}</td>
                <td>{item.sku}</td>
                <td>{item.name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">{formatCurrency(parseFloat(item.price))}</td>
                <td className="text-right">{formatCurrency(item.total)}</td>
                <td className="text-right">{formatCurrency(item.mrp || parseFloat(item.price))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Billing Summary */}
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', padding: '2px 0' }}>
            <span>Gross Amount:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', padding: '2px 0' }}>
              <span>Discount:</span>
              <span>-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', padding: '2px 0' }}>
            <span>Taxable Amount:</span>
            <span>{formatCurrency(subtotal - totalDiscount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', padding: '2px 0' }}>
            <span>GST (18%):</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', padding: '5px 0', fontWeight: 'bold', fontSize: '14px' }}>
            <span>NET AMOUNT:</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* Payment Details */}
        <div style={{ marginTop: '15px', padding: '5px', border: '1px solid #000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Amount Paid ({paymentMethod}):</span>
            <span>{formatCurrency(amountPaid)}</span>
          </div>
          {changeDue > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Change Due:</span>
              <span>{formatCurrency(changeDue)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {notes && (
          <div style={{ marginTop: '10px' }}>
            <strong>Notes:</strong> {notes}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px' }}>
          <p>Thank you for shopping with us!</p>
          <p>Visit us again soon.</p>
          <div style={{ marginTop: '15px', borderTop: '1px solid #000', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>Customer Signature</div>
              <div>Authorized Signature</div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div style={{ marginTop: '20px', fontSize: '8px', textAlign: 'center', color: '#666' }}>
          Generated by Awesome Shop POS v6.5.9.2 | {new Date().toLocaleString()}
        </div>
      </div>
    </>
  );
};

// Print function
export const printReceipt = (receiptData: PrintReceiptProps) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print receipts');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - Bill #${receiptData.billNumber}</title>
        <style>
          ${printWindow.document.querySelector('style')?.innerHTML || ''}
        </style>
      </head>
      <body>
        ${document.querySelector('.print-container')?.innerHTML || ''}
      </body>
    </html>
  `);

  printWindow.document.close();
  
  // Auto print after content loads
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
};
