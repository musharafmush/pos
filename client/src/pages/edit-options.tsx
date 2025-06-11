
import React, { useState } from 'react';
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
  EyeOff
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
    localStorage.setItem('receiptSettings', JSON.stringify(receiptSettings));
    toast({
      title: "Receipt Settings Saved",
      description: "Your receipt format has been updated successfully."
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Edit3 className="h-8 w-8 text-blue-600" />
              Edit Options
            </h1>
            <p className="text-gray-500 mt-1">Configure your POS system settings and preferences</p>
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
                      onChange={(e) => setBusinessSettings({...businessSettings, businessName: e.target.value})}
                      placeholder="Enter business name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={businessSettings.gstNumber}
                      onChange={(e) => setBusinessSettings({...businessSettings, gstNumber: e.target.value})}
                      placeholder="Enter GST number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Textarea
                    id="address"
                    value={businessSettings.address}
                    onChange={(e) => setBusinessSettings({...businessSettings, address: e.target.value})}
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
                      onChange={(e) => setBusinessSettings({...businessSettings, phone: e.target.value})}
                      placeholder="+91-XXXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={businessSettings.email}
                      onChange={(e) => setBusinessSettings({...businessSettings, email: e.target.value})}
                      placeholder="business@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={businessSettings.currency} onValueChange={(value) => setBusinessSettings({...businessSettings, currency: value})}>
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
                  Receipt Configuration
                </CardTitle>
                <CardDescription>
                  Customize how your receipts look and what information they contain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="receiptWidth">Receipt Width</Label>
                    <Select value={receiptSettings.receiptWidth} onValueChange={(value) => setReceiptSettings({...receiptSettings, receiptWidth: value})}>
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
                    <Label htmlFor="copies">Number of Copies</Label>
                    <Input
                      id="copies"
                      type="number"
                      min="1"
                      max="5"
                      value={receiptSettings.copies}
                      onChange={(e) => setReceiptSettings({...receiptSettings, copies: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showLogo">Show Business Logo</Label>
                      <p className="text-sm text-gray-500">Display logo on receipts</p>
                    </div>
                    <Switch
                      id="showLogo"
                      checked={receiptSettings.showLogo}
                      onCheckedChange={(checked) => setReceiptSettings({...receiptSettings, showLogo: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showGST">Show GST Details</Label>
                      <p className="text-sm text-gray-500">Include GST information on receipts</p>
                    </div>
                    <Switch
                      id="showGST"
                      checked={receiptSettings.showGST}
                      onCheckedChange={(checked) => setReceiptSettings({...receiptSettings, showGST: checked})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headerText">Receipt Header Text</Label>
                  <Input
                    id="headerText"
                    value={receiptSettings.headerText}
                    onChange={(e) => setReceiptSettings({...receiptSettings, headerText: e.target.value})}
                    placeholder="Welcome message"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footerText">Receipt Footer Text</Label>
                  <Textarea
                    id="footerText"
                    value={receiptSettings.footerText}
                    onChange={(e) => setReceiptSettings({...receiptSettings, footerText: e.target.value})}
                    placeholder="Thank you message"
                    rows={2}
                  />
                </div>

                <Separator />

                <div className="flex justify-end">
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
                    <Select value={posSettings.taxCalculation} onValueChange={(value) => setPOSSettings({...posSettings, taxCalculation: value})}>
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
                    <Select value={posSettings.roundingMethod} onValueChange={(value) => setPOSSettings({...posSettings, roundingMethod: value})}>
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
                  <Select value={posSettings.defaultPaymentMethod} onValueChange={(value) => setPOSSettings({...posSettings, defaultPaymentMethod: value})}>
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
                      onCheckedChange={(checked) => setPOSSettings({...posSettings, quickSaleMode: checked})}
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
                      onCheckedChange={(checked) => setPOSSettings({...posSettings, barcodeScanning: checked})}
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
                      onCheckedChange={(checked) => setPOSSettings({...posSettings, customerRequired: checked})}
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
                      onCheckedChange={(checked) => setPOSSettings({...posSettings, discountEnabled: checked})}
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
