
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AutoPrinter } from "@/components/pos/auto-printer";
import { ThermalPrinter } from "@/components/pos/thermal-printer";
import { useQuery } from "@tanstack/react-query";
import { 
  Zap, 
  Settings, 
  TestTube, 
  BookOpen, 
  AlertTriangle,
  CheckCircle,
  Info,
  Activity,
  Clock,
  Printer,
  RefreshCw
} from "lucide-react";

const AutoPrinterSetup: React.FC = () => {
  const { toast } = useToast();
  const [autoPrinterSettings, setAutoPrinterSettings] = useState({
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
  const [printQueue, setPrintQueue] = useState(0);
  const [autoPrinterStatus, setAutoPrinterStatus] = useState('active');
  const [lastPrintTime, setLastPrintTime] = useState<Date | null>(null);

  // Fetch receipt settings for real-time data
  const { data: receiptSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/settings/receipt'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Fetch recent sales for print queue simulation
  const { data: recentSales, isLoading: isLoadingSales } = useQuery({
    queryKey: ['/api/sales'],
    refetchInterval: 3000 // Refresh every 3 seconds
  });

  // Load auto-printer settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('autoPrinterSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setAutoPrinterSettings(prev => ({ ...prev, ...parsed }));
    }
  }, []);

  // Simulate print queue based on recent sales
  useEffect(() => {
    if (recentSales && Array.isArray(recentSales)) {
      const todaysSales = recentSales.filter((sale: any) => {
        const saleDate = new Date(sale.createdAt);
        const today = new Date();
        return saleDate.toDateString() === today.toDateString();
      });
      setPrintQueue(todaysSales.length);
      
      if (todaysSales.length > 0) {
        setLastPrintTime(new Date(todaysSales[0].createdAt));
      }
    }
  }, [recentSales]);

  const handleAutoPrinterSettingsChange = (settings: any) => {
    setAutoPrinterSettings(settings);
    // Save settings to localStorage
    localStorage.setItem('autoPrinterSettings', JSON.stringify(settings));
    
    if (!settings.quietMode) {
      toast({
        title: "Settings Saved",
        description: "Auto-printer settings have been updated"
      });
    }
  };

  const integrationSteps = [
    {
      title: "POS Integration",
      description: "Auto-printer integrates with your POS system automatically",
      status: "completed",
      details: "When you complete a sale in POS, it will automatically be added to the print queue"
    },
    {
      title: "Thermal Printer Setup",
      description: "Configure your thermal printer first",
      status: "required",
      details: "Go to Thermal Printer Setup tab to configure your printer before using auto-printer"
    },
    {
      title: "Queue Management",
      description: "Auto-printer manages print jobs in a queue",
      status: "info",
      details: "Failed prints are automatically retried based on your retry settings"
    },
    {
      title: "Global Integration",
      description: "Works across all POS interfaces",
      status: "completed",
      details: "Auto-printer works with POS Classic, Enhanced, and GoFrugal interfaces"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'required': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
      default: return <Settings className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="secondary" className="bg-green-100 text-green-800">Ready</Badge>;
      case 'required': return <Badge variant="destructive">Setup Required</Badge>;
      case 'info': return <Badge variant="outline">Info</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Auto-Printer Setup</h1>
            <p className="text-muted-foreground">
              Configure automatic receipt printing for your POS system
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={autoPrinterStatus === 'active' ? 'default' : 'secondary'} className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {autoPrinterStatus === 'active' ? 'Active' : 'Inactive'}
            </Badge>
            {!isLoadingSettings && !isLoadingSales && (
              <Badge variant="outline" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Live Data
              </Badge>
            )}
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Documentation
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Advanced
            </Button>
          </div>
        </div>

        {/* Real-time Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Print Queue</p>
                  <p className="text-2xl font-bold text-blue-600">{printQueue}</p>
                </div>
                <Printer className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-lg font-semibold text-green-600">
                    {autoPrinterSettings.enableAutoPrint ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <CheckCircle className={`w-8 h-8 ${autoPrinterSettings.enableAutoPrint ? 'text-green-500' : 'text-gray-400'}`} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paper Width</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {receiptSettings?.paperWidth || '77mm'}
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
                  <p className="text-sm font-medium text-gray-600">Last Print</p>
                  <p className="text-sm font-medium text-gray-800">
                    {lastPrintTime ? lastPrintTime.toLocaleTimeString() : 'None'}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="autoprinter" className="space-y-4">
          <TabsList>
            <TabsTrigger value="autoprinter">Auto-Printer</TabsTrigger>
            <TabsTrigger value="thermal">Thermal Printer</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
            <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
          </TabsList>

          <TabsContent value="autoprinter">
            <AutoPrinter 
              onSettingsChange={handleAutoPrinterSettingsChange}
              initialSettings={autoPrinterSettings}
            />
          </TabsContent>

          <TabsContent value="thermal">
            <ThermalPrinter 
              onPrint={(data) => console.log('Manual print:', data)}
            />
          </TabsContent>

          <TabsContent value="integration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Integration Status</CardTitle>
                <CardDescription>
                  Check the integration status of auto-printer with your POS system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integrationSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(step.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{step.title}</h4>
                          {getStatusBadge(step.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                        <p className="text-xs text-gray-500">{step.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>
                  Understanding the auto-printer workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">1</div>
                    <div>
                      <h4 className="font-medium">Sale Completion</h4>
                      <p className="text-sm text-gray-600">When you complete a sale in any POS interface</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">2</div>
                    <div>
                      <h4 className="font-medium">Queue Addition</h4>
                      <p className="text-sm text-gray-600">Sale data is automatically added to the print queue</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">3</div>
                    <div>
                      <h4 className="font-medium">Auto Processing</h4>
                      <p className="text-sm text-gray-600">Queue is processed automatically with your configured delay</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">4</div>
                    <div>
                      <h4 className="font-medium">Receipt Printing</h4>
                      <p className="text-sm text-gray-600">Receipt is printed to your thermal printer with retry logic</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="troubleshoot" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Common Issues & Solutions</CardTitle>
                <CardDescription>
                  Troubleshoot auto-printer problems
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
                      window.location.reload();
                    }}
                  >
                    Reset Auto-Printer Settings
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if ((window as any).autoPrinterAddToQueue) {
                        toast({
                          title: "✅ Auto-Printer Active",
                          description: "Auto-printer integration is working correctly"
                        });
                      } else {
                        toast({
                          title: "❌ Integration Issue",
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
};

export default AutoPrinterSetup;
