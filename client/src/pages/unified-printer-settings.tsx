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
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { generateEnhancedThermalReceiptHTML } from '@/components/pos/print-receipt';
import { useQuery } from "@tanstack/react-query";
import {
  Settings,
  Printer,
  Zap,
  TestTube,
  Store,
  Receipt,
  FileText,
  Save,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertTriangle,
  Info,
  BookOpen,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  HelpCircle,
  Activity
} from 'lucide-react';

interface PrinterSettings {
  // Business Settings
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  taxId: string;
  logoUrl: string;

  // Receipt Settings
  receiptFooter: string;
  paperWidth: string;
  showLogo: boolean;
  autoPrint: boolean;
  showCustomerDetails: boolean;
  showItemSKU: boolean;
  showMRP: boolean;
  showSavings: boolean;
  showLoyaltyPoints: boolean;
  headerStyle: string;
  boldTotals: boolean;
  separatorStyle: string;
  thermalOptimized: boolean;
  fontSize: string;
  fontFamily: string;

  // Auto-Printer Settings
  enableAutoPrint: boolean;
  printDelay: number;
  retryAttempts: number;
  printCustomerCopy: boolean;
  printMerchantCopy: boolean;
  autoOpenCashDrawer: boolean;
  quietMode: boolean;

  // Print Triggers
  printOnSale: boolean;
  printOnReturn: boolean;
}

export default function UnifiedPrinterSettings() {
  // Fetch receipt settings for real-time data
  const { data: receiptSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/settings/receipt'],
    refetchInterval: 2000 // Refresh every 2 seconds for real-time feel
  });

  // Fetch recent sales for print queue simulation
  const { data: recentSales, isLoading: isLoadingSales } = useQuery({
    queryKey: ['/api/sales'],
    refetchInterval: 2000 // Refresh every 2 seconds for real-time feel
  });

  const [settings, setSettings] = useState<PrinterSettings>({
    // Business Settings
    businessName: 'M MART',
    businessAddress: '123 Business Street, City, State',
    phoneNumber: '+91-9876543210',
    taxId: '33GSPDB3311F1ZZ',
    logoUrl: '',

    // Receipt Settings
    receiptFooter: 'Thank you for shopping with us!',
    paperWidth: '77mm',
    showLogo: true,
    autoPrint: true,
    showCustomerDetails: true,
    showItemSKU: true,
    showMRP: true,
    showSavings: true,
    showLoyaltyPoints: true,
    headerStyle: 'centered',
    boldTotals: true,
    separatorStyle: 'solid',
    thermalOptimized: true,
    fontSize: 'medium',
    fontFamily: 'courier',

    // Auto-Printer Settings
    enableAutoPrint: true,
    printDelay: 2,
    retryAttempts: 3,
    printCustomerCopy: true,
    printMerchantCopy: true,
    autoOpenCashDrawer: true,
    quietMode: false,

    // Print Triggers
    printOnSale: true,
    printOnReturn: true
  });

  const [autoPrinterStatus, setAutoPrinterStatus] = useState('active');
  const [printQueue, setPrintQueue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate real-time stats
  const todaysSales = recentSales ? recentSales.filter((sale: any) => {
    const saleDate = new Date(sale.createdAt);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  }).length : 0;

  const totalRevenue = recentSales ? recentSales.reduce((sum: number, sale: any) => {
    const saleDate = new Date(sale.createdAt);
    const today = new Date();
    if (saleDate.toDateString() === today.toDateString()) {
      return sum + (parseFloat(sale.total) || 0);
    }
    return sum;
  }, 0) : 0;

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load settings from backend API
      const response = await fetch('/api/settings/receipt');
      if (response.ok) {
        const backendSettings = await response.json();

        setSettings(prev => ({
          ...prev,
          businessName: backendSettings.businessName || prev.businessName,
          businessAddress: backendSettings.businessAddress || prev.businessAddress,
          phoneNumber: backendSettings.phoneNumber || prev.phoneNumber,
          taxId: backendSettings.taxId || prev.taxId,
          logoUrl: backendSettings.logoUrl || prev.logoUrl,
          receiptFooter: backendSettings.receiptFooter || prev.receiptFooter,
          paperWidth: backendSettings.paperWidth || prev.paperWidth,
          showLogo: backendSettings.showLogo !== undefined ? backendSettings.showLogo : prev.showLogo,
          autoPrint: backendSettings.autoPrint !== undefined ? backendSettings.autoPrint : prev.autoPrint,
          showCustomerDetails: backendSettings.showCustomerDetails !== undefined ? backendSettings.showCustomerDetails : prev.showCustomerDetails,
          showItemSKU: backendSettings.showItemSKU !== undefined ? backendSettings.showItemSKU : prev.showItemSKU,
          showMRP: backendSettings.showMRP !== undefined ? backendSettings.showMRP : prev.showMRP,
          showSavings: backendSettings.showSavings !== undefined ? backendSettings.showSavings : prev.showSavings,
          showLoyaltyPoints: backendSettings.showLoyaltyPoints !== undefined ? backendSettings.showLoyaltyPoints : prev.showLoyaltyPoints,
          headerStyle: backendSettings.headerStyle || prev.headerStyle,
          boldTotals: backendSettings.boldTotals !== undefined ? backendSettings.boldTotals : prev.boldTotals,
          separatorStyle: backendSettings.separatorStyle || prev.separatorStyle,
          thermalOptimized: backendSettings.thermalOptimized !== undefined ? backendSettings.thermalOptimized : prev.thermalOptimized,
          fontSize: backendSettings.fontSize || prev.fontSize,
          fontFamily: backendSettings.fontFamily || prev.fontFamily
        }));
      }

      // Load auto-printer settings from localStorage
      const autoPrinterSettings = localStorage.getItem('autoPrinterSettings');
      if (autoPrinterSettings) {
        const parsed = JSON.parse(autoPrinterSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    return await saveSettingsWithData(settings);
  };

  const saveSettingsWithData = async (settingsData: PrinterSettings) => {
    setIsSaving(true);
    try {
      console.log('💾 Saving printer settings:', settingsData);

      // Save receipt settings to backend
      const receiptResponse = await fetch('/api/settings/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });

      console.log('📊 Receipt settings save response:', receiptResponse.status, receiptResponse.statusText);

      if (receiptResponse.ok) {
        // Save auto-printer settings to localStorage
        localStorage.setItem('autoPrinterSettings', JSON.stringify({
          enableAutoPrint: settingsData.enableAutoPrint,
          printDelay: settingsData.printDelay,
          retryAttempts: settingsData.retryAttempts,
          printCustomerCopy: settingsData.printCustomerCopy,
          printMerchantCopy: settingsData.printMerchantCopy,
          autoOpenCashDrawer: settingsData.autoOpenCashDrawer,
          quietMode: settingsData.quietMode,
          printOnSale: settingsData.printOnSale,
          printOnReturn: settingsData.printOnReturn
        }));

        toast({
          title: "Settings Saved",
          description: "All printer settings have been updated successfully."
        });
      } else {
        const errorText = await receiptResponse.text();
        console.error('🚨 Failed to save receipt settings:', receiptResponse.status, errorText);
        throw new Error(`Failed to save settings: ${receiptResponse.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        updateSetting('logoUrl', dataUrl);
        
        // Auto-save the settings when logo is uploaded
        try {
          await saveSettings();
          toast({
            title: "Logo uploaded and saved",
            description: "Business logo has been updated and saved successfully"
          });
        } catch (saveError) {
          console.error('Error saving logo:', saveError);
          toast({
            title: "Logo uploaded but not saved",
            description: "Logo updated but failed to save. Please click Save Settings.",
            variant: "destructive"
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive"
      });
    }
  };

  const testPrint = async () => {
    try {
      const testReceiptData = {
        orderNumber: `TEST-${Date.now()}`,
        createdAt: new Date().toISOString(),
        user: { name: 'Admin User', id: 1 },
        customer: { name: 'Test Customer', id: 1 },
        items: [
          {
            productName: 'Test Product',
            productSku: 'TEST001',
            quantity: 1,
            unitPrice: 100,
            subtotal: 100,
            price: 100,
            total: 100
          }
        ],
        total: 100,
        discount: 0,
        tax: 0,
        paymentMethod: 'CASH',
        status: 'completed'
      };

      const { printReceipt } = await import('@/components/pos/print-receipt');
      await printReceipt(testReceiptData, settings);

      toast({
        title: "Test Print Sent",
        description: "Test receipt has been sent to printer"
      });
    } catch (error) {
      toast({
        title: "Test Print Failed",
        description: "Could not send test print. Check printer connection.",
        variant: "destructive"
      });
    }
  };

  const resetSettings = () => {
    setSettings({
      businessName: 'M MART',
      businessAddress: '123 Business Street, City, State',
      phoneNumber: '+91-9876543210',
      taxId: '33GSPDB3311F1ZZ',
      receiptFooter: 'Thank you for shopping with us!',
      paperWidth: '77mm',
      showLogo: true,
      autoPrint: true,
      showCustomerDetails: true,
      showItemSKU: true,
      showMRP: true,
      showSavings: true,
      showLoyaltyPoints: true,
      headerStyle: 'centered',
      boldTotals: true,
      separatorStyle: 'solid',
      thermalOptimized: true,
      fontSize: 'medium',
      fontFamily: 'courier',
      enableAutoPrint: true,
      printDelay: 2,
      retryAttempts: 3,
      printCustomerCopy: true,
      printMerchantCopy: true,
      autoOpenCashDrawer: true,
      quietMode: false,
      printOnSale: true,
      printOnReturn: true
    });

    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults"
    });
  };

  const updateSetting = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Auto-save for certain critical settings like logo
    if (key === 'logoUrl' || key === 'businessName' || key === 'showLogo') {
      // Save immediately with the new settings
      await saveSettingsWithData(newSettings);
    }
  };

  const activateAutoPrinter = () => {
    setAutoPrinterStatus('active');
    toast({
      title: "Auto-Printer Activated",
      description: "Automatic printing is now enabled"
    });
  };

  const deactivateAutoPrinter = () => {
    setAutoPrinterStatus('inactive');
    toast({
      title: "Auto-Printer Deactivated",
      description: "Automatic printing has been disabled"
    });
  };

  const clearQueue = () => {
    setPrintQueue(0);
    toast({
      title: "Queue Cleared",
      description: "Print queue has been cleared"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Printer Settings</h1>
            <p className="text-muted-foreground">
              Configure all printing settings in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={testPrint}>
              <TestTube className="h-4 w-4 mr-2" />
              Test Print
            </Button>
            <Button variant="outline" onClick={resetSettings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={saveSettings} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        </div>

        {/* Real-time Status Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                  <p className="text-2xl font-bold text-blue-600">{todaysSales}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paper Width</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {settings.paperWidth}
                  </p>
                </div>
                <Settings className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Auto-Print</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {settings.enableAutoPrint ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <Zap className={`w-8 h-8 ${settings.enableAutoPrint ? 'text-orange-500' : 'text-gray-400'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="autoprinter" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="autoprinter" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Auto-Printer
            </TabsTrigger>
            <TabsTrigger value="thermal" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Thermal Printer
            </TabsTrigger>
            <TabsTrigger value="receipt" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Receipt
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="troubleshoot" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Help
            </TabsTrigger>
          </TabsList>

          {/* Auto-Printer Tab */}
          <TabsContent value="autoprinter" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Auto-Printer Status
                    </CardTitle>
                    <CardDescription>
                      Automatic receipt printing system | Queue: {printQueue} items
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(autoPrinterStatus)}
                    <Button 
                      variant={autoPrinterStatus === 'active' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={autoPrinterStatus === 'active' ? deactivateAutoPrinter : activateAutoPrinter}
                    >
                      {autoPrinterStatus === 'active' ? (
                        <>
                          <PauseCircle className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Activate Auto-Printer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableAutoPrint">Enable Auto-Printing</Label>
                      <Switch
                        id="enableAutoPrint"
                        checked={settings.enableAutoPrint}
                        onCheckedChange={(checked) => updateSetting('enableAutoPrint', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Print Delay (seconds): {settings.printDelay}</Label>
                      <Slider
                        value={[settings.printDelay]}
                        onValueChange={([value]) => updateSetting('printDelay', value)}
                        max={10}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Retry Attempts: {settings.retryAttempts}</Label>
                      <Slider
                        value={[settings.retryAttempts]}
                        onValueChange={([value]) => updateSetting('retryAttempts', value)}
                        max={5}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="printCustomerCopy">Print Customer Copy</Label>
                      <Switch
                        id="printCustomerCopy"
                        checked={settings.printCustomerCopy}
                        onCheckedChange={(checked) => updateSetting('printCustomerCopy', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="printMerchantCopy">Print Merchant Copy</Label>
                      <Switch
                        id="printMerchantCopy"
                        checked={settings.printMerchantCopy}
                        onCheckedChange={(checked) => updateSetting('printMerchantCopy', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoOpenCashDrawer">Auto Open Cash Drawer</Label>
                      <Switch
                        id="autoOpenCashDrawer"
                        checked={settings.autoOpenCashDrawer}
                        onCheckedChange={(checked) => updateSetting('autoOpenCashDrawer', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="quietMode">Quiet Mode (No Notifications)</Label>
                      <Switch
                        id="quietMode"
                        checked={settings.quietMode}
                        onCheckedChange={(checked) => updateSetting('quietMode', checked)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-4">Print Triggers</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="printOnSale">Print on Sale</Label>
                      <Switch
                        id="printOnSale"
                        checked={settings.printOnSale}
                        onCheckedChange={(checked) => updateSetting('printOnSale', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="printOnReturn">Print on Return</Label>
                      <Switch
                        id="printOnReturn"
                        checked={settings.printOnReturn}
                        onCheckedChange={(checked) => updateSetting('printOnReturn', checked)}
                      />
                    </div>
                  </div>
                </div>

                {printQueue > 0 && (
                  <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-orange-900">Print Queue</h4>
                      <p className="text-sm text-orange-700">{printQueue} items waiting to print</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearQueue}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Clear Queue
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Thermal Printer Tab */}
          <TabsContent value="thermal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Thermal Printer Configuration
                </CardTitle>
                <CardDescription>
                  Configure your thermal receipt printer settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="paperWidth">Paper Width</Label>
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

                    <div className="space-y-2">
                      <Label htmlFor="fontSize">Font Size</Label>
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
                      <Label htmlFor="fontFamily">Font Family</Label>
                      <Select value={settings.fontFamily} onValueChange={(value) => updateSetting('fontFamily', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="courier">Courier</SelectItem>
                          <SelectItem value="arial">Arial</SelectItem>
                          <SelectItem value="helvetica">Helvetica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="thermalOptimized">Thermal Optimized</Label>
                      <Switch
                        id="thermalOptimized"
                        checked={settings.thermalOptimized}
                        onCheckedChange={(checked) => updateSetting('thermalOptimized', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="boldTotals">Bold Totals</Label>
                      <Switch
                        id="boldTotals"
                        checked={settings.boldTotals}
                        onCheckedChange={(checked) => updateSetting('boldTotals', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="headerStyle">Header Style</Label>
                      <Select value={settings.headerStyle} onValueChange={(value) => updateSetting('headerStyle', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left Aligned</SelectItem>
                          <SelectItem value="centered">Centered</SelectItem>
                          <SelectItem value="right">Right Aligned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="separatorStyle">Separator Style</Label>
                      <Select value={settings.separatorStyle} onValueChange={(value) => updateSetting('separatorStyle', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid Line</SelectItem>
                          <SelectItem value="dashed">Dashed Line</SelectItem>
                          <SelectItem value="dotted">Dotted Line</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Xprinter XP-420B Configuration Guide</CardTitle>
                <CardDescription>
                  Optimal settings for Xprinter XP-420B thermal receipt printer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Step-by-Step Configuration</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div><strong>1. Set Custom Paper Size:</strong></div>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Control Panel → Devices and Printers</li>
                      <li>Right-click Xprinter XP-420B → Printing Preferences</li>
                      <li>Advanced/Page Setup → Width: 77mm, Height: 297mm</li>
                      <li>Save as "Thermal Receipt"</li>
                    </ul>

                    <div className="mt-3"><strong>2. Print Dialog Settings:</strong></div>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>More Settings → Margins: None</li>
                      <li>Background Graphics: Enabled</li>
                      <li>Scale: 100%</li>
                      <li>Paper Size: 77mm x Receipt</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3 bg-green-50">
                    <h4 className="font-medium text-sm text-green-900">Correct Settings</h4>
                    <ul className="text-sm text-green-800 mt-1 space-y-1">
                      <li>• Paper: 77mm × 297mm</li>
                      <li>• Margins: None (0mm)</li>
                      <li>• Scale: 100%</li>
                      <li>• Background Graphics: ON</li>
                      <li>• Driver: Official Xprinter</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-3 bg-red-50">
                    <h4 className="font-medium text-sm text-red-900">Common Issues</h4>
                    <ul className="text-sm text-red-800 mt-1 space-y-1">
                      <li>• Wrong paper size (A4/Letter)</li>
                      <li>• Large margins cutting content</li>
                      <li>• Scale not 100%</li>
                      <li>• Background graphics disabled</li>
                      <li>• Generic/wrong driver</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipt Tab */}
          <TabsContent value="receipt" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Receipt Layout & Content
                </CardTitle>
                <CardDescription>
                  Configure what appears on your receipts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="receiptFooter">Footer Text</Label>
                      <Textarea
                        id="receiptFooter"
                        value={settings.receiptFooter}
                        onChange={(e) => updateSetting('receiptFooter', e.target.value)}
                        placeholder="Thank you for shopping with us!"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showLogo">Show Business Logo</Label>
                      <Switch
                        id="showLogo"
                        checked={settings.showLogo}
                        onCheckedChange={(checked) => updateSetting('showLogo', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="showCustomerDetails">Show Customer Details</Label>
                      <Switch
                        id="showCustomerDetails"
                        checked={settings.showCustomerDetails}
                        onCheckedChange={(checked) => updateSetting('showCustomerDetails', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="showItemSKU">Show Item SKU</Label>
                      <Switch
                        id="showItemSKU"
                        checked={settings.showItemSKU}
                        onCheckedChange={(checked) => updateSetting('showItemSKU', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="showMRP">Show MRP</Label>
                      <Switch
                        id="showMRP"
                        checked={settings.showMRP}
                        onCheckedChange={(checked) => updateSetting('showMRP', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="showSavings">Show Savings</Label>
                      <Switch
                        id="showSavings"
                        checked={settings.showSavings}
                        onCheckedChange={(checked) => updateSetting('showSavings', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showLoyaltyPoints">Show Loyalty Points</Label>
                      <Switch
                        id="showLoyaltyPoints"
                        checked={settings.showLoyaltyPoints}
                        onCheckedChange={(checked) => updateSetting('showLoyaltyPoints', checked)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-center">
                  <Button variant="outline" onClick={testPrint}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Tab */}
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Update your business details for receipts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={settings.businessName}
                        onChange={(e) => updateSetting('businessName', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessAddress">Business Address</Label>
                      <Textarea
                        id="businessAddress"
                        value={settings.businessAddress}
                        onChange={(e) => updateSetting('businessAddress', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logoUpload">Business Logo</Label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <Input
                            id="logoUpload"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('logoUpload')?.click()}
                          >
                            Choose Image
                          </Button>
                        </div>
                        
                        {settings.logoUrl && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <img
                              src={settings.logoUrl}
                              alt="Business Logo"
                              className="w-12 h-12 object-contain border rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-700">Logo Preview</p>
                              <p className="text-xs text-gray-500">This logo will appear on receipts</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                updateSetting('logoUrl', '');
                                toast({
                                  title: "Logo removed",
                                  description: "Business logo has been cleared"
                                });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                        
                        {!settings.logoUrl && (
                          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="w-12 h-12 bg-blue-100 rounded border-2 border-dashed border-blue-300 flex items-center justify-center">
                              <Store className="w-6 h-6 text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-700">No logo uploaded</p>
                              <p className="text-xs text-blue-600">Upload a logo to display on receipts</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Create a sample logo using SVG data URL
                                const sampleLogo = `data:image/svg+xml;base64,${btoa(`
                                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
                                    <rect width="120" height="40" fill="#2563eb" rx="4"/>
                                    <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">M MART</text>
                                  </svg>
                                `)}`;
                                updateSetting('logoUrl', sampleLogo);
                                toast({
                                  title: "Sample logo added",
                                  description: "Sample M MART logo has been set. Upload your own logo to replace it."
                                });
                              }}
                            >
                              Use Sample Logo
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={settings.phoneNumber}
                        onChange={(e) => updateSetting('phoneNumber', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxId">GST Number</Label>
                      <Input
                        id="taxId"
                        value={settings.taxId}
                        onChange={(e) => updateSetting('taxId', e.target.value)}
                      />
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
                <CardTitle>Common Issues & Solutions</CardTitle>
                <CardDescription>
                  Troubleshoot printer problems
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-l-4 border-orange-400 pl-4">
                  <h4 className="font-medium text-orange-800">Auto-printer not activating</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Check if thermal printer is connected and configured properly
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                    <li>Verify thermal printer connection</li>
                    <li>Check auto-printer enabled setting</li>
                    <li>Ensure print triggers are configured</li>
                  </ul>
                </div>

                <div className="border-l-4 border-red-400 pl-4">
                  <h4 className="font-medium text-red-800">Prints failing consistently</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Print jobs are failing and not retrying successfully
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                    <li>Check thermal printer driver installation</li>
                    <li>Verify paper is loaded correctly</li>
                    <li>Increase retry attempts and delay</li>
                    <li>Check printer cable connections</li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-400 pl-4">
                  <h4 className="font-medium text-blue-800">Queue not processing</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Items are added to queue but not being processed
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                    <li>Check if auto-printer is activated</li>
                    <li>Verify printer queue setting is enabled</li>
                    <li>Clear queue and restart</li>
                    <li>Check browser console for errors</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-400 pl-4">
                  <h4 className="font-medium text-green-800">Performance optimization</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Optimize auto-printer for high-volume environments
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                    <li>Enable quiet mode to reduce notifications</li>
                    <li>Adjust print delay for optimal speed</li>
                    <li>Use single copy printing when possible</li>
                    <li>Monitor queue size during busy periods</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reset & Recovery</CardTitle>
                <CardDescription>
                  Emergency recovery options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      localStorage.removeItem('autoPrinterSettings');
                      localStorage.removeItem('receiptSettings');
                      window.location.reload();
                    }}
                  >
                    Reset All Settings
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if ((window as any).autoPrinterAddToQueue) {
                        toast({
                          title: "Auto-Printer Active",
                          description: "Auto-printer integration is working correctly"
                        });
                      } else {
                        toast({
                          title: "Integration Issue",
                          description: "Auto-printer integration is not active",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Test Integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}