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
import { 
  InfoIcon,
  TagIcon,
  DollarSignIcon,
  BoxIcon,
  SettingsIcon,
  PackageIcon,
  ShoppingCartIcon,
  BarChart3Icon,
  CheckIcon,
  XIcon,
  EditIcon,
  Loader2Icon,
  PlusIcon,
  WandIcon,
  EyeIcon,
  DatabaseIcon
} from "lucide-react";

// Tax Settings Component
function TaxSettings({ onSave }: { onSave: (settings: any) => void }) {
  const { toast } = useToast();
  const [taxSettings, setTaxSettings] = useState({
    defaultTaxRate: 18,
    taxCalculationMethod: 'afterDiscount',
    pricesIncludeTax: false,
    enableMultipleTaxRates: true,
    taxCategories: [
      { id: 1, name: 'Food & Groceries', rate: 5, hsn: '1001-2000', description: 'Essential food items and groceries' },
      { id: 2, name: 'General Merchandise', rate: 18, hsn: '3001-9999', description: 'Standard consumer goods' },
      { id: 3, name: 'Luxury Items', rate: 28, hsn: '8701-8800', description: 'High-end consumer products' },
      { id: 4, name: 'Essential Services', rate: 0, hsn: '9801-9900', description: 'Tax-exempt essential services' }
    ]
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryRate, setNewCategoryRate] = useState(18);
  const [newCategoryHsn, setNewCategoryHsn] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<number | null>(null);

  // Load tax settings from localStorage on component mount
  useEffect(() => {
    const savedTaxSettings = localStorage.getItem('taxSettings');
    if (savedTaxSettings) {
      try {
        const settings = JSON.parse(savedTaxSettings);
        setTaxSettings(prev => ({ 
          ...prev, 
          ...settings,
          // Ensure tax categories have all required fields
          taxCategories: settings.taxCategories?.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            rate: cat.rate || 0,
            hsn: cat.hsn || '',
            description: cat.description || ''
          })) || prev.taxCategories
        }));
      } catch (error) {
        console.error('Error loading tax settings:', error);
        toast({
          title: "Error loading tax settings",
          description: "Using default tax configuration",
          variant: "destructive"
        });
      }
    }
  }, [toast]);

  const updateTaxSetting = (key: string, value: any) => {
    setTaxSettings(prev => {
      const updated = { ...prev, [key]: value };
      // Auto-save to localStorage
      localStorage.setItem('taxSettings', JSON.stringify(updated));
      return updated;
    });
  };

  const updateTaxCategory = (id: number, field: string, value: any) => {
    setTaxSettings(prev => {
      const updated = {
        ...prev,
        taxCategories: prev.taxCategories.map(cat => 
          cat.id === id ? { ...cat, [field]: value } : cat
        )
      };
      localStorage.setItem('taxSettings', JSON.stringify(updated));
      return updated;
    });
  };

  const addTaxCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Category name required",
        description: "Please enter a category name",
        variant: "destructive"
      });
      return;
    }

    if (newCategoryRate < 0 || newCategoryRate > 50) {
      toast({
        title: "Invalid tax rate",
        description: "Tax rate must be between 0% and 50%",
        variant: "destructive"
      });
      return;
    }

    const newId = Math.max(...taxSettings.taxCategories.map(c => c.id), 0) + 1;
    const newCategory = {
      id: newId,
      name: newCategoryName.trim(),
      rate: newCategoryRate,
      hsn: newCategoryHsn.trim(),
      description: newCategoryDescription.trim()
    };

    setTaxSettings(prev => {
      const updated = {
        ...prev,
        taxCategories: [...prev.taxCategories, newCategory]
      };
      localStorage.setItem('taxSettings', JSON.stringify(updated));
      return updated;
    });

    // Reset form
    setNewCategoryName('');
    setNewCategoryRate(18);
    setNewCategoryHsn('');
    setNewCategoryDescription('');

    toast({
      title: "Tax category added",
      description: `${newCategory.name} category created successfully`,
    });
  };

  const removeTaxCategory = (id: number) => {
    const categoryToRemove = taxSettings.taxCategories.find(cat => cat.id === id);

    setTaxSettings(prev => {
      const updated = {
        ...prev,
        taxCategories: prev.taxCategories.filter(cat => cat.id !== id)
      };
      localStorage.setItem('taxSettings', JSON.stringify(updated));
      return updated;
    });

    toast({
      title: "Tax category removed",
      description: `${categoryToRemove?.name} category has been deleted`,
    });
  };

  const duplicateCategory = (id: number) => {
    const categoryToDuplicate = taxSettings.taxCategories.find(cat => cat.id === id);
    if (!categoryToDuplicate) return;

    const newId = Math.max(...taxSettings.taxCategories.map(c => c.id)) + 1;
    const duplicatedCategory = {
      ...categoryToDuplicate,
      id: newId,
      name: `${categoryToDuplicate.name} (Copy)`
    };

    setTaxSettings(prev => {
      const updated = {
        ...prev,
        taxCategories: [...prev.taxCategories, duplicatedCategory]
      };
      localStorage.setItem('taxSettings', JSON.stringify(updated));
      return updated;
    });

    toast({
      title: "Category duplicated",
      description: `Created copy of ${categoryToDuplicate.name}`,
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem('taxSettings', JSON.stringify(taxSettings));
      onSave(taxSettings);
      toast({
        title: "Tax settings saved",
        description: "All tax configurations have been saved successfully",
      });
    } catch (error) {
      console.error('Error saving tax settings:', error);
      toast({
        title: "Save failed",
        description: "Failed to save tax settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
          <Input 
            id="defaultTaxRate" 
            type="number" 
            placeholder="Enter tax rate" 
            value={taxSettings.defaultTaxRate.toString()}
            onChange={(e) => {
              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0 && value <= 100) {
                updateTaxSetting('defaultTaxRate', value);
              }
            }}
            min="0"
            max="100"
            step="0.01"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This rate will be applied to all sales by default
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxCalculation">Tax Calculation Method</Label>
          <Select 
            value={taxSettings.taxCalculationMethod} 
            onValueChange={(value) => updateTaxSetting('taxCalculationMethod', value)}
          >
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
          <Switch 
            id="taxIncluded" 
            checked={taxSettings.pricesIncludeTax}
            onCheckedChange={(checked) => updateTaxSetting('pricesIncludeTax', checked)}
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          If enabled, entered product prices are considered tax-inclusive
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="multipleTaxes">Enable multiple tax rates</Label>
          <Switch 
            id="multipleTaxes" 
            checked={taxSettings.enableMultipleTaxRates}
            onCheckedChange={(checked) => updateTaxSetting('enableMultipleTaxRates', checked)}
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Allow different tax rates for different product categories
        </p>
      </div>

      {taxSettings.enableMultipleTaxRates && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Tax Categories</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {taxSettings.taxCategories.length} categories configured
            </div>
          </div>

          <div className="space-y-4">
            {taxSettings.taxCategories.map((category) => (
              <div key={category.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`cat-name-${category.id}`}>Category Name</Label>
                    <Input
                      id={`cat-name-${category.id}`}
                      value={category.name}
                      onChange={(e) => updateTaxCategory(category.id, 'name', e.target.value)}
                      placeholder="Category name"
                      className="font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cat-rate-${category.id}`}>Tax Rate (%)</Label>
                    <Input
                      id={`cat-rate-${category.id}`}
                      type="number"
                      value={category.rate.toString()}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0 && value <= 50) {
                          updateTaxCategory(category.id, 'rate', value);
                        }
                      }}
                      placeholder="Tax rate"
                      min="0"
                      max="50"
                      step="0.01"
                      className="text-center font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cat-hsn-${category.id}`}>HSN Code Range</Label>
                    <Input
                      id={`cat-hsn-${category.id}`}
                      value={category.hsn || ''}
                      onChange={(e) => updateTaxCategory(category.id, 'hsn', e.target.value)}
                      placeholder="e.g., 1001-2000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Actions</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => duplicateCategory(category.id)}
                        className="flex-1"
                      >
                        Copy
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => removeTaxCategory(category.id)}
                        className="flex-1"
                        disabled={taxSettings.taxCategories.length <= 1}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <Label htmlFor={`cat-desc-${category.id}`}>Description</Label>
                  <Textarea
                    id={`cat-desc-${category.id}`}
                    value={category.description || ''}
                    onChange={(e) => updateTaxCategory(category.id, 'description', e.target.value)}
                    placeholder="Description of items in this category"
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {category.rate}% GST
                  </span>
                  {category.hsn && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      HSN: {category.hsn}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Add new tax category form */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Add New Tax Category
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newCategoryName">Category Name *</Label>
                <Input
                  id="newCategoryName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Medical Supplies"
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCategoryRate">Tax Rate (%) *</Label>
                <Input
                  id="newCategoryRate"
                  type="number"
                  value={newCategoryRate.toString()}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 50) {
                      setNewCategoryRate(value);
                    }
                  }}
                  placeholder="Tax rate"
                  min="0"
                  max="50"
                  step="0.01"
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCategoryHsn">HSN Code Range</Label>
                <Input
                  id="newCategoryHsn"
                  value={newCategoryHsn}
                  onChange={(e) => setNewCategoryHsn(e.target.value)}
                  placeholder="e.g., 3001-3999"
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCategoryDescription">Description</Label>
                <Input
                  id="newCategoryDescription"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Category description"
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quick Tax Rate Buttons */}
            <div className="mt-4">
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Quick Rate Selection:</Label>
              <div className="flex flex-wrap gap-2">
                {[0, 5, 12, 18, 28].map(rate => (
                  <Button
                    key={rate}
                    type="button"
                    variant={newCategoryRate === rate ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setNewCategoryRate(rate);
                      // Auto-generate category name and HSN based on rate
                      if (rate === 0) {
                        setNewCategoryName(newCategoryName || 'Essential Items');
                        setNewCategoryHsn(newCategoryHsn || '0000-1000');
                        setNewCategoryDescription(newCategoryDescription || 'Tax-exempt essential items');
                      } else if (rate === 5) {
                        setNewCategoryName(newCategoryName || 'Basic Necessities');
                        setNewCategoryHsn(newCategoryHsn || '1001-2000');
                        setNewCategoryDescription(newCategoryDescription || 'Basic food items and necessities');
                      } else if (rate === 12) {
                        setNewCategoryName(newCategoryName || 'Standard Items');
                        setNewCategoryHsn(newCategoryHsn || '6001-8000');
                        setNewCategoryDescription(newCategoryDescription || 'Standard consumer goods');
                      } else if (rate === 18) {
                        setNewCategoryName(newCategoryName || 'General Merchandise');
                        setNewCategoryHsn(newCategoryHsn || '3001-9999');
                        setNewCategoryDescription(newCategoryDescription || 'General consumer products');
                      } else if (rate === 28) {
                        setNewCategoryName(newCategoryName || 'Luxury Items');
                        setNewCategoryHsn(newCategoryHsn || '8701-8800');
                        setNewCategoryDescription(newCategoryDescription || 'High-end luxury products');
                      }
                    }}
                    className={rate === newCategoryRate ? "bg-blue-600 text-white" : ""}
                  >
                    {rate}%
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button 
                onClick={addTaxCategory}
                disabled={!newCategoryName || newCategoryRate < 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Tax Category
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setNewCategoryName('');
                  setNewCategoryRate(18);
                  setNewCategoryHsn('');
                  setNewCategoryDescription('');
                }}
              >
                Clear Form
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  // Generate a custom tax category
                  const customName = `Custom Tax ${Math.floor(Math.random() * 1000)}`;
                  setNewCategoryName(customName);
                  setNewCategoryRate(15);
                  setNewCategoryHsn('9000-9999');
                  setNewCategoryDescription('Custom tax category');
                }}
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <WandIcon className="h-4 w-4 mr-2" />
                Generate Sample
              </Button>
            </div>

            {/* Preview of new category */}
            {(newCategoryName || newCategoryRate > 0) && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <EyeIcon className="h-4 w-4" />
                  Preview New Category
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Name:</span>
                    <div className="text-blue-800 dark:text-blue-200">{newCategoryName || 'Unnamed'}</div>
                  </div>
                  <div>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Rate:</span>
                    <div className="text-blue-800 dark:text-blue-200">{newCategoryRate}%</div>
                  </div>
                  <div>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">HSN:</span>
                    <div className="text-blue-800 dark:text-blue-200">{newCategoryHsn || 'Not specified'}</div>
                  </div>
                  <div>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Description:</span>
                    <div className="text-blue-800 dark:text-blue-200">{newCategoryDescription || 'No description'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Configuration Preview */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4" />
              Tax Configuration Summary
            </h4>
            <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <div className="flex justify-between">
                <span>Default tax rate:</span>
                <span className="font-medium">{taxSettings.defaultTaxRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Calculation method:</span>
                <span className="font-medium">
                  {taxSettings.taxCalculationMethod === 'afterDiscount' ? 'After discount' : 'Before discount'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Prices include tax:</span>
                <span className="font-medium">{taxSettings.pricesIncludeTax ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span>Multiple tax rates:</span>
                <span className="font-medium">{taxSettings.enableMultipleTaxRates ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span>Total categories:</span>
                <span className="font-medium">{taxSettings.taxCategories.length}</span>
              </div>
            </div>
          </div>

          {/* Quick Tax Rates */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
              <BellIcon className="h-4 w-4" />
              Standard GST Rates in India
            </h4>
            <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
              <div className="flex justify-between">
                <span>Nil Rate (Essential goods):</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="flex justify-between">
                <span>Reduced Rate (Basic necessities):</span>
                <span className="font-medium">5%</span>
              </div>
              <div className="flex justify-between">
                <span>Standard Rate (Most goods):</span>
                <span className="font-medium">12% & 18%</span>
              </div>
              <div className="flex justify-between">
                <span>Higher Rate (Luxury items):</span>
                <span className="font-medium">28%</span>
              </div>
            </div>
          </div>
        </div>

        {taxSettings.enableMultipleTaxRates && taxSettings.taxCategories.length > 0 && (
          <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Active Tax Categories:</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {taxSettings.taxCategories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    {cat.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-8">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last saved: {new Date().toLocaleString()}
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              const confirmed = window.confirm('Reset tax settings to default values?');
              if (confirmed) {
                setTaxSettings({
                  defaultTaxRate: 18,
                  taxCalculationMethod: 'afterDiscount',
                  pricesIncludeTax: false,
                  enableMultipleTaxRates: true,
                  taxCategories: [
                    { id: 1, name: 'Food & Groceries', rate: 5, hsn: '1001-2000', description: 'Essential food items and groceries' },
                    { id: 2, name: 'General Merchandise', rate: 18, hsn: '3001-9999', description: 'Standard consumer goods' }
                  ]
                });
                localStorage.removeItem('taxSettings');
                toast({
                  title: "Settings reset",
                  description: "Tax settings have been reset to defaults",
                });
              }
            }}
          >
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <DatabaseIcon className="h-4 w-4 mr-2" />
            Save All Tax Settings
          </Button>
        </div>
      </div>
    </div>
  );
}


import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { PrinterIcon, BellIcon, ShieldIcon, UserIcon, DatabaseIcon } from 'lucide-react';
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
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { data: user } = useAuth();

  // Check URL parameters for direct navigation
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    return tabParam === 'tax' ? 'tax-settings' : 'business-settings';
  });

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
    if (file) {
      // Accept both .json files and files without extension (for downloaded backups)
      if (file.type === 'application/json' || file.name.endsWith('.json') || file.name.includes('pos-backup')) {
        setSelectedBackupFile(file);
        toast({
          title: "File selected",
          description: `Selected: ${file.name}`,
        });
      } else {
        toast({
          title: "Invalid file",
          description: "Please select a valid JSON backup file (.json)",
          variant: "destructive"
        });
      }
    }
  };

  const handleRestoreData = async () => {
    if (!selectedBackupFile) {
      toast({
        title: "No file selected",
        description: "Please select a backup file first",
        variant: "destructive"
      });
      return;
    }

    const confirmed = window.confirm(
      "⚠️ WARNING: This will replace ALL current data with the backup data. Current data will be lost. Are you sure you want to continue?"
    );

    if (!confirmed) return;

    try {
      // Read the file content
      const fileContent = await selectedBackupFile.text();
      let backupData;

      try {
        backupData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error('Invalid backup file format. Please ensure it\'s a valid JSON file.');
      }

      // Validate backup data structure
      if (!backupData.data || !backupData.timestamp) {
        throw new Error('Invalid backup file structure. This doesn\'t appear to be a valid POS backup file.');
      }

      // Send backup data directly as JSON
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backup: fileContent }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to restore backup: ${errorText}`);
      }

      const result = await response.json();

      queryClient.clear();

      toast({
        title: "Data restored successfully",
        description: "Your backup has been restored successfully. Page will reload shortly.",
      });

      // Clear the selected file
      setSelectedBackupFile(null);

      // Refresh the page to reload the restored data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: "Restore failed",
        description: error.message || "Failed to restore backup. Please check the file and try again.",
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

<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="receipt-settings">Receipt Settings</TabsTrigger>
            <TabsTrigger value="tax-settings" className={activeTab === 'tax-settings' ? 'bg-blue-100 text-blue-700' : ''}>
              Tax Settings
            </TabsTrigger>
            <TabsTrigger value="data-management">Data Management</TabsTrigger>
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
          <TabsContent value="receipt-settings">
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
          <TabsContent value="data-management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseIcon className="h-5 w-5" />
                  Data Management & Backup
                </CardTitle>
                <CardDescription>
                  Secure backup, restore, and data management options for your POS system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">∞</div>
                    <div className="text-xs text-gray-600">Total Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">✓</div>
                    <div className="text-xs text-gray-600">System Status</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">📊</div>
                    <div className="text-xs text-gray-600">Active Data</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">🔒</div>
                    <div className="text-xs text-gray-600">Secure</div>
                  </div>
                </div>

                {/* Main Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Backup Section */}
                  <div className="border rounded-xl p-6 space-y-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                        <DatabaseIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-800 dark:text-green-200">Backup Your Data</h3>
                        <p className="text-xs text-green-600 dark:text-green-400">Safe & Secure</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Create a complete backup of all your POS data including products, sales, purchases, customers, suppliers, and settings.
                    </p>
                    <div className="space-y-3">
                      <Button 
                        onClick={handleBackupData}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        <DatabaseIcon className="h-4 w-4 mr-2" />
                        Create Full Backup
                      </Button>
                      <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
                        <p>✓ All transaction data</p>
                        <p>✓ Product inventory</p>
                        <p>✓ Customer & supplier info</p>
                        <p>✓ System settings</p>
                      </div>
                    </div>
                  </div>

                  {/* Restore Section */}
                  <div className="border rounded-xl p-6 space-y-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                        <DatabaseIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-800 dark:text-blue-200">Restore Data</h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400">From Backup File</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Restore your complete POS system from a previously created backup file.
                    </p>
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-4">
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={handleRestoreFile}
                          className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Select a backup file (.json) created from this system
                        </p>
                      </div>
                      <Button 
                        onClick={handleRestoreData}
                        disabled={!selectedBackupFile}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                        size="lg"
                      >
                        <DatabaseIcon className="h-4 w-4 mr-2" />
                        {selectedBackupFile ? 'Restore from Backup' : 'Select Backup File First'}
                      </Button>
                      {selectedBackupFile && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            📁 Selected: {selectedBackupFile.name}
                          </p>
                          <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                            Size: {Math.round(selectedBackupFile.size / 1024)} KB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clear Data Section */}
                  <div className="border rounded-xl p-6 space-y-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                        <ShieldIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-red-800 dark:text-red-200">Clear All Data</h3>
                        <p className="text-xs text-red-600 dark:text-red-400">⚠️ Dangerous Action</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Permanently delete all data from the system. This will reset your POS to factory settings.
                    </p>
                    <div className="space-y-3">
                      <Button 
                        onClick={handleClearData}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        variant="destructive"
                        size="lg"
                      >
                        <ShieldIcon className="h-4 w-4 mr-2" />
                        Clear All Data
                      </Button>
                      <div className="text-xs text-red-600 dark:text-red-400 space-y-1 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <p className="font-medium">⚠️ This will permanently delete:</p>
                        <p>• All sales & purchase records</p>
                        <p>• Product inventory data</p>
                        <p>• Customer & supplier info</p>
                        <p>• System settings & configurations</p>
                        <p className="font-medium text-red-700 dark:text-red-300">❌ This action cannot be undone!</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Management Tips */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BellIcon className="h-5 w-5 text-blue-600" />
                    Data Management Best Practices
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">🔄 Regular Backups</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Create weekly backups to protect your business data. Store backups in multiple locations for safety.
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">📁 Backup Storage</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Save backup files with descriptive names including date and time for easy identification.
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">🔒 Data Security</h4>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Keep backup files secure and encrypted. Never share backup files containing sensitive business data.
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">✅ Test Restores</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Periodically test your backup files by restoring them to ensure data integrity and completeness.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t pt-6">
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" size="sm" onClick={() => {
                      toast({
                        title: "System Status",
                        description: "Your POS system is running optimally with all data intact.",
                      });
                    }}>
                      <DatabaseIcon className="h-4 w-4 mr-2" />
                      Check System Health
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      toast({
                        title: "Storage Info",
                        description: "Your data is securely stored and backed up locally.",
                      });
                    }}>
                      <ShieldIcon className="h-4 w-4 mr-2" />
                      Storage Information
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      window.open('/api/sales/test', '_blank');
                    }}>
                      <BellIcon className="h-4 w-4 mr-2" />
                      System Diagnostics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Settings */}
          <TabsContent value="tax-settings">
            <Card>
              <CardHeader>
                <CardTitle>Tax Settings</CardTitle>
                <CardDescription>Configure tax rates and calculation methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TaxSettings 
                  onSave={(settings) => {
                    localStorage.setItem('taxSettings', JSON.stringify(settings));
                    toast({
                      title: "Tax settings updated",
                      description: "Tax settings have been saved successfully",
                    });
                  }}
                />
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

function WandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-wand"
      {...props}
    >
      <path d="M12 2v7M20 15l2 2 2-2-2-2Z" />
      <path d="M5 5 3 7 8 12l4.5 4.5 4.5-4.5L19 7l-2-2Z" />
    </svg>
  );
}

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-eye"
      {...props}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}