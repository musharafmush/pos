
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  SearchIcon, 
  PackageIcon, 
  AlertTriangleIcon, 
  TrendingUpIcon,
  TrendingDownIcon,
  RefreshCwIcon,
  PlusIcon,
  MinusIcon,
  EditIcon,
  EyeIcon,
  FilterIcon,
  DownloadIcon,
  UploadIcon,
  BarChart3Icon,
  Package2Icon,
  ShoppingCartIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  IndianRupeeIcon,
  TagIcon,
  CategoryIcon,
  CalendarIcon,
  UserIcon,
  SettingsIcon,
  HelpCircleIcon,
  KeyboardIcon,
  ZapIcon,
  StarIcon,
  HeartIcon,
  ScanIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import type { Product } from "@shared/schema";

interface InventoryItem extends Product {
  lowStock: boolean;
  outOfStock: boolean;
  movement: 'up' | 'down' | 'stable';
  lastUpdated: string;
  category: string;
  supplier?: string;
  location?: string;
  reorderLevel: number;
  maxStock: number;
  avgCost: number;
  lastSold: string;
  salesVelocity: number;
}

interface StockAdjustment {
  productId: number;
  productName: string;
  currentStock: number;
  adjustmentQty: number;
  adjustmentType: 'add' | 'remove' | 'set';
  reason: string;
  notes: string;
}

export default function InventoryEnhanced() {
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showStockAdjustDialog, setShowStockAdjustDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<StockAdjustment>({
    productId: 0,
    productName: "",
    currentStock: 0,
    adjustmentQty: 0,
    adjustmentType: "add",
    reason: "",
    notes: ""
  });
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [bulkUpdateMode, setBulkUpdateMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Mock inventory data with comprehensive details
  const mockInventoryData: InventoryItem[] = [
    {
      id: 1,
      name: "Badam Almonds Premium 250g",
      sku: "ALM001",
      price: "450",
      cost: "380",
      stockQuantity: 5,
      description: "Premium quality badam almonds",
      barcode: "ALM001",
      brand: "Premium Nuts",
      manufacturer: "Nut Company",
      categoryId: 1,
      mrp: "500",
      unit: "PKG",
      hsnCode: "0802",
      taxRate: "12",
      active: true,
      trackInventory: true,
      allowNegativeStock: false,
      alertThreshold: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lowStock: true,
      outOfStock: false,
      movement: 'down',
      lastUpdated: "2 hours ago",
      category: "Dry Fruits",
      supplier: "Premium Suppliers",
      location: "A-1-01",
      reorderLevel: 10,
      maxStock: 100,
      avgCost: 385,
      lastSold: "Today",
      salesVelocity: 15
    },
    {
      id: 2,
      name: "Organic Basmati Rice 1kg",
      sku: "RIC001", 
      price: "85",
      cost: "70",
      stockQuantity: 0,
      description: "Organic basmati rice",
      barcode: "RIC001",
      brand: "Organic Farm",
      manufacturer: "Rice Mills",
      categoryId: 2,
      mrp: "95",
      unit: "KG",
      hsnCode: "1006",
      taxRate: "5",
      active: true,
      trackInventory: true,
      allowNegativeStock: false,
      alertThreshold: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lowStock: false,
      outOfStock: true,
      movement: 'down',
      lastUpdated: "1 hour ago",
      category: "Grains",
      supplier: "Organic Suppliers",
      location: "B-2-03",
      reorderLevel: 20,
      maxStock: 200,
      avgCost: 72,
      lastSold: "Yesterday",
      salesVelocity: 25
    },
    {
      id: 3,
      name: "Cold Pressed Coconut Oil 1L",
      sku: "OIL001",
      price: "220",
      cost: "180",
      stockQuantity: 45,
      description: "Cold pressed coconut oil",
      barcode: "OIL001", 
      brand: "Pure Oil",
      manufacturer: "Oil Mills",
      categoryId: 3,
      mrp: "250",
      unit: "LTR",
      hsnCode: "1513",
      taxRate: "18",
      active: true,
      trackInventory: true,
      allowNegativeStock: false,
      alertThreshold: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lowStock: false,
      outOfStock: false,
      movement: 'up',
      lastUpdated: "30 mins ago",
      category: "Oils",
      supplier: "Oil Suppliers",
      location: "C-1-05",
      reorderLevel: 15,
      maxStock: 150,
      avgCost: 185,
      lastSold: "Today",
      salesVelocity: 8
    }
  ];

  const [inventoryData, setInventoryData] = useState<InventoryItem[]>(mockInventoryData);

  // Categories for filtering
  const categories = ["all", ...Array.from(new Set(inventoryData.map(item => item.category)))];

  // Filter and sort inventory data
  const filteredInventory = inventoryData
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      
      const matchesStock = stockFilter === "all" ||
                          (stockFilter === "low" && item.lowStock) ||
                          (stockFilter === "out" && item.outOfStock) ||
                          (stockFilter === "normal" && !item.lowStock && !item.outOfStock);
      
      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "stock":
          aValue = a.stockQuantity;
          bValue = b.stockQuantity;
          break;
        case "value":
          aValue = a.stockQuantity * parseFloat(a.cost);
          bValue = b.stockQuantity * parseFloat(b.cost);
          break;
        case "movement":
          aValue = a.salesVelocity;
          bValue = b.salesVelocity;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Calculate summary statistics
  const totalProducts = inventoryData.length;
  const lowStockItems = inventoryData.filter(item => item.lowStock).length;
  const outOfStockItems = inventoryData.filter(item => item.outOfStock).length;
  const totalValue = inventoryData.reduce((sum, item) => sum + (item.stockQuantity * parseFloat(item.cost)), 0);

  // Handle stock adjustment
  const handleStockAdjustment = (product: InventoryItem) => {
    setSelectedProduct(product);
    setStockAdjustment({
      productId: product.id,
      productName: product.name,
      currentStock: product.stockQuantity,
      adjustmentQty: 0,
      adjustmentType: "add",
      reason: "",
      notes: ""
    });
    setShowStockAdjustDialog(true);
  };

  // Process stock adjustment
  const processStockAdjustment = () => {
    if (!selectedProduct || stockAdjustment.adjustmentQty === 0) {
      toast({
        title: "⚠️ Invalid Adjustment",
        description: "Please enter a valid adjustment quantity",
        variant: "destructive"
      });
      return;
    }

    let newStock = selectedProduct.stockQuantity;
    
    switch (stockAdjustment.adjustmentType) {
      case "add":
        newStock += stockAdjustment.adjustmentQty;
        break;
      case "remove":
        newStock -= stockAdjustment.adjustmentQty;
        break;
      case "set":
        newStock = stockAdjustment.adjustmentQty;
        break;
    }

    if (newStock < 0) {
      toast({
        title: "⚠️ Negative Stock",
        description: "Stock cannot be negative",
        variant: "destructive"
      });
      return;
    }

    // Update inventory data
    setInventoryData(prev => prev.map(item => 
      item.id === selectedProduct.id 
        ? {
            ...item,
            stockQuantity: newStock,
            lowStock: newStock <= item.reorderLevel,
            outOfStock: newStock === 0,
            lastUpdated: "Just now"
          }
        : item
    ));

    toast({
      title: "✅ Stock Updated",
      description: `${selectedProduct.name} stock updated to ${newStock} ${selectedProduct.unit}`
    });

    setShowStockAdjustDialog(false);
    setSelectedProduct(null);
  };

  // Time update
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'f':
            if (e.ctrlKey) {
              e.preventDefault();
              searchInputRef.current?.focus();
              toast({ title: "🔍 Search", description: "Search mode activated" });
            }
            break;
          case 'r':
            if (e.ctrlKey) {
              e.preventDefault();
              setInventoryData([...mockInventoryData]);
              toast({ title: "🔄 Refreshed", description: "Inventory data refreshed" });
            }
            break;
          case 'v':
            if (e.ctrlKey) {
              e.preventDefault();
              setViewMode(viewMode === 'table' ? 'grid' : 'table');
              toast({ title: "👁️ View", description: `Switched to ${viewMode === 'table' ? 'grid' : 'table'} view` });
            }
            break;
        }
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'F2':
          e.preventDefault();
          setStockFilter(stockFilter === "all" ? "low" : stockFilter === "low" ? "out" : "all");
          break;
        case 'F3':
          e.preventDefault();
          setViewMode(viewMode === 'table' ? 'grid' : 'table');
          break;
        case 'F9':
          e.preventDefault();
          setShowKeyboardShortcuts(true);
          break;
        case 'Escape':
          setShowStockAdjustDialog(false);
          setShowKeyboardShortcuts(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [viewMode, stockFilter]);

  const keyboardShortcuts = [
    { key: "F1", action: "Focus Search" },
    { key: "F2", action: "Toggle Stock Filter" },
    { key: "F3", action: "Toggle View Mode" },
    { key: "F9", action: "Show Shortcuts" },
    { key: "Ctrl+F", action: "Quick Search" },
    { key: "Ctrl+R", action: "Refresh Data" },
    { key: "Ctrl+V", action: "Switch View" },
    { key: "Esc", action: "Close Dialogs" }
  ];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-gradient-to-br from-green-50 via-white to-blue-50">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b-2 border-green-200 shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl shadow-lg">
                  <PackageIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    📦 Smart Inventory Manager
                  </h1>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Real-time stock monitoring and management
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                  📊 {totalProducts} Products
                </Badge>
                {lowStockItems > 0 && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 px-3 py-1">
                    ⚠️ {lowStockItems} Low Stock
                  </Badge>
                )}
                {outOfStockItems > 0 && (
                  <Badge variant="destructive" className="px-3 py-1">
                    🚫 {outOfStockItems} Out of Stock
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-center bg-white rounded-lg p-3 shadow-sm border">
                <div className="text-xs text-gray-500 font-medium">💰 Total Value</div>
                <div className="font-bold text-green-600 text-lg">{formatCurrency(totalValue)}</div>
              </div>
              <div className="text-center bg-white rounded-lg p-3 shadow-sm border">
                <div className="text-xs text-gray-500 font-medium">⏰ Last Update</div>
                <div className="font-mono text-blue-600">{currentTime.toLocaleTimeString()}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyboardShortcuts(true)}
                className="bg-white hover:bg-blue-50 border-blue-200"
              >
                <KeyboardIcon className="h-4 w-4 mr-1" />
                🔑 Help (F9)
              </Button>
            </div>
          </div>
        </div>

        {/* Smart Filters & Search */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b border-blue-200 p-4">
          <div className="grid grid-cols-6 gap-4 items-end">
            <div className="col-span-2">
              <Label className="text-sm font-bold text-blue-700">🔍 Smart Search</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="🔍 Search by name, SKU, or category... (F1)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 border-2 border-blue-200 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-bold text-blue-700">📂 Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-10 border-2 border-blue-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.slice(1).map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-bold text-blue-700">📊 Stock Status</Label>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="h-10 border-2 border-blue-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="normal">✅ Normal Stock</SelectItem>
                  <SelectItem value="low">⚠️ Low Stock</SelectItem>
                  <SelectItem value="out">🚫 Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-bold text-blue-700">🔄 Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 border-2 border-blue-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">📝 Name</SelectItem>
                  <SelectItem value="stock">📦 Stock Level</SelectItem>
                  <SelectItem value="value">💰 Stock Value</SelectItem>
                  <SelectItem value="movement">📈 Sales Velocity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-10 border-blue-200 hover:bg-blue-50"
              >
                {sortOrder === "asc" ? "⬆️" : "⬇️"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                className="h-10 border-blue-200 hover:bg-blue-50"
                title="F3"
              >
                {viewMode === 'table' ? "🔲" : "📋"}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {filteredInventory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <PackageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">No Items Found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Enhanced Inventory Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      📋 Inventory Items ({filteredInventory.length})
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <DownloadIcon className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCwIcon className="h-4 w-4 mr-1" />
                        Refresh (Ctrl+R)
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Details</TableHead>
                        <TableHead>Stock Info</TableHead>
                        <TableHead>Financial</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory.map((item) => (
                        <TableRow key={item.id} className="hover:bg-blue-50">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-bold text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-600">
                                SKU: {item.sku} • {item.category}
                              </div>
                              <div className="text-xs text-gray-500">
                                📍 {item.location} • 🏭 {item.supplier}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-lg">
                                  {item.stockQuantity} {item.unit}
                                </span>
                                {item.movement === 'up' && <TrendingUpIcon className="h-4 w-4 text-green-500" />}
                                {item.movement === 'down' && <TrendingDownIcon className="h-4 w-4 text-red-500" />}
                              </div>
                              <div className="flex space-x-1">
                                {item.outOfStock && (
                                  <Badge variant="destructive" className="text-xs">🚫 Out of Stock</Badge>
                                )}
                                {item.lowStock && !item.outOfStock && (
                                  <Badge variant="outline" className="text-xs border-orange-400 text-orange-700">
                                    ⚠️ Low Stock
                                  </Badge>
                                )}
                                {!item.lowStock && !item.outOfStock && (
                                  <Badge variant="outline" className="text-xs border-green-400 text-green-700">
                                    ✅ Normal
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                Reorder: {item.reorderLevel} • Max: {item.maxStock}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-gray-600">Cost: </span>
                                <span className="font-medium">{formatCurrency(parseFloat(item.cost))}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Price: </span>
                                <span className="font-medium">{formatCurrency(parseFloat(item.price))}</span>
                              </div>
                              <div className="text-sm font-bold text-green-600">
                                Value: {formatCurrency(item.stockQuantity * parseFloat(item.cost))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-gray-600">Velocity: </span>
                                <span className="font-medium">{item.salesVelocity}/day</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Last sold: {item.lastSold}
                              </div>
                              <div className="text-xs text-gray-500">
                                Updated: {item.lastUpdated}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStockAdjustment(item)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <EditIcon className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                <EyeIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Enhanced Stock Adjustment Dialog */}
        <Dialog open={showStockAdjustDialog} onOpenChange={setShowStockAdjustDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">📦 Stock Adjustment</DialogTitle>
              <DialogDescription>
                Adjust stock for {stockAdjustment.productName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-800">
                    {stockAdjustment.currentStock} {selectedProduct?.unit}
                  </div>
                  <div className="text-sm text-blue-600">Current Stock</div>
                </div>
              </div>

              <div>
                <Label className="font-medium">Adjustment Type</Label>
                <Select 
                  value={stockAdjustment.adjustmentType} 
                  onValueChange={(value: 'add' | 'remove' | 'set') => 
                    setStockAdjustment({...stockAdjustment, adjustmentType: value})
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">➕ Add Stock</SelectItem>
                    <SelectItem value="remove">➖ Remove Stock</SelectItem>
                    <SelectItem value="set">🎯 Set Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-medium">
                  {stockAdjustment.adjustmentType === 'set' ? 'New Stock Level' : 'Quantity'}
                </Label>
                <Input
                  type="number"
                  value={stockAdjustment.adjustmentQty}
                  onChange={(e) => setStockAdjustment({
                    ...stockAdjustment, 
                    adjustmentQty: parseInt(e.target.value) || 0
                  })}
                  className="text-center font-bold text-lg h-12"
                  min="0"
                />
              </div>

              <div>
                <Label className="font-medium">Reason</Label>
                <Select 
                  value={stockAdjustment.reason} 
                  onValueChange={(value) => setStockAdjustment({...stockAdjustment, reason: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">📦 New Purchase</SelectItem>
                    <SelectItem value="damage">💥 Damage/Spoilage</SelectItem>
                    <SelectItem value="theft">🚨 Theft/Loss</SelectItem>
                    <SelectItem value="return">↩️ Customer Return</SelectItem>
                    <SelectItem value="recount">🔢 Physical Recount</SelectItem>
                    <SelectItem value="other">❓ Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-medium">Notes (Optional)</Label>
                <Textarea
                  value={stockAdjustment.notes}
                  onChange={(e) => setStockAdjustment({...stockAdjustment, notes: e.target.value})}
                  placeholder="Additional notes..."
                  className="h-20"
                />
              </div>

              {stockAdjustment.adjustmentQty > 0 && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-sm text-green-800">
                    <strong>New Stock Level:</strong> {
                      stockAdjustment.adjustmentType === 'add' 
                        ? stockAdjustment.currentStock + stockAdjustment.adjustmentQty
                        : stockAdjustment.adjustmentType === 'remove'
                        ? Math.max(0, stockAdjustment.currentStock - stockAdjustment.adjustmentQty)
                        : stockAdjustment.adjustmentQty
                    } {selectedProduct?.unit}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStockAdjustDialog(false)}>
                Cancel
              </Button>
              <Button onClick={processStockAdjustment} className="bg-blue-600 hover:bg-blue-700">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Update Stock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Keyboard Shortcuts Dialog */}
        <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">⌨️ Keyboard Shortcuts</DialogTitle>
              <DialogDescription>Speed up your inventory management</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {keyboardShortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{shortcut.action}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {shortcut.key}
                  </Badge>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Status Bar */}
        <div className="bg-gray-900 text-white text-xs p-2 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <span className="text-green-400 flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Inventory System Active
            </span>
            <span>📦 Total: {totalProducts}</span>
            <span>⚠️ Low: {lowStockItems}</span>
            <span>🚫 Out: {outOfStockItems}</span>
          </div>
          <div className="flex items-center space-x-6">
            <span>💰 Value: {formatCurrency(totalValue)}</span>
            <span className="font-mono bg-blue-900 px-2 py-1 rounded">
              ⏰ {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
