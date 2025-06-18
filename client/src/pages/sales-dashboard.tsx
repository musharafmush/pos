import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { 
  DollarSignIcon, 
  TrendingUpIcon, 
  ShoppingCartIcon, 
  UsersIcon,
  CalendarIcon,
  PercentIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFormatCurrency } from "@/lib/currency";

export default function SalesDashboard() {
  const [timeRange, setTimeRange] = useState<string>("7");
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const formatCurrency = useFormatCurrency();

  // Customer Billing Details CRUD operations
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    orderNumber: '',
    customerId: '',
    customerName: '',
    total: '',
    paymentMethod: 'cash',
    status: 'completed'
  });

  // Customer Billing CRUD state
  const [selectedCustomerBilling, setSelectedCustomerBilling] = useState<any>(null);
  const [isEditCustomerBillingDialogOpen, setIsEditCustomerBillingDialogOpen] = useState(false);
  const [isDeleteCustomerBillingDialogOpen, setIsDeleteCustomerBillingDialogOpen] = useState(false);
  const [isCreateCustomerBillingDialogOpen, setIsCreateCustomerBillingDialogOpen] = useState(false);
  const [isViewCustomerBillingDialogOpen, setIsViewCustomerBillingDialogOpen] = useState(false);
  const [customerBillingForm, setCustomerBillingForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    totalBilled: '',
    orderCount: '',
    averageOrderValue: '',
    status: 'active',
    paymentTerm: '',
    creditLimit: '',
    notes: ''
  });

  // Sales Detail state
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any>(null);
  const [isViewSaleDetailDialogOpen, setIsViewSaleDetailDialogOpen] = useState(false);

  // Product CRUD state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [isDeleteProductDialogOpen, setIsDeleteProductDialogOpen] = useState(false);
  const [isCreateProductDialogOpen, setIsCreateProductDialogOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    price: '',
    cost: '',
    categoryId: '',
    stockQuantity: '',
    alertThreshold: '5',
    active: true,
    description: '',
    barcode: ''
  });

  // Fetch sales data with enhanced customer billing details and real-time updates
  const { data: salesData, isLoading: salesLoading, error: salesError, refetch: refetchSales } = useQuery({
    queryKey: ['/api/sales'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/sales?limit=100&include=customer,items,billing');
        if (!response.ok) {
          console.error('Sales API response not ok:', response.status, response.statusText);
          throw new Error(`Failed to fetch sales: ${response.status}`);
        }
        const data = await response.json();
        console.log('Sales data received:', data);

        // Handle different response formats
        if (Array.isArray(data)) {
          return data;
        } else if (data && Array.isArray(data.sales)) {
          return data.sales;
        } else if (data && data.data && Array.isArray(data.data)) {
          return data.data;
        } else {
          console.warn('Unexpected sales data format:', data);
          return [];
        }
      } catch (error) {
        console.error('Error fetching sales data:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 10000 // Refresh every 10 seconds for live data
  });

  // Fetch detailed customer billing data with enhanced information
  const { data: customerBillingData, isLoading: billingLoading, refetch: refetchCustomerBilling } = useQuery({
    queryKey: ['/api/reports/customer-billing', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports/customer-billing?days=${timeRange}`);
        if (!response.ok) {
          console.error('Customer billing API error:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Customer billing data:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching customer billing data:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch detailed customer transaction history
  const { data: customerTransactionHistory, isLoading: transactionLoading } = useQuery({
    queryKey: ['/api/reports/customer-transactions', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports/customer-transactions?days=${timeRange}`);
        if (!response.ok) {
          console.error('Customer transactions API error:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Customer transaction history:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching customer transaction history:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch customer demographics and segmentation data
  const { data: customerDemographics, isLoading: demographicsLoading } = useQuery({
    queryKey: ['/api/reports/customer-demographics', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports/customer-demographics?days=${timeRange}`);
        if (!response.ok) {
          console.error('Customer demographics API error:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Customer demographics data:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching customer demographics:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch payment method analytics
  const { data: paymentAnalytics, isLoading: paymentLoading } = useQuery({
    queryKey: ['/api/reports/payment-analytics', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports/payment-analytics?days=${timeRange}`);
        if (!response.ok) {
          console.error('Payment analytics API error:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Payment analytics data:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching payment analytics data:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // CRUD Operations
  const handleCreateSale = async (saleData: any) => {
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...saleData,
          items: saleData.items || [],
          customerId: saleData.customerId || null,
          userId: 1, // Default user ID
          total: parseFloat(saleData.total || '0'),
          tax: parseFloat(saleData.tax || '0'),
          discount: parseFloat(saleData.discount || '0'),
          status: saleData.status || 'completed'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create sale');
      }

      const result = await response.json();
      console.log('Sale created successfully:', result);
      refetchSales();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Failed to create sale. Please try again.');
    }
  };

  const handleUpdateSale = async (saleId: number, saleData: any) => {
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...saleData,
          total: parseFloat(saleData.total || '0'),
          tax: parseFloat(saleData.tax || '0'),
          discount: parseFloat(saleData.discount || '0')
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sale');
      }

      const result = await response.json();
      console.log('Sale updated successfully:', result);
      refetchSales();
      setIsEditDialogOpen(false);
      setSelectedSale(null);
      resetForm();
    } catch (error) {
      console.error('Error updating sale:', error);
      alert('Failed to update sale. Please try again.');
    }
  };

  const handleDeleteSale = async (saleId: number) => {
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete sale');
      }

      console.log('Sale deleted successfully');
      refetchSales();
      setIsDeleteDialogOpen(false);
      setSelectedSale(null);
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Failed to delete sale. Please try again.');
    }
  };

  const resetForm = () => {
    setEditForm({
      orderNumber: '',
      customerId: '',
      customerName: '',
      total: '',
      paymentMethod: 'cash',
      status: 'completed'
    });
  };

  const openEditDialog = (sale: any) => {
    setSelectedSale(sale);
    setEditForm({
      orderNumber: sale.orderNumber || '',
      customerId: sale.customerId?.toString() || '',
      customerName: sale.customerName || sale.customer?.name || '',
      total: sale.total?.toString() || '',
      paymentMethod: sale.paymentMethod || 'cash',
      status: sale.status || 'completed'
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (sale: any) => {
    setSelectedSale(sale);
    setIsDeleteDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  // Product CRUD Operations
  const handleCreateProduct = async (productData: any) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...productData,
          price: parseFloat(productData.price || '0'),
          cost: parseFloat(productData.cost || '0'),
          categoryId: parseInt(productData.categoryId || '1'),
          stockQuantity: parseInt(productData.stockQuantity || '0'),
          alertThreshold: parseInt(productData.alertThreshold || '5'),
          active: productData.active !== false
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      const result = await response.json();
      console.log('Product created successfully:', result);
      refetchProducts();
      setIsCreateProductDialogOpen(false);
      resetProductForm();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    }
  };

  const handleUpdateProduct = async (productId: number, productData: any) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...productData,
          price: parseFloat(productData.price || '0'),
          cost: parseFloat(productData.cost || '0'),
          categoryId: parseInt(productData.categoryId || '1'),
          stockQuantity: parseInt(productData.stockQuantity || '0'),
          alertThreshold: parseInt(productData.alertThreshold || '5')
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      const result = await response.json();
      console.log('Product updated successfully:', result);
      refetchProducts();
      setIsEditProductDialogOpen(false);
      setSelectedProduct(null);
      resetProductForm();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      console.log('Product deleted successfully');
      refetchProducts();
      setIsDeleteProductDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      sku: '',
      price: '',
      cost: '',
      categoryId: '',
      stockQuantity: '',
      alertThreshold: '5',
      active: true,
      description: '',
      barcode: ''
    });
  };

  const openEditProductDialog = (product: any) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name || '',
      sku: product.sku || '',
      price: product.price?.toString() || '',
      cost: product.cost?.toString() || '',
      categoryId: product.categoryId?.toString() || '',
      stockQuantity: product.stockQuantity?.toString() || '',
      alertThreshold: product.alertThreshold?.toString() || '5',
      active: product.active !== false,
      description: product.description || '',
      barcode: product.barcode || ''
    });
    setIsEditProductDialogOpen(true);
  };

  const openDeleteProductDialog = (product: any) => {
    setSelectedProduct(product);
    setIsDeleteProductDialogOpen(true);
  };

  const openCreateProductDialog = () => {
    resetProductForm();
    setIsCreateProductDialogOpen(true);
  };

  // Fetch sales chart data
  const { data: salesChartData, isLoading: chartLoading } = useQuery({
    queryKey: ['/api/dashboard/sales-chart', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/dashboard/sales-chart?days=${timeRange}`);
        if (!response.ok) throw new Error('Failed to fetch chart data');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching chart data:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch top selling products
  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/reports/top-selling-products', timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/reports/top-selling-products?days=${timeRange}&limit=10`);
        if (!response.ok) {
          console.error('Top products API error:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Top products data:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching top products:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch all products for selling products management
  const { data: allProducts, isLoading: allProductsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch categories for product form
  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        return response.json();
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    }
  });

  // Filter products based on search term
  const filteredProducts = allProducts?.filter((product: any) =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.category?.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  ) || [];

  // Process chart data with better error handling
  const chartData = salesChartData?.map((item: any) => {
    const date = item.date || item.createdAt || new Date().toISOString();
    const total = parseFloat(item.total || item.totalAmount || item.amount || 0);
    return {
      date: format(new Date(date), "MMM dd"),
      total: isNaN(total) ? 0 : total,
      sales: item.sales || 0
    };
  }) || [];

  console.log('Processed chart data:', chartData);

  // Calculate metrics with better error handling
  const totalSalesAmount = salesData?.reduce((total: number, sale: any) => {
    const saleTotal = parseFloat(sale.total || sale.totalAmount || sale.amount || 0);
    return total + (isNaN(saleTotal) ? 0 : saleTotal);
  }, 0) || 0;

  const totalTransactions = salesData?.length || 0;
  const averageOrderValue = totalTransactions > 0 ? totalSalesAmount / totalTransactions : 0;

  // Mock data for additional metrics
  const previousPeriodSales = totalSalesAmount * 0.85; // Simulate 15% growth
  const salesGrowth = totalSalesAmount > 0 ? ((totalSalesAmount - previousPeriodSales) / previousPeriodSales) * 100 : 0;

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2'];

  // Product category data for pie chart
  const productCategoryData = topProducts?.reduce((acc: any[], product: any) => {
    const category = product.product.category?.name || "Uncategorized";
    const existingCategory = acc.find((item) => item.name === category);

    if (existingCategory) {
      existingCategory.value += product.soldQuantity;
      existingCategory.revenue += parseFloat(product.revenue || 0);
    } else {
      acc.push({ 
        name: category, 
        value: product.soldQuantity,
        revenue: parseFloat(product.revenue || 0)
      });
    }

    return acc;
  }, []) || [];

  // Customer Billing CRUD Operations
  const handleCreateCustomerBilling = async (customerData: any) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...customerData,
          totalBilled: parseFloat(customerData.totalBilled || '0'),
          orderCount: parseInt(customerData.orderCount || '0'),
          averageOrderValue: parseFloat(customerData.averageOrderValue || '0'),
          creditLimit: parseFloat(customerData.creditLimit || '0')
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create customer');
      }

      const result = await response.json();
      console.log('Customer created successfully:', result);
      // Refetch customer billing data
      refetchCustomerBilling();
      setIsCreateCustomerBillingDialogOpen(false);
      resetCustomerBillingForm();
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer. Please try again.');
    }
  };

  const handleUpdateCustomerBilling = async (customerId: number, customerData: any) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...customerData,
          totalBilled: parseFloat(customerData.totalBilled || '0'),
          orderCount: parseInt(customerData.orderCount || '0'),
          averageOrderValue: parseFloat(customerData.averageOrderValue || '0'),
          creditLimit: parseFloat(customerData.creditLimit || '0')
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update customer');
      }

      const result = await response.json();
      console.log('Customer updated successfully:', result);
      // Refetch customer billing data
      refetchCustomerBilling();
      setIsEditCustomerBillingDialogOpen(false);
      setSelectedCustomerBilling(null);
      resetCustomerBillingForm();
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer. Please try again.');
    }
  };

  const handleDeleteCustomerBilling = async (customerId: number) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }

      console.log('Customer deleted successfully');
      // Refetch customer billing data
      refetchCustomerBilling();
      setIsDeleteCustomerBillingDialogOpen(false);
      setSelectedCustomerBilling(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer. Please try again.');
    }
  };

  const resetCustomerBillingForm = () => {
    setCustomerBillingForm({
      customerName: '',
      phone: '',
      email: '',
      address: '',
      totalBilled: '',
      orderCount: '',
      averageOrderValue: '',
      status: 'active',
      paymentTerm: '',
      creditLimit: '',
      notes: ''
    });
  };

  const openEditCustomerBillingDialog = (customer: any) => {
    setSelectedCustomerBilling(customer);
    setCustomerBillingForm({
      customerName: customer.customerName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      totalBilled: customer.totalBilled?.toString() || '',
      orderCount: customer.orderCount?.toString() || '',
      averageOrderValue: customer.averageOrderValue?.toString() || '',
      status: customer.status || 'active',
      paymentTerm: customer.paymentTerm || '',
      creditLimit: customer.creditLimit?.toString() || '',
      notes: customer.notes || ''
    });
    setIsEditCustomerBillingDialogOpen(true);
  };

  const openDeleteCustomerBillingDialog = (customer: any) => {
    setSelectedCustomerBilling(customer);
    setIsDeleteCustomerBillingDialogOpen(true);
  };

  const openCreateCustomerBillingDialog = () => {
    resetCustomerBillingForm();
    setIsCreateCustomerBillingDialogOpen(true);
  };

  // Sales Detail functions
  const openViewSaleDetailDialog = (sale: any) => {
    setSelectedSaleDetail(sale);
    setIsViewSaleDetailDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Sales Dashboard</h2>
              <p className="text-gray-600 dark:text-gray-400">Monitor your sales performance and trends • Real-time POS integration</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live Data
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={openCreateDialog}
                className="flex items-center space-x-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                <span>New Sale</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/pos-enhanced', '_blank')}
                className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                <span>POS System</span>
              </Button>
            </div>
          </div>

          {/* Loading and Error States */}
          {salesLoading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700">Loading sales data...</p>
            </div>
          )}

          {salesError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">Error loading sales data. Please try refreshing the page.</p>
            </div>
          )}

          {!salesLoading && !salesError && (!salesData || salesData.length === 0) && (
            <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <ShoppingCartIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Ready for Sales!</h3>
                  <p className="text-blue-700">Your POS system is connected and ready to track sales data</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-blue-600">
                <div>📊 Real-time sales tracking enabled</div>
                <div>🛒 Start making sales in POS Enhanced to see live analytics</div>
                <div>📈 All transaction data will appear here instantly</div>
              </div>
              <Button
                onClick={() => window.open('/pos-enhanced', '_blank')}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <ShoppingCartIcon className="h-4 w-4 mr-2" />
                Open POS System
              </Button>
            </div>
          )}
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSalesAmount)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {salesGrowth >= 0 ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={salesGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(salesGrowth).toFixed(1)}%
                </span>
                <span className="ml-1">from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Sales transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</div>
              <p className="text-xs text-muted-foreground">
                Per transaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Selling Items</CardTitle>
              <PercentIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topProducts?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active products
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customer-billing">Customer Billing</TabsTrigger>
            <TabsTrigger value="payment-analytics">Payment Analytics</TabsTrigger>
            <TabsTrigger value="trends">Sales Trends</TabsTrigger>
            <TabsTrigger value="products">Product Performance</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="selling-products">Selling Products</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Sales Overview</h3>
              <Select
                value={timeRange}
                onValueChange={(value) => setTimeRange(value)}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm bg-gray-50 dark:bg-gray-700">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recent Sales Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCartIcon className="h-5 w-5 text-blue-600" />
                      Recent Sales
                    </CardTitle>
                    <CardDescription>Latest sales transactions with live updates</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-2 py-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                      Live
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchSales()}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      🔄 Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading recent sales...</p>
                    </div>
                  </div>
                ) : salesData && salesData.length > 0 ? (
                  <div className="space-y-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{salesData.length}</div>
                        <div className="text-xs text-gray-600">Total Sales</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSalesAmount)}</div>
                        <div className="text-xs text-gray-600">Total Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{formatCurrency(averageOrderValue)}</div>
                        <div className="text-xs text-gray-600">Avg Order Value</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {salesData.filter((sale: any) => {
                            const saleDate = new Date(sale.createdAt || sale.created_at || sale.date);
                            const today = new Date();
                            return saleDate.toDateString() === today.toDateString();
                          }).length}
                        </div>
                        <div className="text-xs text-gray-600">Today's Sales</div>
                      </div>
                    </div>

                    {/* Recent Sales List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-semibold text-gray-800">Latest Transactions</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('/pos-enhanced', '_blank')}
                          className="text-green-600 hover:text-green-800"
                        >
                          📱 New Sale
                        </Button>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {salesData.slice(0, 10).map((sale: any) => {
                          const saleDate = sale.createdAt || sale.created_at || sale.date || new Date().toISOString();
                          const saleTotal = parseFloat(sale.total || sale.totalAmount || sale.amount || 0);
                          const itemCount = sale.items?.length || sale.saleItems?.length || sale.sale_items?.length || 0;
                          const timeAgo = format(new Date(saleDate), "MMM dd, hh:mm a");
                          const isToday = new Date(saleDate).toDateString() === new Date().toDateString();

                          return (
                            <div key={sale.id} className={`p-4 rounded-lg border hover:shadow-md transition-all duration-200 ${
                              isToday ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    isToday ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    <ShoppingCartIcon className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-gray-800">
                                        {sale.orderNumber || sale.invoiceNumber || `#${sale.id}`}
                                      </span>
                                      {isToday && (
                                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">
                                          Today
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      <span className="font-medium">{sale.customerName || sale.customer_name || "Walk-in Customer"}</span>
                                      {sale.customerPhone && <span> • {sale.customerPhone}</span>}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {itemCount} {itemCount === 1 ? 'item' : 'items'} • {timeAgo}
                                      {sale.paymentMethod && <span> • {sale.paymentMethod.toUpperCase()}</span>}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-800">
                                    {formatCurrency(isNaN(saleTotal) ? 0 : saleTotal)}
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      sale.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {sale.status || "Completed"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Sale Items Preview */}
                              {sale.items && sale.items.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">Items: </span>
                                    {sale.items.slice(0, 3).map((item: any, index: number) => (
                                      <span key={index}>
                                        {item.productName || item.name} ({item.quantity}x)
                                        {index < Math.min(sale.items.length, 3) - 1 && ", "}
                                      </span>
                                    ))}
                                    {sale.items.length > 3 && (
                                      <span className="text-blue-600 font-medium"> +{sale.items.length - 3} more</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="mt-3 flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openViewSaleDetailDialog(sale)}
                                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800"
                                >
                                  👁️ View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    window.print();
                                  }}
                                  className="h-7 px-2 text-xs text-green-600 hover:text-green-800"
                                >
                                  🖨️ Print
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(sale)}
                                  className="h-7 px-2 text-xs text-orange-600 hover:text-orange-800"
                                >
                                  ✏️ Edit
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {salesData.length > 10 && (
                        <div className="text-center pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => {
                              // Switch to transactions tab to see all sales
                              const tabsList = document.querySelector('[role="tablist"]');
                              const transactionsTab = document.querySelector('[value="transactions"]');
                              if (transactionsTab) {
                                (transactionsTab as HTMLElement).click();
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View All {salesData.length} Sales →
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCartIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Sales Yet</h3>
                    <p className="text-gray-600 mb-4">Start making sales to see them appear here</p>
                    <Button
                      onClick={() => window.open('/pos-enhanced', '_blank')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ShoppingCartIcon className="h-4 w-4 mr-2" />
                      Make First Sale
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales Trend</CardTitle>
                  <CardDescription>Daily sales performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                  <CardDescription>Product category distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={productCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {productCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customer Billing Tab */}
          <TabsContent value="customer-billing" className="space-y-6">
            {/* Header with Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Customer Billing Details</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Comprehensive billing information for all customers</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Export customer billing data
                    const csvData = customerBillingData?.map(customer => ({
                      'Customer Name': customer.customerName || 'Walk-in Customer',
                      'Phone': customer.phone || '',
                      'Email': customer.email || '',
                      'Total Billed': customer.totalBilled || '0',
                      'Order Count': customer.orderCount || 0,
                      'Average Order Value': customer.averageOrderValue || '0',
                      'Last Purchase': customer.lastPurchaseDate ? format(new Date(customer.lastPurchaseDate), "yyyy-MM-dd") : 'Never'
                    }));
                    console.log('Exporting customer billing data:', csvData);
                  }}
                  className="flex items-center space-x-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                >
                  📊 Export Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCreateCustomerBillingDialog}
                  className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                >
                  <UsersIcon className="h-4 w-4" />
                  Add Customer
                </Button>
              </div>
            </div>

            {/* Billing Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{customerBillingData?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Active billing customers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      customerBillingData?.reduce((sum: number, customer: any) => 
                        sum + parseFloat(customer.totalBilled || customer.totalAmount || 0), 0
                      ) || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">From all customers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
                  <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      customerBillingData?.length > 0 
                        ? customerBillingData.reduce((sum: number, customer: any) => 
                            sum + parseFloat(customer.totalBilled || customer.totalAmount || 0), 0
                          ) / customerBillingData.length
                        : 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Per customer</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {customerBillingData?.reduce((sum: number, customer: any) => 
                      sum + (customer.orderCount || 0), 0
                    ) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">All customer orders</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer Billing Summary */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Customer Billing Details</CardTitle>
                  <CardDescription>Comprehensive billing information for all customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead className="text-right">Total Billed</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Avg Order</TableHead>
                          <TableHead className="text-right">Frequency</TableHead>
                          <TableHead>Last Purchase</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerBillingData?.map((customer: any) => {
                          const totalBilled = parseFloat(customer.totalBilled || customer.totalAmount || 0);
                          const orderCount = customer.orderCount || 0;
                          const avgOrderValue = orderCount > 0 ? totalBilled / orderCount : 0;
                          const isHighValue = totalBilled > 5000;
                          const isFrequent = orderCount > 5;

                          return (
                            <TableRow key={customer.customerId || customer.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isHighValue ? 'bg-yellow-100 text-yellow-600' : 
                                    isFrequent ? 'bg-green-100 text-green-600' : 
                                    'bg-blue-100 text-blue-600'
                                  }`}>
                                    <UsersIcon className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{customer.customerName || customer.name || "Walk-in Customer"}</div>
                                    <div className="text-xs text-gray-500">ID: {customer.customerId || customer.id}</div>
                                    {isHighValue && <div className="text-xs text-yellow-600 font-medium">VIP Customer</div>}
                                    {isFrequent && <div className="text-xs text-green-600 font-medium">Frequent Buyer</div>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {customer.phone && <div className="font-medium">{customer.phone}</div>}
                                  {customer.email && <div className="text-gray-500 text-xs">{customer.email}</div>}
                                  {!customer.phone && !customer.email && <span className="text-gray-400">No contact</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="font-semibold">{formatCurrency(totalBilled)}</div>
                                <div className="text-xs text-gray-500">
                                  {totalBilled > 0 && `${((totalBilled / (customerBillingData?.reduce((sum: number, c: any) => 
                                    sum + parseFloat(c.totalBilled || c.totalAmount || 0), 0) || 1)) * 100).toFixed(1)}% of total`}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="font-medium">{orderCount}</div>
                                <div className="text-xs text-gray-500">orders</div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="font-medium">{formatCurrency(avgOrderValue)}</div>
                                <div className="text-xs text-gray-500">per order</div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="text-sm">
                                  {orderCount > 10 ? "Very High" : 
                                   orderCount > 5 ? "High" : 
                                   orderCount > 2 ? "Medium" : "Low"}
                                </div>
                                <div className="text-xs text-gray-500">{orderCount} orders</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {customer.lastPurchaseDate ? format(new Date(customer.lastPurchaseDate), "MMM dd, yyyy") : "Never"}
                                </div>
                                {customer.lastPurchaseDate && (
                                  <div className="text-xs text-gray-500">
                                    {Math.floor((new Date().getTime() - new Date(customer.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isHighValue ? 'bg-yellow-100 text-yellow-800' :
                                  isFrequent ? 'bg-green-100 text-green-800' :
                                  orderCount > 0 ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {isHighValue ? 'VIP' : isFrequent ? 'Frequent' : orderCount > 0 ? 'Active' : 'Inactive'}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        console.log('View customer:', customer);
                                        setSelectedCustomerBilling(customer);
                                        setIsViewCustomerBillingDialogOpen(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditCustomerBillingDialog(customer)}
                                      className="text-green-600 hover:text-green-800"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDeleteCustomerBillingDialog(customer)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      Delete
                                    </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Insights and Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Insights</CardTitle>
                  <CardDescription>Customer behavior and analytics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Top Customers */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 text-gray-700">Top Customers by Value</h4>
                    <div className="space-y-3">
                      {customerBillingData?.slice(0, 5).map((customer: any, index: number) => (
                        <div key={customer.customerId || customer.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 
                              index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{customer.customerName || customer.name || "Walk-in"}</div>
                              <div className="text-xs text-gray-500">{customer.orderCount || 0} orders</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">{formatCurrency(parseFloat(customer.totalBilled || 0))}</div>
                            <div className="text-xs text-gray-500">
                              {formatCurrency(parseFloat(customer.averageOrderValue || 0))} avg
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer Segmentation */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 text-gray-700">Customer Segmentation</h4>
                    <div className="space-y-2">
                      {(() => {
                        const vipCustomers = customerBillingData?.filter((c: any) => parseFloat(c.totalBilled || 0) > 5000).length || 0;
                        const frequentCustomers = customerBillingData?.filter((c: any) => (c.orderCount || 0) > 5).length || 0;
                        const newCustomers = customerBillingData?.filter((c: any) => (c.orderCount || 0) === 1).length || 0;
                        const totalCustomers = customerBillingData?.length || 0;

                        return (
                          <>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs text-gray-600">VIP Customers (&gt;₹5000)</span>
                              <span className="text-xs font-medium text-yellow-600">{vipCustomers} ({totalCustomers > 0 ? ((vipCustomers/totalCustomers)*100).toFixed(0) : 0}%)</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs text-gray-600">Frequent Buyers (&gt;5 orders)</span>
                              <span className="text-xs font-medium text-green-600">{frequentCustomers} ({totalCustomers > 0 ? ((frequentCustomers/totalCustomers)*100).toFixed(0) : 0}%)</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs text-gray-600">New Customers (1 order)</span>
                              <span className="text-xs font-medium text-blue-600">{newCustomers} ({totalCustomers > 0 ? ((newCustomers/totalCustomers)*100).toFixed(0) : 0}%)</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 text-gray-700">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          console.log('Export customer data');
                        }}
                      >
                        📊 Export Customer Data
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 text-green-600 hover:text-green-800"
                        onClick={() => {
                          console.log('Send bulk statements');
                        }}
                      >
                        📄 Send Bulk Statements
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 text-purple-600 hover:text-purple-800"
                        onClick={() => {
                          console.log('Customer loyalty program');
                        }}
                      >
                        🎁 Loyalty Program
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Billing Trends and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Purchase Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Purchase Trends</CardTitle>
                  <CardDescription>Top customers by purchase volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerBillingData?.slice(0, 8) || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="customerName" 
                          tick={{ fontSize: 12 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'totalBilled' ? formatCurrency(Number(value)) : value,
                            name === 'totalBilled' ? 'Total Billed' : 'Orders'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="totalBilled" fill="#3b82f6" name="Total Billed" />
                        <Bar dataKey="orderCount" fill="#10b981" name="Order Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Value Distribution</CardTitle>
                  <CardDescription>Revenue distribution by customer segments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(() => {
                            const vipRevenue = customerBillingData?.filter((c: any) => parseFloat(c.totalBilled || 0) > 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;
                            const frequentRevenue = customerBillingData?.filter((c: any) => (c.orderCount || 0) > 5 && parseFloat(c.totalBilled || 0) <= 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;
                            const regularRevenue = customerBillingData?.filter((c: any) => (c.orderCount || 0) <= 5 && parseFloat(c.totalBilled || 0) <= 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;

                            return [
                              { name: 'VIP Customers', value: vipRevenue, color: '#fbbf24' },
                              { name: 'Frequent Buyers', value: frequentRevenue, color: '#10b981' },
                              { name: 'Regular Customers', value: regularRevenue, color: '#3b82f6' }
                            ].filter(item => item.value > 0);
                          })()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(() => {
                            const vipRevenue = customerBillingData?.filter((c: any) => parseFloat(c.totalBilled || 0) > 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;
                            const frequentRevenue = customerBillingData?.filter((c: any) => (c.orderCount || 0) > 5 && parseFloat(c.totalBilled || 0) <= 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;
                            const regularRevenue = customerBillingData?.filter((c: any) => (c.orderCount || 0) <= 5 && parseFloat(c.totalBilled || 0) <= 5000)
                              .reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0) || 0;

                            const data = [
                              { name: 'VIP Customers', value: vipRevenue, color: '#fbbf24' },
                              { name: 'Frequent Buyers', value: frequentRevenue, color: '#10b981' },
                              { name: 'Regular Customers', value: regularRevenue, color: '#3b82f6' }
                            ].filter(item => item.value > 0);

                            return data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ));
                          })()}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Billing Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Billing Summary</CardTitle>
                <CardDescription>Detailed financial overview by customer segments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {(() => {
                    const vipCustomers = customerBillingData?.filter((c: any) => parseFloat(c.totalBilled || 0) > 5000) || [];
                    const frequentCustomers = customerBillingData?.filter((c: any) => (c.orderCount || 0) > 5 && parseFloat(c.totalBilled || 0) <= 5000) || [];
                    const regularCustomers = customerBillingData?.filter((c: any) => (c.orderCount || 0) <= 5 && parseFloat(c.totalBilled || 0) <= 5000) || [];

                    const vipRevenue = vipCustomers.reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0);
                    const frequentRevenue = frequentCustomers.reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0);
                    const regularRevenue = regularCustomers.reduce((sum: number, c: any) => sum + parseFloat(c.totalBilled || 0), 0);

                    return (
                      <>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-yellow-800">VIP Customers</h4>
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">Premium</span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-yellow-900">{vipCustomers.length}</div>
                            <div className="text-sm text-yellow-700">Total Revenue: {formatCurrency(vipRevenue)}</div>
                            <div className="text-xs text-yellow-600">Avg: {formatCurrency(vipCustomers.length > 0 ? vipRevenue / vipCustomers.length : 0)}</div>
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-green-800">Frequent Buyers</h4>
                            <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Active</span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-green-900">{frequentCustomers.length}</div>
                            <div className="text-sm text-green-700">Total Revenue: {formatCurrency(frequentRevenue)}</div>
                            <div className="text-xs text-green-600">Avg: {formatCurrency(frequentCustomers.length > 0 ? frequentRevenue / frequentCustomers.length : 0)}</div>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-blue-800">Regular Customers</h4>
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">Standard</span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-blue-900">{regularCustomers.length}</div>
                            <div className="text-sm text-blue-700">Total Revenue: {formatCurrency(regularRevenue)}</div>
                            <div className="text-xs text-blue-600">Avg: {formatCurrency(regularCustomers.length > 0 ? regularRevenue / regularCustomers.length : 0)}</div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Analytics Tab */}
          <TabsContent value="payment-analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Method Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method Distribution</CardTitle>
                <CardDescription>Breakdown of payment methods used</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentAnalytics}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {paymentAnalytics?.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Trends</CardTitle>
                  <CardDescription>Daily payment method usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} name="Total Sales" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Method Details */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Details</CardTitle>
                <CardDescription>Detailed breakdown by payment method</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Average Transaction</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentAnalytics?.map((payment: any) => {
                        const percentage = ((payment.amount / totalSalesAmount) * 100).toFixed(1);
                        return (
                          <TableRow key={payment.paymentMethod}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[paymentAnalytics.indexOf(payment) % COLORS.length] }}></div>
                                <span className="capitalize">{payment.paymentMethod}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{payment.transactionCount}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(parseFloat(payment.amount || 0))}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(parseFloat(payment.amount || 0) / (payment.transactionCount || 1))}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium">{percentage}%</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Sales Analysis</CardTitle>
                <div className="flex space-x-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Daily Sales"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Performance Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performing products by quantity sold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Quantity Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts?.map((product: any) => (
                        <TableRow key={product.product.id}>
                          <TableCell className="font-medium">
                            {product.product.name}
                          </TableCell>
                          <TableCell>{product.product.sku}</TableCell>
                          <TableCell>{product.product.category?.name || "Uncategorized"}</TableCell>
                          <TableCell className="text-right">{product.soldQuantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(product.revenue || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Header with Title and Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Recent Sales Transactions</h2>
                <p className="text-gray-600 mt-1">Latest sales activity with detailed billing information</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Export transactions
                    const csvData = salesData?.map(sale => ({
                      'Date': format(new Date(sale.createdAt || sale.created_at || new Date()), "yyyy-MM-dd"),
                      'Invoice': sale.orderNumber || sale.invoiceNumber || `INV-${sale.id}`,
                      'Customer': sale.customerName || sale.customer_name || "Walk-in Customer",
                      'Total': sale.total || sale.totalAmount || sale.amount || 0,
                      'Payment': sale.paymentMethod || sale.payment_method || "Cash",
                      'Status': sale.status || "Completed"
                    }));
                    console.log('Exporting transactions:', csvData);
                  }}
                  className="text-green-600 hover:text-green-800 border-green-300 hover:bg-green-50"
                >
                  📊 Export Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchSales()}
                  className="text-blue-600 hover:text-blue-800 border-blue-300 hover:bg-blue-50"
                >
                  🔄 Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open('/pos-enhanced', '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ShoppingCartIcon className="h-4 w-4 mr-2" />
                  New Transaction
                </Button>
              </div>
            </div>

            {/* Transaction Summary Cards - Matching Reference Image */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total Transactions</p>
                      <p className="text-3xl font-bold text-blue-900">{salesData?.length || 0}</p>
                      <p className="text-xs text-blue-600 mt-1">Sales transactions</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                      <ShoppingCartIcon className="h-6 w-6 text-blue-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Total Revenue</p>
                      <p className="text-3xl font-bold text-green-900">{formatCurrency(totalSalesAmount)}</p>
                      <p className="text-xs text-green-600 mt-1">Total earnings</p>
                    </div>
                    <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                      <DollarSignIcon className="h-6 w-6 text-green-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Average Order</p>
                      <p className="text-3xl font-bold text-purple-900">{formatCurrency(averageOrderValue)}</p>
                      <p className="text-xs text-purple-600 mt-1">Per transaction</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                      <TrendingUpIcon className="h-6 w-6 text-purple-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">Today's Sales</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {salesData?.filter((sale: any) => {
                          const saleDate = new Date(sale.createdAt || sale.created_at || sale.date);
                          const today = new Date();
                          return saleDate.toDateString() === today.toDateString();
                        }).length || 0}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">Sales today</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
                      <CalendarIcon className="h-6 w-6 text-orange-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Table */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="font-semibold text-gray-700 py-4 px-6">Date & Time</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 px-6">Invoice#</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 px-6">Customer Details</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 px-6">Items</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 px-6 text-right">Subtotal</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 px-6 text-right">Tax</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 px-6 text-right">Discount</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 px-6 text-right">Total</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 px-6">Payment</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 px-6">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700 py-4 px-6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData && salesData.length > 0 ? (
                        salesData.map((sale: any, index: number) => {
                          const saleDate = sale.createdAt || sale.created_at || sale.date || new Date().toISOString();
                          const saleTotal = parseFloat(sale.total || sale.totalAmount || sale.amount || 0);
                          const saleSubtotal = parseFloat(sale.subtotal || (sale.total - sale.tax - sale.discount) || sale.total || 0);
                          const saleTax = parseFloat(sale.tax || sale.taxAmount || 0);
                          const saleDiscount = parseFloat(sale.discount || sale.discountAmount || 0);
                          const itemCount = sale.items?.length || sale.saleItems?.length || sale.sale_items?.length || 0;
                          const isToday = new Date(saleDate).toDateString() === new Date().toDateString();

                          return (
                            <TableRow 
                              key={sale.id || index} 
                              className={`hover:bg-gray-50 transition-colors duration-150 ${
                                isToday ? 'bg-green-50 border-l-4 border-l-green-400' : ''
                              }`}
                            >
                              <TableCell className="py-4 px-6">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-800">
                                    {format(new Date(saleDate), "MMM dd, yyyy")}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {format(new Date(saleDate), "hh:mm a")}
                                  </span>
                                  {isToday && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mt-1 w-fit">
                                      Today
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              
                              <TableCell className="py-4 px-6">
                                <div className="font-mono text-sm font-medium text-blue-600">
                                  {sale.orderNumber || sale.invoiceNumber || `INV-${sale.id}`}
                                </div>
                              </TableCell>
                              
                              <TableCell className="py-4 px-6">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-800">
                                    {sale.customerName || sale.customer_name || "Walk-in Customer"}
                                  </span>
                                  {sale.customerPhone && (
                                    <span className="text-sm text-gray-500">{sale.customerPhone}</span>
                                  )}
                                  {sale.customerEmail && (
                                    <span className="text-xs text-gray-400">{sale.customerEmail}</span>
                                  )}
                                </div>
                              </TableCell>
                              
                              <TableCell className="py-4 px-6">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-800">{itemCount} items</span>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {sale.items?.slice(0, 2).map((item: any, idx: number) => (
                                      <div key={idx}>
                                        {item.productName || item.name} (×{item.quantity})
                                      </div>
                                    ))}
                                    {itemCount > 2 && (
                                      <div className="text-blue-600 font-medium">+{itemCount - 2} more items</div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              
                              <TableCell className="py-4 px-6 text-right">
                                <span className="font-medium text-gray-800">
                                  {formatCurrency(isNaN(saleSubtotal) ? saleTotal : saleSubtotal)}
                                </span>
                              </TableCell>
                              
                              <TableCell className="py-4 px-6 text-right">
                                <span className="font-medium text-gray-600">
                                  {formatCurrency(isNaN(saleTax) ? 0 : saleTax)}
                                </span>
                              </TableCell>
                              
                              <TableCell className="py-4 px-6 text-right">
                                <span className="font-medium text-gray-600">
                                  {saleDiscount > 0 ? formatCurrency(saleDiscount) : "—"}
                                </span>
                              </TableCell>
                              
                              <TableCell className="py-4 px-6 text-right">
                                <span className="text-lg font-bold text-green-600">
                                  {formatCurrency(isNaN(saleTotal) ? 0 : saleTotal)}
                                </span>
                              </TableCell>
                              
                              <TableCell className="py-4 px-6">
                                <div className="flex flex-col">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                    (sale.paymentMethod || sale.payment_method || "cash") === "cash" 
                                      ? "bg-green-100 text-green-800"
                                      : (sale.paymentMethod || sale.payment_method) === "card"
                                      ? "bg-blue-100 text-blue-800"
                                      : (sale.paymentMethod || sale.payment_method) === "upi"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {sale.paymentMethod || sale.payment_method || "Cash"}
                                  </span>
                                  {sale.paymentReference && (
                                    <span className="text-xs text-gray-500 mt-1">
                                      Ref: {sale.paymentReference}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              
                              <TableCell className="py-4 px-6">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  (sale.status || "completed") === 'completed' 
                                    ? 'bg-green-100 text-green-800' :
                                  (sale.status || "completed") === 'pending' 
                                    ? 'bg-yellow-100 text-yellow-800' :
                                  (sale.status || "completed") === 'cancelled' 
                                    ? 'bg-red-100 text-red-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {sale.status || "Completed"}
                                </span>
                              </TableCell>
                              
                              <TableCell className="py-4 px-6">
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openViewSaleDetailDialog(sale)}
                                    className="h-8 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  >
                                    👁️ View
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      window.print();
                                    }}
                                    className="h-8 px-2 text-xs text-green-600 hover:text-green-800 hover:bg-green-50"
                                  >
                                    🖨️ Print
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(sale)}
                                    className="h-8 px-2 text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                                  >
                                    ✏️ Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(sale)}
                                    className="h-8 px-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    🗑️ Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={11} className="py-12">
                            <div className="text-center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShoppingCartIcon className="h-8 w-8 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Transactions Found</h3>
                              <p className="text-gray-600 mb-4">Start making sales to see transaction history here</p>
                              <Button
                                onClick={() => window.open('/pos-enhanced', '_blank')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <ShoppingCartIcon className="h-4 w-4 mr-2" />
                                Create First Transaction
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Footer */}
                {salesData && salesData.length > 0 && (
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {Math.min(salesData.length, 10)} of {salesData.length} transactions
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={salesData.length <= 10}
                          className="text-gray-600"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={salesData.length <= 10}
                          className="text-gray-600"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Selling Products CRUD Tab */}
          <TabsContent value="selling-products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Selling Products Management</CardTitle>
                    <CardDescription>Manage products for sales operations</CardDescription>
                  </div>
                  <Button
                    onClick={openCreateProductDialog}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  >
                    <ShoppingCartIcon className="h-4 w-4" />
                    <span>Add Product</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Search products by name, SKU, or category..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts?.map((product: any) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                <ShoppingCartIcon className="h-4 w-4 text-gray-500" />
                              </div>
                              <span>{product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{product.sku}</TableCell>
                          <TableCell>{product.category?.name || "Uncategorized"}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(product.price || 0))}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`${product.stockQuantity <= product.alertThreshold ? 'text-red-600 font-semibold' : ''}`}>
                              {product.stockQuantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              product.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {product.active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditProductDialog(product)}
                                className="h-8 px-2 text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteProductDialog(product)}
                                className="h-8 px-2 text-red-600 hover:text-red-800"
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>

      {/* Create Sale Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={editForm.customerName}
                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="total">Total Amount</Label>
              <Input
                id="total"
                type="number"
                value={editForm.total}
                onChange={(e) => setEditForm({ ...editForm, total: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={editForm.paymentMethod} onValueChange={(value) => setEditForm({ ...editForm, paymentMethod: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle create sale
              console.log('Creating sale:', editForm);
              setIsCreateDialogOpen(false);
            }}>
              Create Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sale Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer Billing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editCustomerName">Customer Name</Label>
              <Input
                id="editCustomerName"
                value={editForm.customerName}
                onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="editTotal">Total Amount</Label>
              <Input
                id="editTotal"
                type="number"
                value={editForm.total}
                onChange={(e) => setEditForm({ ...editForm, total: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="editPaymentMethod">Payment Method</Label>
              <Select value={editForm.paymentMethod} onValueChange={(value) => setEditForm({ ...editForm, paymentMethod: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle update sale
              console.log('Updating sale:', editForm);
              setIsEditDialogOpen(false);
            }}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales Detail View Dialog */}
      <Dialog open={isViewSaleDetailDialogOpen} onOpenChange={setIsViewSaleDetailDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingCartIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-800">Sales Detail</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">Comprehensive sales transaction information</p>
              </div>
            </div>
          </DialogHeader>

          {selectedSaleDetail && (
            <div className="py-6 space-y-8">
              {/* Sale Header Information */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Basic Sale Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Sale Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Invoice Number:</span>
                        <span className="font-medium font-mono">{selectedSaleDetail.orderNumber || selectedSaleDetail.invoiceNumber || `INV-${selectedSaleDetail.id}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sale ID:</span>
                        <span className="font-medium">#{selectedSaleDetail.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date & Time:</span>
                        <span className="font-medium">
                          {format(new Date(selectedSaleDetail.createdAt || selectedSaleDetail.created_at || new Date()), "MMM dd, yyyy hh:mm a")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedSaleDetail.status === 'completed' ? 'bg-green-100 text-green-800' :
                          selectedSaleDetail.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedSaleDetail.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {selectedSaleDetail.status || "Completed"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Customer Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{selectedSaleDetail.customerName || selectedSaleDetail.customer_name || "Walk-in Customer"}</span>
                      </div>
                      {selectedSaleDetail.customerPhone && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{selectedSaleDetail.customerPhone}</span>
                        </div>
                      )}
                      {selectedSaleDetail.customerEmail && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium text-blue-600">{selectedSaleDetail.customerEmail}</span>
                        </div>
                      )}
                      {selectedSaleDetail.customerId && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customer ID:</span>
                          <span className="font-medium">#{selectedSaleDetail.customerId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {selectedSaleDetail.paymentMethod || selectedSaleDetail.payment_method || "Cash"}
                        </span>
                      </div>
                      {selectedSaleDetail.paymentReference && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reference:</span>
                          <span className="font-medium font-mono">{selectedSaleDetail.paymentReference}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-bold text-lg text-green-600">
                          {formatCurrency(parseFloat(selectedSaleDetail.total || selectedSaleDetail.totalAmount || selectedSaleDetail.amount || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(parseFloat(selectedSaleDetail.subtotal || selectedSaleDetail.total || 0))}
                    </div>
                    <div className="text-sm text-gray-600">Subtotal</div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(parseFloat(selectedSaleDetail.tax || selectedSaleDetail.taxAmount || 0))}
                    </div>
                    <div className="text-sm text-gray-600">Tax</div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(parseFloat(selectedSaleDetail.discount || selectedSaleDetail.discountAmount || 0))}
                    </div>
                    <div className="text-sm text-gray-600">Discount</div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(parseFloat(selectedSaleDetail.total || selectedSaleDetail.totalAmount || selectedSaleDetail.amount || 0))}
                    </div>
                    <div className="text-sm text-gray-600">Final Total</div>
                  </div>
                </div>
              </div>

              {/* Items Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Sale Items</h3>
                <div className="bg-white rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold">#</TableHead>
                        <TableHead className="font-semibold">Product Name</TableHead>
                        <TableHead className="font-semibold">SKU</TableHead>
                        <TableHead className="font-semibold text-right">Unit Price</TableHead>
                        <TableHead className="font-semibold text-right">Quantity</TableHead>
                        <TableHead className="font-semibold text-right">Subtotal</TableHead>
                        <TableHead className="font-semibold text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSaleDetail.items && selectedSaleDetail.items.length > 0 ? (
                        selectedSaleDetail.items.map((item: any, index: number) => (
                          <TableRow key={item.id || index} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.productName || item.name || "Unknown Product"}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-500">{item.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{item.sku || item.productSku || "N/A"}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(parseFloat(item.unitPrice || item.price || 0))}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                                {item.quantity || 0}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(parseFloat(item.subtotal || (item.unitPrice || item.price || 0) * (item.quantity || 0)))}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(parseFloat(item.total || item.subtotal || (item.unitPrice || item.price || 0) * (item.quantity || 0)))}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No items found for this sale
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Items Summary */}
                  {selectedSaleDetail.items && selectedSaleDetail.items.length > 0 && (
                    <div className="bg-gray-50 p-4 border-t">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <strong>Total Items:</strong> {selectedSaleDetail.items.length} | 
                          <strong> Total Quantity:</strong> {selectedSaleDetail.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)}
                        </div>
                        <div className="text-lg font-bold text-gray-800">
                          Items Total: {formatCurrency(
                            selectedSaleDetail.items.reduce((sum: number, item: any) => 
                              sum + parseFloat(item.total || item.subtotal || (item.unitPrice || item.price || 0) * (item.quantity || 0)), 0
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sale Notes */}
                <div className="bg-yellow-50 p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-800 mb-3">Sale Notes</h4>
                  <div className="text-sm text-gray-700">
                    {selectedSaleDetail.notes || selectedSaleDetail.remarks || "No additional notes for this sale."}
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-800 mb-3">Transaction Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processed by:</span>
                      <span className="font-medium">{selectedSaleDetail.userName || selectedSaleDetail.user?.name || "System"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processing Time:</span>
                      <span className="font-medium">
                        {selectedSaleDetail.processingTime || "Instant"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{selectedSaleDetail.location || "Main Store"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Device:</span>
                      <span className="font-medium">{selectedSaleDetail.device || "POS Terminal"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Last updated: {format(new Date(selectedSaleDetail.updatedAt || selectedSaleDetail.createdAt || new Date()), "MMM dd, yyyy hh:mm a")}
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.print();
                    }}
                    className="text-green-600 hover:text-green-800"
                  >
                    🖨️ Print Receipt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('Email receipt for sale:', selectedSaleDetail);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    📧 Email Receipt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openEditDialog(selectedSaleDetail)}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    ✏️ Edit Sale
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('Process return for sale:', selectedSaleDetail);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    🔄 Process Return
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsViewSaleDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Customer Billing Dialog */}
      <Dialog open={isViewCustomerBillingDialogOpen} onOpenChange={setIsViewCustomerBillingDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Customer Billing Details</DialogTitle>
          </DialogHeader>
          {selectedCustomerBilling && (
            <div className="space-y-6">
              {/* Customer Info Header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      {selectedCustomerBilling.customerName || "Walk-in Customer"}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Customer ID:</strong> {selectedCustomerBilling.customerId}</div>
                      {selectedCustomerBilling.phone && (
                        <div><strong>Phone:</strong> {selectedCustomerBilling.phone}</div>
                      )}
                      {selectedCustomerBilling.email && (
                        <div><strong>Email:</strong> {selectedCustomerBilling.email}</div>
                      )}
                      {selectedCustomerBilling.address && (
                        <div><strong>Address:</strong> {selectedCustomerBilling.address}</div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(parseFloat(selectedCustomerBilling.totalBilled || 0))}
                      </div>
                      <div className="text-sm text-gray-600">Total Billed</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedCustomerBilling.orderCount || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Orders</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(parseFloat(selectedCustomerBilling.averageOrderValue || 0))}
                      </div>
                      <div className="text-sm text-gray-600">Avg Order Value</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="text-sm font-bold text-orange-600">
                        {selectedCustomerBilling.lastPurchaseDate 
                          ? format(new Date(selectedCustomerBilling.lastPurchaseDate), "MMM dd, yyyy")
                          : "Never"
                        }
                      </div>
                      <div className="text-sm text-gray-600">Last Purchase</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase History */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Recent Purchase History</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Order #</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerTransactionHistory
                          ?.filter((transaction: any) => 
                            transaction.customerId === selectedCustomerBilling.customerId
                          )
                          ?.slice(0, 10)
                          ?.map((transaction: any) => (
                            <TableRow key={transaction.saleId}>
                              <TableCell>
                                {format(new Date(transaction.createdAt), "MMM dd, yyyy")}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {transaction.orderNumber}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{transaction.itemCount} items</div>
                                  <div className="text-gray-500 text-xs">
                                    {transaction.productNames?.slice(0, 2).join(", ")}
                                    {transaction.productNames?.length > 2 && "..."}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(parseFloat(transaction.total || 0))}
                              </TableCell>
                              <TableCell className="capitalize">
                                {transaction.paymentMethod}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {transaction.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          )) || (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500">
                              No purchase history available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Customer Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <h5 className="font-semibold text-blue-800 mb-2">Customer Segment</h5>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    parseFloat(selectedCustomerBilling.totalBilled || 0) > 5000 ? 'bg-yellow-100 text-yellow-800' :
                    (selectedCustomerBilling.orderCount || 0) > 5 ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {parseFloat(selectedCustomerBilling.totalBilled || 0) > 5000 ? 'VIP Customer' :
                     (selectedCustomerBilling.orderCount || 0) > 5 ? 'Frequent Buyer' : 'Regular Customer'}
                  </span>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border">
                  <h5 className="font-semibold text-green-800 mb-2">Purchase Frequency</h5>
                  <div className="text-sm">
                    {(selectedCustomerBilling.orderCount || 0) > 10 ? "Very High" : 
                     (selectedCustomerBilling.orderCount || 0) > 5 ? "High" : 
                     (selectedCustomerBilling.orderCount || 0) > 2 ? "Medium" : "Low"}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border">
                  <h5 className="font-semibold text-purple-800 mb-2">Customer Since</h5>
                  <div className="text-sm">
                    {selectedCustomerBilling.firstPurchaseDate 
                      ? format(new Date(selectedCustomerBilling.firstPurchaseDate), "MMM yyyy")
                      : "N/A"
                    }
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('Generate statement for:', selectedCustomerBilling);
                    // Generate and download customer statement
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  📄 Generate Statement
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('Send reminder to:', selectedCustomerBilling);
                    // Send payment reminder
                  }}
                  className="text-green-600 hover:text-green-800"
                >
                  📧 Send Reminder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCustomerBilling(selectedCustomerBilling);
                    setCustomerBillingForm({
                      customerName: selectedCustomerBilling.customerName || '',
                      phone: selectedCustomerBilling.phone || '',
                      email: selectedCustomerBilling.email || '',
                      address: selectedCustomerBilling.address || '',
                      totalBilled: selectedCustomerBilling.totalBilled || '',
                      orderCount: selectedCustomerBilling.orderCount?.toString() || '',
                      averageOrderValue: selectedCustomerBilling.averageOrderValue || '',
                      status: 'active',
                      paymentTerm: '',
                      creditLimit: '',
                      notes: ''
                    });
                    setIsViewCustomerBillingDialogOpen(false);
                    setIsEditCustomerBillingDialogOpen(true);
                  }}
                  className="text-orange-600 hover:text-orange-800"
                >
                  ✏️ Edit Details
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewCustomerBillingDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Billing Details */}
      <Dialog open={isEditCustomerBillingDialogOpen} onOpenChange={setIsEditCustomerBillingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-800">Edit Customer Billing Details</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">Update customer information and billing preferences</p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-8">
            {/* Customer Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">
                    Customer Name *
                  </Label>
                  <Input
                    id="customerName"
                    value={customerBillingForm.customerName}
                    onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, customerName: e.target.value })}
                    placeholder="Enter full customer name"
                    className="h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={customerBillingForm.phone}
                    onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, phone: e.target.value })}
                    placeholder="+91-XXXXXXXXXX"
                    className="h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerBillingForm.email}
                    onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, email: e.target.value })}
                    placeholder="customer@example.com"
                    className="h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={customerBillingForm.address}
                    onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, address: e.target.value })}
                    placeholder="Complete customer address"
                    className="h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Billing Statistics */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-green-600">2</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Billing Statistics</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-green-50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="totalBilled" className="text-sm font-medium text-gray-700">
                    Total Billed Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <Input
                      id="totalBilled"
                      type="number"
                      value={customerBillingForm.totalBilled}
                      onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, totalBilled: e.target.value })}
                      placeholder="0.00"
                      className="h-10 pl-8 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderCount" className="text-sm font-medium text-gray-700">
                    Total Orders
                  </Label>
                  <Input
                    id="orderCount"
                    type="number"
                    value={customerBillingForm.orderCount}
                    onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, orderCount: e.target.value })}
                    placeholder="0"
                    className="h-10 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="averageOrderValue" className="text-sm font-medium text-gray-700">
                    Average Order Value
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <Input
                      id="averageOrderValue"
                      type="number"
                      value={customerBillingForm.averageOrderValue}
                      onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, averageOrderValue: e.target.value })}
                      placeholder="0.00"
                      className="h-10 pl-8 bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Credit Terms */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600">3</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Payment & Credit Terms</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-purple-50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="paymentTerm" className="text-sm font-medium text-gray-700">
                    Payment Terms
                  </Label>
                  <Select 
                    value={customerBillingForm.paymentTerm} 
                    onValueChange={(value) => setCustomerBillingForm({ ...customerBillingForm, paymentTerm: value })}
                  >
                    <SelectTrigger className="h-10 bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate Payment</SelectItem>
                      <SelectItem value="net15">Net 15 Days</SelectItem>
                      <SelectItem value="net30">Net 30 Days</SelectItem>
                      <SelectItem value="net45">Net 45 Days</SelectItem>
                      <SelectItem value="net60">Net 60 Days</SelectItem>
                      <SelectItem value="custom">Custom Terms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditLimit" className="text-sm font-medium text-gray-700">
                    Credit Limit
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <Input
                      id="creditLimit"
                      type="number"
                      value={customerBillingForm.creditLimit}
                      onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, creditLimit: e.target.value })}
                      placeholder="0.00"
                      className="h-10 pl-8 bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                    Customer Status
                  </Label>
                  <Select 
                    value={customerBillingForm.status} 
                    onValueChange={(value) => setCustomerBillingForm({ ...customerBillingForm, status: value })}
                  >
                    <SelectTrigger className="h-10 bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="vip">VIP Customer</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-yellow-600">4</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Additional Information</h3>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                    Notes & Comments
                  </Label>
                  <textarea
                    id="notes"
                    value={customerBillingForm.notes}
                    onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, notes: e.target.value })}
                    placeholder="Add any special notes, preferences, or important information about this customer..."
                    rows={4}
                    className="w-full p-3 bg-white border border-gray-300 rounded-md focus:border-yellow-500 focus:ring-yellow-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Customer Summary */}
            {selectedCustomerBilling && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-3">Current Customer Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Customer ID:</span>
                    <div className="font-medium">{selectedCustomerBilling.customerId}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Total:</span>
                    <div className="font-medium text-green-600">{formatCurrency(parseFloat(selectedCustomerBilling.totalBilled || 0))}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Orders:</span>
                    <div className="font-medium">{selectedCustomerBilling.orderCount || 0}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Purchase:</span>
                    <div className="font-medium">
                      {selectedCustomerBilling.lastPurchaseDate 
                        ? format(new Date(selectedCustomerBilling.lastPurchaseDate), "MMM dd, yyyy")
                        : "Never"
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-6 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleDateString()}
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditCustomerBillingDialogOpen(false)}
                  className="px-6 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedCustomerBilling) {
                      handleUpdateCustomerBilling(selectedCustomerBilling.customerId, customerBillingForm);
                    }
                  }}
                  className="px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                >
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Update Customer Details
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteCustomerBillingDialogOpen} onOpenChange={setIsDeleteCustomerBillingDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer's billing records? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (selectedCustomerBilling) {
                  handleDeleteCustomerBilling(selectedCustomerBilling.customerId);
                }
                setIsDeleteCustomerBillingDialogOpen(false);
                setSelectedCustomerBilling(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Create Customer Billing Dialog */}
      <Dialog open={isCreateCustomerBillingDialogOpen} onOpenChange={setIsCreateCustomerBillingDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New Customer Billing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                        id="customerName"
                        value={customerBillingForm.customerName}
                        onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, customerName: e.target.value })}
                        placeholder="Enter customer name"
                    />
                </div>
                <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        value={customerBillingForm.phone}
                        onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, phone: e.target.value })}
                        placeholder="Enter phone number"
                    />
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={customerBillingForm.email}
                        onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, email: e.target.value })}
                        placeholder="Enter email address"
                    />
                </div>
                <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                        id="address"
                        value={customerBillingForm.address}
                        onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, address: e.target.value })}
                        placeholder="Enter customer address"
                    />
                </div>
                <div>
                    <Label htmlFor="totalBilled">Total Billed</Label>
                    <Input
                        id="totalBilled"
                        type="number"
                        value={customerBillingForm.totalBilled}
                        onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, totalBilled: e.target.value })}
                        placeholder="Enter total billed amount"
                    />
                </div>
                <div>
                    <Label htmlFor="orderCount">Order Count</Label>
                    <Input
                        id="orderCount"
                        type="number"
                        value={customerBillingForm.orderCount}
                        onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, orderCount: e.target.value })}
                        placeholder="Enter order count"
                    />
                </div>
                <div>
                    <Label htmlFor="averageOrderValue">Average Order Value</Label>
                    <Input
                        id="averageOrderValue"
                        type="number"
                        value={customerBillingForm.averageOrderValue}
                        onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, averageOrderValue: e.target.value })}
                        placeholder="Enter average order value"
                    />
                </div>
                <div>
                  <Label htmlFor="paymentTerm">Payment Term</Label>
                  <Input
                    id="paymentTerm"
                    type="text"
                    value={customerBillingForm.paymentTerm}
                    onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, paymentTerm: e.target.value })}
                    placeholder="Enter Payment Term"
                  />
                </div>
                <div>
                  <Label htmlFor="creditLimit">Credit Limit</Label>
                  <Input
                    id="creditLimit"
                    type="text"
                    value={customerBillingForm.creditLimit}
                    onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, creditLimit: e.target.value })}
                    placeholder="Enter Credit Limit"
                  />
                </div>
                 <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    type="text"
                    value={customerBillingForm.notes}
                    onChange={(e) => setCustomerBillingForm({ ...customerBillingForm, notes: e.target.value })}
                    placeholder="Enter Notes"
                  />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateCustomerBillingDialogOpen(false)}>
                    Cancel
                </Button>
                <Button onClick={() => {
                    handleCreateCustomerBilling(customerBillingForm);
                    setIsCreateCustomerBillingDialogOpen(false);
                }}>
                    Create Customer
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}