
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Printer, Settings, TestTube, Wifi, Bluetooth, Usb } from "lucide-react";

interface ThermalPrinterSettings {
  printerType: 'usb' | 'bluetooth' | 'wifi' | 'network';
  paperWidth: '58mm' | '80mm' | '112mm';
  baudRate: string;
  deviceName: string;
  ipAddress: string;
  port: string;
  characterSet: 'cp437' | 'cp850' | 'cp852' | 'cp858' | 'cp866' | 'cp1252';
  printDensity: 'light' | 'medium' | 'dark';
  printSpeed: 'slow' | 'medium' | 'fast';
  cutType: 'full' | 'partial' | 'none';
  buzzer: boolean;
  drawer: boolean;
  autoConnect: boolean;
  retryAttempts: number;
}

interface ThermalPrinterProps {
  onPrint: (receiptData: any) => void;
  settings?: Partial<ThermalPrinterSettings>;
  onSettingsChange?: (settings: ThermalPrinterSettings) => void;
}

export const ThermalPrinter: React.FC<ThermalPrinterProps> = ({
  onPrint,
  settings: externalSettings,
  onSettingsChange
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'idle' | 'printing' | 'error' | 'offline'>('idle');

  const [settings, setSettings] = useState<ThermalPrinterSettings>({
    printerType: 'usb',
    paperWidth: '80mm',
    baudRate: '9600',
    deviceName: 'Xprinter XP-420B',
    ipAddress: '192.168.1.100',
    port: '9100',
    characterSet: 'cp437',
    printDensity: 'medium',
    printSpeed: 'medium',
    cutType: 'full',
    buzzer: true,
    drawer: false,
    autoConnect: true,
    retryAttempts: 3,
    ...externalSettings
  });

  useEffect(() => {
    if (settings.autoConnect) {
      connectPrinter();
    }
  }, []);

  const updateSetting = (key: keyof ThermalPrinterSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const connectPrinter = async () => {
    try {
      setIsConnected(false);
      setPrinterStatus('offline');
      
      // Simulate connection based on printer type
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsConnected(true);
      setPrinterStatus('idle');
      
      toast({
        title: "✅ Printer Connected",
        description: `Connected to ${settings.deviceName} via ${settings.printerType.toUpperCase()}`
      });
    } catch (error) {
      setIsConnected(false);
      setPrinterStatus('error');
      toast({
        title: "❌ Connection Failed",
        description: "Could not connect to thermal printer",
        variant: "destructive"
      });
    }
  };

  const printTestReceipt = async () => {
    if (!isConnected) {
      toast({
        title: "❌ Printer Not Connected",
        description: "Please connect the printer first",
        variant: "destructive"
      });
      return;
    }

    setIsPrinting(true);
    setPrinterStatus('printing');

    try {
      const testData = {
        billNumber: 'TEST-' + Date.now(),
        billDate: new Date().toISOString(),
        customerDetails: { name: 'Test Customer' },
        salesMan: 'System Test',
        items: [
          { name: 'Test Item 1', sku: 'TEST001', quantity: 1, price: '10.00', total: 10.00, mrp: 12.00 },
          { name: 'Test Item 2', sku: 'TEST002', quantity: 2, price: '5.00', total: 10.00, mrp: 6.00 }
        ],
        subtotal: 20.00,
        discount: 0,
        discountType: 'fixed' as const,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: 20.00,
        amountPaid: 20.00,
        changeDue: 0,
        paymentMethod: 'cash',
        notes: 'Test Receipt - Thermal Printer'
      };

      const thermalSettings = {
        paperWidth: settings.paperWidth,
        fontSize: 'medium' as const,
        fontFamily: 'courier' as const,
        headerStyle: 'centered' as const,
        showCustomerDetails: true,
        showItemSKU: true,
        showMRP: true,
        showSavings: true,
        autoPrint: false,
        businessName: 'M MART - Thermal Test',
        businessAddress: 'Test Address for Thermal Printer',
        phoneNumber: '+91-9876543210',
        taxId: '33GSPDB3311F1ZZ',
        receiptFooter: 'Thermal Printer Test Receipt\nThank you for your business!',
        currencySymbol: '₹',
        thermalOptimized: true
      };

      // Import and use the print function
      const { printReceipt } = await import('./print-receipt');
      printReceipt(testData, thermalSettings);

      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "✅ Test Print Successful",
        description: "Test receipt sent to thermal printer"
      });
    } catch (error) {
      toast({
        title: "❌ Print Failed",
        description: "Could not print test receipt",
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
      setPrinterStatus('idle');
    }
  };

  const getConnectionIcon = () => {
    switch (settings.printerType) {
      case 'usb': return <Usb className="h-4 w-4" />;
      case 'bluetooth': return <Bluetooth className="h-4 w-4" />;
      case 'wifi': 
      case 'network': return <Wifi className="h-4 w-4" />;
      default: return <Printer className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (printerStatus) {
      case 'idle': return 'text-green-600';
      case 'printing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      case 'offline': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Printer Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Thermal Printer Status
            </span>
            <div className={`flex items-center gap-2 ${getStatusColor()}`}>
              {getConnectionIcon()}
              <span className="text-sm font-medium capitalize">
                {printerStatus}
              </span>
            </div>
          </CardTitle>
          <CardDescription>
            Current printer: {settings.deviceName} | Paper: {settings.paperWidth}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button 
              onClick={connectPrinter}
              disabled={isConnected}
              variant={isConnected ? "secondary" : "default"}
            >
              {isConnected ? "Connected" : "Connect Printer"}
            </Button>
            <Button 
              onClick={printTestReceipt}
              disabled={!isConnected || isPrinting}
              variant="outline"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isPrinting ? "Printing..." : "Test Print"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Connection Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Connection Type</Label>
              <Select 
                value={settings.printerType} 
                onValueChange={(value: any) => updateSetting('printerType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usb">USB Connection</SelectItem>
                  <SelectItem value="bluetooth">Bluetooth</SelectItem>
                  <SelectItem value="wifi">WiFi Network</SelectItem>
                  <SelectItem value="network">Network IP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Paper Width</Label>
              <Select 
                value={settings.paperWidth} 
                onValueChange={(value: any) => updateSetting('paperWidth', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (Small)</SelectItem>
                  <SelectItem value="80mm">80mm (Standard)</SelectItem>
                  <SelectItem value="112mm">112mm (Wide)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(settings.printerType === 'wifi' || settings.printerType === 'network') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>IP Address</Label>
                <Input 
                  value={settings.ipAddress}
                  onChange={(e) => updateSetting('ipAddress', e.target.value)}
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <Label>Port</Label>
                <Input 
                  value={settings.port}
                  onChange={(e) => updateSetting('port', e.target.value)}
                  placeholder="9100"
                />
              </div>
            </div>
          )}

          <div>
            <Label>Device Name</Label>
            <Input 
              value={settings.deviceName}
              onChange={(e) => updateSetting('deviceName', e.target.value)}
              placeholder="Thermal Printer"
            />
          </div>
        </CardContent>
      </Card>

      {/* Print Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Print Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Print Density</Label>
              <Select 
                value={settings.printDensity} 
                onValueChange={(value: any) => updateSetting('printDensity', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Print Speed</Label>
              <Select 
                value={settings.printSpeed} 
                onValueChange={(value: any) => updateSetting('printSpeed', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Paper Cut</Label>
              <Select 
                value={settings.cutType} 
                onValueChange={(value: any) => updateSetting('cutType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Cut</SelectItem>
                  <SelectItem value="partial">Partial Cut</SelectItem>
                  <SelectItem value="none">No Cut</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label>Enable Buzzer</Label>
              <Switch 
                checked={settings.buzzer}
                onCheckedChange={(checked) => updateSetting('buzzer', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Open Cash Drawer</Label>
              <Switch 
                checked={settings.drawer}
                onCheckedChange={(checked) => updateSetting('drawer', checked)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Auto Connect on Startup</Label>
            <Switch 
              checked={settings.autoConnect}
              onCheckedChange={(checked) => updateSetting('autoConnect', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThermalPrinter;
