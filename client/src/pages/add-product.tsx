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
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus } from "lucide-react";

// Simple and clean form schema matching the screenshot
const productFormSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  cost: z.coerce.number().min(0, "Cost must be positive"),
  category: z.string().min(1, "Category is required"),
  stockQuantity: z.coerce.number().min(0, "Stock quantity must be positive"),
  alertThreshold: z.coerce.number().min(0, "Alert threshold must be positive"),
  barcode: z.string().optional(),
  imageUrl: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function AddProduct() {
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return await res.json();
    }
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      productName: "",
      sku: "",
      description: "",
      price: 0,
      cost: 0,
      category: "",
      stockQuantity: 0,
      alertThreshold: 10,
      barcode: "",
      imageUrl: "",
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const productData = {
        name: data.productName,
        description: data.description || "",
        sku: data.sku,
        price: data.price.toString(),
        cost: data.cost.toString(),
        categoryId: categories.find((cat: any) => cat.name === data.category)?.id || 1,
        stockQuantity: data.stockQuantity,
        alertThreshold: data.alertThreshold,
        barcode: data.barcode || "",
        active: true,
      };
      
      const res = await apiRequest("POST", "/api/products", productData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success!",
        description: "Product has been created successfully.",
      });
      form.reset();
      setIsOpen(false);
      window.history.back();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "There was an error creating the product.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ProductFormValues) => {
    createProductMutation.mutate(data);
  };

  const handleCancel = () => {
    setIsOpen(false);
    window.history.back();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-screen bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
              <p className="text-sm text-gray-500 mt-1">Fill out the form for the new product.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Form Content */}
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Product Name and SKU Row */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                          Product Name<span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter product name" 
                            className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                          SKU<span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter SKU" 
                            className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter product description" 
                          className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price and Cost Row */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                          Price<span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0" 
                            className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                          Cost<span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0" 
                            className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                        Category<span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category: any) => (
                              <SelectItem key={category.id} value={category.name}>
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

                {/* Stock Quantity and Alert Threshold Row */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                          Stock Quantity<span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alertThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 flex items-center">
                          Alert Threshold<span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10" 
                            className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Barcode and Image URL Row */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Barcode</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter barcode" 
                            className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Image URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter image URL" 
                            className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createProductMutation.isPending}
              className="px-6 py-2 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={createProductMutation.isPending}
              className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700"
            >
              {createProductMutation.isPending ? "Adding..." : "Add Product"}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}