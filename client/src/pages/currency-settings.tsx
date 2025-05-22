import { useState } from "react";
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
import { Save, DollarSign } from "lucide-react";

// Form schema for currency settings
const currencySettingsSchema = z.object({
  baseCurrency: z.string().min(3, "Currency code must be at least 3 characters"),
  currencySymbol: z.string().min(1, "Currency symbol is required"),
  currencyPosition: z.enum(["before", "after"]),
  decimalPlaces: z.string().default("2"),
  thousandSeparator: z.string().default(","),
  decimalSeparator: z.string().default("."),
});

type CurrencySettingsValues = z.infer<typeof currencySettingsSchema>;

// Popular currencies data
const popularCurrencies = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
];

export default function CurrencySettings() {
  const { toast } = useToast();
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");

  // Fetch current currency settings
  const { data: currentSettings } = useQuery({
    queryKey: ["/api/settings/currency"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings/currency");
        if (!res.ok) {
          return {
            baseCurrency: "USD",
            currencySymbol: "$",
            currencyPosition: "before",
            decimalPlaces: "2",
            thousandSeparator: ",",
            decimalSeparator: ".",
          };
        }
        return await res.json();
      } catch (error) {
        return {
          baseCurrency: "USD",
          currencySymbol: "$",
          currencyPosition: "before",
          decimalPlaces: "2",
          thousandSeparator: ",",
          decimalSeparator: ".",
        };
      }
    }
  });

  const form = useForm<CurrencySettingsValues>({
    resolver: zodResolver(currencySettingsSchema),
    defaultValues: currentSettings || {
      baseCurrency: "USD",
      currencySymbol: "$",
      currencyPosition: "before",
      decimalPlaces: "2",
      thousandSeparator: ",",
      decimalSeparator: ".",
    },
    values: currentSettings,
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: async (data: CurrencySettingsValues) => {
      const res = await apiRequest("PUT", "/api/settings/currency", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/currency"] });
      toast({
        title: "Currency settings updated",
        description: "Your currency settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating settings",
        description: error.message || "There was an error updating the currency settings.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CurrencySettingsValues) => {
    updateCurrencyMutation.mutate(data);
  };

  const handleCurrencySelect = (currencyCode: string) => {
    const currency = popularCurrencies.find(c => c.code === currencyCode);
    if (currency) {
      form.setValue("baseCurrency", currency.code);
      form.setValue("currencySymbol", currency.symbol);
      setSelectedCurrency(currencyCode);
    }
  };

  const formatPreview = (amount: number = 1234.56) => {
    const symbol = form.watch("currencySymbol") || "$";
    const position = form.watch("currencyPosition") || "before";
    const decimals = parseInt(form.watch("decimalPlaces") || "2");
    const thousandSep = form.watch("thousandSeparator") || ",";
    const decimalSep = form.watch("decimalSeparator") || ".";

    let formattedAmount = amount.toFixed(decimals).replace(".", decimalSep);
    
    // Only add thousand separator if it's not "none"
    if (thousandSep !== "none") {
      formattedAmount = formattedAmount.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
    }

    return position === "before" 
      ? `${symbol}${formattedAmount}`
      : `${formattedAmount}${symbol}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Currency Settings</h1>
          <p className="text-muted-foreground">
            Configure currency display settings for your POS system.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Quick Currency Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Quick Currency Selection</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {popularCurrencies.map((currency) => (
                      <Button
                        key={currency.code}
                        type="button"
                        variant={selectedCurrency === currency.code ? "default" : "outline"}
                        onClick={() => handleCurrencySelect(currency.code)}
                        className="flex items-center gap-2 h-auto p-3"
                      >
                        <span className="font-mono text-lg">{currency.symbol}</span>
                        <div className="text-left">
                          <div className="font-medium">{currency.code}</div>
                          <div className="text-xs text-muted-foreground">{currency.name.split(" ")[0]}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="baseCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Currency Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="USD"
                            className="uppercase"
                            maxLength={3}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormDescription>
                          Three-letter ISO currency code (e.g., USD, EUR, GBP)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currencySymbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency Symbol</FormLabel>
                        <FormControl>
                          <Input placeholder="$" {...field} />
                        </FormControl>
                        <FormDescription>
                          Symbol to display with amounts (e.g., $, €, £)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="currencyPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Symbol Position</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="before">Before amount ($100.00)</SelectItem>
                              <SelectItem value="after">After amount (100.00$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="decimalPlaces"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Decimal Places</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select decimal places" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0 (100)</SelectItem>
                              <SelectItem value="1">1 (100.0)</SelectItem>
                              <SelectItem value="2">2 (100.00)</SelectItem>
                              <SelectItem value="3">3 (100.000)</SelectItem>
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
                    name="thousandSeparator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thousand Separator</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select separator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value=",">, (comma)</SelectItem>
                              <SelectItem value=".">(period)</SelectItem>
                              <SelectItem value=" ">(space)</SelectItem>
                              <SelectItem value="none">(none)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="decimalSeparator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Decimal Separator</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select separator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value=".">(period)</SelectItem>
                              <SelectItem value=",">, (comma)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Preview */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Format Preview</h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-center">
                      {formatPreview()}
                    </div>
                    <p className="text-center text-muted-foreground mt-2">
                      Sample amount formatting
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="submit"
                    disabled={updateCurrencyMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateCurrencyMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}