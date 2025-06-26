import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Eye, FileText, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PDFReceiptData {
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

interface PDFReceiptGeneratorProps {
  receiptData: PDFReceiptData;
  businessSettings?: {
    businessName?: string;
    businessAddress?: string;
    phoneNumber?: string;
    email?: string;
    taxId?: string;
    receiptFooter?: string;
  };
  className?: string;
}

export const PDFReceiptGenerator: React.FC<PDFReceiptGeneratorProps> = ({
  receiptData,
  businessSettings,
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const { toast } = useToast();

  const generatePDFReceipt = async (preview = false) => {
    try {
      if (preview) {
        setIsPreviewing(true);
      } else {
        setIsGenerating(true);
      }

      console.log('🔄 Generating 4-inch PDF receipt...', { preview });

      const endpoint = preview ? '/api/pdf-receipt/preview' : '/api/pdf-receipt/generate';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptData,
          settings: businessSettings
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log(`✅ PDF receipt ${preview ? 'preview' : 'download'} successful:`, blob.size, 'bytes');

      if (preview) {
        // Open PDF in new tab for preview
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          toast({
            title: "Preview Failed",
            description: "Please allow popups for PDF preview",
            variant: "destructive",
          });
        } else {
          toast({
            title: "PDF Preview Ready",
            description: "4-inch PDF receipt opened in new tab",
          });
        }
        
        // Clean up URL after 1 minute
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        // Download PDF
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${receiptData.billNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "PDF Receipt Downloaded",
          description: `4-inch receipt for ${receiptData.billNumber} saved successfully`,
        });
      }

    } catch (error) {
      console.error('❌ PDF receipt generation failed:', error);
      toast({
        title: preview ? "Preview Failed" : "Download Failed",
        description: error instanceof Error ? error.message : 'Failed to generate PDF receipt',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsPreviewing(false);
    }
  };

  const printPDFReceipt = async () => {
    try {
      setIsPreviewing(true);
      
      const response = await fetch('/api/pdf-receipt/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptData,
          settings: businessSettings
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF for printing');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      
      iframe.onload = () => {
        iframe.contentWindow?.print();
        // Clean up after print
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
      
      document.body.appendChild(iframe);
      
      toast({
        title: "Printing PDF",
        description: "4-inch PDF receipt sent to printer",
      });

    } catch (error) {
      console.error('❌ PDF printing failed:', error);
      toast({
        title: "Print Failed",
        description: error instanceof Error ? error.message : 'Failed to print PDF receipt',
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          4-inch PDF Receipt Generator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Generate professional 4-inch wide PDF receipts (288pt width) for thermal printers
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            onClick={() => generatePDFReceipt(true)}
            disabled={isPreviewing || isGenerating}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {isPreviewing ? 'Generating...' : 'Preview PDF'}
          </Button>

          <Button
            onClick={() => generatePDFReceipt(false)}
            disabled={isPreviewing || isGenerating}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>

          <Button
            onClick={printPDFReceipt}
            disabled={isPreviewing || isGenerating}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            {isPreviewing ? 'Preparing...' : 'Print PDF'}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">PDF Receipt Features:</h4>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• 4-inch width (288pt) optimized for thermal printers</li>
            <li>• Professional layout with business header and GST details</li>
            <li>• Comprehensive product listing with HSN codes and MRP</li>
            <li>• CGST/SGST/IGST breakdown for tax compliance</li>
            <li>• QR code with bill details for verification</li>
            <li>• Number-to-words conversion for grand total</li>
            <li>• Customer information and payment details</li>
            <li>• Professional footer with terms and conditions</li>
          </ul>
        </div>

        {receiptData.billNumber && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
            <strong>Bill:</strong> {receiptData.billNumber} | 
            <strong> Total:</strong> ₹{receiptData.grandTotal} | 
            <strong> Items:</strong> {receiptData.items.length}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFReceiptGenerator;