import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { LowStockItems } from "@/components/dashboard/low-stock-items";
import { TopSellingProducts } from "@/components/dashboard/top-selling-products";
import { Button } from "@/components/ui/button";
import { PlusIcon, DollarSignIcon, ShoppingBagIcon, WarehouseIcon, AlertTriangleIcon } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
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
        {/* Dashboard Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Dashboard</h2>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <Link href="/pos">
              <Button className="inline-flex items-center text-sm">
                <PlusIcon className="h-5 w-5 mr-2" />
                New Sale
              </Button>
            </Link>
            <Link href="/products">
              <Button className="inline-flex items-center text-sm bg-secondary hover:bg-green-600 dark:hover:bg-green-500">
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Today's Sales"
            value={isLoading ? "Loading..." : `$${parseFloat(dashboardStats?.todaySales || "0").toFixed(2)}`}
            icon={<DollarSignIcon className="h-6 w-6" />}
            iconBgColor="bg-primary bg-opacity-10 dark:bg-opacity-20"
            iconColor="text-primary"
            percentageChange={8.4}
            percentageLabel="vs yesterday"
          />
          <StatsCard
            title="Total Orders"
            value={isLoading ? "Loading..." : `${dashboardStats?.totalOrders || 0}`}
            icon={<ShoppingBagIcon className="h-6 w-6" />}
            iconBgColor="bg-secondary bg-opacity-10 dark:bg-opacity-20"
            iconColor="text-secondary"
            percentageChange={12.1}
            percentageLabel="vs last week"
          />
          <StatsCard
            title="Inventory Value"
            value={isLoading ? "Loading..." : `$${parseFloat(dashboardStats?.inventoryValue || "0").toFixed(2)}`}
            icon={<WarehouseIcon className="h-6 w-6" />}
            iconBgColor="bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-20"
            iconColor="text-yellow-500 dark:text-yellow-400"
            percentageChange={-3.2}
            percentageLabel="vs last month"
          />
          <StatsCard
            title="Low Stock Items"
            value={isLoading ? "Loading..." : `${dashboardStats?.lowStockCount || 0}`}
            icon={<AlertTriangleIcon className="h-6 w-6" />}
            iconBgColor="bg-red-100 dark:bg-red-900 dark:bg-opacity-20"
            iconColor="text-red-500 dark:text-red-400"
            percentageChange={5}
            percentageLabel="more than yesterday"
          />
        </div>

        {/* Sales Chart and Recent Sales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <SalesChart className="lg:col-span-2" />
          <RecentSales />
        </div>

        {/* Low Stock and Top Selling Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LowStockItems />
          <TopSellingProducts />
        </div>
      </div>
    </DashboardLayout>
  );
}
