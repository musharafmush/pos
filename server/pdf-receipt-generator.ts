import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface PDFReceiptData {
  billNumber: string;
  billDate: string;
  customerDetails?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items: Array<{
    name: string;
    sku?: string;
    hsnCode?: string;
    quantity: number;
    price: string;
    mrp?: string;
    total: string;
    gstRate?: number;
    discount?: number;
  }>;
  subtotal: string;
  discount?: string;
  discountType?: 'percentage' | 'amount';
  taxAmount?: string;
  taxRate?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  grandTotal: string;
  amountPaid: string;
  changeDue?: string;
  paymentMethod: string;
  salesMan?: string;
  notes?: string;
  loyaltyPointsEarned?: number;
  roundingAdjustment?: string;
}

export interface PDFReceiptSettings {
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  email?: string;
  taxId: string;
  receiptFooter?: string;
  showLogo?: boolean;
  logoPath?: string;
  showQRCode?: boolean;
  termsConditions?: string;
  returnPolicy?: string;
}

export class PDFReceiptGenerator {
  private doc: PDFDocument;
  private pageWidth = 226; // 80mm thermal paper = 226 points
  private margin = 10;
  private contentWidth: number;
  private currentY = 40;

  constructor() {
    this.doc = new PDFDocument({
      size: [this.pageWidth, 'auto'], // 80mm thermal paper width, auto height
      margin: this.margin,
      info: {
        Title: 'POS Receipt',
        Author: 'M MART POS System',
        Subject: 'Sales Receipt'
      }
    });
    this.contentWidth = this.pageWidth - (this.margin * 2);
  }

  // Helper function to convert numbers to words (Indian format)
  private numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    const convertGroup = (n: number): string => {
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
        return result;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };
    
    const intNum = Math.floor(num);
    if (intNum < 1000) return convertGroup(intNum).trim();
    if (intNum < 100000) return convertGroup(Math.floor(intNum / 1000)).trim() + ' Thousand ' + convertGroup(intNum % 1000).trim();
    if (intNum < 10000000) return convertGroup(Math.floor(intNum / 100000)).trim() + ' Lakh ' + convertGroup(Math.floor((intNum % 100000) / 1000)).trim() + ' Thousand ' + convertGroup(intNum % 1000).trim();
    
    return intNum.toString();
  }

  private addText(text: string, options: any = {}) {
    const fontSize = options.fontSize || 10;
    const align = options.align || 'left';
    
    this.doc.fontSize(fontSize);
    
    if (align === 'center') {
      this.doc.text(text, this.margin, this.currentY, {
        width: this.contentWidth,
        align: 'center'
      });
    } else if (align === 'right') {
      this.doc.text(text, this.margin, this.currentY, {
        width: this.contentWidth,
        align: 'right'
      });
    } else {
      this.doc.text(text, this.margin, this.currentY, {
        width: this.contentWidth
      });
    }
    
    this.currentY += fontSize + (options.lineSpacing || 2);
  }

  private addLine(thickness = 0.5) {
    this.doc.strokeColor('#000000')
      .lineWidth(thickness)
      .moveTo(this.margin, this.currentY)
      .lineTo(this.pageWidth - this.margin, this.currentY)
      .stroke();
    this.currentY += 5;
  }

  private addDottedLine() {
    this.doc.strokeColor('#666666')
      .lineWidth(0.5)
      .dash(2, { space: 2 })
      .moveTo(this.margin, this.currentY)
      .lineTo(this.pageWidth - this.margin, this.currentY)
      .stroke()
      .undash();
    this.currentY += 5;
  }

  private addTableRow(columns: string[], widths: number[], options: any = {}) {
    const startX = this.margin;
    let currentX = startX;
    const fontSize = options.fontSize || 9;
    const isBold = options.bold || false;
    
    this.doc.fontSize(fontSize);
    if (isBold) this.doc.font('Helvetica-Bold');
    else this.doc.font('Helvetica');
    
    columns.forEach((column, index) => {
      const width = widths[index];
      const align = options.align?.[index] || 'left';
      
      this.doc.text(column, currentX, this.currentY, {
        width: width,
        align: align
      });
      
      currentX += width;
    });
    
    this.currentY += fontSize + 3;
    this.doc.font('Helvetica'); // Reset to normal font
  }

  private async addQRCode(data: string) {
    try {
      const qrBuffer = await QRCode.toBuffer(data, {
        width: 60,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      
      const qrX = this.margin + (this.contentWidth - 60) / 2; // Center QR code
      this.doc.image(qrBuffer, qrX, this.currentY, { width: 60, height: 60 });
      this.currentY += 70;
    } catch (error) {
      console.error('QR Code generation failed:', error);
      // Continue without QR code
    }
  }

  async generateReceipt(data: PDFReceiptData, settings: PDFReceiptSettings): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const buffers: Buffer[] = [];
        
        this.doc.on('data', buffers.push.bind(buffers));
        this.doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header Section
        this.addText(settings.businessName, { 
          fontSize: 14, 
          align: 'center'
        });
        
        this.addText(settings.businessAddress.replace(/\n/g, ' '), { 
          fontSize: 9, 
          align: 'center' 
        });
        
        this.addText(`Phone: ${settings.phoneNumber}`, { 
          fontSize: 9, 
          align: 'center' 
        });
        
        if (settings.email) {
          this.addText(`Email: ${settings.email}`, { 
            fontSize: 9, 
            align: 'center' 
          });
        }
        
        this.addText(`GST No: ${settings.taxId}`, { 
          fontSize: 9, 
          align: 'center' 
        });

        this.addLine(1);

        // Invoice Details
        this.addText('INVOICE DETAILS', { fontSize: 10 });
        this.addText(`Bill No: ${data.billNumber}`, { fontSize: 9 });
        this.addText(`Date: ${data.billDate}`, { fontSize: 9 });
        
        if (data.customerDetails?.name) {
          this.addText(`Customer: ${data.customerDetails.name}`, { fontSize: 9 });
          if (data.customerDetails.phone) {
            this.addText(`Phone: ${data.customerDetails.phone}`, { fontSize: 9 });
          }
          if (data.customerDetails.email) {
            this.addText(`Email: ${data.customerDetails.email}`, { fontSize: 9 });
          }
          if (data.customerDetails.address) {
            this.addText(`Address: ${data.customerDetails.address}`, { fontSize: 9 });
          }
        }
        
        this.addText(`Cashier: ${data.salesMan || 'Sales Staff'}`, { fontSize: 9 });

        this.addLine();

        // Items Table Header
        const itemWidths = [120, 30, 40, 50]; // Item, Qty, Rate, Amount
        this.addTableRow(['Item', 'Qty', 'Rate', 'Amount'], itemWidths, { 
          bold: true, 
          fontSize: 9,
          align: ['left', 'center', 'right', 'right']
        });
        this.addLine(0.5);

        // Items
        data.items.forEach(item => {
          // Main item row
          this.addTableRow([
            item.name,
            item.quantity.toString(),
            `₹${item.price}`,
            `₹${item.total}`
          ], itemWidths, {
            fontSize: 9,
            align: ['left', 'center', 'right', 'right']
          });

          // Sub-details row
          if (item.sku || item.hsnCode || item.mrp) {
            const details = [];
            if (item.sku) details.push(`SKU: ${item.sku}`);
            if (item.hsnCode) details.push(`HSN: ${item.hsnCode}`);
            if (item.mrp) details.push(`MRP: ₹${item.mrp}`);
            
            this.addText(details.join(' | '), { 
              fontSize: 8, 
              lineSpacing: 1 
            });
          }
          
          this.addDottedLine();
        });

        // Totals Section
        this.currentY += 5;
        
        const totalWidths = [180, 60];
        
        this.addTableRow([
          'Subtotal (Before Tax):',
          `₹${(parseFloat(data.subtotal) - (parseFloat(data.taxAmount || '0'))).toFixed(2)}`
        ], totalWidths, {
          fontSize: 9,
          align: ['left', 'right']
        });

        if (data.discount && parseFloat(data.discount) > 0) {
          this.addTableRow([
            `Discount${data.discountType === 'percentage' ? ` (${data.discount}%)` : ''}:`,
            `-₹${data.discountType === 'percentage' 
              ? (parseFloat(data.subtotal) * parseFloat(data.discount) / 100).toFixed(2)
              : parseFloat(data.discount).toFixed(2)}`
          ], totalWidths, {
            fontSize: 9,
            align: ['left', 'right']
          });
        }

        if (data.taxAmount && parseFloat(data.taxAmount) > 0) {
          this.addText('GST Summary:', { fontSize: 9 });
          
          if (data.cgstRate && data.sgstRate) {
            this.addTableRow([
              `CGST (${data.cgstRate}%):`,
              `₹${(parseFloat(data.taxAmount) / 2).toFixed(2)}`
            ], totalWidths, {
              fontSize: 9,
              align: ['left', 'right']
            });
            
            this.addTableRow([
              `SGST (${data.sgstRate}%):`,
              `₹${(parseFloat(data.taxAmount) / 2).toFixed(2)}`
            ], totalWidths, {
              fontSize: 9,
              align: ['left', 'right']
            });
          } else if (data.igstRate) {
            this.addTableRow([
              `IGST (${data.igstRate}%):`,
              `₹${parseFloat(data.taxAmount).toFixed(2)}`
            ], totalWidths, {
              fontSize: 9,
              align: ['left', 'right']
            });
          } else {
            this.addTableRow([
              `GST (${data.taxRate || 0}%):`,
              `₹${parseFloat(data.taxAmount).toFixed(2)}`
            ], totalWidths, {
              fontSize: 9,
              align: ['left', 'right']
            });
          }
        }

        if (data.roundingAdjustment && parseFloat(data.roundingAdjustment) !== 0) {
          this.addTableRow([
            'Rounding Adjustment:',
            `₹${parseFloat(data.roundingAdjustment).toFixed(2)}`
          ], totalWidths, {
            fontSize: 9,
            align: ['left', 'right']
          });
        }

        this.addLine();

        // Grand Total
        this.addTableRow([
          'GRAND TOTAL:',
          `₹${parseFloat(data.grandTotal).toFixed(2)}`
        ], totalWidths, {
          fontSize: 12,
          bold: true,
          align: ['left', 'right']
        });

        this.addText(`(${this.numberToWords(parseFloat(data.grandTotal))} Only)`, { 
          fontSize: 8, 
          align: 'center' 
        });

        this.addLine();

        // Payment Details
        this.addText('PAYMENT DETAILS', { fontSize: 10 });
        this.addTableRow([
          'Payment Method:',
          data.paymentMethod.toUpperCase()
        ], totalWidths, {
          fontSize: 9,
          align: ['left', 'right']
        });

        this.addTableRow([
          'Amount Paid:',
          `₹${parseFloat(data.amountPaid).toFixed(2)}`
        ], totalWidths, {
          fontSize: 9,
          align: ['left', 'right']
        });

        if (data.changeDue && parseFloat(data.changeDue) > 0) {
          this.addTableRow([
            'Change Due:',
            `₹${parseFloat(data.changeDue).toFixed(2)}`
          ], totalWidths, {
            fontSize: 9,
            bold: true,
            align: ['left', 'right']
          });
        }

        if (data.loyaltyPointsEarned) {
          this.addTableRow([
            'Loyalty Points Earned:',
            `+${data.loyaltyPointsEarned}`
          ], totalWidths, {
            fontSize: 9,
            align: ['left', 'right']
          });
        }

        this.addDottedLine();

        // Footer Section
        this.currentY += 10;
        
        this.addText('🛍️ Thank You for Shopping! 🛍️', { 
          fontSize: 11, 
          align: 'center' 
        });
        
        if (settings.receiptFooter) {
          this.addText(settings.receiptFooter.replace(/\n/g, ' '), { 
            fontSize: 9, 
            align: 'center' 
          });
        }

        this.addText('Store Timings: 9:00 AM - 10:00 PM', { 
          fontSize: 8, 
          align: 'center' 
        });
        
        this.addText(`Customer Care: ${settings.phoneNumber}`, { 
          fontSize: 8, 
          align: 'center' 
        });

        if (data.notes) {
          this.currentY += 5;
          this.addText('Special Notes:', { fontSize: 9 });
          this.addText(data.notes, { fontSize: 8 });
        }

        if (settings.termsConditions) {
          this.currentY += 5;
          this.addText('Terms & Conditions:', { fontSize: 8 });
          this.addText(settings.termsConditions, { fontSize: 7 });
        }

        // QR Code (if enabled)
        if (settings.showQRCode) {
          this.currentY += 10;
          await this.addQRCode(`BILL:${data.billNumber}|TOTAL:${data.grandTotal}|DATE:${data.billDate}`);
        }

        // Final receipt info
        this.currentY += 10;
        this.addText(`Invoice ID: ${data.billNumber}`, { 
          fontSize: 7, 
          align: 'center' 
        });
        
        this.addText(`Printed: ${new Date().toLocaleString()}`, { 
          fontSize: 7, 
          align: 'center' 
        });
        
        this.addText('POS System v2.0 - Computer Generated Invoice', { 
          fontSize: 6, 
          align: 'center' 
        });

        this.doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Export utility function for easy use
export async function generatePDFReceipt(
  data: PDFReceiptData, 
  settings: PDFReceiptSettings
): Promise<Buffer> {
  const generator = new PDFReceiptGenerator();
  return generator.generateReceipt(data, settings);
}