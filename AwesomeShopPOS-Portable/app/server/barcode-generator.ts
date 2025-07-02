import JsBarcode from 'jsbarcode';

export interface BarcodeOptions {
  format: 'CODE128' | 'EAN13' | 'CODE39' | 'UPC' | 'QR';
  width: number;
  height: number;
  displayValue: boolean;
  fontSize: number;
  textMargin: number;
  margin: number;
}

export class BarcodeGenerator {
  static generateBarcode(value: string, options: Partial<BarcodeOptions> = {}): string {
    const defaultOptions: BarcodeOptions = {
      format: 'CODE128',
      width: 2,
      height: 100,
      displayValue: true,
      fontSize: 14,
      textMargin: 2,
      margin: 10
    };

    const config = { ...defaultOptions, ...options };

    try {
      // For now, return a data URL string that represents the barcode
      // In a real implementation, this would use canvas or server-side rendering
      const barcodeData = `data:image/svg+xml;base64,${Buffer.from(`
        <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="100" fill="white"/>
          <g transform="translate(10,10)">
            <!-- Barcode bars representation -->
            ${this.generateBarcodePattern(value, config.format)}
          </g>
          ${config.displayValue ? `<text x="100" y="90" text-anchor="middle" font-size="${config.fontSize}">${value}</text>` : ''}
        </svg>
      `).toString('base64')}`;
      
      return barcodeData;
    } catch (error: any) {
      console.error('Barcode generation error:', error);
      throw new Error(`Failed to generate barcode: ${error.message}`);
    }
  }

  private static generateBarcodePattern(value: string, format: string): string {
    // Simple barcode pattern generation for demonstration
    let pattern = '';
    const barCount = Math.min(value.length * 8, 50);
    
    for (let i = 0; i < barCount; i++) {
      const width = Math.random() > 0.5 ? 2 : 4;
      const x = i * 3;
      pattern += `<rect x="${x}" y="0" width="${width}" height="60" fill="black"/>`;
    }
    
    return pattern;
  }

  static validateBarcodeValue(value: string, format: string): boolean {
    switch (format) {
      case 'CODE128':
        return /^[\x00-\x7F]+$/.test(value); // ASCII characters only
      case 'EAN13':
        return /^\d{12,13}$/.test(value); // 12-13 digits
      case 'CODE39':
        return /^[A-Z0-9\-\.\s\$\/\+%]+$/.test(value); // CODE39 character set
      case 'UPC':
        return /^\d{11,12}$/.test(value); // 11-12 digits
      default:
        return true; // Allow all for QR and unknown formats
    }
  }

  static generateBarcodeForProduct(productSku: string, productId: number): string {
    // Generate barcode based on SKU or product ID
    const barcodeValue = productSku || `PROD${productId.toString().padStart(8, '0')}`;
    
    return this.generateBarcode(barcodeValue, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 12
    });
  }

  static getSupportedFormats(): string[] {
    return ['CODE128', 'EAN13', 'CODE39', 'UPC', 'QR'];
  }
}

// ESC/POS commands for Endura printers
export class EnduraPrinterCommands {
  static ESC = '\x1B';
  static GS = '\x1D';

  static initializePrinter(): string {
    return this.ESC + '@'; // Initialize printer
  }

  static setTextSize(width: number = 1, height: number = 1): string {
    const size = ((width - 1) << 4) | (height - 1);
    return this.GS + '!' + String.fromCharCode(size);
  }

  static setTextAlignment(alignment: 'left' | 'center' | 'right'): string {
    const alignValue = alignment === 'left' ? 0 : alignment === 'center' ? 1 : 2;
    return this.ESC + 'a' + String.fromCharCode(alignValue);
  }

  static setBold(enabled: boolean): string {
    return this.ESC + 'E' + String.fromCharCode(enabled ? 1 : 0);
  }

  static setUnderline(enabled: boolean): string {
    return this.ESC + '-' + String.fromCharCode(enabled ? 1 : 0);
  }

  static printText(text: string): string {
    return text;
  }

  static printBarcode(data: string, type: string = 'CODE128'): string {
    // Set barcode type
    let barcodeType = 73; // CODE128 default
    switch (type) {
      case 'EAN13': barcodeType = 67; break;
      case 'CODE39': barcodeType = 69; break;
      case 'UPC': barcodeType = 65; break;
    }

    return this.GS + 'k' + String.fromCharCode(barcodeType) + 
           String.fromCharCode(data.length) + data;
  }

  static setLineSpacing(spacing: number = 30): string {
    return this.ESC + '3' + String.fromCharCode(spacing);
  }

  static feedLines(lines: number = 1): string {
    return this.ESC + 'd' + String.fromCharCode(lines);
  }

  static cutPaper(partial: boolean = false): string {
    return this.GS + 'V' + String.fromCharCode(partial ? 1 : 0);
  }

  static generateLabelCommands(labelData: any): string {
    let commands = '';
    
    // Initialize printer
    commands += this.initializePrinter();
    
    // Set text alignment
    commands += this.setTextAlignment(labelData.textAlignment || 'center');
    
    // Print product name (bold, larger text)
    commands += this.setBold(true);
    commands += this.setTextSize(2, 2);
    commands += this.printText(labelData.productName);
    commands += this.feedLines(1);
    
    // Reset text formatting
    commands += this.setBold(false);
    commands += this.setTextSize(1, 1);
    
    // Print price
    if (labelData.includePrice) {
      commands += this.printText(`Price: ₹${labelData.price}`);
      commands += this.feedLines(1);
    }
    
    // Print MRP
    if (labelData.includeMrp && labelData.mrp) {
      commands += this.printText(`MRP: ₹${labelData.mrp}`);
      commands += this.feedLines(1);
    }
    
    // Print description
    if (labelData.includeDescription && labelData.description) {
      commands += this.printText(labelData.description);
      commands += this.feedLines(1);
    }
    
    // Print weight
    if (labelData.includeWeight && labelData.weight) {
      commands += this.printText(`Weight: ${labelData.weight}g`);
      commands += this.feedLines(1);
    }
    
    // Print barcode
    if (labelData.includeBarcode && labelData.barcode) {
      commands += this.printBarcode(labelData.barcode, labelData.barcodeType);
      commands += this.feedLines(2);
    }
    
    // Add custom text if provided
    if (labelData.customText) {
      commands += this.printText(labelData.customText);
      commands += this.feedLines(1);
    }
    
    // Cut paper
    commands += this.feedLines(3);
    commands += this.cutPaper();
    
    return commands;
  }
}

export default { BarcodeGenerator, EnduraPrinterCommands };