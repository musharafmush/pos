import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  Building2, 
  FileText, 
  DollarSign, 
  Calendar,
  Clock,
  MapPin,
  Upload,
  Info
} from "lucide-react";

// Form schema for business settings
const businessSettingsSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  currency: z.string().min(3, "Currency code is required"),
  currencySymbolPlacement: z.enum(["before", "after"]),
  defaultProfitPercent: z.string().min(0, "Profit percent must be positive"),
  timezone: z.string().min(1, "Timezone is required"),
  startDate: z.string().min(1, "Start date is required"),
  financialYearStartMonth: z.string().min(1, "Financial year start month is required"),
  stockAccountingMethod: z.string().min(1, "Stock accounting method is required"),
  transactionEditDays: z.string().min(0, "Transaction edit days must be positive"),
  dateFormat: z.string().min(1, "Date format is required"),
  timeFormat: z.string().min(1, "Time format is required"),
  currencyPrecision: z.string().min(0, "Currency precision must be positive"),
  quantityPrecision: z.string().min(0, "Quantity precision must be positive"),
});

type BusinessSettingsValues = z.infer<typeof businessSettingsSchema>;

// Sample data for dropdowns
const currencies = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
];

const timezones = [
  "America/Phoenix",
  "America/New_York", 
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Asia/Dubai",
];

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const stockAccountingMethods = [
  "FIFO (First In First Out)",
  "LIFO (Last In First Out)",
  "Average Cost",
];

const dateFormats = [
  "mm/dd/yyyy",
  "dd/mm/yyyy",
  "yyyy-mm-dd",
  "dd-mm-yyyy",
];

const timeFormats = [
  "12 Hour",
  "24 Hour",
];

export default function BusinessSettings() {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Fetch current business settings
  const { data: currentSettings } = useQuery({
    queryKey: ["/api/settings/business"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings/business");
        if (!res.ok) {
          return {
            businessName: "Awesome Shop",
            currency: "USD",
            currencySymbolPlacement: "before",
            defaultProfitPercent: "25.00",
            timezone: "America/Phoenix",
            startDate: "01/01/2018",
            financialYearStartMonth: "January",
            stockAccountingMethod: "FIFO (First In First Out)",
            transactionEditDays: "30",
            dateFormat: "mm/dd/yyyy",
            timeFormat: "24 Hour",
            currencyPrecision: "2",
            quantityPrecision: "2",
          };
        }
        return await res.json();
      } catch (error) {
        return {
          businessName: "Awesome Shop",
          currency: "USD",
          currencySymbolPlacement: "before",
          defaultProfitPercent: "25.00",
          timezone: "America/Phoenix",
          startDate: "01/01/2018",
          financialYearStartMonth: "January",
          stockAccountingMethod: "FIFO (First In First Out)",
          transactionEditDays: "30",
          dateFormat: "mm/dd/yyyy",
          timeFormat: "24 Hour",
          currencyPrecision: "2",
          quantityPrecision: "2",
        };
      }
    }
  });

  const form = useForm<BusinessSettingsValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      businessName: "Awesome Shop",
      currency: "USD",
      currencySymbolPlacement: "before",
      defaultProfitPercent: "25.00",
      timezone: "America/Phoenix",
      startDate: "01/01/2018",
      financialYearStartMonth: "January",
      stockAccountingMethod: "FIFO (First In First Out)",
      transactionEditDays: "30",
      dateFormat: "mm/dd/yyyy",
      timeFormat: "24 Hour",
      currencyPrecision: "2",
      quantityPrecision: "2",
    },
  });

  // Update form values when data loads
  React.useEffect(() => {
    if (currentSettings) {
      form.reset(currentSettings);
    }
  }, [currentSettings, form]);

  const updateBusinessMutation = useMutation({
    mutationFn: async (data: BusinessSettingsValues) => {
      const res = await apiRequest("PUT", "/api/settings/business", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/business"] });
      toast({
        title: "Business settings updated",
        description: "Your business settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating settings",
        description: error.message || "There was an error updating the business settings.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: BusinessSettingsValues) => {
    updateBusinessMutation.mutate(data);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      toast({
        title: "Logo uploaded",
        description: "Previous logo (if exists) will be replaced.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Settings</h1>
          <p className="text-muted-foreground">
            Configure your business information and operational settings.
          </p>
        </div>

        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="tax">Tax</TabsTrigger>
            <TabsTrigger value="product">Product</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="sale">Sale</TabsTrigger>
            <TabsTrigger value="pos">POS</TabsTrigger>
            <TabsTrigger value="display">Display Screen</TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Business Name: <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Awesome Shop" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date:</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency:</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencies.map((currency) => (
                                    <SelectItem key={currency.code} value={currency.code}>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono">{currency.symbol}</span>
                                        <span>{currency.name} ({currency.code})</span>
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
                        name="currencySymbolPlacement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency Symbol Placement:</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select placement" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="before">Before amount</SelectItem>
                                  <SelectItem value="after">After amount</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="defaultProfitPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Default profit percent: <Info className="h-4 w-4 text-muted-foreground" />
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="25.00" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time zone:</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timezones.map((tz) => (
                                    <SelectItem key={tz} value={tz}>
                                      {tz}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Upload Logo:</h3>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Browse
                        </Button>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        {logoFile ? (
                          <span className="text-sm text-muted-foreground">{logoFile.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Previous logo (if exists) will be replaced
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="financialYearStartMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Financial year start month: <Info className="h-4 w-4 text-muted-foreground" />
                            </FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent>
                                  {months.map((month) => (
                                    <SelectItem key={month} value={month}>
                                      {month}
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
                        name="stockAccountingMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Stock Accounting Method: <Info className="h-4 w-4 text-muted-foreground" />
                            </FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                  {stockAccountingMethods.map((method) => (
                                    <SelectItem key={method} value={method}>
                                      {method}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="transactionEditDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Transaction Edit Days: <Info className="h-4 w-4 text-muted-foreground" />
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="30" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateFormat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date Format: <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                  {dateFormats.map((format) => (
                                    <SelectItem key={format} value={format}>
                                      {format}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="timeFormat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Format: <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeFormats.map((format) => (
                                    <SelectItem key={format} value={format}>
                                      {format}
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
                        name="currencyPrecision"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Currency precision: <Info className="h-4 w-4 text-muted-foreground" />
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                max="4"
                                placeholder="2" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="quantityPrecision"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              Quantity precision: <Info className="h-4 w-4 text-muted-foreground" />
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                max="4"
                                placeholder="2" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button
                        type="submit"
                        disabled={updateBusinessMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {updateBusinessMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Placeholder tabs for other sections */}
          <TabsContent value="tax">
            <Card>
              <CardHeader>
                <CardTitle>Tax Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Tax configuration settings will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="product">
            <Card>
              <CardHeader>
                <CardTitle>Product Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Product configuration settings will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Contact Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Contact configuration settings will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sale">
            <Card>
              <CardHeader>
                <CardTitle>Sale Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Sale configuration settings will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pos">
            <Card>
              <CardHeader>
                <CardTitle>POS Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">POS configuration settings will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="display">
            <Card>
              <CardHeader>
                <CardTitle>Display Screen Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Display screen configuration settings will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}