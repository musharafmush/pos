
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { 
  Printer, 
  Eye, 
  Download, 
  Save, 
  Settings, 
  FileText, 
  Palette,
  Zap,
  RefreshCw,
  Upload,
  TestTube
} from "lucide-react";
import { printReceipt, type ReceiptCustomization } from "@/components/pos/print-receipt";

export default function PrinterReceiptEditor() {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<ReceiptCustomization>({
    businessName: 'M MART',
    businessAddress: '47,SHOP NO.1&2,\nTHANDARAMPATTU MAIN ROAD,\nSAMUTHIRAM VILLAGE,\nTIRUVANNAMALAI-606603',
    phoneNumber: '+91-9876543210',
    email: 'info@mmart.com',
    taxId: '33QIWPS9348F1Z2',
    receiptFooter: 'Thank you for shopping with us!\nVisit again soon\nCustomer Care: support@mmart.com',
    showLogo: false,
    autoPrint: true,
    paperWidth: 'thermal80',
    fontSize: 'medium',
    fontFamily: 'courier',
    headerStyle: 'centered',
    showCustomerDetails: true,
    showItemSKU: true,
    showMRP: true,
    showSavings: true,
    showBarcode: false,
    showQRCode: false,
    headerBackground: true,
    boldTotals: true,
    separatorStyle: 'solid',
    showTermsConditions: false,
    termsConditions: 'All sales are final. No returns without receipt.',
    showReturnPolicy: false,
    returnPolicy: '7 days return policy. Terms apply.',
    language: 'english',
    currencySymbol: '₹',
    thermalOptimized: true,
    printDensity: 'medium',
    autoCut: true,
    lineSpacing: 'tight',
    characterEncoding: 'utf8',
    charactersPerLine: 48,
    marginLeft: 2,
    marginRight: 2,
    logoHeight: 50,
    website: 'www.mmart.com',
    returnPolicyText: '7 days return policy with original receipt'
  });

  const [printerSettings, setPrinterSettings] = useState({
    defaultPrinter: 'thermal',
    printSpeed: 'medium',
    paperDetection: true,
    autoReconnect: true,
    printQuality: 'high',
    buzzerSound: true
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('receiptSettings');
    const savedPrinterSettings = localStorage.getItem('printerSettings');
    
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading receipt settings:', error);
      }
    }

    if (savedPrinterSettings) {
      try {
        const parsed = JSON.parse(savedPrinterSettings);
        setPrinterSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading printer settings:', error);
      }
    }
  }, []);

  const saveAllSettings = () => {
    try {
      localStorage.setItem('receiptSettings', JSON.stringify(settings));
      localStorage.setItem('printerSettings', JSON.stringify(printerSettings));
      toast({
        title: "✅ Settings Saved Successfully",
        description: "All printer and receipt settings have been saved",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "❌ Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const testPrint = () => {
    const testData = {
      billNumber: `TEST${Date.now()}`,
      billDate: new Date().toLocaleDateString('en-IN'),
      customerDetails: {
        name: 'Test Customer',
        doorNo: '+91-9876543210'
      },
      salesMan: 'Test Cashier',
      items: [
        {
          id: 1,
          name: 'Test Product 1',
          sku: 'TEST001',
          quantity: 2,
          price: '50.00',
          total: 100.00,
          mrp: 60.00
        },
        {
          id: 2,
          name: 'Test Product 2',
          sku: 'TEST002',
          quantity: 1,
          price: '25.00',
          total: 25.00,
          mrp: 30.00
        }
      ],
      subtotal: 125.00,
      discount: 5.00,
      discountType: 'fixed' as const,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: 120.00,
      amountPaid: 120.00,
      changeDue: 0,
      paymentMethod: 'CASH',
      notes: 'Test receipt for printer configuration'
    };

    printReceipt(testData, settings);
    toast({
      title: "🖨️ Test Print Sent",
      description: "Check your printer for the test receipt",
    });
  };

  const applyTemplate = (templateName: string) => {
    const templates = {
      professional: {
        paperWidth: 'thermal80' as const,
        fontSize: 'medium' as const,
        fontFamily: 'courier' as const,
        headerStyle: 'centered' as const,
        headerBackground: true,
        boldTotals: true,
        separatorStyle: 'solid' as const,
        thermalOptimized: true,
        printDensity: 'medium' as const,
        charactersPerLine: 48
      },
      compact: {
        paperWidth: 'thermal58' as const,
        fontSize: 'small' as const,
        fontFamily: 'courier' as const,
        headerStyle: 'centered' as const,
        headerBackground: false,
        boldTotals: false,
        separatorStyle: 'dashed' as const,
        thermalOptimized: true,
        printDensity: 'high' as const,
        charactersPerLine: 32
      },
      premium: {
        paperWidth: 'thermal80' as const,
        fontSize: 'large' as const,
        fontFamily: 'impact' as const,
        headerStyle: 'centered' as const,
        headerBackground: true,
        boldTotals: true,
        separatorStyle: 'solid' as const,
        thermalOptimized: true,
        printDensity: 'high' as const,
        charactersPerLine: 48
      }
    };

    const template = templates[templateName as keyof typeof templates];
    if (template) {
      setSettings(prev => ({ ...prev, ...template }));
      toast({
        title: "📋 Template Applied",
        description: `${templateName.charAt(0).toUpperCase() + templateName.slice(1)} template has been applied`,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Printer className="h-8 w-8 text-blue-600" />
              Printer & Receipt Editor
            </h1>
            <p className="text-gray-600 mt-2">
              Complete printer setup and receipt customization for your POS system
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={testPrint}>
              <TestTube className="h-4 w-4 mr-2" />
              Test Print
            </Button>
            <Button onClick={saveAllSettings}>
              <Save className="h-4 w-4 mr-2" />
              Save All Settings
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="printer" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="printer">
                  <Printer className="h-4 w-4 mr-1" />
                  Printer
                </TabsTrigger>
                <TabsTrigger value="receipt">
                  <FileText className="h-4 w-4 mr-1" />
                  Receipt
                </TabsTrigger>
                <TabsTrigger value="layout">
                  <Palette className="h-4 w-4 mr-1" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="content">
                  <Settings className="h-4 w-4 mr-1" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="templates">
                  <Zap className="h-4 w-4 mr-1" />
                  Templates
                </TabsTrigger>
              </TabsList>

              {/* Printer Settings */}
              <TabsContent value="printer" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>🖨️ Thermal Printer Configuration</CardTitle>
                    <CardDescription>
                      Configure your thermal printer for optimal receipt printing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="paperWidth">Paper Size</Label>
                        <Select 
                          value={settings.paperWidth} 
                          onValueChange={(value: any) => {
                            const charsPerLine = value === 'thermal58' ? 32 : value === 'thermal80' ? 48 : 80;
                            setSettings(prev => ({ ...prev, paperWidth: value, charactersPerLine: charsPerLine }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="thermal58">58mm (32 chars)</SelectItem>
                            <SelectItem value="thermal80">80mm (48 chars)</SelectItem>
                            <SelectItem value="thermal112">112mm (64 chars)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="defaultPrinter">Default Printer</Label>
                        <Select 
                          value={printerSettings.defaultPrinter}
                          onValueChange={(value) => setPrinterSettings(prev => ({ ...prev, defaultPrinter: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="thermal">Thermal Receipt Printer</SelectItem>
                            <SelectItem value="default">System Default</SelectItem>
                            <SelectItem value="network">Network Printer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="printDensity">Print Density</Label>
                        <Select 
                          value={settings.printDensity || 'medium'} 
                          onValueChange={(value: any) => setSettings(prev => ({ ...prev, printDensity: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Light</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">Dark</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="printSpeed">Print Speed</Label>
                        <Select 
                          value={printerSettings.printSpeed}
                          onValueChange={(value) => setPrinterSettings(prev => ({ ...prev, printSpeed: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slow">Slow (High Quality)</SelectItem>
                            <SelectItem value="medium">Medium (Balanced)</SelectItem>
                            <SelectItem value="fast">Fast (Quick Print)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="autoCut">Auto Cut Paper</Label>
                        <Switch 
                          id="autoCut" 
                          checked={settings.autoCut !== false}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCut: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="autoPrint">Auto Print After Sale</Label>
                        <Switch 
                          id="autoPrint" 
                          checked={settings.autoPrint}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoPrint: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="paperDetection">Paper Detection</Label>
                        <Switch 
                          id="paperDetection" 
                          checked={printerSettings.paperDetection}
                          onCheckedChange={(checked) => setPrinterSettings(prev => ({ ...prev, paperDetection: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="buzzerSound">Buzzer Sound</Label>
                        <Switch 
                          id="buzzerSound" 
                          checked={printerSettings.buzzerSound}
                          onCheckedChange={(checked) => setPrinterSettings(prev => ({ ...prev, buzzerSound: checked }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="charactersPerLine">Characters Per Line</Label>
                        <Input 
                          id="charactersPerLine" 
                          type="number"
                          min="20"
                          max="80"
                          value={settings.charactersPerLine || 48}
                          onChange={(e) => setSettings(prev => ({ ...prev, charactersPerLine: parseInt(e.target.value) || 48 }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="marginLeft">Left Margin (mm)</Label>
                        <Input 
                          id="marginLeft" 
                          type="number"
                          min="0"
                          max="10"
                          value={settings.marginLeft || 2}
                          onChange={(e) => setSettings(prev => ({ ...prev, marginLeft: parseInt(e.target.value) || 2 }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="marginRight">Right Margin (mm)</Label>
                        <Input 
                          id="marginRight" 
                          type="number"
                          min="0"
                          max="10"
                          value={settings.marginRight || 2}
                          onChange={(e) => setSettings(prev => ({ ...prev, marginRight: parseInt(e.target.value) || 2 }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Receipt Settings */}
              <TabsContent value="receipt" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>🧾 Business Information</CardTitle>
                    <CardDescription>Configure your business details for receipts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input 
                        id="businessName" 
                        value={settings.businessName}
                        onChange={(e) => setSettings(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Your Business Name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="businessAddress">Business Address</Label>
                      <Textarea 
                        id="businessAddress" 
                        value={settings.businessAddress}
                        onChange={(e) => setSettings(prev => ({ ...prev, businessAddress: e.target.value }))}
                        placeholder="Your Business Address"
                        rows={4}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input 
                          id="phoneNumber" 
                          value={settings.phoneNumber}
                          onChange={(e) => setSettings(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          placeholder="+91-XXXXXXXXXX"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="taxId">GST/Tax ID</Label>
                        <Input 
                          id="taxId" 
                          value={settings.taxId}
                          onChange={(e) => setSettings(prev => ({ ...prev, taxId: e.target.value }))}
                          placeholder="33QIWPS9348F1Z2"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="receiptFooter">Receipt Footer</Label>
                      <Textarea 
                        id="receiptFooter" 
                        value={settings.receiptFooter}
                        onChange={(e) => setSettings(prev => ({ ...prev, receiptFooter: e.target.value }))}
                        placeholder="Thank you message and contact info"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Layout Settings */}
              <TabsContent value="layout" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>🎨 Layout & Styling</CardTitle>
                    <CardDescription>Customize the visual appearance of your receipts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fontSize">Font Size</Label>
                        <Select 
                          value={settings.fontSize} 
                          onValueChange={(value: any) => setSettings(prev => ({ ...prev, fontSize: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small (Compact)</SelectItem>
                            <SelectItem value="medium">Medium (Standard)</SelectItem>
                            <SelectItem value="large">Large (Bold)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="fontFamily">Font Family</Label>
                        <Select 
                          value={settings.fontFamily} 
                          onValueChange={(value: any) => setSettings(prev => ({ ...prev, fontFamily: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="courier">Courier (Monospace)</SelectItem>
                            <SelectItem value="arial">Arial (Clean)</SelectItem>
                            <SelectItem value="impact">Impact (Bold)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="headerStyle">Header Style</Label>
                        <Select 
                          value={settings.headerStyle} 
                          onValueChange={(value: any) => setSettings(prev => ({ ...prev, headerStyle: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="centered">Centered</SelectItem>
                            <SelectItem value="left">Left Aligned</SelectItem>
                            <SelectItem value="justified">Justified</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="separatorStyle">Line Style</Label>
                        <Select 
                          value={settings.separatorStyle} 
                          onValueChange={(value: any) => setSettings(prev => ({ ...prev, separatorStyle: value }))}
                        >
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="headerBackground">Header Background</Label>
                        <Switch 
                          id="headerBackground" 
                          checked={settings.headerBackground}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, headerBackground: checked }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="boldTotals">Bold Totals</Label>
                        <Switch 
                          id="boldTotals" 
                          checked={settings.boldTotals}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, boldTotals: checked }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Content Settings */}
              <TabsContent value="content" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>📋 Receipt Content</CardTitle>
                    <CardDescription>Choose what information to show on receipts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showCustomerDetails">Customer Details</Label>
                        <Switch 
                          id="showCustomerDetails" 
                          checked={settings.showCustomerDetails}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showCustomerDetails: checked }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showItemSKU">Item SKU</Label>
                        <Switch 
                          id="showItemSKU" 
                          checked={settings.showItemSKU}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showItemSKU: checked }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showMRP">Show MRP</Label>
                        <Switch 
                          id="showMRP" 
                          checked={settings.showMRP}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showMRP: checked }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showSavings">Show Savings</Label>
                        <Switch 
                          id="showSavings" 
                          checked={settings.showSavings}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showSavings: checked }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="currencySymbol">Currency Symbol</Label>
                      <Input 
                        id="currencySymbol" 
                        value={settings.currencySymbol}
                        onChange={(e) => setSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
                        placeholder="₹"
                        className="w-20"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Templates */}
              <TabsContent value="templates" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>🎯 Quick Templates</CardTitle>
                    <CardDescription>Apply pre-configured receipt templates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Button 
                        variant="outline" 
                        className="h-24 flex flex-col items-center justify-center gap-2"
                        onClick={() => applyTemplate('professional')}
                      >
                        <FileText className="h-6 w-6" />
                        <div className="text-center">
                          <div className="font-semibold">Professional</div>
                          <div className="text-xs text-gray-500">80mm • Medium</div>
                        </div>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="h-24 flex flex-col items-center justify-center gap-2"
                        onClick={() => applyTemplate('compact')}
                      >
                        <FileText className="h-6 w-6" />
                        <div className="text-center">
                          <div className="font-semibold">Compact</div>
                          <div className="text-xs text-gray-500">58mm • Small</div>
                        </div>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="h-24 flex flex-col items-center justify-center gap-2"
                        onClick={() => applyTemplate('premium')}
                      >
                        <FileText className="h-6 w-6" />
                        <div className="text-center">
                          <div className="font-semibold">Premium</div>
                          <div className="text-xs text-gray-500">80mm • Large</div>
                        </div>
                      </Button>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            const dataStr = JSON.stringify({ receiptSettings: settings, printerSettings }, null, 2);
                            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                            const linkElement = document.createElement('a');
                            linkElement.setAttribute('href', dataUri);
                            linkElement.setAttribute('download', 'printer-receipt-settings.json');
                            linkElement.click();
                            toast({ title: "Settings Exported", description: "Settings downloaded successfully" });
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Settings
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.json';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  try {
                                    const importedData = JSON.parse(e.target?.result as string);
                                    if (importedData.receiptSettings) setSettings(prev => ({ ...prev, ...importedData.receiptSettings }));
                                    if (importedData.printerSettings) setPrinterSettings(prev => ({ ...prev, ...importedData.printerSettings }));
                                    toast({ title: "Settings Imported", description: "Settings loaded successfully" });
                                  } catch (error) {
                                    toast({ title: "Import Failed", description: "Invalid settings file", variant: "destructive" });
                                  }
                                };
                                reader.readAsText(file);
                              }
                            };
                            input.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import Settings
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>Real-time receipt preview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 font-mono text-xs overflow-auto max-h-[600px] text-black">
                  <div className={`${settings.headerStyle === 'centered' ? 'text-center' : 'text-left'} mb-3 ${settings.headerBackground ? 'bg-gray-100 p-2 rounded' : ''}`}>
                    <div className="font-bold text-sm">{settings.businessName}</div>
                    <div className="text-xs text-gray-600">Professional Retail Solution</div>
                    <div className="text-xs font-bold text-red-600">GST NO: {settings.taxId}</div>
                    <div className="text-xs whitespace-pre-line">{settings.businessAddress}</div>
                    <div className="text-xs">Ph: {settings.phoneNumber}</div>
                  </div>

                  <div className="bg-gray-50 p-2 rounded mb-2 text-xs">
                    <div className="flex justify-between"><span>Bill No:</span><span>TEST123456</span></div>
                    <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleDateString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Time:</span><span>{new Date().toLocaleTimeString('en-IN', { hour12: true })}</span></div>
                  </div>

                  {settings.showCustomerDetails && (
                    <div className="bg-blue-50 p-2 rounded mb-2 text-xs">
                      <div><strong>Customer:</strong> Test Customer</div>
                    </div>
                  )}

                  <div className={`border-t ${settings.separatorStyle === 'dashed' ? 'border-dashed' : settings.separatorStyle === 'dotted' ? 'border-dotted' : 'border-solid'} border-gray-400 my-2`}></div>

                  <div className="text-xs mb-2">
                    <div className="flex">
                      <div className="flex-grow">
                        <div className="font-bold">Test Product</div>
                        {settings.showItemSKU && <div className="text-gray-500">SKU: TEST001</div>}
                        {settings.showMRP && settings.showSavings && (
                          <div className="text-green-600">MRP: {settings.currencySymbol}60 (Save: {settings.currencySymbol}10)</div>
                        )}
                      </div>
                      <div className="w-8 text-center">2</div>
                      <div className="w-12 text-right">{settings.currencySymbol}50</div>
                      <div className="w-12 text-right">{settings.currencySymbol}100</div>
                    </div>
                  </div>

                  <div className={`border-t ${settings.separatorStyle === 'dashed' ? 'border-dashed' : settings.separatorStyle === 'dotted' ? 'border-dotted' : 'border-solid'} border-gray-400 my-2`}></div>

                  <div className="bg-gray-50 p-2 rounded text-xs">
                    <div className="flex justify-between"><span>Sub Total:</span><span>{settings.currencySymbol}100.00</span></div>
                    <div className="flex justify-between"><span>Tax (0%):</span><span>{settings.currencySymbol}0.00</span></div>
                    
                    <div className={`border-2 border-black p-2 mt-2 ${settings.boldTotals ? 'font-bold' : ''} ${settings.headerBackground ? 'bg-yellow-100' : ''} rounded flex justify-between`}>
                      <span>TOTAL:</span><span>{settings.currencySymbol}100.00</span>
                    </div>
                  </div>

                  <div className={`border-t-2 ${settings.separatorStyle === 'dashed' ? 'border-dashed' : settings.separatorStyle === 'dotted' ? 'border-dotted' : 'border-solid'} border-gray-400 pt-2 text-center text-xs mt-3`}>
                    <div className="font-bold text-green-600 mb-2">🙏 Thank you! 🙏</div>
                    <div className="whitespace-pre-line">{settings.receiptFooter}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
