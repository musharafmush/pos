
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ThermalPrinter from "@/components/pos/thermal-printer";
import { Printer, Settings, TestTube, FileText, Zap } from "lucide-react";

const ThermalPrinterSetup: React.FC = () => {
  const { toast } = useToast();
  const [printerSettings, setPrinterSettings] = useState({});

  const handlePrint = (receiptData: any) => {
    console.log('Printing receipt:', receiptData);
  };

  const handleSettingsChange = (settings: any) => {
    setPrinterSettings(settings);
    // Save settings to localStorage or backend
    localStorage.setItem('thermalPrinterSettings', JSON.stringify(settings));
    
    toast({
      title: "Settings Saved",
      description: "Thermal printer settings have been updated"
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Thermal Printer Setup</h1>
            <p className="text-muted-foreground">
              Configure and manage your thermal receipt printer
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Manual
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Advanced
            </Button>
          </div>
        </div>

        <Tabs defaultValue="setup" className="space-y-4">
          <TabsList>
            <TabsTrigger value="setup">Printer Setup</TabsTrigger>
            <TabsTrigger value="test">Test & Debug</TabsTrigger>
            <TabsTrigger value="templates">Receipt Templates</TabsTrigger>
            <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
          </TabsList>

          <TabsContent value="setup">
            <ThermalPrinter 
              onPrint={handlePrint}
              settings={printerSettings}
              onSettingsChange={handleSettingsChange}
            />
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Connection Test
                  </Button>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Text Alignment Test
                  </Button>
                  <Button variant="outline">
                    <Zap className="h-4 w-4 mr-2" />
                    Print Quality Test
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Cut Test
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-2">Test Results</h4>
                  <div className="text-sm text-gray-600">
                    No tests performed yet. Click any test button above to begin.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Thermal Receipt Templates</CardTitle>
                <CardDescription>
                  Optimized templates for thermal printers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Standard Receipt</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Standard format for 80mm thermal printers
                    </p>
                    <Button size="sm" variant="outline">Use Template</Button>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Compact Receipt</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Compact format for 58mm thermal printers
                    </p>
                    <Button size="sm" variant="outline">Use Template</Button>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Detailed Receipt</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Detailed format with extra information
                    </p>
                    <Button size="sm" variant="outline">Use Template</Button>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Custom Template</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Create your own custom template
                    </p>
                    <Button size="sm">Create New</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="troubleshoot" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>🖨️ Xprinter XP-420B Configuration Guide</CardTitle>
                <CardDescription>
                  Optimal settings for Xprinter XP-420B thermal receipt printer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">📋 Step-by-Step Configuration</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div><strong>1. Set Custom Paper Size:</strong></div>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Control Panel → Devices and Printers</li>
                      <li>Right-click Xprinter XP-420B → Printing Preferences</li>
                      <li>Advanced/Page Setup → Width: 72mm, Height: 297mm</li>
                      <li>Save as "Thermal Receipt"</li>
                    </ul>
                    
                    <div className="mt-3"><strong>2. Print Dialog Settings:</strong></div>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>More Settings → Margins: None</li>
                      <li>Background Graphics: ✅ Enabled</li>
                      <li>Scale: 100%</li>
                      <li>Paper Size: 72mm x Receipt</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3 bg-green-50">
                    <h4 className="font-medium text-sm text-green-900">✅ Correct Settings</h4>
                    <ul className="text-sm text-green-800 mt-1 space-y-1">
                      <li>• Paper: 72mm × 297mm</li>
                      <li>• Margins: None (0mm)</li>
                      <li>• Scale: 100%</li>
                      <li>• Background Graphics: ON</li>
                      <li>• Driver: Official Xprinter</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-3 bg-red-50">
                    <h4 className="font-medium text-sm text-red-900">❌ Common Issues</h4>
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

            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting Guide</CardTitle>
                <CardDescription>
                  Common issues and solutions for thermal printers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium text-sm">Printer Not Connecting</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Check USB cable, power supply, and driver installation
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium text-sm">Poor Print Quality</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Adjust print density, check paper quality, clean print head
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium text-sm">Paper Jam</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Turn off printer, remove paper carefully, check paper guides
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium text-sm">Characters Not Printing</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Check character set settings, ensure proper encoding
                    </p>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  Run Diagnostic Test
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ThermalPrinterSetup;
