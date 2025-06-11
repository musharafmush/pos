
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PrinterIcon, XIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface ReceiptSettings {
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  taxId: string;
  receiptFooter: string;
  showLogo: boolean;
  autoPrint: boolean;
}

export default function ReceiptSettings() {
  const [settings, setSettings] = useState<ReceiptSettings>({
    businessName: 'AWESOME SHOP POS',
    businessAddress: '123 Main Street\nCity, State 560001',
    phoneNumber: '(123) 456-7890',
    taxId: '29ABCDE1234F1Z5',
    receiptFooter: 'Thank you for shopping with us!',
    showLogo: false,
    autoPrint: true
  });

  const [isOpen, setIsOpen] = useState(true);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('receiptSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('receiptSettings', JSON.stringify(settings));
    alert('Receipt settings saved successfully!');
  };

  const handlePrintTest = () => {
    const testReceiptData = {
      billNumber: 'POS1749631206824',
      billDate: '11/06/2025',
      customerDetails: {
        name: 'Walk-in Customer'
      },
      salesMan: 'Admin User',
      items: [{
        id: 1,
        name: 'Sample Product',
        sku: 'ITM264973991-REPACK-2500-1749547699598',
        quantity: 1,
        price: '2.99',
        total: 2.99,
        mrp: 2.99
      }],
      subtotal: 2.99,
      discount: 0,
      discountType: 'fixed' as const,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: 2.99,
      amountPaid: 2.99,
      changeDue: 0,
      paymentMethod: 'CASH',
      notes: ''
    };

    printTestReceipt(testReceiptData);
  };

  const printTestReceipt = (data: any) => {
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
    <title>Receipt Test Print</title>
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
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }

        .business-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 4px;
        }

        .business-address {
            font-size: 10px;
            line-height: 1.3;
            margin-bottom: 4px;
        }

        .bill-info {
            margin: 8px 0;
            font-size: 10px;
        }

        .bill-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }

        .separator {
            border-top: 1px dashed #000;
            margin: 6px 0;
        }

        .customer-section {
            margin: 8px 0;
            font-size: 10px;
        }

        .items-section {
            margin: 8px 0;
        }

        .item-header {
            display: flex;
            font-weight: bold;
            border-bottom: 1px solid #000;
            padding: 2px 0;
            font-size: 9px;
        }

        .item-name { flex: 3; }
        .item-qty { flex: 1; text-align: center; }
        .item-price { flex: 2; text-align: right; }
        .item-total { flex: 2; text-align: right; }

        .item-row {
            display: flex;
            padding: 3px 0;
            font-size: 9px;
        }

        .totals-section {
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 6px;
            font-size: 10px;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }

        .grand-total {
            font-weight: bold;
            font-size: 12px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 0;
            margin: 6px 0;
        }

        .payment-section {
            margin: 8px 0;
            font-size: 10px;
        }

        .footer {
            text-align: center;
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 6px;
            font-size: 9px;
        }

        @media print {
            body { padding: 0; margin: 0; }
            .receipt-container { width: 58mm; max-width: none; }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <div class="business-name">${settings.businessName}</div>
            <div class="business-address">
                ${settings.businessAddress.replace(/\n/g, '<br>')}
            </div>
            <div style="font-size: 9px; margin-top: 4px;">
                ${settings.taxId ? `GST No: ${settings.taxId} | ` : ''}Ph: ${settings.phoneNumber}
            </div>
        </div>

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

        <div class="customer-section">
            <strong>Customer:</strong> ${data.customerDetails.name}
        </div>

        <div class="separator"></div>

        <div class="items-section">
            <div class="item-header">
                <div class="item-name">ITEM</div>
                <div class="item-qty">QTY</div>
                <div class="item-price">PRICE</div>
                <div class="item-total">TOTAL</div>
            </div>
            ${data.items.map(item => `
                <div class="item-row">
                    <div class="item-name">${item.name}</div>
                    <div class="item-qty">${item.quantity}</div>
                    <div class="item-price">${formatCurrency(parseFloat(item.price))}</div>
                    <div class="item-total">${formatCurrency(item.total)}</div>
                </div>
                <div style="font-size: 8px; color: #666; margin-left: 0;">${item.sku}</div>
            `).join('')}
        </div>

        <div class="separator"></div>

        <div class="totals-section">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>${formatCurrency(data.subtotal)}</span>
            </div>
            <div class="total-row">
                <span>Tax (0%):</span>
                <span>${formatCurrency(data.taxAmount)}</span>
            </div>
            <div class="total-row grand-total">
                <span>TOTAL:</span>
                <span>${formatCurrency(data.grandTotal)}</span>
            </div>
        </div>

        <div class="payment-section">
            <div class="total-row">
                <span>Payment Method:</span>
                <span>${data.paymentMethod}</span>
            </div>
            <div class="total-row">
                <span>Amount Paid:</span>
                <span>${formatCurrency(data.amountPaid)}</span>
            </div>
        </div>

        <div class="footer">
            <div>${settings.receiptFooter}</div>
            <div style="margin-top: 4px; font-size: 8px;">Terminal: POS-Enhanced</div>
        </div>
    </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <PrinterIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Receipt & Printer Settings</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
          {/* Settings Form */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-sm font-medium">
                  Business Name
                </Label>
                <Input
                  id="businessName"
                  value={settings.businessName}
                  onChange={(e) => setSettings({...settings, businessName: e.target.value})}
                  placeholder="Enter business name"
                />
              </div>

              {/* Business Address */}
              <div className="space-y-2">
                <Label htmlFor="businessAddress" className="text-sm font-medium">
                  Business Address
                </Label>
                <Textarea
                  id="businessAddress"
                  value={settings.businessAddress}
                  onChange={(e) => setSettings({...settings, businessAddress: e.target.value})}
                  placeholder="Enter business address"
                  rows={3}
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  value={settings.phoneNumber}
                  onChange={(e) => setSettings({...settings, phoneNumber: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>

              {/* Tax ID / GST Number */}
              <div className="space-y-2">
                <Label htmlFor="taxId" className="text-sm font-medium">
                  Tax ID / GST Number
                </Label>
                <Input
                  id="taxId"
                  value={settings.taxId}
                  onChange={(e) => setSettings({...settings, taxId: e.target.value})}
                  placeholder="Your tax ID number"
                />
              </div>

              {/* Receipt Footer */}
              <div className="space-y-2">
                <Label htmlFor="receiptFooter" className="text-sm font-medium">
                  Receipt Footer
                </Label>
                <Textarea
                  id="receiptFooter"
                  value={settings.receiptFooter}
                  onChange={(e) => setSettings({...settings, receiptFooter: e.target.value})}
                  placeholder="Thank you message"
                  rows={3}
                />
              </div>

              <Separator />

              {/* Toggle Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showLogo" className="text-sm font-medium">
                    Show Logo on Receipt
                  </Label>
                  <Switch
                    id="showLogo"
                    checked={settings.showLogo}
                    onCheckedChange={(checked) => setSettings({...settings, showLogo: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="autoPrint" className="text-sm font-medium">
                    Auto Print After Sale
                  </Label>
                  <Switch
                    id="autoPrint"
                    checked={settings.autoPrint}
                    onCheckedChange={(checked) => setSettings({...settings, autoPrint: checked})}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  Save Settings
                </Button>
                <Button onClick={handlePrintTest} variant="outline" className="flex-1">
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print Test
                </Button>
              </div>
            </div>
          </div>

          {/* Receipt Preview */}
          <div className="lg:w-96 bg-gray-50 p-6 border-l overflow-y-auto">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Receipt Preview</h3>
              
              <div className="bg-white p-4 rounded border shadow-sm">
                <div className="font-mono text-xs leading-tight">
                  <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
                    <div className="font-bold text-sm">{settings.businessName}</div>
                    <div className="text-xs mt-1 whitespace-pre-line">
                      {settings.businessAddress}
                    </div>
                    <div className="text-xs mt-1">
                      {settings.taxId && `GST No: ${settings.taxId} | `}Tel: {settings.phoneNumber}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs mb-2">
                    <div className="flex justify-between">
                      <span>Bill No:</span>
                      <span>POS1749631206824</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span>11/06/2025</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span>06:22:10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cashier:</span>
                      <span>Admin User</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
                    <div className="text-xs"><strong>Customer:</strong> Walk-in Customer</div>
                  </div>

                  <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
                    <div className="flex text-xs font-bold border-b border-gray-400 pb-1">
                      <div className="flex-1">ITEM</div>
                      <div className="w-8 text-center">QTY</div>
                      <div className="w-12 text-right">PRICE</div>
                      <div className="w-12 text-right">TOTAL</div>
                    </div>
                    <div className="flex text-xs py-1">
                      <div className="flex-1">Sample Product</div>
                      <div className="w-8 text-center">1</div>
                      <div className="w-12 text-right">₹2.99</div>
                      <div className="w-12 text-right">₹2.99</div>
                    </div>
                    <div className="text-xs text-gray-600">ITM264973991-REPACK-2500</div>
                  </div>

                  <div className="border-t border-dashed border-gray-400 pt-2 mb-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Subtotal:</span>
                      <span>₹2.99</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold border-t border-b border-gray-400 py-1">
                      <span>TOTAL:</span>
                      <span>₹2.99</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs mb-2">
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <span>CASH</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount Paid:</span>
                      <span>₹2.99</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-400 pt-2 text-center text-xs">
                    <div>{settings.receiptFooter}</div>
                    <div className="mt-1 text-gray-600">Terminal: POS-Enhanced</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
