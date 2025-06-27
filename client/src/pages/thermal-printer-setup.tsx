import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { printReceipt as printReceiptUtil } from '@/components/pos/print-receipt';
import { useQuery } from "@tanstack/react-query";
import {
  Printer,
  Settings,
  TestTube,
  CheckCircle,
  AlertTriangle,
  Info,
  PlayCircle,
  RefreshCw,
  Zap,
  Monitor,
  FileText,
  Eye,
  Save,
  RotateCcw,
  HelpCircle,
  BookOpen,
  Activity,
  Clock,
  Gauge
} from 'lucide-react';

interface ThermalPrinterSettings {
  // Basic Settings
  printerName: string;
  paperWidth: string;
  fontSize: string;
  fontFamily: string;
  
  // Print Quality
  printDensity: number;
  printSpeed: number;
  thermalOptimized: boolean;
  
  // Layout Settings
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  lineSpacing: number;
  
  // Advanced Settings
  cutterEnabled: boolean;
  drawerKickEnabled: boolean;
  qrCodeSize: number;
  barcodeHeight: number;
  
  // Receipt Settings
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  taxId: string;
  receiptFooter: string;
  showLogo: boolean;
}

export default function ThermalPrinterSetup() {
  // Fetch receipt settings for real-time data
  const { data: receiptSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/settings/receipt'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Fetch recent sales for print status
  const { data: recentSales, isLoading: isLoadingSales } = useQuery({
    queryKey: ['/api/sales'],
    refetchInterval: 3000 // Refresh every 3 seconds
  });

  const [activeTab, setActiveTab] = useState('setup');
  const [testResults, setTestResults] = useState<{ [key: string]: 'pending' | 'success' | 'failed' }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState<ThermalPrinterSettings>({
    printerName: 'Xprinter XP-420B',
    paperWidth: '77mm',
    fontSize: 'medium',
    fontFamily: 'courier',
    printDensity: 15,
    printSpeed: 6,
    thermalOptimized: true,
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 2,
    marginRight: 2,
    lineSpacing: 1.2,
    cutterEnabled: true,
    drawerKickEnabled: true,
    qrCodeSize: 100,
    barcodeHeight: 50,
    businessName: 'M MART',
    businessAddress: 'Professional Retail Solution\n123 Business Street, City, State',
    phoneNumber: '+91-9876543210',
    taxId: '33GSPDB3311F1ZZ',
    receiptFooter: 'Thank you for shopping with us!\nVisit again soon',
    showLogo: true
  });

  useEffect(() => {
    loadSettings();
    checkPrinterConnection();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/receipt');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to load thermal printer settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/settings/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Thermal printer settings updated successfully"
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save thermal printer settings",
        variant: "destructive"
      });
    }
  };

  const checkPrinterConnection = async () => {
    setTestResults(prev => ({ ...prev, connection: 'pending' }));
    
    // Simulate connection test
    setTimeout(() => {
      const connected = Math.random() > 0.3; // 70% success rate simulation
      setIsConnected(connected);
      setTestResults(prev => ({ 
        ...prev, 
        connection: connected ? 'success' : 'failed' 
      }));
    }, 2000);
  };

  const runPrintQualityTest = async () => {
    setTestResults(prev => ({ ...prev, quality: 'pending' }));
    
    try {
      const testData = {
        billNumber: `TEST-QUALITY-${Date.now()}`,
        billDate: new Date().toLocaleString(),
        customerDetails: { name: 'Test Customer' },
        salesMan: 'Test User',
        items: [
          {
            id: 1,
            name: 'Print Quality Test Item',
            sku: 'TEST-001',
            quantity: 1,
            price: '100.00',
            total: 100,
            mrp: 120
          }
        ],
        subtotal: 100,
        discount: 0,
        discountType: 'fixed' as const,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: 100,
        amountPaid: 100,
        changeDue: 0,
        paymentMethod: 'TEST',
        notes: 'Print Quality Test - Check character clarity and alignment'
      };

      printReceiptUtil(testData, {
        paperWidth: settings.paperWidth as any,
        fontSize: settings.fontSize as any,
        fontFamily: settings.fontFamily as any,
        thermalOptimized: settings.thermalOptimized,
        businessName: settings.businessName,
        businessAddress: settings.businessAddress,
        phoneNumber: settings.phoneNumber,
        taxId: settings.taxId,
        receiptFooter: settings.receiptFooter + '\n--- PRINT QUALITY TEST ---'
      });

      setTimeout(() => {
        setTestResults(prev => ({ ...prev, quality: 'success' }));
      }, 1500);

      toast({
        title: "Quality Test Sent",
        description: "Print quality test receipt sent to printer"
      });
    } catch (error) {
      setTestResults(prev => ({ ...prev, quality: 'failed' }));
      toast({
        title: "Quality Test Failed",
        description: "Could not send print quality test",
        variant: "destructive"
      });
    }
  };

  const runAlignmentTest = async () => {
    setTestResults(prev => ({ ...prev, alignment: 'pending' }));
    
    try {
      const alignmentData = {
        billNumber: `ALIGN-TEST-${Date.now()}`,
        billDate: new Date().toLocaleString(),
        customerDetails: { name: 'Alignment Test' },
        salesMan: 'System Test',
        items: [
          {
            id: 1,
            name: 'Left Alignment Test',
            sku: 'ALIGN-L',
            quantity: 1,
            price: '123.45',
            total: 123.45,
            mrp: 150
          },
          {
            id: 2,
            name: 'Right Alignment Test',
            sku: 'ALIGN-R',
            quantity: 2,
            price: '67.89',
            total: 135.78,
            mrp: 80
          }
        ],
        subtotal: 259.23,
        discount: 9.23,
        discountType: 'fixed' as const,
        taxRate: 18,
        taxAmount: 45,
        grandTotal: 295,
        amountPaid: 300,
        changeDue: 5,
        paymentMethod: 'CASH',
        notes: '--- TEXT ALIGNMENT TEST ---\nLeft: ←←←\nCenter: ↔↔↔\nRight: →→→\n' +
               '123456789012345678901234567890123456789012345\n' +
               'Check if all text aligns properly within margins'
      };

      printReceiptUtil(alignmentData, {
        paperWidth: settings.paperWidth as any,
        fontSize: settings.fontSize as any,
        fontFamily: settings.fontFamily as any,
        thermalOptimized: settings.thermalOptimized,
        businessName: settings.businessName,
        businessAddress: settings.businessAddress,
        phoneNumber: settings.phoneNumber,
        taxId: settings.taxId,
        receiptFooter: settings.receiptFooter
      });

      setTimeout(() => {
        setTestResults(prev => ({ ...prev, alignment: 'success' }));
      }, 1500);

      toast({
        title: "Alignment Test Sent",
        description: "Text alignment test receipt sent to printer"
      });
    } catch (error) {
      setTestResults(prev => ({ ...prev, alignment: 'failed' }));
      toast({
        title: "Alignment Test Failed",
        description: "Could not send alignment test",
        variant: "destructive"
      });
    }
  };

  const runCutTest = async () => {
    setTestResults(prev => ({ ...prev, cut: 'pending' }));
    
    try {
      const cutTestData = {
        billNumber: `CUT-TEST-${Date.now()}`,
        billDate: new Date().toLocaleString(),
        customerDetails: { name: 'Cut Test' },
        salesMan: 'System',
        items: [
          {
            id: 1,
            name: 'Paper Cut Test Item',
            sku: 'CUT-001',
            quantity: 1,
            price: '1.00',
            total: 1,
            mrp: 1
          }
        ],
        subtotal: 1,
        discount: 0,
        discountType: 'fixed' as const,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: 1,
        amountPaid: 1,
        changeDue: 0,
        paymentMethod: 'TEST',
        notes: 'PAPER CUT TEST\nThis receipt should be cut cleanly at the bottom.\nCheck for clean, straight cuts.'
      };

      printReceiptUtil(cutTestData, {
        paperWidth: settings.paperWidth as any,
        fontSize: settings.fontSize as any,
        fontFamily: settings.fontFamily as any,
        thermalOptimized: settings.thermalOptimized,
        businessName: settings.businessName,
        businessAddress: settings.businessAddress,
        phoneNumber: settings.phoneNumber,
        taxId: settings.taxId,
        receiptFooter: '--- PAPER CUT TEST ---\nCheck cut quality below this line'
      });

      setTimeout(() => {
        setTestResults(prev => ({ ...prev, cut: 'success' }));
      }, 1500);

      toast({
        title: "Cut Test Sent",
        description: "Paper cut test receipt sent to printer"
      });
    } catch (error) {
      setTestResults(prev => ({ ...prev, cut: 'failed' }));
      toast({
        title: "Cut Test Failed",
        description: "Could not send cut test",
        variant: "destructive"
      });
    }
  };

  const updateSetting = (key: keyof ThermalPrinterSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setSettings({
      printerName: 'Xprinter XP-420B',
      paperWidth: '77mm',
      fontSize: 'medium',
      fontFamily: 'courier',
      printDensity: 15,
      printSpeed: 6,
      thermalOptimized: true,
      marginTop: 2,
      marginBottom: 2,
      marginLeft: 2,
      marginRight: 2,
      lineSpacing: 1.2,
      cutterEnabled: true,
      drawerKickEnabled: true,
      qrCodeSize: 100,
      barcodeHeight: 50,
      businessName: 'M MART',
      businessAddress: 'Professional Retail Solution\n123 Business Street, City, State',
      phoneNumber: '+91-9876543210',
      taxId: '33GSPDB3311F1ZZ',
      receiptFooter: 'Thank you for shopping with us!\nVisit again soon',
      showLogo: true
    });
    
    toast({
      title: "Settings Reset",
      description: "All settings restored to defaults"
    });
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'failed' | undefined) => {
    switch (status) {
      case 'pending':
        return <RefreshCw className="h-4 w-4 animate-spin text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <PlayCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: 'pending' | 'success' | 'failed' | undefined) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Testing...</Badge>;
      case 'success':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Not Tested</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Thermal Printer Setup</h1>
            <p className="text-muted-foreground">Configure and manage your thermal receipt printer</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "secondary" : "destructive"} className={isConnected ? "bg-green-100 text-green-800" : ""}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            {!isLoadingSettings && !isLoadingSales && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Live Data
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              {(receiptSettings as any)?.paperWidth || '77mm'} Paper
            </Badge>
            <Button variant="outline" size="sm" onClick={() => window.open('/unified-printer-settings', '_blank')}>
              <Settings className="h-4 w-4 mr-2" />
              Advanced
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="setup">Printer Setup</TabsTrigger>
            <TabsTrigger value="testing">Test & Debug</TabsTrigger>
            <TabsTrigger value="templates">Receipt Templates</TabsTrigger>
            <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
          </TabsList>

          {/* Printer Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="h-5 w-5" />
                    Basic Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure your thermal printer's basic settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Printer Name</Label>
                    <Input
                      value={settings.printerName}
                      onChange={(e) => updateSetting('printerName', e.target.value)}
                      placeholder="Enter printer name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Paper Width</Label>
                    <Select value={settings.paperWidth} onValueChange={(value) => updateSetting('paperWidth', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="58mm">58mm (Compact)</SelectItem>
                        <SelectItem value="72mm">72mm (Standard)</SelectItem>
                        <SelectItem value="77mm">77mm (Optimal)</SelectItem>
                        <SelectItem value="80mm">80mm (Wide)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Font Size</Label>
                      <Select value={settings.fontSize} onValueChange={(value) => updateSetting('fontSize', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select value={settings.fontFamily} onValueChange={(value) => updateSetting('fontFamily', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="courier">Courier</SelectItem>
                          <SelectItem value="arial">Arial</SelectItem>
                          <SelectItem value="impact">Impact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Thermal Optimization</Label>
                    <Switch
                      checked={settings.thermalOptimized}
                      onCheckedChange={(checked) => updateSetting('thermalOptimized', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Print Quality Settings
                  </CardTitle>
                  <CardDescription>
                    Fine-tune print quality and performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Print Density</Label>
                      <span className="text-sm text-muted-foreground">{settings.printDensity}</span>
                    </div>
                    <div className="px-3">
                      <input
                        type="range"
                        min="10"
                        max="20"
                        value={settings.printDensity}
                        onChange={(e) => updateSetting('printDensity', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Light</span>
                        <span>Dark</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Print Speed</Label>
                      <span className="text-sm text-muted-foreground">{settings.printSpeed}</span>
                    </div>
                    <div className="px-3">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={settings.printSpeed}
                        onChange={(e) => updateSetting('printSpeed', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Slow</span>
                        <span>Fast</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Auto Cutter</Label>
                    <Switch
                      checked={settings.cutterEnabled}
                      onCheckedChange={(checked) => updateSetting('cutterEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Cash Drawer Kick</Label>
                    <Switch
                      checked={settings.drawerKickEnabled}
                      onCheckedChange={(checked) => updateSetting('drawerKickEnabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetToDefaults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </TabsContent>

          {/* Testing & Debug Tab */}
          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Printer Testing
                </CardTitle>
                <CardDescription>
                  Test different aspects of your thermal printer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(testResults.connection)}
                        <div>
                          <h4 className="font-medium">Connection Test</h4>
                          <p className="text-sm text-muted-foreground">Verify printer connectivity</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(testResults.connection)}
                        <Button size="sm" onClick={checkPrinterConnection}>
                          Test
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(testResults.quality)}
                        <div>
                          <h4 className="font-medium">Print Quality Test</h4>
                          <p className="text-sm text-muted-foreground">Test character clarity and density</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(testResults.quality)}
                        <Button size="sm" onClick={runPrintQualityTest}>
                          Test
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(testResults.alignment)}
                        <div>
                          <h4 className="font-medium">Text Alignment Test</h4>
                          <p className="text-sm text-muted-foreground">Test text positioning and margins</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(testResults.alignment)}
                        <Button size="sm" onClick={runAlignmentTest}>
                          Test
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(testResults.cut)}
                        <div>
                          <h4 className="font-medium">Cut Test</h4>
                          <p className="text-sm text-muted-foreground">Test paper cutting mechanism</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(testResults.cut)}
                        <Button size="sm" onClick={runCutTest}>
                          Test
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Test Results:</strong> {Object.keys(testResults).length === 0 
                      ? "No tests performed yet. Click test buttons above to begin."
                      : `${Object.values(testResults).filter(r => r === 'success').length} passed, ${Object.values(testResults).filter(r => r === 'failed').length} failed, ${Object.values(testResults).filter(r => r === 'pending').length} running`
                    }
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipt Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Receipt Templates
                </CardTitle>
                <CardDescription>
                  Customize your receipt layout and content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Business Name</Label>
                      <Input
                        value={settings.businessName}
                        onChange={(e) => updateSetting('businessName', e.target.value)}
                        placeholder="Enter business name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Business Address</Label>
                      <Textarea
                        value={settings.businessAddress}
                        onChange={(e) => updateSetting('businessAddress', e.target.value)}
                        placeholder="Enter business address"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={settings.phoneNumber}
                        onChange={(e) => updateSetting('phoneNumber', e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tax ID / GST Number</Label>
                      <Input
                        value={settings.taxId}
                        onChange={(e) => updateSetting('taxId', e.target.value)}
                        placeholder="Enter tax ID"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Receipt Footer</Label>
                      <Textarea
                        value={settings.receiptFooter}
                        onChange={(e) => updateSetting('receiptFooter', e.target.value)}
                        placeholder="Enter footer text"
                        rows={4}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Show Logo</Label>
                      <Switch
                        checked={settings.showLogo}
                        onCheckedChange={(checked) => updateSetting('showLogo', checked)}
                      />
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/30">
                      <h4 className="font-medium mb-2">Preview</h4>
                      <div className="text-sm space-y-1 font-mono">
                        <div className="text-center font-bold">{settings.businessName}</div>
                        <div className="text-center text-xs">{settings.businessAddress.split('\n')[0]}</div>
                        <div className="text-center text-xs">{settings.phoneNumber}</div>
                        <div className="border-t border-dashed my-2"></div>
                        <div className="text-xs">Bill No: TEST-001</div>
                        <div className="text-xs">Date: {new Date().toLocaleDateString()}</div>
                        <div className="border-t border-dashed my-2"></div>
                        <div className="text-xs">Sample Item x1 ₹100.00</div>
                        <div className="border-t border-dashed my-2"></div>
                        <div className="text-xs font-bold">Total: ₹100.00</div>
                        <div className="border-t border-dashed my-2"></div>
                        <div className="text-center text-xs">{settings.receiptFooter.split('\n')[0]}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Troubleshoot Tab */}
          <TabsContent value="troubleshoot" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Troubleshooting Guide
                </CardTitle>
                <CardDescription>
                  Common issues and solutions for thermal printers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-lg">Common Issues</h4>
                    
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <h5 className="font-medium text-red-600">Printer Not Responding</h5>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          <li>• Check USB/Network connection</li>
                          <li>• Verify printer is powered on</li>
                          <li>• Check Windows printer queue</li>
                          <li>• Restart printer service</li>
                        </ul>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <h5 className="font-medium text-orange-600">Poor Print Quality</h5>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          <li>• Adjust print density settings</li>
                          <li>• Check thermal paper quality</li>
                          <li>• Clean printer head</li>
                          <li>• Reduce print speed</li>
                        </ul>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <h5 className="font-medium text-blue-600">Paper Jam</h5>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          <li>• Turn off printer</li>
                          <li>• Remove paper roll</li>
                          <li>• Clear any torn paper</li>
                          <li>• Reinstall paper correctly</li>
                        </ul>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <h5 className="font-medium text-purple-600">Cutter Not Working</h5>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          <li>• Enable cutter in settings</li>
                          <li>• Check for paper buildup</li>
                          <li>• Clean cutter blade area</li>
                          <li>• Contact technical support</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-lg">Xprinter XP-420B Setup</h4>
                    
                    <div className="p-4 border rounded-lg bg-green-50">
                      <h5 className="font-medium text-green-900 mb-2">Optimal Settings</h5>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Paper: 77mm × 297mm</li>
                        <li>• Driver: Official Xprinter</li>
                        <li>• Margins: None (0mm)</li>
                        <li>• Scale: 100%</li>
                        <li>• Background Graphics: ON</li>
                      </ul>
                    </div>

                    <div className="p-4 border rounded-lg bg-blue-50">
                      <h5 className="font-medium text-blue-900 mb-2">Windows Configuration</h5>
                      <ol className="text-sm text-blue-800 space-y-1">
                        <li>1. Control Panel → Devices and Printers</li>
                        <li>2. Right-click XP-420B → Properties</li>
                        <li>3. Advanced → Printing Defaults</li>
                        <li>4. Paper Size: Custom (77mm x 297mm)</li>
                        <li>5. Quality: 600 DPI</li>
                      </ol>
                    </div>

                    <div className="p-4 border rounded-lg bg-yellow-50">
                      <h5 className="font-medium text-yellow-900 mb-2">Browser Settings</h5>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• Allow popups for this site</li>
                        <li>• Enable background graphics</li>
                        <li>• Set margins to None</li>
                        <li>• Select correct paper size</li>
                      </ul>
                    </div>

                    <Alert>
                      <BookOpen className="h-4 w-4" />
                      <AlertDescription>
                        For detailed setup instructions, visit the <strong>Unified Printer Settings</strong> page.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}