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
import { toast } from '@/hooks/use-toast';
import {
  Settings,
  Store,
  Receipt,
  Printer,
  CreditCard,
  Users,
  Package,
  Calculator,
  Database,
  Palette,
  Bell,
  Shield,
  Globe,
  Save,
  RefreshCw,
  Edit3,
  Eye,
  EyeOff,
  Calendar,
  FileText
} from 'lucide-react';

interface BusinessSettings {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  logo: string;
  timezone: string;
  currency: string;
}

interface ReceiptSettings {
  receiptWidth: string;
  showLogo: boolean;
  showGST: boolean;
  footerText: string;
  headerText: string;
  printerType: string;
  copies: number;
}

interface POSSettings {
  quickSaleMode: boolean;
  barcodeScanning: boolean;
  customerRequired: boolean;
  discountEnabled: boolean;
  taxCalculation: string;
  roundingMethod: string;
  defaultPaymentMethod: string;
}

export default function EditOptions() {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    businessName: 'M MART',
    address: '123 Business Street, City, State',
    phone: '+91-9876543210',
    email: 'contact@mmart.com',
    gstNumber: '33GSPDB3311F1ZZ',
    logo: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR'
  });

  // Load saved settings on component mount
  useEffect(() => {
    try {
      const savedBusiness = localStorage.getItem('businessSettings');
      const savedReceipt = localStorage.getItem('receiptConfig');
      const savedPOS = localStorage.getItem('posSettings');

      if (savedBusiness) {
        const parsed = JSON.parse(savedBusiness);
        setBusinessSettings(prev => ({ ...prev, ...parsed }));
      }

      if (savedReceipt) {
        const parsed = JSON.parse(savedReceipt);
        setReceiptSettings(prev => ({ ...prev, ...parsed }));
      }

      if (savedPOS) {
        const parsed = JSON.parse(savedPOS);
        setPOSSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
  }, []);

  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    receiptWidth: '80mm',
    showLogo: true,
    showGST: true,
    footerText: 'Thank you for shopping with us!',
    headerText: 'Welcome to M MART',
    printerType: 'thermal',
    copies: 1
  });

  const [posSettings, setPOSSettings] = useState<POSSettings>({
    quickSaleMode: false,
    barcodeScanning: true,
    customerRequired: false,
    discountEnabled: true,
    taxCalculation: 'inclusive',
    roundingMethod: 'round',
    defaultPaymentMethod: 'cash'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSaveBusinessSettings = () => {
    // Save to localStorage or API
    localStorage.setItem('businessSettings', JSON.stringify(businessSettings));
    toast({
      title: "Business Settings Saved",
      description: "Your business information has been updated successfully."
    });
  };

  const handleSaveReceiptSettings = () => {
    // Combine business and receipt settings for complete receipt configuration
    const combinedSettings = {
      ...businessSettings,
      ...receiptSettings,
      // Map fields properly for receipt system
      businessAddress: businessSettings.address,
      taxId: businessSettings.gstNumber,
      receiptFooter: receiptSettings.footerText,
      paperWidth: receiptSettings.receiptWidth,
      showCustomerDetails: true,
      showItemSKU: true,
      showMRP: true,
      showSavings: true,
      headerStyle: 'centered' as const,
      boldTotals: true,
      separatorStyle: 'solid' as const,
      showTermsConditions: false,
      termsConditions: '',
      showReturnPolicy: false,
      returnPolicy: '',
      language: 'english' as const,
      currencySymbol: businessSettings.currency === 'INR' ? '₹' : '$',
      thermalOptimized: true,
      fontSize: 'medium' as const,
      fontFamily: 'courier' as const,
      showBarcode: false,
      showQRCode: false,
      headerBackground: true,
      autoPrint: true
    };

    // Save to localStorage for receipt printing
    localStorage.setItem('receiptSettings', JSON.stringify(combinedSettings));
    
    // Also save individual settings
    localStorage.setItem('businessSettings', JSON.stringify(businessSettings));
    localStorage.setItem('receiptConfig', JSON.stringify(receiptSettings));
    
    toast({
      title: "✅ Receipt Settings Saved",
      description: "Your bill receipt format has been updated and will be used for all future receipts."
    });
  };

  const handleSavePOSSettings = () => {
    localStorage.setItem('posSettings', JSON.stringify(posSettings));
    toast({
      title: "POS Settings Saved",
      description: "Your POS configuration has been updated successfully."
    });
  };

  const resetToDefaults = () => {
    setBusinessSettings({
      businessName: 'M MART',
      address: '123 Business Street, City, State',
      phone: '+91-9876543210',
      email: 'contact@mmart.com',
      gstNumber: '33GSPDB3311F1ZZ',
      logo: '',
      timezone: 'Asia/Kolkata',
      currency: 'INR'
    });
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values."
    });
  };

  const previewReceipt = () => {
    // Save current settings first to ensure preview uses latest settings
    const combinedSettings = {
      businessName: businessSettings.businessName,
      businessAddress: businessSettings.address,
      phoneNumber: businessSettings.phone,
      email: businessSettings.email,
      taxId: businessSettings.gstNumber,
      receiptFooter: receiptSettings.footerText,
      showLogo: receiptSettings.showLogo,
      autoPrint: false, // Don't auto-print for preview
      paperWidth: receiptSettings.receiptWidth,
      fontSize: 'medium' as const,
      fontFamily: 'courier' as const,
      headerStyle: 'centered' as const,
      showCustomerDetails: true,
      showItemSKU: true,
      showMRP: true,
      showSavings: true,
      showBarcode: false,
      showQRCode: false,
      headerBackground: true,
      boldTotals: true,
      separatorStyle: 'solid' as const,
      showTermsConditions: false,
      termsConditions: '',
      showReturnPolicy: false,
      returnPolicy: '',
      language: 'english' as const,
      currencySymbol: businessSettings.currency === 'INR' ? '₹' : '$',
      thermalOptimized: true
    };

    // Save to localStorage for receipt system
    localStorage.setItem('receiptSettings', JSON.stringify(combinedSettings));

    // Create comprehensive test receipt data
    const testReceiptData = {
      billNumber: `PREVIEW-${Date.now().toString().slice(-6)}`,
      billDate: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      }),
      customerDetails: {
        name: 'Walk-in Customer',
        doorNo: '+91-9876543210'
      },
      salesMan: 'Admin User',
      items: [
        {
          id: 1,
          name: 'Premium Rice (5kg)',
          sku: 'ITM264973991-RICE-5KG',
          quantity: 2,
          price: '125.00',
          total: 250.00,
          mrp: 150.00
        },
        {
          id: 2,
          name: 'Cooking Oil (1L)',
          sku: 'ITM264973992-OIL-1L',
          quantity: 1,
          price: '75.00',
          total: 75.00,
          mrp: 85.00
        },
        {
          id: 3,
          name: 'Sugar (1kg)',
          sku: 'ITM264973993-SUGAR-1KG',
          quantity: 3,
          price: '45.00',
          total: 135.00,
          mrp: 50.00
        }
      ],
      subtotal: 460.00,
      discount: 25.00,
      discountType: 'fixed' as const,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: 435.00,
      amountPaid: 435.00,
      changeDue: 0,
      paymentMethod: 'CASH',
      notes: 'Preview receipt from POS Bill Edit settings - Sample data for testing'
    };

    // Dynamic import and execute print receipt
    import('@/components/pos/print-receipt').then(({ printReceipt }) => {
      try {
        printReceipt(testReceiptData, combinedSettings);
        toast({
          title: "✅ Receipt Preview Generated",
          description: "Preview window opened with your current settings"
        });
      } catch (error) {
        console.error('Preview error:', error);
        toast({
          title: "❌ Preview Error",
          description: "Failed to generate preview. Please try again.",
          variant: "destructive"
        });
      }
    }).catch(error => {
      console.error('Import error:', error);
      toast({
        title: "❌ Module Load Error", 
        description: "Failed to load receipt module. Please refresh the page.",
        variant: "destructive"
      });
    });
  };

  const updateBusinessSetting = (key: string, value: string) => {
    setBusinessSettings(prev => ({ ...prev, [key]: value }));
  };

    const updateReceiptSetting = (key: string, value: any) => {
        setReceiptSettings(prev => ({ ...prev, [key]: value }));
    };

  const updatePOSSetting = (key: string, value: any) => {
    setPOSSettings(prev => ({ ...prev, [key]: value }));
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Edit3 className="h-8 w-8 text-blue-600" />
              POS Bill Edit
            </h1>
            <p className="text-gray-500 mt-1">Configure your POS bill settings and receipt preferences</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </Button>
            <Button variant="outline" onClick={resetToDefaults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </div>

        {/* Main Settings Tabs */}
        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="receipt" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Receipt
            </TabsTrigger>
            <TabsTrigger value="pos" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              POS
            </TabsTrigger>
            <TabsTrigger value="printer" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Printer
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Business Settings */}
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Configure your business details that appear on receipts and reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={businessSettings.businessName}
                      onChange={(e) => updateBusinessSetting('businessName', e.target.value)}
                      placeholder="Enter business name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={businessSettings.gstNumber}
                      onChange={(e) => updateBusinessSetting('gstNumber', e.target.value)}
                      placeholder="Enter GST number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Textarea
                    id="address"
                    value={businessSettings.address}
                    onChange={(e) => updateBusinessSetting('address', e.target.value)}
                    placeholder="Enter complete business address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={businessSettings.phone}
                      onChange={(e) => updateBusinessSetting('phone', e.target.value)}
                      placeholder="+91-XXXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={businessSettings.email}
                      onChange={(e) => updateBusinessSetting('email', e.target.value)}
                      placeholder="business@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={businessSettings.currency} onValueChange={(value) => updateBusinessSetting('currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="GBP">British Pound (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button onClick={handleSaveBusinessSettings}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Business Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipt Settings */}
          <TabsContent value="receipt" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Bill Receipt Details Configuration
                </CardTitle>
                <CardDescription>
                  Customize bill receipt layout, formatting, and content for POS Enhanced
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Header Section */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Header Section
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="storeName">Store Name (Bold Header)</Label>
                      <Input
                        id="storeName"
                        value={businessSettings.businessName}
                        onChange={(e) => updateBusinessSetting('businessName', e.target.value)}
                        placeholder="Store name at top"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gstDisplay">GST Number Display</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="showGSTHeader"
                          checked={receiptSettings.showGST}
                          onCheckedChange={(checked) => updateReceiptSetting('showGST', checked)}
                        />
                        <span className="text-sm">Show below address</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="headerAlignment">Header Alignment</Label>
                    <Select value={receiptSettings.receiptWidth} onValueChange={(value) => updateReceiptSetting('receiptWidth', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left Aligned</SelectItem>
                        <SelectItem value="center">Center Aligned</SelectItem>
                        <SelectItem value="right">Right Aligned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date & Time Format */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date & Time Format
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Select defaultValue="dd-mm-yyyy">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dd-mm-yyyy">DD-MM-YYYY</SelectItem>
                          <SelectItem value="mm-dd-yyyy">MM-DD-YYYY</SelectItem>
                          <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                          <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeFormat">Time Format</Label>
                      <Select defaultValue="12hour">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12hour">12 Hour (AM/PM)</SelectItem>
                          <SelectItem value="24hour">24 Hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Amount & Total Section */}
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Amount & Total Formatting
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalAlignment">Total Amount Alignment</Label>
                      <Select defaultValue="right">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left Aligned</SelectItem>
                          <SelectItem value="center">Center Aligned</SelectItem>
                          <SelectItem value="right">Right Aligned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currencyFormat">Currency Display</Label>
                      <Select value={businessSettings.currency} onValueChange={(value) => updateBusinessSetting('currency', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">₹ (Indian Rupee)</SelectItem>
                          <SelectItem value="USD">$ (US Dollar)</SelectItem>
                          <SelectItem value="EUR">€ (Euro)</SelectItem>
                          <SelectItem value="GBP">£ (British Pound)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="boldTotals">Bold Total Amount</Label>
                        <p className="text-sm text-gray-500">Make grand total bold and prominent</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="showSavings">Show Savings Amount</Label>
                        <p className="text-sm text-gray-500">Display total savings on receipt</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="border rounded-lg p-4 bg-purple-50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Footer Section
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="thankYouMessage">Thank You Message</Label>
                      <Input
                        id="thankYouMessage"
                        defaultValue="Thank You for shopping with us!"
                        placeholder="Thank you message"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="thankYouBold">Bold Thank You</Label>
                          <p className="text-sm text-gray-500">Make thank you message bold</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="thankYouCenter">Center Align</Label>
                          <p className="text-sm text-gray-500">Center align thank you message</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="additionalFooter">Additional Footer Text</Label>
                      <Textarea
                        id="additionalFooter"
                        value={receiptSettings.footerText}
                        onChange={(e) => updateReceiptSetting('footerText', e.target.value)}
                        placeholder="Visit again soon&#10;Customer Care: support@store.com"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Paper & Print Settings */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Paper & Print Settings
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="receiptWidth">Receipt Width</Label>
                      <Select value={receiptSettings.receiptWidth} onValueChange={(value) => updateReceiptSetting('receiptWidth', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58mm">58mm (Small)</SelectItem>
                          <SelectItem value="80mm">80mm (Standard)</SelectItem>
                          <SelectItem value="112mm">112mm (Large)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fontSize">Font Size</Label>
                      <Select defaultValue="medium">
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
                      <Label htmlFor="copies">Number of Copies</Label>
                      <Input
                        id="copies"
                        type="number"
                        min="1"
                        max="5"
                        value={receiptSettings.copies}
                        onChange={(e) => updateReceiptSetting('copies', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={previewReceipt}
                      className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Receipt
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Save settings first, then preview
                        handleSaveReceiptSettings();
                        setTimeout(() => previewReceipt(), 500);
                      }}
                      className="bg-green-50 hover:bg-green-100 border-green-200"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      <Eye className="h-4 w-4 mr-1" />
                      Save & Preview
                    </Button>
                  </div>
                  <Button onClick={handleSaveReceiptSettings}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Receipt Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* POS Settings */}
          <TabsContent value="pos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  POS Behavior Settings
                </CardTitle>
                <CardDescription>
                  Configure how your POS system behaves during transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="taxCalculation">Tax Calculation Method</Label>
                    <Select value={posSettings.taxCalculation} onValueChange={(value) => updatePOSSetting('taxCalculation', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inclusive">Tax Inclusive</SelectItem>
                        <SelectItem value="exclusive">Tax Exclusive</SelectItem>
                        <SelectItem value="compound">Compound Tax</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roundingMethod">Rounding Method</Label>
                    <Select value={posSettings.roundingMethod} onValueChange={(value) => updatePOSSetting('roundingMethod', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round">Round to Nearest</SelectItem>
                        <SelectItem value="floor">Round Down</SelectItem>
                        <SelectItem value="ceil">Round Up</SelectItem>
                        <SelectItem value="none">No Rounding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultPayment">Default Payment Method</Label>
                  <Select value={posSettings.defaultPaymentMethod} onValueChange={(value) => updatePOSSetting('defaultPaymentMethod', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="credit">Store Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="quickSale">Quick Sale Mode</Label>
                      <p className="text-sm text-gray-500">Enable fast checkout without customer details</p>
                    </div>
                    <Switch
                      id="quickSale"
                      checked={posSettings.quickSaleMode}
                      onCheckedChange={(checked) => updatePOSSetting('quickSaleMode', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="barcode">Barcode Scanning</Label>
                      <p className="text-sm text-gray-500">Enable barcode scanner support</p>
                    </div>
                    <Switch
                      id="barcode"
                      checked={posSettings.barcodeScanning}
                      onCheckedChange={(checked) => updatePOSSetting('barcodeScanning', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="customerRequired">Customer Required</Label>
                      <p className="text-sm text-gray-500">Require customer selection for all sales</p>
                    </div>
                    <Switch
                      id="customerRequired"
                      checked={posSettings.customerRequired}
                      onCheckedChange={(checked) => updatePOSSetting('customerRequired', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="discount">Discount Enabled</Label>
                      <p className="text-sm text-gray-500">Allow discounts on items and bills</p>
                    </div>
                    <Switch
                      id="discount"
                      checked={posSettings.discountEnabled}
                      onCheckedChange={(checked) => updatePOSSetting('discountEnabled', checked)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button onClick={handleSavePOSSettings}>
                    <Save className="h-4 w-4 mr-2" />
                    Save POS Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Additional tabs would go here for Printer, Payment, and Advanced settings */}
          <TabsContent value="printer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Printer Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Printer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Printer settings will be available in the next update</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Gateway Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Payment gateway configuration coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Advanced System Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Advanced settings for system administrators</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}