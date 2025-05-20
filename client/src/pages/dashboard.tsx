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

export default function Dashboard() {
  const queryClient = useQueryClient();
  const currentUser = queryClient.getQueryData<{ user: any }>(["/api/auth/user"])?.user;

  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return response.json();
    }
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Welcome header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Welcome Admin, <span className="text-yellow-500">👋</span>
          </h2>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 shadow-sm border-none">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 mr-3">
                  <ShoppingBagIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div className="font-medium text-sm text-gray-500">Total Sales</div>
              </div>
              <div className="text-2xl font-bold mb-2">
                $ {isLoading ? "..." : parseFloat(dashboardStats?.todaySales || "12647.27").toFixed(2)}
              </div>
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm border-none">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 mr-3">
                  <DollarSignIcon className="h-6 w-6 text-green-500" />
                </div>
                <div className="font-medium text-sm text-gray-500">Net</div>
              </div>
              <div className="text-2xl font-bold mb-2">
                $ {isLoading ? "..." : parseFloat(dashboardStats?.todaySales || "12647.27").toFixed(2)}
              </div>
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm border-none">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100 mr-3">
                  <CreditCardIcon className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="font-medium text-sm text-gray-500">Invoice due</div>
              </div>
              <div className="text-2xl font-bold mb-2">
                $ {isLoading ? "..." : "0.00"}
              </div>
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm border-none">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 mr-3">
                  <ArrowDownIcon className="h-6 w-6 text-red-500" />
                </div>
                <div className="font-medium text-sm text-gray-500">Total Sell Return</div>
              </div>
              <div className="text-2xl font-bold mb-2">
                $ {isLoading ? "..." : "0.00"}
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-sm border-none">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 mr-3">
                  <WalletIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div className="font-medium text-sm text-gray-500">Total Purchase</div>
              </div>
              <div className="text-2xl font-bold mb-2">
                $ {isLoading ? "..." : "0.00"}
              </div>
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm border-none">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100 mr-3">
                  <CircleDollarSignIcon className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="font-medium text-sm text-gray-500">Purchase Due</div>
              </div>
              <div className="text-2xl font-bold mb-2">
                $ {isLoading ? "..." : "0.00"}
              </div>
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm border-none">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 mr-3">
                  <ArrowUpIcon className="h-6 w-6 text-green-500" />
                </div>
                <div className="font-medium text-sm text-gray-500">Total Purchase Return</div>
              </div>
              <div className="text-2xl font-bold mb-2">
                $ {isLoading ? "..." : "0.00"}
              </div>
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm border-none">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 mr-3">
                  <BadgePercentIcon className="h-6 w-6 text-purple-500" />
                </div>
                <div className="font-medium text-sm text-gray-500">Expense</div>
              </div>
              <div className="text-2xl font-bold mb-2">
                $ {isLoading ? "..." : "0.00"}
              </div>
            </div>
          </Card>
        </div>

        {/* Sales Chart */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Sales Last 30 Days</h3>
          </div>
          <SalesChart />
        </div>

        {/* Recent Sales and Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-medium mb-4">Recent Sales</h3>
            <RecentSales />
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-medium mb-4">Top Products</h3>
            <TopSellingProducts />
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-8">
          <h3 className="text-lg font-medium mb-4">Low Stock Items</h3>
          <LowStockItems />
        </div>
      </div>
    </DashboardLayout>
  );
}
