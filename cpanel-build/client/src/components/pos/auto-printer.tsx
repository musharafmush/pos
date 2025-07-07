
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Printer, Settings, Clock, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { printReceipt } from './print-receipt';

interface AutoPrinterSettings {
  enabled: boolean;
  printDelay: number; // seconds
  retryAttempts: number;
  retryDelay: number; // seconds
  printCustomerCopy: boolean;
  printMerchantCopy: boolean;
  autoOpenDrawer: boolean;
  quietMode: boolean;
  printerQueue: boolean;
  printOnSale: boolean;
  printOnReturn: boolean;
  printOnHold: boolean;
}

interface SaleData {
  id: string;
  billNumber: string;
  billDate: string;
  customerDetails: any;
  salesMan: string;
  items: any[];
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
  type: 'sale' | 'return' | 'hold';
}

interface AutoPrinterProps {
  onSettingsChange?: (settings: AutoPrinterSettings) => void;
  initialSettings?: Partial<AutoPrinterSettings>;
}

export const AutoPrinter: React.FC<AutoPrinterProps> = ({
  onSettingsChange,
  initialSettings
}) => {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [printQueue, setPrintQueue] = useState<SaleData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statistics, setStatistics] = useState({
    totalPrinted: 0,
    successfulPrints: 0,
    failedPrints: 0,
    queueSize: 0
  });

  const [settings, setSettings] = useState<AutoPrinterSettings>({
    enabled: true,
    printDelay: 2,
    retryAttempts: 3,
    retryDelay: 5,
    printCustomerCopy: true,
    printMerchantCopy: false,
    autoOpenDrawer: true,
    quietMode: false,
    printerQueue: true,
    printOnSale: true,
    printOnReturn: true,
    printOnHold: false,
    ...initialSettings
  });

  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  useEffect(() => {
    setStatistics(prev => ({ ...prev, queueSize: printQueue.length }));
  }, [printQueue]);

  const updateSetting = (key: keyof AutoPrinterSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const addToQueue = useCallback((saleData: SaleData) => {
    if (!settings.enabled) return;

    const shouldPrint = 
      (saleData.type === 'sale' && settings.printOnSale) ||
      (saleData.type === 'return' && settings.printOnReturn) ||
      (saleData.type === 'hold' && settings.printOnHold);

    if (shouldPrint) {
      setPrintQueue(prev => [...prev, saleData]);
      
      if (!settings.quietMode) {
        toast({
          title: "🖨️ Added to Print Queue",
          description: `Receipt ${saleData.billNumber} queued for printing`
        });
      }
    }
  }, [settings, toast]);

  const processPrintQueue = useCallback(async () => {
    if (isProcessing || printQueue.length === 0) return;

    setIsProcessing(true);
    const currentItem = printQueue[0];

    try {
      // Add delay before printing
      if (settings.printDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, settings.printDelay * 1000));
      }

      // Print customer copy
      if (settings.printCustomerCopy) {
        await printWithRetry(currentItem, 'Customer Copy');
      }

      // Print merchant copy
      if (settings.printMerchantCopy) {
        await printWithRetry(currentItem, 'Merchant Copy');
      }

      // Remove from queue
      setPrintQueue(prev => prev.slice(1));
      setStatistics(prev => ({
        ...prev,
        totalPrinted: prev.totalPrinted + 1,
        successfulPrints: prev.successfulPrints + 1
      }));

      if (!settings.quietMode) {
        toast({
          title: "✅ Print Successful",
          description: `Receipt ${currentItem.billNumber} printed successfully`
        });
      }

    } catch (error) {
      console.error('Auto-print failed:', error);
      
      // Remove failed item from queue
      setPrintQueue(prev => prev.slice(1));
      setStatistics(prev => ({
        ...prev,
        totalPrinted: prev.totalPrinted + 1,
        failedPrints: prev.failedPrints + 1
      }));

      toast({
        title: "❌ Auto-Print Failed",
        description: `Failed to print receipt ${currentItem.billNumber}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, printQueue, settings, toast]);

  const printWithRetry = async (saleData: SaleData, copyType: string) => {
    let attempts = 0;
    const maxAttempts = settings.retryAttempts;

    while (attempts < maxAttempts) {
      try {
        const receiptData = {
          billNumber: saleData.billNumber,
          billDate: saleData.billDate,
          customerDetails: saleData.customerDetails,
          salesMan: saleData.salesMan,
          items: saleData.items,
          subtotal: saleData.subtotal,
          discount: saleData.discount,
          discountType: saleData.discountType,
          taxRate: saleData.taxRate,
          taxAmount: saleData.taxAmount,
          grandTotal: saleData.grandTotal,
          amountPaid: saleData.amountPaid,
          changeDue: saleData.changeDue,
          paymentMethod: saleData.paymentMethod,
          notes: `${saleData.notes || ''} - ${copyType}`.trim()
        };

        const thermalSettings = {
          autoPrint: true,
          paperWidth: 'thermal80' as const,
          fontSize: 'medium' as const,
          showCustomerDetails: true,
          showItemSKU: true,
          showMRP: true,
          thermalOptimized: true,
          receiptFooter: `${copyType}\nAuto-printed by system`
        };

        printReceipt(receiptData, thermalSettings);
        return; // Success
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, settings.retryDelay * 1000));
        } else {
          throw error;
        }
      }
    }
  };

  // Process queue automatically
  useEffect(() => {
    if (settings.enabled && settings.printerQueue && printQueue.length > 0 && !isProcessing) {
      const timer = setTimeout(processPrintQueue, 1000);
      return () => clearTimeout(timer);
    }
  }, [settings.enabled, settings.printerQueue, printQueue.length, isProcessing, processPrintQueue]);

  const clearQueue = () => {
    setPrintQueue([]);
    toast({
      title: "🗑️ Queue Cleared",
      description: "Print queue has been cleared"
    });
  };

  const testAutoPrint = () => {
    const testSale: SaleData = {
      id: 'auto-test-' + Date.now(),
      billNumber: 'AUTO-TEST-' + Date.now(),
      billDate: new Date().toISOString(),
      customerDetails: { name: 'Auto-Print Test Customer' },
      salesMan: 'Auto-Printer System',
      items: [
        { name: 'Test Item', sku: 'AUTO-TEST-001', quantity: 1, price: '10.00', total: 10.00, mrp: 12.00 }
      ],
      subtotal: 10.00,
      discount: 0,
      discountType: 'fixed' as const,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: 10.00,
      amountPaid: 10.00,
      changeDue: 0,
      paymentMethod: 'cash',
      notes: 'Auto-printer test receipt',
      type: 'sale' as const
    };

    addToQueue(testSale);
  };

  // Expose addToQueue function globally for POS integration
  useEffect(() => {
    (window as any).autoPrinterAddToQueue = addToQueue;
    return () => {
      delete (window as any).autoPrinterAddToQueue;
    };
  }, [addToQueue]);

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Auto-Printer Status
            </span>
            <div className={`flex items-center gap-2 ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
              {isActive ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </CardTitle>
          <CardDescription>
            Automatic receipt printing system | Queue: {printQueue.length} items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button 
              onClick={() => setIsActive(!isActive)}
              variant={isActive ? "secondary" : "default"}
            >
              {isActive ? "Deactivate" : "Activate"} Auto-Printer
            </Button>
            <Button 
              onClick={testAutoPrint}
              disabled={!settings.enabled}
              variant="outline"
            >
              <Printer className="h-4 w-4 mr-2" />
              Test Print
            </Button>
            <Button 
              onClick={clearQueue}
              disabled={printQueue.length === 0}
              variant="outline"
            >
              Clear Queue ({printQueue.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Auto-Printer Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Auto-Printing</Label>
            <Switch 
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting('enabled', checked)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Print Delay (seconds)</Label>
              <Input 
                type="number"
                min="0"
                max="30"
                value={settings.printDelay}
                onChange={(e) => updateSetting('printDelay', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Retry Attempts</Label>
              <Input 
                type="number"
                min="1"
                max="10"
                value={settings.retryAttempts}
                onChange={(e) => updateSetting('retryAttempts', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Print Customer Copy</Label>
              <Switch 
                checked={settings.printCustomerCopy}
                onCheckedChange={(checked) => updateSetting('printCustomerCopy', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Print Merchant Copy</Label>
              <Switch 
                checked={settings.printMerchantCopy}
                onCheckedChange={(checked) => updateSetting('printMerchantCopy', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Auto Open Cash Drawer</Label>
              <Switch 
                checked={settings.autoOpenDrawer}
                onCheckedChange={(checked) => updateSetting('autoOpenDrawer', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Quiet Mode (No Notifications)</Label>
              <Switch 
                checked={settings.quietMode}
                onCheckedChange={(checked) => updateSetting('quietMode', checked)}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Print Triggers</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Print on Sale</Label>
                <Switch 
                  checked={settings.printOnSale}
                  onCheckedChange={(checked) => updateSetting('printOnSale', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Print on Return</Label>
                <Switch 
                  checked={settings.printOnReturn}
                  onCheckedChange={(checked) => updateSetting('printOnReturn', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Print on Hold</Label>
                <Switch 
                  checked={settings.printOnHold}
                  onCheckedChange={(checked) => updateSetting('printOnHold', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Print Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalPrinted}</div>
              <div className="text-sm text-gray-600">Total Printed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.successfulPrints}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.failedPrints}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.queueSize}</div>
              <div className="text-sm text-gray-600">In Queue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Status */}
      {printQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Print Queue</CardTitle>
            <CardDescription>
              {isProcessing ? "Processing..." : "Waiting to process"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {printQueue.slice(0, 5).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">
                    {index === 0 && isProcessing && "🖨️ "}{item.billNumber} - ₹{item.grandTotal}
                  </span>
                  <span className="text-xs text-gray-500">{item.type}</span>
                </div>
              ))}
              {printQueue.length > 5 && (
                <div className="text-center text-sm text-gray-500">
                  +{printQueue.length - 5} more items...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutoPrinter;
