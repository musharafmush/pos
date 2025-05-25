import { useState, useEffect } from "react";
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  PackageIcon,
  SaveIcon,
  XIcon,
  Calculator,
  BarChart3Icon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

const autoRepackSchema = z.object({
  issueDate: z.string(),
  issueNo: z.string(),
  repackNo: z.string(),
  bulkProductId: z.number(),
  targetProductCode: z.string(),
  targetProductName: z.string(),
  quantity: z.number(),
  cost: z.number(),
  selling: z.number(),
  mrp: z.number(),
  bulkWeight: z.number(),
  unitCost: z.number(),
});

type AutoRepackFormValues = z.infer<typeof autoRepackSchema>;

export default function AutoRepackingProfessional() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedBulkProduct, setSelectedBulkProduct] = useState<Product | null>(null);
  const [currentStock, setCurrentStock] = useState(300.00);
  const [packedQuantity, setPacked] = useState(50.00);
  const [availableForPack, setAvailableForPack] = useState(250.00);
  const [repackItems, setRepackItems] = useState([
    {
      code: "12926",
      itemName: "WHITE SUGAR 1KG",
      qty: 50,
      cost: 39.25,
      selling: 43.00,
      mrp: 43.00
    }
  ]);

  const form = useForm<AutoRepackFormValues>({
    resolver: zodResolver(autoRepackSchema),
    defaultValues: {
      issueDate: "14/05/2025",
      issueNo: "",
      repackNo: "",
      bulkProductId: 0,
      targetProductCode: "12926",
      targetProductName: "WHITE SUGAR 1KG",
      quantity: 50,
      cost: 39.25,
      selling: 43.00,
      mrp: 43.00,
      bulkWeight: 1000,
      unitCost: 39.25,
    },
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  const processRepacking = useMutation({
    mutationFn: async (data: AutoRepackFormValues) => {
      const response = await fetch("/api/repacking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to process repacking");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Repacking Completed",
        description: "Products have been successfully repacked",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error) => {
      toast({
        title: "Repacking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculateTotals = () => {
    const totalCost = repackItems.reduce((sum, item) => sum + (item.qty * item.cost), 0);
    const totalMRP = repackItems.reduce((sum, item) => sum + (item.qty * item.mrp), 0);
    return { totalCost, totalMRP };
  };

  const onSubmit = (data: AutoRepackFormValues) => {
    processRepacking.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <h1 className="text-xl font-bold">Professional Automatic Repacking</h1>
        </div>

        <div className="bg-white p-6 rounded-b-lg shadow-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Issue Date and Numbers */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Issue Date</label>
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="bg-gray-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="14/05/2025">14/05/2025</SelectItem>
                              <SelectItem value="15/05/2025">15/05/2025</SelectItem>
                              <SelectItem value="16/05/2025">16/05/2025</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Issue No</label>
                  <FormField
                    control={form.control}
                    name="issueNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} className="bg-gray-100" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Repack No :</label>
                  <FormField
                    control={form.control}
                    name="repackNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} className="bg-gray-100" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Main Repacking Table and Bulk Details */}
              <div className="grid grid-cols-3 gap-6">
                {/* Repacking Table */}
                <div className="col-span-2">
                  <Table className="border">
                    <TableHeader className="bg-blue-500">
                      <TableRow>
                        <TableHead className="text-white text-center">Code</TableHead>
                        <TableHead className="text-white text-center">Item Name</TableHead>
                        <TableHead className="text-white text-center">Qty</TableHead>
                        <TableHead className="text-white text-center">Cost</TableHead>
                        <TableHead className="text-white text-center">Selling</TableHead>
                        <TableHead className="text-white text-center">MRP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repackItems.map((item, index) => (
                        <TableRow key={index} className="bg-blue-50">
                          <TableCell className="text-center font-medium">{item.code}</TableCell>
                          <TableCell className="text-blue-600 font-medium">{item.itemName}</TableCell>
                          <TableCell className="text-center">{item.qty}</TableCell>
                          <TableCell className="text-center">{item.cost.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{item.selling.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{item.mrp.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Bulk Item Details Panel */}
                <div className="bg-gray-100 p-4 rounded border">
                  <h3 className="font-bold text-gray-800 mb-4">Bulk Item Details</h3>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="font-medium text-gray-700">Bulk Code</span>
                      <span className="bg-white px-2 py-1 rounded text-center">12925</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <span className="font-medium text-gray-700">Bulk Item</span>
                      <span className="bg-white px-2 py-1 rounded">SUGAR BULK</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <span className="font-medium text-gray-700">Weight</span>
                      <span className="bg-white px-2 py-1 rounded text-center">1000</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-medium text-gray-700">Cost</span>
                      <span className="bg-white px-2 py-1 rounded text-center">39.25</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600">Latest sel</span>
                        <span className="bg-white px-1 py-0.5 rounded text-xs">39.28</span>
                      </div>
                    </div>
                    
                    {/* Stock Information */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="text-center">
                        <div className="font-medium text-gray-700 text-sm">Current Stock</div>
                        <div className="bg-white px-2 py-2 rounded font-bold">{currentStock.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-700 text-sm">Packed</div>
                        <div className="bg-white px-2 py-2 rounded font-bold">{packedQuantity.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-700 text-sm">Avail for pack</div>
                        <div className="bg-white px-2 py-2 rounded font-bold">{availableForPack.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Percentage Breakdown Table */}
                    <div className="mt-4">
                      <Table className="border text-xs">
                        <TableHeader className="bg-blue-500">
                          <TableRow>
                            <TableHead className="text-white text-center py-1">Name</TableHead>
                            <TableHead className="text-white text-center py-1">Perc %</TableHead>
                            <TableHead className="text-white text-center py-1">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="py-6 border"></TableCell>
                            <TableCell className="py-6 border"></TableCell>
                            <TableCell className="py-6 border"></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/repacking-dashboard-professional")}
                  className="px-6"
                >
                  <XIcon className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={processRepacking.isPending}
                  className="px-6 bg-green-600 hover:bg-green-700"
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {processRepacking.isPending ? "Processing..." : "Complete Repacking"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
}