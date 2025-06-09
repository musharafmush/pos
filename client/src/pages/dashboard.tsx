import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { LowStockItems } from "@/components/dashboard/low-stock-items";
import { TopSellingProducts } from "@/components/dashboard/top-selling-products";
import { Button } from "@/components/ui/button";
import { 
  PlusIcon, 
  DollarSignIcon, 
  ShoppingBagIcon, 
  WarehouseIcon, 
  AlertTriangleIcon,
  CreditCardIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  WalletIcon,
  CircleDollarSignIcon,
  PercentIcon,
  BadgePercentIcon
} from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useFormatCurrency } from "@/lib/currency";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const currentUser = queryClient.getQueryData<{ user: any }>(["/api/auth/user"])?.user;
  const formatCurrency = useFormatCurrency();

  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Welcome header with dynamic greeting */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Welcome {currentUser?.name || 'Administrator'}, <span className="text-yellow-500">👋</span>
          </h2>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <ShoppingBagIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-600">Total Sales</div>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency(dashboardStats?.todaySales || "0")}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <DollarSignIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-600">Net</div>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency(dashboardStats?.todaySales || "0")}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
                <ArrowUpIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-600">Smart Freight Distribution</div>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency(dashboardStats?.totalFreightDistributed || "0")}
                </div>
                <div className="text-xs text-gray-500">Across all purchase orders</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100">
                <ArrowDownIcon className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-600">Total Sell Return</div>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency("0.00")}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <WalletIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-600">Total Purchase</div>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency("0.00")}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100">
                <CircleDollarSignIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-600">Purchase Due</div>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency("0.00")}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <ArrowUpIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-600">Total Purchase Return</div>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency("0.00")}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
                <BadgePercentIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-600">Expense</div>
                <div className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency("0.00")}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sales Chart */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Sales Last 30 Days</h3>
          </div>
          <SalesChart />
        </div>

        {/* Recent Sales and Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Sales</h3>
            <RecentSales />
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Products</h3>
            <TopSellingProducts />
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Low Stock Items</h3>
          <LowStockItems />
        </div>
      </div>
    </DashboardLayout>
  );
}
