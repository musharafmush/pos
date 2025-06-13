import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme } from "@/components/ui/theme-provider";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { PrinterIcon, DollarSignIcon, BellIcon, ShieldIcon, UserIcon, DatabaseIcon } from 'lucide-react';
import ReceiptSettings from './receipt-settings';

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Must provide a valid email").or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
  image: z.string().optional().or(z.literal(""))
})
.refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [showReceiptSettings, setShowReceiptSettings] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);

  // Load current user data
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          return { user: null };
        }
        throw new Error('Failed to fetch user');
      }
      return response.json();
    }
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      image: ""
    },
  });

  // Set form default values when user data is loaded
  useEffect(() => {
    if (userData?.user) {
      profileForm.reset({
        name: userData.user.name || "",
        email: userData.user.email || "",
        password: "",
        confirmPassword: "",
        image: userData.user.image || ""
      });
    }
  }, [userData, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const userId = userData.user.id;
      const updateData = {
        name: data.name,
        email: data.email,
        image: data.image
      };

      // Only include password if it's provided
      if (data.password) {
        Object.assign(updateData, { password: data.password });
      }

      return await apiRequest("PUT", `/api/users/${userId}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Receipt settings form state
  const [receiptSettings, setReceiptSettings] = useState({
    businessName: "LARAVEL POS SYSTEM",
    address: "1234 Main Street\nCity, State 12345",
    phone: "(123) 456-7890",
    taxId: "",
    receiptFooter: "Thank you for shopping with us!",
    showLogo: false,
    printAutomatically: true,
    defaultPrinter: "default"
  });

  // Load receipt settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('receiptSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setReceiptSettings({
        businessName: settings.businessName || "AWESOME SHOP POS",
        address: settings.businessAddress || "123 Main Street\nCity, State 560001",
        phone: settings.phoneNumber || "(123) 456-7890",
        taxId: settings.taxId || "",
        receiptFooter: settings.receiptFooter || "Thank you for shopping with us!",
        showLogo: settings.showLogo || false,
        printAutomatically: settings.autoPrint || true,
        defaultPrinter: settings.defaultPrinter || "default"
      });
    }
  }, []);

  const saveReceiptSettings = () => {
    const settingsToSave = {
      businessName: receiptSettings.businessName,
      businessAddress: receiptSettings.address,
      phoneNumber: receiptSettings.phone,
      taxId: receiptSettings.taxId,
      receiptFooter: receiptSettings.receiptFooter,
      showLogo: receiptSettings.showLogo,
      autoPrint: receiptSettings.printAutomatically,
      defaultPrinter: receiptSettings.defaultPrinter
    };
    
    localStorage.setItem('receiptSettings', JSON.stringify(settingsToSave));
    toast({
      title: "Settings updated",
      description: "Receipt settings have been saved successfully",
    });
  };

  // Data management handlers
  const handleBackupData = async () => {
    try {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      const result = await response.json();
      
      // Download the backup file
      const downloadResponse = await fetch('/api/backup/download', {
        credentials: 'include'
      });
      
      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pos-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Backup created successfully",
          description: "Your data has been backed up and downloaded",
        });
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        title: "Backup failed",
        description: "Failed to create backup. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleClearData = async () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will permanently delete ALL your data including products, sales, purchases, customers, and suppliers. This action cannot be undone.\n\nAre you absolutely sure you want to continue?"
    );

    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      "This is your final warning. All data will be lost forever. Type 'DELETE' in the next prompt to confirm."
    );

    if (!doubleConfirmed) return;

    const finalConfirmation = window.prompt(
      "Type 'DELETE' (in capital letters) to confirm data deletion:"
    );

    if (finalConfirmation !== 'DELETE') {
      toast({
        title: "Data deletion cancelled",
        description: "Confirmation text did not match. Your data is safe.",
      });
      return;
    }

    try {
      const response = await fetch('/api/data/clear', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to clear data');
      }

      queryClient.clear();
      
      toast({
        title: "All data cleared",
        description: "All data has been permanently deleted from the system",
      });

      // Refresh the page to reset the application state
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Clear data error:', error);
      toast({
        title: "Failed to clear data",
        description: "An error occurred while clearing data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRestoreFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedBackupFile(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a valid JSON backup file",
        variant: "destructive"
      });
    }
  };

  const handleRestoreData = async () => {
    if (!selectedBackupFile) return;

    const confirmed = window.confirm(
      "⚠️ WARNING: This will replace ALL current data with the backup data. Current data will be lost. Are you sure you want to continue?"
    );

    if (!confirmed) return;

    try {
      const formData = new FormData();
      formData.append('backup', selectedBackupFile);

      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to restore backup');
      }

      queryClient.clear();
      
      toast({
        title: "Data restored successfully",
        description: "Your backup has been restored successfully",
      });

      // Refresh the page to reload the restored data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: "Restore failed",
        description: "Failed to restore backup. Please check the file and try again.",
        variant: "destructive"
      });
    }
  };

  const generateTestReceipt = () => `
${receiptSettings.businessName}
Professional Retail Solution
${receiptSettings.taxId ? `GST No: ${receiptSettings.taxId} | ` : ''}Ph: ${receiptSettings.phone}
${receiptSettings.address}
-------------------------------
Bill No: POS1749631206824
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
Cashier: ${userData?.user?.name || "Admin User"}
-------------------------------
Customer Details:
Name: Walk-in Customer
-------------------------------
Item                Qty  Rate    Amt
-------------------------------
rice (250g Pack)     1   ₹100   ₹100
ITM26497399-REPACK-2500-1749547699598
MRP: ₹120 (You Save: ₹20)
-------------------------------
Sub Total:                 ₹100
Taxable Amount:            ₹100
GST (0%):                   ₹0
-------------------------------
GRAND TOTAL:              ₹100

Payment Method:           CASH
Amount Paid:              ₹100
-------------------------------
${receiptSettings.receiptFooter}
  `;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
        </div>

        <Tabs defaultValue="profile" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="receipts">Receipt Settings</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
            <TabsTrigger value="tax">Tax Settings</TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your personal information and password</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="relative">
                        <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                          {profileForm.watch("image") ? (
                            <img 
                              src={profileForm.watch("image")} 
                              alt="Profile" 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-gray-400">
                              {userData?.user?.name?.charAt(0) || "U"}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{userData?.user?.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{userData?.user?.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Your email" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Image URL</FormLabel>
                          <FormControl>
                            <Input placeholder="URL to your profile image" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input placeholder="Leave blank to keep current" type="password" {...field} />
                            </FormControl>
                            <FormDescription>
                              At least 6 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input placeholder="Leave blank to keep current" type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end mt-6">
                      <Button 
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={theme}
                      onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color Mode Preview</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 bg-white text-black">
                      <h3 className="text-lg font-medium mb-2">Light Mode</h3>
                      <div className="flex space-x-2">
                        <div className="h-8 w-8 rounded-full bg-primary"></div>
                        <div className="h-8 w-8 rounded-full bg-secondary"></div>
                        <div className="h-8 w-8 rounded-full bg-muted"></div>
                        <div className="h-8 w-8 rounded-full bg-accent"></div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-gray-900 text-white">
                      <h3 className="text-lg font-medium mb-2">Dark Mode</h3>
                      <div className="flex space-x-2">
                        <div className="h-8 w-8 rounded-full bg-primary"></div>
                        <div className="h-8 w-8 rounded-full bg-secondary"></div>
                        <div className="h-8 w-8 rounded-full bg-muted"></div>
                        <div className="h-8 w-8 rounded-full bg-accent"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="animations">UI Animations</Label>
                    <Switch id="animations" defaultChecked />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enable or disable UI animations for smoother experience
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compact">Compact Mode</Label>
                    <Switch id="compact" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Reduce spacing between elements for a more compact view
                  </p>
                </div>

                <div className="flex justify-end mt-6">
                  <Button>
                    Save Appearance Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipt Settings */}
          <TabsContent value="receipts">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Receipt Settings</CardTitle>
                  <CardDescription>Configure how receipts are generated and printed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input 
                      id="businessName" 
                      placeholder="Your Business Name" 
                      value={receiptSettings.businessName}
                      onChange={(e) => setReceiptSettings(prev => ({ ...prev, businessName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Business Address</Label>
                    <Textarea 
                      id="address" 
                      placeholder="Business Address" 
                      value={receiptSettings.address}
                      onChange={(e) => setReceiptSettings(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      placeholder="(123) 456-7890" 
                      value={receiptSettings.phone}
                      onChange={(e) => setReceiptSettings(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / GST Number</Label>
                    <Input 
                      id="taxId" 
                      placeholder="Your tax ID number" 
                      value={receiptSettings.taxId}
                      onChange={(e) => setReceiptSettings(prev => ({ ...prev, taxId: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receiptFooter">Receipt Footer</Label>
                    <Textarea 
                      id="receiptFooter" 
                      placeholder="Custom message for receipt footer" 
                      value={receiptSettings.receiptFooter}
                      onChange={(e) => setReceiptSettings(prev => ({ ...prev, receiptFooter: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showLogo">Show Logo</Label>
                      <Switch 
                        id="showLogo" 
                        checked={receiptSettings.showLogo}
                        onCheckedChange={(checked) => setReceiptSettings(prev => ({ ...prev, showLogo: checked }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="printAutomatically">Print Automatically</Label>
                      <Switch 
                        id="printAutomatically" 
                        checked={receiptSettings.printAutomatically}
                        onCheckedChange={(checked) => setReceiptSettings(prev => ({ ...prev, printAutomatically: checked }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="printerSelect">Default Printer</Label>
                    <Select 
                      value={receiptSettings.defaultPrinter}
                      onValueChange={(value) => setReceiptSettings(prev => ({ ...prev, defaultPrinter: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a printer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">System Default Printer</SelectItem>
                        <SelectItem value="thermal">Thermal Receipt Printer</SelectItem>
                        <SelectItem value="inkjet">Office Inkjet Printer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button 
                      type="button"
                      onClick={() => {
                        saveReceiptSettings();
                        setReceiptPreview(generateTestReceipt());
                      }}
                    >
                      Save Receipt Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Receipt Preview</CardTitle>
                  <CardDescription>Preview how your receipt will look</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border border-gray-200 rounded-lg p-6 font-mono text-sm overflow-auto max-h-[600px] text-black">
                    <pre className="whitespace-pre-wrap">
                      {receiptPreview || generateTestReceipt()}
                    </pre>
                  </div>
                  <div className="flex justify-between mt-4">
                    <Button 
                      variant="outline"
                      onClick={() => setReceiptPreview(generateTestReceipt())}
                    >
                      Refresh Preview
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const printWindow = window.open('', '_blank', 'width=400,height=700');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Test Receipt</title>
                                <style>
                                  body { font-family: monospace; margin: 20px; }
                                  pre { white-space: pre-wrap; }
                                </style>
                              </head>
                              <body>
                                <pre>${receiptPreview || generateTestReceipt()}</pre>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}
                    >
                      Print Test Receipt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Management */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseIcon className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Backup your data or clear all data from the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Backup Section */}
                  <div className="border rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <DatabaseIcon className="h-5 w-5" />
                      <h3 className="font-semibold">Backup Data</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create a complete backup of your POS data including products, sales, purchases, customers, and suppliers.
                    </p>
                    <div className="space-y-2">
                      <Button 
                        onClick={handleBackupData}
                        className="w-full"
                        variant="outline"
                      >
                        <DatabaseIcon className="h-4 w-4 mr-2" />
                        Create Backup
                      </Button>
                      <p className="text-xs text-gray-500">
                        Backup will be saved to your downloads folder
                      </p>
                    </div>
                  </div>

                  {/* Clear Data Section */}
                  <div className="border rounded-lg p-6 space-y-4 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <ShieldIcon className="h-5 w-5" />
                      <h3 className="font-semibold">Clear All Data</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Permanently delete all data from the system. This action cannot be undone.
                    </p>
                    <div className="space-y-2">
                      <Button 
                        onClick={handleClearData}
                        className="w-full"
                        variant="destructive"
                      >
                        <ShieldIcon className="h-4 w-4 mr-2" />
                        Clear All Data
                      </Button>
                      <p className="text-xs text-red-500">
                        ⚠️ This will delete all your data permanently
                      </p>
                    </div>
                  </div>
                </div>

                {/* Restore Section */}
                <div className="border-t pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <DatabaseIcon className="h-5 w-5" />
                      <h3 className="font-semibold">Restore from Backup</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Restore your data from a previously created backup file.
                    </p>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreFile}
                        className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <Button 
                        onClick={handleRestoreData}
                        disabled={!selectedBackupFile}
                        variant="outline"
                      >
                        Restore Data
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Settings */}
          <TabsContent value="tax">
            <Card>
              <CardHeader>
                <CardTitle>Tax Settings</CardTitle>
                <CardDescription>Configure tax rates and calculation methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                    <Input 
                      id="defaultTaxRate" 
                      type="number" 
                      placeholder="Enter tax rate" 
                      defaultValue="7"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This rate will be applied to all sales by default
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxCalculation">Tax Calculation Method</Label>
                    <Select defaultValue="afterDiscount">
                      <SelectTrigger>
                        <SelectValue placeholder="Select calculation method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="afterDiscount">Calculate after discount</SelectItem>
                        <SelectItem value="beforeDiscount">Calculate before discount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="taxIncluded">Prices include tax</Label>
                    <Switch id="taxIncluded" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    If enabled, entered product prices are considered tax-inclusive
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="multipleTaxes">Enable multiple tax rates</Label>
                    <Switch id="multipleTaxes" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Allow different tax rates for different product categories
                  </p>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-medium mb-4">Tax Categories</h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="col-span-2">
                        <Label htmlFor="foodCategory">Food & Groceries</Label>
                      </div>
                      <div>
                        <Input 
                          id="foodCategory" 
                          type="number" 
                          defaultValue="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="col-span-2">
                        <Label htmlFor="generalCategory">General Merchandise</Label>
                      </div>
                      <div>
                        <Input 
                          id="generalCategory" 
                          type="number" 
                          defaultValue="7"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Tax Category
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={() => {
                    toast({
                      title: "Tax settings updated",
                      description: "Tax settings have been saved successfully",
                    });
                  }}>
                    Save Tax Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Receipt Settings Modal */}
      {showReceiptSettings && (
        <ReceiptSettings />
      )}
    </DashboardLayout>
  );
}

// Placeholder icon to make the page compile
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}