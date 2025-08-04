import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, FileText, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

// Helper function to convert numbers to words (for professional invoices)
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

  if (num === 0) return 'Zero';
  
  const convertHundreds = (n: number): string => {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result;
  };

  let result = '';
  let scale = 0;
  
  while (num > 0) {
    if (num % 1000 !== 0) {
      result = convertHundreds(num % 1000) + thousands[scale] + ' ' + result;
    }
    num = Math.floor(num / 1000);
    scale++;
  }
  
  return result.trim();
};

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
    address: "1234 Main Street, Business District\nCity, State 12345\nIndia",
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
    
    // Professional Header with border
    pdf.setLineWidth(0.5);
    pdf.rect(10, 10, pageWidth - 20, 25);
    
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PURCHASE ORDER', pageWidth / 2, 22, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.text('(Original Copy)', pageWidth - 15, 22, { align: 'right' });
    
    // Business Details Section with enhanced formatting
    let yPos = 45;
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(businessDetails.name, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const addressLines = businessDetails.address.split('\n');
    addressLines.forEach(line => {
      pdf.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    });
    
    yPos += 2;
    pdf.text(`Contact: ${businessDetails.phone}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    pdf.text(`Email: ${businessDetails.email}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.text(`GSTIN: ${businessDetails.gstin}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    
    // Purchase Order Details Section with professional layout
    pdf.setLineWidth(0.3);
    pdf.rect(15, yPos, pageWidth - 30, 25);
    
    yPos += 8;
    // Left Side Details
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('PO No.', 20, yPos);
    pdf.text(':', 50, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(purchaseOrder.orderNumber, 55, yPos);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date', 20, yPos + 6);
    pdf.text(':', 50, yPos + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.text(new Date(purchaseOrder.orderDate).toLocaleDateString('en-IN'), 55, yPos + 6);
    
    // Right Side Details
    pdf.setFont('helvetica', 'bold');
    pdf.text('Place of Supply', 120, yPos);
    pdf.text(':', 155, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('33-Tamil Nadu', 160, yPos);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('Status', 120, yPos + 6);
    pdf.text(':', 155, yPos + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.text(purchaseOrder.status.toUpperCase(), 160, yPos + 6);
    
    if (purchaseOrder.expectedDate) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Expected Date', 20, yPos + 12);
      pdf.text(':', 50, yPos + 12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(purchaseOrder.expectedDate).toLocaleDateString('en-IN'), 55, yPos + 12);
    }
    
    if (purchaseOrder.dueDate) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Due Date', 120, yPos + 12);
      pdf.text(':', 155, yPos + 12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date(purchaseOrder.dueDate).toLocaleDateString('en-IN'), 160, yPos + 12);
    }
    
    yPos += 30;
    
    // Supplier Details Section with professional border
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Bill To:', 20, yPos);
    
    yPos += 5;
    pdf.setLineWidth(0.3);
    pdf.rect(15, yPos, pageWidth - 30, 25);
    
    yPos += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(purchaseOrder.supplier.name, 20, yPos);
    
    yPos += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    if (purchaseOrder.supplier.address) {
      const supplierAddressLines = purchaseOrder.supplier.address.split('\n');
      supplierAddressLines.forEach(line => {
        pdf.text(line, 20, yPos);
        yPos += 4;
      });
    }
    
    if (purchaseOrder.supplier.phone) {
      pdf.text(`Contact: ${purchaseOrder.supplier.phone}`, 20, yPos);
      yPos += 4;
    }
    
    if (purchaseOrder.supplier.gstin) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(`GSTIN: ${purchaseOrder.supplier.gstin}`, 20, yPos);
    }
    
    yPos += 20;
    
    // Items Table Header with professional styling
    const tableStartY = yPos;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setFillColor(240, 240, 240);
    
    // Enhanced table headers with better spacing
    pdf.rect(15, yPos, 175, 10, 'F');
    pdf.rect(15, yPos, 175, 10, 'S');
    
    // Table column separators
    pdf.line(25, yPos, 25, yPos + 10); // After S.No
    pdf.line(80, yPos, 80, yPos + 10); // After Particulars
    pdf.line(105, yPos, 105, yPos + 10); // After HSN
    pdf.line(125, yPos, 125, yPos + 10); // After QTY
    pdf.line(150, yPos, 150, yPos + 10); // After Unit Price
    pdf.line(165, yPos, 165, yPos + 10); // After GST
    
    pdf.setTextColor(0, 0, 0);
    pdf.text('S.No.', 17, yPos + 6);
    pdf.text('PARTICULARS', 30, yPos + 6);
    pdf.text('HSN/SAC', 85, yPos + 6);
    pdf.text('QTY', 110, yPos + 6);
    pdf.text('UNIT PRICE', 128, yPos + 6);
    pdf.text('GST', 153, yPos + 6);
    pdf.text('AMOUNT', 170, yPos + 6);
    
    yPos += 10;
    
    // Items with enhanced formatting
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    let itemCount = 0;
    
    purchaseOrder.items.forEach((item, index) => {
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        yPos = 30;
        // Repeat header on new page
        pdf.setFont('helvetica', 'bold');
        pdf.setFillColor(240, 240, 240);
        pdf.rect(15, yPos, 175, 10, 'F');
        pdf.rect(15, yPos, 175, 10, 'S');
        pdf.line(25, yPos, 25, yPos + 10);
        pdf.line(80, yPos, 80, yPos + 10);
        pdf.line(105, yPos, 105, yPos + 10);
        pdf.line(125, yPos, 125, yPos + 10);
        pdf.line(150, yPos, 150, yPos + 10);
        pdf.line(165, yPos, 165, yPos + 10);
        pdf.text('S.No.', 17, yPos + 6);
        pdf.text('PARTICULARS', 30, yPos + 6);
        pdf.text('HSN/SAC', 85, yPos + 6);
        pdf.text('QTY', 110, yPos + 6);
        pdf.text('UNIT PRICE', 128, yPos + 6);
        pdf.text('GST', 153, yPos + 6);
        pdf.text('AMOUNT', 170, yPos + 6);
        yPos += 10;
        pdf.setFont('helvetica', 'normal');
      }
      
      // Enhanced item row with borders
      pdf.rect(15, yPos, 175, 10);
      pdf.line(25, yPos, 25, yPos + 10);
      pdf.line(80, yPos, 80, yPos + 10);
      pdf.line(105, yPos, 105, yPos + 10);
      pdf.line(125, yPos, 125, yPos + 10);
      pdf.line(150, yPos, 150, yPos + 10);
      pdf.line(165, yPos, 165, yPos + 10);
      
      pdf.text((index + 1).toString(), 17, yPos + 6);
      
      // Handle long product names
      const productName = item.product.name;
      if (productName.length > 25) {
        const words = productName.split(' ');
        let line1 = '';
        let line2 = '';
        let wordIndex = 0;
        
        while (wordIndex < words.length && (line1 + words[wordIndex]).length <= 25) {
          line1 += (line1 ? ' ' : '') + words[wordIndex];
          wordIndex++;
        }
        
        while (wordIndex < words.length) {
          line2 += (line2 ? ' ' : '') + words[wordIndex];
          wordIndex++;
        }
        
        pdf.text(line1, 27, yPos + 4);
        if (line2) {
          pdf.text(line2, 27, yPos + 8);
        }
      } else {
        pdf.text(productName, 27, yPos + 6);
      }
      
      pdf.text(item.product.hsn || '00000000', 82, yPos + 6);
      pdf.text(item.quantity.toString() + ' NOS', 107, yPos + 6);
      pdf.text(formatCurrency(parseFloat(item.unitPrice)), 127, yPos + 6);
      pdf.text(`${item.product.gstRate || 18}%`, 153, yPos + 6);
      pdf.text(formatCurrency(parseFloat(item.total)), 167, yPos + 6);
      
      yPos += 10;
      itemCount++;
    });
    
    // Add total row count
    const totalItemsHeight = 10;
    pdf.rect(15, yPos, 175, totalItemsHeight);
    pdf.line(80, yPos, 80, yPos + totalItemsHeight);
    pdf.line(165, yPos, 165, yPos + totalItemsHeight);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', 45, yPos + 6);
    pdf.text(`${itemCount}`, 110, yPos + 6);
    pdf.text(formatCurrency(parseFloat(purchaseOrder.total)), 167, yPos + 6);
    
    yPos += totalItemsHeight;
    
    // Enhanced GST Breakdown Section
    yPos += 15;
    const gstBreakdown = calculateGSTBreakdown();
    
    // GST Breakdown Table Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, yPos, 175, 8, 'F');
    pdf.rect(15, yPos, 175, 8, 'S');
    
    // Table column separators for GST breakdown
    pdf.line(50, yPos, 50, yPos + 8);
    pdf.line(80, yPos, 80, yPos + 8);
    pdf.line(110, yPos, 110, yPos + 8);
    pdf.line(140, yPos, 140, yPos + 8);
    pdf.line(165, yPos, 165, yPos + 8);
    
    pdf.text('HSN/SAC', 25, yPos + 5);
    pdf.text('GST%', 60, yPos + 5);
    pdf.text('Amount', 88, yPos + 5);
    pdf.text('CGST', 118, yPos + 5);
    pdf.text('SGST', 148, yPos + 5);
    pdf.text('Sub Total', 168, yPos + 5);
    
    yPos += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    let totalGST = 0;
    let totalAmount = 0;
    Object.entries(gstBreakdown).forEach(([rate, values]) => {
      pdf.rect(15, yPos, 175, 8);
      pdf.line(50, yPos, 50, yPos + 8);
      pdf.line(80, yPos, 80, yPos + 8);
      pdf.line(110, yPos, 110, yPos + 8);
      pdf.line(140, yPos, 140, yPos + 8);
      pdf.line(165, yPos, 165, yPos + 8);
      
      pdf.text('Various', 25, yPos + 5);
      pdf.text(rate, 60, yPos + 5);
      pdf.text(formatCurrency(values.amount), 85, yPos + 5);
      pdf.text(formatCurrency(values.cgst), 115, yPos + 5);
      pdf.text(formatCurrency(values.sgst), 145, yPos + 5);
      pdf.text(formatCurrency(values.amount + values.cgst + values.sgst), 168, yPos + 5);
      
      totalGST += values.cgst + values.sgst;
      totalAmount += values.amount;
      yPos += 8;
    });
    
    // Final Totals Section with professional layout
    yPos += 15;
    const subtotal = parseFloat(purchaseOrder.subTotal || purchaseOrder.total);
    const freight = parseFloat(purchaseOrder.freightCost || '0');
    const otherCharges = parseFloat(purchaseOrder.otherCharges || '0');
    const discount = parseFloat(purchaseOrder.discountAmount || '0');
    const finalTotal = subtotal + freight + otherCharges - discount;
    
    // Amount calculations section
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    pdf.text(`Tax Amount (+)`, 120, yPos);
    pdf.text(formatCurrency(totalGST), 170, yPos);
    
    yPos += 6;
    if (freight > 0) {
      pdf.text(`Freight (+)`, 120, yPos);
      pdf.text(formatCurrency(freight), 170, yPos);
      yPos += 6;
    }
    
    if (otherCharges > 0) {
      pdf.text(`Other Charges (+)`, 120, yPos);
      pdf.text(formatCurrency(otherCharges), 170, yPos);
      yPos += 6;
    }
    
    if (discount > 0) {
      pdf.text(`Discount (-)`, 120, yPos);
      pdf.text(formatCurrency(discount), 170, yPos);
      yPos += 6;
    }
    
    pdf.text(`Round Off (-)`, 120, yPos);
    const roundOff = Math.round(finalTotal) - finalTotal;
    pdf.text(formatCurrency(Math.abs(roundOff)), 170, yPos);
    
    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(`TOTAL AMOUNT`, 120, yPos);
    pdf.text(formatCurrency(Math.round(finalTotal)), 170, yPos);
    
    // Amount in words
    yPos += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const amountInWords = numberToWords(Math.round(finalTotal));
    pdf.text(`Amount (in words): Rupees ${amountInWords} Only`, 20, yPos);
    
    // Enhanced Terms and Conditions Section
    yPos += 20;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Terms / Declaration', 20, yPos);
    
    yPos += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const terms = [
      'Terms and conditions:',
      '1. Goods once purchased cannot be taken back on any account.',
      '2. We reserve to ourselves the right to demand payment of this',
      'order at any time before due date.',
      '3. We are not responsible for breakage or damage in transit.',
      '4. Interest will be charged @ 24% if payment not made on due date.',
      '5. All payments should be made by A/c payee IMPS/NEFT/RTGS ONLY.',
      '6. 100% of payment before dispatch.',
      '7. Subject to local jurisdiction only.'
    ];
    
    terms.forEach((term, index) => {
      if (index === 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(term, 20, yPos);
        pdf.setFont('helvetica', 'normal');
      } else {
        pdf.text(term, 20, yPos);
      }
      yPos += 4;
    });
    
    if (purchaseOrder.notes) {
      yPos += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Notes: `, 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(purchaseOrder.notes, 45, yPos);
    }
    
    // Enhanced Signatures Section
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      yPos = 30;
    }
    
    yPos += 25;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    // Left side signature
    pdf.text('Receiver\'s Signature', 20, yPos);
    
    // Right side signature with company name
    pdf.text('Authorized Signatory', 140, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(businessDetails.name, 140, yPos + 15);
    
    // Professional Footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(`${purchaseOrder.orderNumber}`, 20, pageHeight - 10);
    pdf.text('Page: 1 / 1', pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text('Powered By Awesome Shop POS System', pageWidth - 20, pageHeight - 10, { align: 'right' });
    
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