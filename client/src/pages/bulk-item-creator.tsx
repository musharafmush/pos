import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PackageIcon, SaveIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category, Supplier } from "@shared/schema";

const bulkItemSchema = z.object({
  itemName: z.string().min(2, "Item name is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  mrp: z.string().min(1, "MRP is required"),
  weight: z.string().min(1, "Weight is required"),
  weightUnit: z.string().default("g"),
  stockQuantity: z.string().min(1, "Stock quantity is required"),
  categoryId: z.number().min(1, "Category is required"),
});

type BulkItemFormValues = z.infer<typeof bulkItemSchema>;

export default function BulkItemCreator() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const form = useForm<BulkItemFormValues>({
    resolver: zodResolver(bulkItemSchema),
    defaultValues: {
      itemName: "",
      costPrice: "",
      sellingPrice: "",
      mrp: "",
      weight: "25000",
      weightUnit: "g",
      stockQuantity: "5",
      categoryId: 0,
    },
  });

  const createBulkItem = useMutation({
    mutationFn: async (data: BulkItemFormValues) => {
      const itemCode = `BULK${Date.now().toString().slice(-6)}`;
      const productData = {
        name: data.itemName,
        description: `Bulk item - ${data.itemName}`,
        sku: itemCode,
        price: data.sellingPrice,
        cost: data.costPrice,
        mrp: data.mrp,
        weight: data.weight,
        weightUnit: data.weightUnit,
        categoryId: data.categoryId,
        stockQuantity: Number(data.stockQuantity),
        active: true,
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) throw new Error("Failed to create bulk item");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bulk Item Created Successfully!",
        description: "Your bulk item is ready for repacking",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setLocation("/repacking-professional");
    },
    onError: (error) => {
      toast({
        title: "Error Creating Bulk Item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BulkItemFormValues) => {
    createBulkItem.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="w-5 h-5" />
              Create Bulk Item for Repacking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Item Name */}
                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name (add BULK to identify)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Sugar BULK 25kg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(Number(value))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(categories) && categories.map((category: any) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pricing */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-4">Pricing (Indian Rupees ₹)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="costPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Price (₹)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="800" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sellingPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selling Price (₹)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="900" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mrp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MRP (₹)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="1000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Weight & Packing */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-4">Weight & Packing (Bulk Items)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (for 25kg = 25000)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="25000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weightUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight Unit</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="g">Gram (g)</SelectItem>
                                <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                <SelectItem value="mg">Milligram (mg)</SelectItem>
                                <SelectItem value="l">Litre (l)</SelectItem>
                                <SelectItem value="ml">Millilitre (ml)</SelectItem>
                                <SelectItem value="piece">Piece</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stockQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Quantity (bags/units)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="5" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={createBulkItem.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {createBulkItem.isPending ? "Creating..." : "Create Bulk Item & Go to Repacking"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}