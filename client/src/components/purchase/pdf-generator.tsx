import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, FileText, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface PurchaseItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  total: string;
  product: {
    id: number;
    name: string;
    sku: string;
    hsn?: string;
    gstRate?: number;
  };
}

interface Supplier {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

interface PurchaseOrder {
  id: number;
  orderNumber: string;
  orderDate: string;
  expectedDate?: string;
  dueDate?: string;
  total: string;
  subTotal: string;
  freightCost?: string;
  otherCharges?: string;
  discountAmount?: string;
  status: string;
  notes?: string;
  supplier: Supplier;
  items: PurchaseItem[];
}

interface PDFGeneratorProps {
  purchaseOrder: PurchaseOrder;
  businessDetails?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
  };
}

export const PurchaseOrderPDF: React.FC<PDFGeneratorProps> = ({ 
  purchaseOrder, 
  businessDetails = {
    name: "AWESOME SHOP POS SYSTEM",
    address: "1234 Main Street\nCity, State 12345\nIndia",
    phone: "(123) 456-7890",
    email: "admin@awesomeshop.com",
    gstin: "33ABCDE1234F1Z5"
  }
}) => {
  
  const calculateGSTBreakdown = () => {
    const breakdown: { [key: string]: { amount: number; cgst: number; sgst: number; igst: number } } = {};
    
    purchaseOrder.items.forEach(item => {
      const gstRate = item.product.gstRate || 18;
      const amount = parseFloat(item.total);
      const gstAmount = (amount * gstRate) / (100 + gstRate);
      const baseAmount = amount - gstAmount;
      
      const key = `${gstRate}%`;
      if (!breakdown[key]) {
        breakdown[key] = { amount: 0, cgst: 0, sgst: 0, igst: 0 };
      }
      
      breakdown[key].amount += baseAmount;
      breakdown[key].cgst += gstAmount / 2;
      breakdown[key].sgst += gstAmount / 2;
    });
    
    return breakdown;
  };

  const generatePDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PURCHASE ORDER', pageWidth / 2, 20, { align: 'center' });
    pdf.text('(Original Copy)', pageWidth - 20, 20, { align: 'right' });
    
    // Business Details
    pdf.setFontSize(14);
    pdf.text(businessDetails.name, pageWidth / 2, 35, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const addressLines = businessDetails.address.split('\n');
    let yPos = 42;
    addressLines.forEach(line => {
      pdf.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    });
    
    pdf.text(`Contact: ${businessDetails.phone}`, pageWidth / 2, yPos, { align: 'center' });
    pdf.text(`Email: ${businessDetails.email}`, pageWidth / 2, yPos + 5, { align: 'center' });
    pdf.text(`GSTIN: ${businessDetails.gstin}`, pageWidth / 2, yPos + 10, { align: 'center' });
    
    yPos += 20;
    
    // Purchase Order Details - Left Side
    pdf.setFont('helvetica', 'bold');
    pdf.text('PO No.', 20, yPos);
    pdf.text(':', 50, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(purchaseOrder.orderNumber, 55, yPos);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date', 20, yPos + 7);
    pdf.text(':', 50, yPos + 7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(new Date(purchaseOrder.orderDate).toLocaleDateString('en-IN'), 55, yPos + 7);
    
    if (purchaseOrder.expectedDate) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Expected Date', 20, yPos + 14);
      pdf.text(':', 50, yPos + 14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(purchaseOrder.expectedDate).toLocaleDateString('en-IN'), 55, yPos + 14);
    }
    
    if (purchaseOrder.dueDate) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Due Date', 20, yPos + 21);
      pdf.text(':', 50, yPos + 21);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(purchaseOrder.dueDate).toLocaleDateString('en-IN'), 55, yPos + 21);
    }
    
    // Purchase Order Details - Right Side
    pdf.setFont('helvetica', 'bold');
    pdf.text('Status', 120, yPos);
    pdf.text(':', 140, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(purchaseOrder.status.toUpperCase(), 145, yPos);
    
    yPos += 35;
    
    // Supplier Details
    pdf.setFont('helvetica', 'bold');
    pdf.text('Supplier Details:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 7;
    pdf.text(purchaseOrder.supplier.name, 20, yPos);
    if (purchaseOrder.supplier.address) {
      yPos += 5;
      pdf.text(purchaseOrder.supplier.address, 20, yPos);
    }
    if (purchaseOrder.supplier.phone) {
      yPos += 5;
      pdf.text(`Contact: ${purchaseOrder.supplier.phone}`, 20, yPos);
    }
    if (purchaseOrder.supplier.gstin) {
      yPos += 5;
      pdf.text(`GSTIN: ${purchaseOrder.supplier.gstin}`, 20, yPos);
    }
    
    yPos += 15;
    
    // Items Table Header
    const tableStartY = yPos;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    
    // Table headers
    pdf.rect(20, yPos, 170, 8);
    pdf.text('S.No.', 22, yPos + 5);
    pdf.text('PARTICULARS', 35, yPos + 5);
    pdf.text('HSN/SAC', 90, yPos + 5);
    pdf.text('QTY', 110, yPos + 5);
    pdf.text('UNIT PRICE', 125, yPos + 5);
    pdf.text('GST', 145, yPos + 5);
    pdf.text('AMOUNT', 165, yPos + 5);
    
    yPos += 8;
    
    // Items
    pdf.setFont('helvetica', 'normal');
    purchaseOrder.items.forEach((item, index) => {
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        yPos = 30;
      }
      
      pdf.rect(20, yPos, 170, 8);
      pdf.text((index + 1).toString(), 22, yPos + 5);
      pdf.text(item.product.name, 35, yPos + 5);
      pdf.text(item.product.hsn || '00000000', 90, yPos + 5);
      pdf.text(item.quantity.toString(), 110, yPos + 5);
      pdf.text(formatCurrency(parseFloat(item.unitPrice)), 125, yPos + 5);
      pdf.text(`${item.product.gstRate || 18}%`, 145, yPos + 5);
      pdf.text(formatCurrency(parseFloat(item.total)), 165, yPos + 5);
      
      yPos += 8;
    });
    
    // Totals Section
    yPos += 10;
    const gstBreakdown = calculateGSTBreakdown();
    
    // GST Breakdown Table
    pdf.setFont('helvetica', 'bold');
    pdf.text('HSN/SAC', 20, yPos);
    pdf.text('GST%', 50, yPos);
    pdf.text('Amount', 70, yPos);
    pdf.text('CGST', 100, yPos);
    pdf.text('SGST', 120, yPos);
    pdf.text('Sub Total', 140, yPos);
    
    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    
    let totalGST = 0;
    Object.entries(gstBreakdown).forEach(([rate, values]) => {
      pdf.text('Various', 20, yPos);
      pdf.text(rate, 50, yPos);
      pdf.text(formatCurrency(values.amount), 70, yPos);
      pdf.text(formatCurrency(values.cgst), 100, yPos);
      pdf.text(formatCurrency(values.sgst), 120, yPos);
      pdf.text(formatCurrency(values.amount + values.cgst + values.sgst), 140, yPos);
      totalGST += values.cgst + values.sgst;
      yPos += 7;
    });
    
    // Final Totals
    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    const subtotal = parseFloat(purchaseOrder.subTotal || purchaseOrder.total);
    const freight = parseFloat(purchaseOrder.freightCost || '0');
    const otherCharges = parseFloat(purchaseOrder.otherCharges || '0');
    const discount = parseFloat(purchaseOrder.discountAmount || '0');
    const finalTotal = subtotal + freight + otherCharges - discount;
    
    pdf.text(`Subtotal: ${formatCurrency(subtotal)}`, 140, yPos);
    if (freight > 0) {
      yPos += 7;
      pdf.text(`Freight: ${formatCurrency(freight)}`, 140, yPos);
    }
    if (otherCharges > 0) {
      yPos += 7;
      pdf.text(`Other Charges: ${formatCurrency(otherCharges)}`, 140, yPos);
    }
    if (discount > 0) {
      yPos += 7;
      pdf.text(`Discount: -${formatCurrency(discount)}`, 140, yPos);
    }
    yPos += 7;
    pdf.text(`GST Amount: ${formatCurrency(totalGST)}`, 140, yPos);
    yPos += 7;
    pdf.setFontSize(12);
    pdf.text(`TOTAL AMOUNT: ${formatCurrency(finalTotal)}`, 140, yPos);
    
    // Terms and Conditions
    yPos += 20;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold'); 
    pdf.text('Terms & Conditions:', 20, yPos);
    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    const terms = [
      '1. All items subject to inspection and acceptance.',
      '2. Payment terms as per agreement.',
      '3. Delivery as per specified date.',
      '4. Any disputes subject to local jurisdiction.'
    ];
    
    terms.forEach(term => {
      pdf.text(term, 20, yPos);
      yPos += 5;
    });
    
    if (purchaseOrder.notes) {
      yPos += 5;
      pdf.text(`Notes: ${purchaseOrder.notes}`, 20, yPos);
    }
    
    // Signatures
    yPos += 20;
    pdf.text('Received By: ________________', 20, yPos);
    pdf.text('Authorized Signatory', 140, yPos);
    pdf.text(businessDetails.name, 140, yPos + 15);
    
    // Footer
    pdf.setFontSize(8);
    pdf.text(`${purchaseOrder.orderNumber}`, 20, pageHeight - 10);
    pdf.text('Page: 1 / 1', pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text('Powered By Awesome Shop POS', pageWidth - 20, pageHeight - 10, { align: 'right' });
    
    // Save PDF
    pdf.save(`PO_${purchaseOrder.orderNumber}.pdf`);
  };

  const printPDF = async () => {
    await generatePDF();
  };

  return (
    <div className="flex gap-2" data-testid="pdf-generator-buttons">
      <Button 
        onClick={generatePDF}
        size="sm"
        className="flex items-center gap-2"
        data-testid="button-download-pdf"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </Button>
      
      <Button 
        onClick={printPDF}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
        data-testid="button-print-pdf"
      >
        <Printer className="h-4 w-4" />
        Print PDF
      </Button>
    </div>
  );
};

export default PurchaseOrderPDF;