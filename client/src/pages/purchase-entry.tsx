import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { CalendarIcon, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFormatCurrency } from "@/lib/currency";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Product, Supplier } from "@shared/schema";

interface LineItem {
  id: string;
  productId?: number;
  productName: string;
  discAmt: number;
  expDate: Date | null;
  netCost: number;
  roiPercent: number;
  grossProfitPercent: number;
  sellingPrice: number;
  mrp: number;
  amount: number;
  netAmount: number;
  quantity: number;
}

export default function PurchaseEntry() {
  const [activeTab, setActiveTab] = useState("line-items");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: "1",
      productName: "",
      discAmt: 0,
      expDate: null,
      netCost: 100,
      roiPercent: 20.00,
      grossProfitPercent: 16.67,
      sellingPrice: 120,
      mrp: 120,
      amount: 0,
      netAmount: 0,
      quantity: 1
    }
  ]);

  const { toast } = useToast();
  const formatCurrency = useFormatCurrency();

  // Fetch products and suppliers
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      productName: "",
      discAmt: 0,
      expDate: null,
      netCost: 100,
      roiPercent: 20.00,
      grossProfitPercent: 16.67,
      sellingPrice: 120,
      mrp: 120,
      amount: 0,
      netAmount: 0,
      quantity: 1
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(items => 
      items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateLineItemValues = (item: LineItem) => {
    const amount = item.quantity * item.netCost;
    const netAmount = amount - item.discAmt;
    
    return {
      ...item,
      amount,
      netAmount
    };
  };

  return (
    <DashboardLayout>
      <div className="container max-w-full pb-8 px-4">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Purchase Entry</h1>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Save Purchase
            </Button>
          </div>

          {/* Main Content */}
          <Card>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-50 rounded-none">
                  <TabsTrigger value="purchase-details" className="data-[state=active]:bg-white">
                    Purchase Details
                  </TabsTrigger>
                  <TabsTrigger value="line-items" className="data-[state=active]:bg-white">
                    Line Items
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="data-[state=active]:bg-white">
                    Summary
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="purchase-details" className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Supplier</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier: Supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Purchase Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(new Date(), "PPP")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Reference No</Label>
                        <Input placeholder="Enter reference number" />
                      </div>
                      <div>
                        <Label>Invoice No</Label>
                        <Input placeholder="Enter invoice number" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="line-items" className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Line Items</h3>
                      <Button onClick={addLineItem} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    {/* Line Items Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 border-b">
                        <div className="grid grid-cols-12 gap-2 p-3 text-sm font-medium text-gray-700">
                          <div className="col-span-1">Disc Amt</div>
                          <div className="col-span-1">Exp. Date</div>
                          <div className="col-span-1">Net Cost</div>
                          <div className="col-span-1">ROI %</div>
                          <div className="col-span-1">Gross Profit %</div>
                          <div className="col-span-1">Selling Price</div>
                          <div className="col-span-1">MRP</div>
                          <div className="col-span-1">Amount</div>
                          <div className="col-span-1">Net Amount</div>
                          <div className="col-span-1">Quantity</div>
                          <div className="col-span-2">Actions</div>
                        </div>
                      </div>

                      {lineItems.map((item, index) => {
                        const calculatedItem = calculateLineItemValues(item);
                        
                        return (
                          <div key={item.id} className="border-b last:border-b-0">
                            <div className="grid grid-cols-12 gap-2 p-3 text-sm">
                              {/* Discount Amount */}
                              <div className="col-span-1">
                                <div className="flex items-center">
                                  <span className="text-xs mr-1">₹</span>
                                  <Input
                                    type="number"
                                    value={item.discAmt}
                                    onChange={(e) => updateLineItem(item.id, 'discAmt', parseFloat(e.target.value) || 0)}
                                    className="h-8 text-xs"
                                    placeholder="0"
                                  />
                                </div>
                              </div>

                              {/* Expiry Date */}
                              <div className="col-span-1">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="h-8 w-full text-xs justify-start"
                                    >
                                      <CalendarIcon className="mr-1 h-3 w-3" />
                                      {item.expDate ? format(item.expDate, "dd-MM-yyyy") : "dd-mm-yyyy"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={item.expDate || undefined}
                                      onSelect={(date) => updateLineItem(item.id, 'expDate', date)}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              {/* Net Cost */}
                              <div className="col-span-1">
                                <div className="flex items-center">
                                  <span className="text-xs mr-1">₹</span>
                                  <Input
                                    type="number"
                                    value={item.netCost}
                                    onChange={(e) => updateLineItem(item.id, 'netCost', parseFloat(e.target.value) || 0)}
                                    className="h-8 text-xs"
                                    placeholder="100"
                                  />
                                </div>
                              </div>

                              {/* ROI % */}
                              <div className="col-span-1">
                                <div className="flex items-center">
                                  <span className="text-xs mr-1">%</span>
                                  <Input
                                    type="number"
                                    value={item.roiPercent}
                                    onChange={(e) => updateLineItem(item.id, 'roiPercent', parseFloat(e.target.value) || 0)}
                                    className="h-8 text-xs"
                                    placeholder="20.00"
                                    step="0.01"
                                  />
                                </div>
                              </div>

                              {/* Gross Profit % */}
                              <div className="col-span-1">
                                <div className="flex items-center">
                                  <span className="text-xs mr-1">%</span>
                                  <Input
                                    type="number"
                                    value={item.grossProfitPercent}
                                    onChange={(e) => updateLineItem(item.id, 'grossProfitPercent', parseFloat(e.target.value) || 0)}
                                    className="h-8 text-xs"
                                    placeholder="16.67"
                                    step="0.01"
                                  />
                                </div>
                              </div>

                              {/* Selling Price */}
                              <div className="col-span-1">
                                <span className="text-xs font-medium text-blue-600">
                                  ₹{item.sellingPrice}
                                </span>
                              </div>

                              {/* MRP */}
                              <div className="col-span-1">
                                <span className="text-xs font-medium text-blue-600">
                                  ₹{item.mrp}
                                </span>
                              </div>

                              {/* Amount */}
                              <div className="col-span-1">
                                <span className="text-xs font-medium text-green-600">
                                  ₹{calculatedItem.amount}
                                </span>
                              </div>

                              {/* Net Amount */}
                              <div className="col-span-1">
                                <span className="text-xs font-medium text-green-600">
                                  ₹{calculatedItem.netAmount}
                                </span>
                              </div>

                              {/* Quantity */}
                              <div className="col-span-1">
                                <div className="flex items-center">
                                  <span className="text-xs mr-1">%</span>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                    className="h-8 text-xs"
                                    placeholder="1"
                                    min="1"
                                  />
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="col-span-2 flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                  <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress/Navigation Bar */}
                    <div className="flex items-center justify-center py-4">
                      <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="w-96 h-2 bg-gray-200 rounded-full">
                          <div className="w-1/3 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                        <Button variant="outline" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Footer Navigation */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <Button variant="outline" onClick={() => setActiveTab("purchase-details")}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back: Purchase Details
                      </Button>
                      <Button onClick={() => setActiveTab("summary")} className="bg-blue-600 hover:bg-blue-700">
                        Next: Summary
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="p-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Purchase Summary</h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Total Items:</span>
                          <span className="font-medium">{lineItems.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-medium">
                            {formatCurrency(lineItems.reduce((sum, item) => sum + calculateLineItemValues(item).amount, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Discount:</span>
                          <span className="font-medium">
                            {formatCurrency(lineItems.reduce((sum, item) => sum + item.discAmt, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span>Net Total:</span>
                          <span className="text-green-600">
                            {formatCurrency(lineItems.reduce((sum, item) => sum + calculateLineItemValues(item).netAmount, 0))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <Button variant="outline" onClick={() => setActiveTab("line-items")}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back: Line Items
                      </Button>
                      <Button className="bg-green-600 hover:bg-green-700">
                        Complete Purchase
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}