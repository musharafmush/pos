import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Printer, Eye, Download, Palette, Settings, FileText, Languages, Zap } from "lucide-react";
import { printReceipt, type ReceiptCustomization } from "@/components/pos/print-receipt";
import ReceiptTemplateManager from "@/components/pos/receipt-template-manager";

export default function ReceiptSettings() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<ReceiptCustomization>({
    businessName: 'M MART',
    businessAddress: '47,SHOP NO.1&2,\nTHANDARAMPATTU MAIN ROAD,\nSAMUTHIRAM VILLAGE,\nTIRUVANNAMALAI-606603',
    phoneNumber: '+91-9876543210',
    email: 'info@mmart.com',
    taxId: '33QIWPS9348F1Z2',
    receiptFooter: 'Thank you for shopping with us!\nVisit again soon\nCustomer Care: support@mmart.com',
    showLogo: false,
    logoUrl: '',
    autoPrint: true,
    paperWidth: 'thermal80',
    fontSize: 'small',
    fontFamily: 'courier',
    headerStyle: 'centered',
    showCustomerDetails: true,
    showItemSKU: true,
    showMRP: true,
    showSavings: true,
    showBarcode: false,
    showQRCode: false,
    headerBackground: false,
    boldTotals: true,
    separatorStyle: 'dashed',
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

  useEffect(() => {
    const savedSettings = localStorage.getItem('receiptSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading receipt settings:', error);
      }
    }
  }, []);

  const saveSettings = () => {
    try {
      localStorage.setItem('receiptSettings', JSON.stringify(settings));
      toast({
        title: "✅ Settings Saved",
        description: "Receipt customization settings have been saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "❌ Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const handlePrintTest = async () => {
    const testReceiptData = {
      billNumber: 'POS1749631206824',
      billDate: new Date().toLocaleDateString('en-IN'),
      customerDetails: {
        name: 'Walk-in Customer',
        doorNo: '+91-9876543210'
      },
      salesMan: 'Admin User',
      items: [
        {
          id: 1,
          name: 'Sample Product 1',
          sku: 'ITM264973991-REPACK-2500',
          quantity: 2,
          price: '125.00',
          total: 250.00,
          mrp: 150.00
        },
        {
          id: 2,
          name: 'Another Test Item',
          sku: 'ITM264973992-PACK-500',
          quantity: 1,
          price: '75.50',
          total: 75.50,
          mrp: 85.00
        }
      ],
      subtotal: 325.50,
      discount: 25.50,
      discountType: 'fixed' as const,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: 300.00,
      amountPaid: 300.00,
      changeDue: 0,
      paymentMethod: 'CASH',
      notes: 'Test receipt with custom formatting'
    };

    await printReceipt(testReceiptData, settings);
  };

  const resetToDefaults = () => {
    const defaultSettings: ReceiptCustomization = {
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
      currencySymbol: '₹'
    };

    setSettings(defaultSettings);
    toast({
      title: "🔄 Reset Complete",
      description: "Settings have been reset to defaults",
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Printer className="h-8 w-8 text-blue-600" />
              Receipt Customization
            </h1>
            <p className="text-gray-600 mt-2">Configure your receipt format and appearance for optimal printing</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetToDefaults}>
              <Zap className="h-4 w-4 mr-2" />
              Reset Defaults
            </Button>
            <Button variant="outline" onClick={handlePrintTest}>
              <Eye className="h-4 w-4 mr-2" />
              Test Print
            </Button>
            <Button onClick={saveSettings}>
              <Download className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="business" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="business" className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Business
                </TabsTrigger>
                <TabsTrigger value="layout" className="flex items-center gap-1">
                  <Palette className="h-4 w-4" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="styling" className="flex items-center gap-1">
                  <Palette className="h-4 w-4" />
                  Styling
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-1">
                  <Languages className="h-4 w-4" />
                  Advanced
                </TabsTrigger>
              </TabsList>

              {/* Business Information */}
              <TabsContent value="business" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>Configure your business details for the receipt header</CardDescription>
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
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input 
                          id="email" 
                          value={settings.email || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="info@yourbusiness.com"
                        />
                      </div>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="website">Website (Optional)</Label>
                        <Input 
                          id="website" 
                          value={settings.website || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="www.yourbusiness.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="returnPolicyText">Return Policy Text</Label>
                        <Input 
                          id="returnPolicyText" 
                          value={settings.returnPolicyText || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, returnPolicyText: e.target.value }))}
                          placeholder="7 days return policy with receipt"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Layout Settings */}
              <TabsContent value="layout" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Layout Configuration</CardTitle>
                    <CardDescription>Configure paper size, fonts, and layout style</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="paperWidth">Paper Width</Label>
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
                            <SelectItem value="thermal58">58mm Thermal (32 chars)</SelectItem>
                            <SelectItem value="thermal80">80mm Thermal (48 chars)</SelectItem>
                            <SelectItem value="thermal112">112mm Thermal (64 chars)</SelectItem>
                            <SelectItem value="a4">A4 Paper (80 chars)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                            <SelectItem value="courier">Courier New (Monospace)</SelectItem>
                            <SelectItem value="arial">Arial (Sans-serif)</SelectItem>
                            <SelectItem value="impact">Impact (Bold)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="headerStyle">Header Alignment</Label>
                        <Select 
                          value={settings.headerStyle} 
                          onValueChange={(value: any) => setSettings(prev => ({ ...prev, headerStyle: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="centered">Centered Header</SelectItem>
                            <SelectItem value="left">Left Aligned Header</SelectItem>
                            <SelectItem value="justified">Justified Header</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Thermal Printer Specific Settings */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-3">🖨️ Thermal Printer Settings</h4>
                      <div className="grid grid-cols-2 gap-4">
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
                              <SelectItem value="low">Low (Light)</SelectItem>
                              <SelectItem value="medium">Medium (Standard)</SelectItem>
                              <SelectItem value="high">High (Dark)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="lineSpacing">Line Spacing</Label>
                          <Select 
                            value={settings.lineSpacing || 'tight'} 
                            onValueChange={(value: any) => setSettings(prev => ({ ...prev, lineSpacing: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tight">Tight (Compact)</SelectItem>
                              <SelectItem value="normal">Normal (Standard)</SelectItem>
                              <SelectItem value="loose">Loose (Spaced)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="characterEncoding">Character Encoding</Label>
                          <Select 
                            value={settings.characterEncoding || 'utf8'} 
                            onValueChange={(value: any) => setSettings(prev => ({ ...prev, characterEncoding: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="utf8">UTF-8 (Unicode ₹)</SelectItem>
                              <SelectItem value="cp437">CP437 (Extended ASCII)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

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
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="autoCut">Auto Cut Paper</Label>
                          <Switch 
                            id="autoCut" 
                            checked={settings.autoCut !== false}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCut: checked }))}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="thermalOptimized">Thermal Optimized</Label>
                          <Switch 
                            id="thermalOptimized" 
                            checked={settings.thermalOptimized !== false}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, thermalOptimized: checked }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4">
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

                        <div>
                          <Label htmlFor="logoHeight">Logo Height (px)</Label>
                          <Input 
                            id="logoHeight" 
                            type="number"
                            min="30"
                            max="100"
                            value={settings.logoHeight || 50}
                            onChange={(e) => setSettings(prev => ({ ...prev, logoHeight: parseInt(e.target.value) || 50 }))}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Content Settings */}
              <TabsContent value="content" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Content Options</CardTitle>
                    <CardDescription>Choose what information to display on receipts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showCustomerDetails">Show Customer Details</Label>
                        <Switch 
                          id="showCustomerDetails" 
                          checked={settings.showCustomerDetails}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showCustomerDetails: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="showItemSKU">Show Item SKU</Label>
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

                      <div className="flex items-center justify-between">
                        <Label htmlFor="showBarcode">Show Barcode</Label>
                        <Switch 
                          id="showBarcode" 
                          checked={settings.showBarcode}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showBarcode: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="showQRCode">Show QR Code</Label>
                        <Switch 
                          id="showQRCode" 
                          checked={settings.showQRCode}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showQRCode: checked }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Styling Settings */}
              <TabsContent value="styling" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Visual Styling</CardTitle>
                    <CardDescription>Customize the visual appearance of receipts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                      <div className="flex items-center justify-between">
                        <Label htmlFor="thermalOptimized">Thermal Printer Optimized</Label>
                        <Switch 
                          id="thermalOptimized" 
                          checked={settings.thermalOptimized || true}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, thermalOptimized: checked }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="separatorStyle">Separator Style</Label>
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
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Template Selection */}
              <TabsContent value="templates" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Receipt Templates</CardTitle>
                    <CardDescription>Choose from pre-designed receipt templates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2"
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            paperWidth: 'thermal80',
                            fontSize: 'medium',
                            fontFamily: 'courier',
                            headerStyle: 'centered',
                            headerBackground: true,
                            boldTotals: true,
                            separatorStyle: 'solid'
                          }));
                          toast({ title: "Template Applied", description: "Professional template selected" });
                        }}
                      >
                        <FileText className="h-6 w-6" />
                        Professional
                      </Button>

                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2"
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            paperWidth: 'thermal58',
                            fontSize: 'small',
                            fontFamily: 'courier',
                            headerStyle: 'centered',
                            headerBackground: false,
                            boldTotals: false,
                            separatorStyle: 'dashed'
                          }));
                          toast({ title: "Template Applied", description: "Compact template selected" });
                        }}
                      >
                        <FileText className="h-6 w-6" />
                        Compact
                      </Button>

                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2"
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            paperWidth: 'thermal80',
                            fontSize: 'large',
                            fontFamily: 'impact',
                            headerStyle: 'centered',
                            headerBackground: true,
                            boldTotals: true,
                            separatorStyle: 'solid'
                          }));
                          toast({ title: "Template Applied", description: "Bold template selected" });
                        }}
                      >
                        <FileText className="h-6 w-6" />
                        Bold
                      </Button>

                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2"
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            paperWidth: 'a4',
                            fontSize: 'medium',
                            fontFamily: 'arial',
                            headerStyle: 'left',
                            headerBackground: false,
                            boldTotals: true,
                            separatorStyle: 'solid'
                          }));
                          toast({ title: "Template Applied", description: "Office template selected" });
                        }}
                      >
                        <FileText className="h-6 w-6" />
                        Office
                      </Button>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            setSettings(prev => ({ ...prev, showMRP: !prev.showMRP }));
                            toast({ title: "MRP Display", description: `MRP ${settings.showMRP ? 'hidden' : 'shown'}` });
                          }}
                        >
                          Toggle MRP
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            setSettings(prev => ({ ...prev, showItemSKU: !prev.showItemSKU }));
                            toast({ title: "SKU Display", description: `SKU ${settings.showItemSKU ? 'hidden' : 'shown'}` });
                          }}
                        >
                          Toggle SKU
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            setSettings(prev => ({ ...prev, headerBackground: !prev.headerBackground }));
                            toast({ title: "Header Style", description: `Background ${settings.headerBackground ? 'removed' : 'added'}` });
                          }}
                        >
                          Toggle Header BG
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Advanced Settings */}
              <TabsContent value="advanced" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Options</CardTitle>
                    <CardDescription>Terms, conditions, and additional features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoPrint">Auto Print</Label>
                      <Switch 
                        id="autoPrint" 
                        checked={settings.autoPrint}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoPrint: checked }))}
                      />
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

                    <div className="flex items-center justify-between">
                      <Label htmlFor="showTermsConditions">Show Terms & Conditions</Label>
                      <Switch 
                        id="showTermsConditions" 
                        checked={settings.showTermsConditions}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showTermsConditions: checked }))}
                      />
                    </div>

                    {settings.showTermsConditions && (
                      <div>
                        <Label htmlFor="termsConditions">Terms & Conditions</Label>
                        <Textarea 
                          id="termsConditions" 
                          value={settings.termsConditions}
                          onChange={(e) => setSettings(prev => ({ ...prev, termsConditions: e.target.value }))}
                          placeholder="All sales are final. No returns without receipt."
                          rows={2}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Label htmlFor="showReturnPolicy">Show Return Policy</Label>
                      <Switch 
                        id="showReturnPolicy" 
                        checked={settings.showReturnPolicy}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showReturnPolicy: checked }))}
                      />
                    </div>

                    {settings.showReturnPolicy && (
                      <div>
                        <Label htmlFor="returnPolicy">Return Policy</Label>
                        <Textarea 
                          id="returnPolicy" 
                          value={settings.returnPolicy}
                          onChange={(e) => setSettings(prev => ({ ...prev, returnPolicy: e.target.value }))}
                          placeholder="7 days return policy. Terms apply."
                          rows={2}
                        />
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-3">Settings Management</h4>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const dataStr = JSON.stringify(settings, null, 2);
                            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

                            const exportFileDefaultName = 'receipt-settings.json';

                            const linkElement = document.createElement('a');
                            linkElement.setAttribute('href', dataUri);
                            linkElement.setAttribute('download', exportFileDefaultName);
                            linkElement.click();

                            toast({ title: "Settings Exported", description: "Receipt settings downloaded successfully" });
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Settings
                        </Button>

                        <Button 
                          size="sm" 
                          variant="outline"
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
                                    const importedSettings = JSON.parse(e.target?.result as string);
                                    setSettings(prev => ({ ...prev, ...importedSettings }));
                                    toast({ title: "Settings Imported", description: "Receipt settings loaded successfully" });
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
                          Import Settings
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Live Preview and Template Manager */}
          <div className="lg:col-span-1 space-y-6">
            <ReceiptTemplateManager 
              currentSettings={settings}
              onApplyTemplate={(newSettings) => setSettings(newSettings)}
            />

            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>See how your receipt will look</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 font-mono text-xs overflow-auto max-h-[600px] text-black">
                  <div className={`${settings.headerStyle === 'centered' ? 'text-center' : 'text-left'} mb-3 ${settings.headerBackground ? 'bg-gray-100 p-2 rounded' : ''}`}>
                    <div className="font-bold text-sm">{settings.businessName}</div>
                    <div className="text-xs text-gray-600">Professional Retail Solution</div>
                    <div className="text-xs font-bold text-red-600">GST NO: {settings.taxId}</div>
                    <div className="text-xs whitespace-pre-line">{settings.businessAddress}</div>
                    <div className="text-xs">Ph: {settings.phoneNumber}</div>
                    {settings.email && <div className="text-xs">Email: {settings.email}</div>}
                  </div>

                  <div className="bg-gray-50 p-2 rounded mb-2 text-xs">
                    <div className="flex justify-between"><span>Bill No:</span><span>POS1749631206824</span></div>
                    <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleDateString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Time:</span><span>{new Date().toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit' })}</span></div>
                    <div className="flex justify-between"><span>Cashier:</span><span>Admin User</span></div>
                  </div>

                  {settings.showCustomerDetails && (
                    <div className="bg-blue-50 p-2 rounded mb-2 text-xs">
                      <div><strong>Customer:</strong> Walk-in Customer</div>
                    </div>
                  )}

                  <div className={`border-t ${settings.separatorStyle === 'dashed' ? 'border-dashed' : settings.separatorStyle === 'dotted' ? 'border-dotted' : 'border-solid'} border-gray-400 my-2`}></div>

                  <div className={`${settings.headerBackground ? 'bg-gray-100' : ''} p-1 text-xs font-bold mb-1`}>
                    <div className="flex">
                      <div className="flex-grow">ITEM</div>
                      <div className="w-8 text-center">QTY</div>
                      <div className="w-12 text-right">RATE</div>
                      <div className="w-12 text-right">AMOUNT</div>
                    </div>
                  </div>

                  <div className="text-xs mb-2">
                    <div className={`border-b ${settings.separatorStyle === 'dashed' ? 'border-dashed' : settings.separatorStyle === 'dotted' ? 'border-dotted' : 'border-solid'} border-gray-300 py-1`}>
                      <div className="flex">
                        <div className="flex-grow">
                          <div className="font-bold text-blue-900">Sample Product</div>
                          {settings.showItemSKU && <div className="text-gray-500 text-xs">SKU: ITM264973991</div>}
                          {settings.showMRP && settings.showSavings && (
                            <div className="text-green-600 text-xs">MRP: {settings.currencySymbol}150 (Save: {settings.currencySymbol}25)</div>
                          )}
                        </div>
                        <div className="w-8 text-center">2</div>
                        <div className="w-12 text-right">{settings.currencySymbol}125</div>
                        <div className="w-12 text-right">{settings.currencySymbol}250</div>
                      </div>
                    </div>
                  </div>

                  <div className={`border-t ${settings.separatorStyle === 'dashed' ? 'border-dashed' : settings.separatorStyle === 'dotted' ? 'border-dotted' : 'border-solid'} border-gray-400 my-2`}></div>

                  <div className="bg-gray-50 p-2 rounded text-xs">
                    <div className="flex justify-between"><span>Sub Total:</span><span>{settings.currencySymbol}250.00</span></div>
                    <div className="flex justify-between"><span>Taxable Amount:</span><span>{settings.currencySymbol}250.00</span></div>
                    <div className="flex justify-between"><span>GST (0%):</span><span>{settings.currencySymbol}0.00</span></div>

                    <div className={`border-2 border-black p-2 mt-2 ${settings.boldTotals ? 'font-bold' : ''} ${settings.headerBackground ? 'bg-yellow-100' : ''} rounded flex justify-between`}>
                      <span>GRAND TOTAL:</span><span>{settings.currencySymbol}250.00</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-2 rounded mt-2 text-xs">
                    <div className="flex justify-between"><span>Payment Method:</span><span><strong>CASH</strong></span></div>
                    <div className="flex justify-between"><span>Amount Paid:</span><span><strong>{settings.currencySymbol}250.00</strong></span></div>
                  </div>

                  {settings.showTermsConditions && (
                    <div className="bg-yellow-50 border border-yellow-200 p-2 rounded mt-2 text-xs">
                      <div><strong>Terms & Conditions:</strong></div>
                      <div>{settings.termsConditions}</div>
                    </div>
                  )}

                  {settings.showReturnPolicy && (
                    <div className="bg-blue-50 border border-blue-200 p-2 rounded mt-2 text-xs">
                      <div><strong>Return Policy:</strong></div>
                      <div>{settings.returnPolicy}</div>
                    </div>
                  )}

                  <div className={`border-t-2 ${settings.separatorStyle === 'dashed' ? 'border-dashed' : settings.separatorStyle === 'dotted' ? 'border-dotted' : 'border-solid'} border-gray-400 pt-2 text-center text-xs mt-3`}>
                    <div className="font-bold text-green-600 mb-2">🙏 धन्यवाद | Thank you! 🙏</div>
                    <div className="whitespace-pre-line">{settings.receiptFooter}</div>
                    <div className="mt-2 text-gray-600">
                      <div>Items: 1 | Total Qty: 2 | Savings: {settings.currencySymbol}25.00</div>
                      <div>Receipt: POS1749631206824 | Terminal: POS-Enhanced</div>
                      <div>✨ Powered by Awesome Shop POS v7.0 ✨</div>
                    </div>
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