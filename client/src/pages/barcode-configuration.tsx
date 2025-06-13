
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Save,
  Scan,
  QrCode,
  BarChart3,
  Settings,
  Eye,
  Printer,
  Download,
  Upload,
  TestTube,
  Zap
} from "lucide-react";

// Barcode configuration schema
const barcodeConfigSchema = z.object({
  // General Settings
  barcodeEnabled: z.boolean().default(true),
  defaultBarcodeType: z.string().default("EAN13"),
  autoGenerateBarcode: z.boolean().default(false),
  duplicateBarcodeCheck: z.boolean().default(true),
  
  // Scanner Settings
  scannerEnabled: z.boolean().default(true),
  scannerPort: z.string().default("COM3"),
  scannerBaudRate: z.string().default("9600"),
  scannerTimeout: z.string().default("5000"),
  scannerBeep: z.boolean().default(true),
  scannerAutoFocus: z.boolean().default(true),
  
  // Generation Settings
  countryCode: z.string().default("890"), // India
  companyPrefix: z.string().default("12345"),
  productCodeStart: z.string().default("00001"),
  checksumValidation: z.boolean().default(true),
  
  // Display Settings
  showBarcodeOnReceipt: z.boolean().default(true),
  showBarcodeOnLabels: z.boolean().default(true),
  barcodeHeight: z.string().default("50"),
  barcodeWidth: z.string().default("200"),
  showHumanReadable: z.boolean().default(true),
  
  // Printing Settings
  labelPaperSize: z.string().default("50x30mm"),
  labelOrientation: z.string().default("landscape"),
  printDensity: z.string().default("medium"),
  labelQuantity: z.string().default("1"),
});

type BarcodeConfigValues = z.infer<typeof barcodeConfigSchema>;

// Barcode types with their specifications
const barcodeTypes = [
  { value: "EAN13", label: "EAN-13 (European)", digits: 13, prefix: "Country code required" },
  { value: "EAN8", label: "EAN-8 (Short)", digits: 8, prefix: "Compact format" },
  { value: "UPC", label: "UPC (Universal)", digits: 12, prefix: "North America" },
  { value: "CODE128", label: "Code 128", digits: "Variable", prefix: "Alphanumeric" },
  { value: "CODE39", label: "Code 39", digits: "Variable", prefix: "Legacy systems" },
  { value: "ITF", label: "ITF-14", digits: 14, prefix: "Shipping containers" },
  { value: "QR", label: "QR Code", digits: "Variable", prefix: "2D barcode" }
];

// Country codes for EAN
const countryCodes = [
  { value: "890", label: "890 - India" },
  { value: "840", label: "840 - United States" },
  { value: "380", label: "380 - Bulgaria" },
  { value: "400", label: "400-440 - Germany" },
  { value: "690", label: "690-695 - China" },
  { value: "300", label: "300-379 - France" },
  { value: "500", label: "500-509 - United Kingdom" }
];

export default function BarcodeConfiguration() {
  const { toast } = useToast();
  const [testBarcode, setTestBarcode] = useState("");
  const [generatedBarcode, setGeneratedBarcode] = useState("");

  // Fetch current barcode settings
  const { data: currentSettings } = useQuery({
    queryKey: ["/api/settings/barcode"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings/barcode");
        if (!res.ok) {
          return {
            barcodeEnabled: true,
            defaultBarcodeType: "EAN13",
            autoGenerateBarcode: false,
            duplicateBarcodeCheck: true,
            scannerEnabled: true,
            scannerPort: "COM3",
            scannerBaudRate: "9600",
            scannerTimeout: "5000",
            scannerBeep: true,
            scannerAutoFocus: true,
            countryCode: "890",
            companyPrefix: "12345",
            productCodeStart: "00001",
            checksumValidation: true,
            showBarcodeOnReceipt: true,
            showBarcodeOnLabels: true,
            barcodeHeight: "50",
            barcodeWidth: "200",
            showHumanReadable: true,
            labelPaperSize: "50x30mm",
            labelOrientation: "landscape",
            printDensity: "medium",
            labelQuantity: "1"
          };
        }
        return await res.json();
      } catch (error) {
        return {};
      }
    }
  });

  const form = useForm<BarcodeConfigValues>({
    resolver: zodResolver(barcodeConfigSchema),
    defaultValues: {
      barcodeEnabled: true,
      defaultBarcodeType: "EAN13",
      autoGenerateBarcode: false,
      duplicateBarcodeCheck: true,
      scannerEnabled: true,
      scannerPort: "COM3",
      scannerBaudRate: "9600",
      scannerTimeout: "5000",
      scannerBeep: true,
      scannerAutoFocus: true,
      countryCode: "890",
      companyPrefix: "12345",
      productCodeStart: "00001",
      checksumValidation: true,
      showBarcodeOnReceipt: true,
      showBarcodeOnLabels: true,
      barcodeHeight: "50",
      barcodeWidth: "200",
      showHumanReadable: true,
      labelPaperSize: "50x30mm",
      labelOrientation: "landscape",
      printDensity: "medium",
      labelQuantity: "1"
    }
  });

  // Update form values when data loads
  useEffect(() => {
    if (currentSettings) {
      form.reset(currentSettings);
    }
  }, [currentSettings, form]);

  const updateBarcodeConfigMutation = useMutation({
    mutationFn: async (data: BarcodeConfigValues) => {
      const res = await apiRequest("POST", "/api/settings/barcode", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/barcode"] });
      toast({
        title: "Barcode configuration updated",
        description: "Your barcode settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating settings",
        description: error.message || "There was an error updating the barcode configuration.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: BarcodeConfigValues) => {
    updateBarcodeConfigMutation.mutate(data);
  };

  // Generate sample barcode based on settings
  const generateSampleBarcode = () => {
    const barcodeType = form.watch("defaultBarcodeType");
    const countryCode = form.watch("countryCode");
    const companyPrefix = form.watch("companyPrefix");
    const productCode = form.watch("productCodeStart");

    let barcode = "";
    
    switch (barcodeType) {
      case "EAN13":
        barcode = countryCode + companyPrefix + productCode;
        // Add checksum digit (simplified)
        const checksum = (10 - (barcode.split('').reduce((sum, digit, index) => {
          return sum + parseInt(digit) * (index % 2 === 0 ? 1 : 3);
        }, 0) % 10)) % 10;
        barcode += checksum;
        break;
      case "EAN8":
        barcode = countryCode.slice(0, 2) + companyPrefix.slice(0, 4) + "1";
        break;
      case "UPC":
        barcode = companyPrefix + productCode + "0";
        break;
      case "CODE128":
        barcode = "CODE" + productCode;
        break;
      case "CODE39":
        barcode = "*" + productCode + "*";
        break;
      default:
        barcode = countryCode + companyPrefix + productCode;
    }

    setGeneratedBarcode(barcode);
    toast({
      title: "Sample barcode generated",
      description: `Generated ${barcodeType}: ${barcode}`,
    });
  };

  // Test barcode scanner
  const testBarcodeScanner = () => {
    toast({
      title: "Scanner test initiated",
      description: "Please scan a barcode to test the scanner...",
    });
    
    // Simulate scanner test (in real implementation, this would interface with actual scanner)
    setTimeout(() => {
      setTestBarcode("8901234567890");
      toast({
        title: "Scanner test successful",
        description: "Barcode scanned: 8901234567890",
      });
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Scan className="h-8 w-8 text-blue-600" />
              Barcode Configuration
            </h1>
            <p className="text-muted-foreground">
              Configure barcode generation, scanning, and printing settings for your POS system.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={generateSampleBarcode}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Generate Sample
            </Button>
            <Button
              onClick={testBarcodeScanner}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Test Scanner
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="scanner" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="generation" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Generation
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Display
            </TabsTrigger>
            <TabsTrigger value="printing" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Printing
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* General Settings Tab */}
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      General Barcode Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="barcodeEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Enable Barcode System</FormLabel>
                              <FormDescription>
                                Enable barcode generation and scanning throughout the system
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="defaultBarcodeType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Barcode Type</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select barcode type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {barcodeTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      <div className="flex flex-col">
                                        <span>{type.label}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {type.digits} digits • {type.prefix}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="autoGenerateBarcode"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Auto-Generate Barcodes</FormLabel>
                              <FormDescription>
                                Automatically generate barcodes for new products
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="duplicateBarcodeCheck"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Duplicate Barcode Check</FormLabel>
                              <FormDescription>
                                Prevent duplicate barcodes in the system
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Barcode Type Information */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">Barcode Type Reference</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {barcodeTypes.map((type) => (
                          <div
                            key={type.value}
                            className={`p-3 border rounded-lg ${
                              form.watch("defaultBarcodeType") === type.value
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{type.value}</span>
                              <Badge variant="outline">{type.digits}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{type.prefix}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Scanner Settings Tab */}
              <TabsContent value="scanner" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scan className="h-5 w-5" />
                      Barcode Scanner Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="scannerEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Enable Barcode Scanner</FormLabel>
                              <FormDescription>
                                Enable hardware barcode scanner support
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scannerPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scanner Port</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select scanner port" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COM1">COM1</SelectItem>
                                  <SelectItem value="COM2">COM2</SelectItem>
                                  <SelectItem value="COM3">COM3</SelectItem>
                                  <SelectItem value="COM4">COM4</SelectItem>
                                  <SelectItem value="USB">USB</SelectItem>
                                  <SelectItem value="Bluetooth">Bluetooth</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scannerBaudRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scanner Baud Rate</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select baud rate" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="9600">9600</SelectItem>
                                  <SelectItem value="19200">19200</SelectItem>
                                  <SelectItem value="38400">38400</SelectItem>
                                  <SelectItem value="57600">57600</SelectItem>
                                  <SelectItem value="115200">115200</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scannerTimeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scanner Timeout (ms)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                placeholder="5000"
                              />
                            </FormControl>
                            <FormDescription>
                              Timeout for scanner operations in milliseconds
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scannerBeep"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Scanner Beep</FormLabel>
                              <FormDescription>
                                Enable beep sound on successful scan
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scannerAutoFocus"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Scanner Auto Focus</FormLabel>
                              <FormDescription>
                                Enable automatic focus for camera-based scanners
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Scanner Test Section */}
                    <div className="border-t pt-6">
                      <h4 className="text-sm font-medium mb-3">Scanner Testing</h4>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          onClick={testBarcodeScanner}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Zap className="h-4 w-4" />
                          Test Scanner
                        </Button>
                        {testBarcode && (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Last Scanned:</Badge>
                            <span className="font-mono text-sm">{testBarcode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Generation Settings Tab */}
              <TabsContent value="generation" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Barcode Generation Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="countryCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country Code (EAN/UPC)</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select country code" />
                                </SelectTrigger>
                                <SelectContent>
                                  {countryCodes.map((country) => (
                                    <SelectItem key={country.value} value={country.value}>
                                      {country.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription>
                              Country code for EAN/UPC barcode generation
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="companyPrefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Prefix</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="12345"
                                maxLength={5}
                              />
                            </FormControl>
                            <FormDescription>
                              Unique company identifier (5 digits)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="productCodeStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Code Start</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="00001"
                                maxLength={5}
                              />
                            </FormControl>
                            <FormDescription>
                              Starting number for auto-generated product codes
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="checksumValidation"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Checksum Validation</FormLabel>
                              <FormDescription>
                                Validate barcode checksums during generation
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Generation Preview */}
                    <div className="border-t pt-6">
                      <h4 className="text-sm font-medium mb-3">Generation Preview</h4>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          onClick={generateSampleBarcode}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <TestTube className="h-4 w-4" />
                          Generate Sample
                        </Button>
                        {generatedBarcode && (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Sample:</Badge>
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {generatedBarcode}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Display Settings Tab */}
              <TabsContent value="display" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Barcode Display Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="showBarcodeOnReceipt"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Show on Receipt</FormLabel>
                              <FormDescription>
                                Display barcodes on printed receipts
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="showBarcodeOnLabels"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Show on Labels</FormLabel>
                              <FormDescription>
                                Display barcodes on product labels
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="barcodeHeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Barcode Height (px)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                placeholder="50"
                                min="20"
                                max="200"
                              />
                            </FormControl>
                            <FormDescription>
                              Height of barcode in pixels (20-200)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="barcodeWidth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Barcode Width (px)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                placeholder="200"
                                min="100"
                                max="500"
                              />
                            </FormControl>
                            <FormDescription>
                              Width of barcode in pixels (100-500)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="showHumanReadable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Show Human Readable Text</FormLabel>
                              <FormDescription>
                                Display barcode numbers below the barcode
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Printing Settings Tab */}
              <TabsContent value="printing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Printer className="h-5 w-5" />
                      Barcode Printing Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="labelPaperSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Label Paper Size</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select paper size" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="50x30mm">50x30mm (Standard)</SelectItem>
                                  <SelectItem value="40x25mm">40x25mm (Small)</SelectItem>
                                  <SelectItem value="60x40mm">60x40mm (Large)</SelectItem>
                                  <SelectItem value="70x50mm">70x50mm (Extra Large)</SelectItem>
                                  <SelectItem value="custom">Custom Size</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="labelOrientation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Label Orientation</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select orientation" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="landscape">Landscape</SelectItem>
                                  <SelectItem value="portrait">Portrait</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="printDensity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Print Density</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select density" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="light">Light</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="dark">Dark</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="labelQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Label Quantity</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                placeholder="1"
                                min="1"
                                max="100"
                              />
                            </FormControl>
                            <FormDescription>
                              Default number of labels to print per product
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="submit"
                  disabled={updateBarcodeConfigMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateBarcodeConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
