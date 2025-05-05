import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBagIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentSalesProps {
  className?: string;
}

export function RecentSales({ className }: RecentSalesProps) {
  const { data: recentSales, isLoading } = useQuery({
    queryKey: ['/api/sales/recent'],
    queryFn: async () => {
      const response = await fetch('/api/sales/recent');
      if (!response.ok) {
        throw new Error('Failed to fetch recent sales');
      }
      return response.json();
    }
  });

  return (
    <Card className={`shadow ${className}`}>
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-100">Recent Sales</CardTitle>
        <a href="/pos" className="text-sm font-medium text-primary hover:text-blue-600 dark:hover:text-blue-400">View All</a>
      </CardHeader>
      <CardContent className="p-1">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Loading recent sales...
          </div>
        ) : recentSales && recentSales.length > 0 ? (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentSales.map((sale: any) => {
              const itemCount = sale.items?.length || 0;
              const totalAmount = parseFloat(sale.total).toFixed(2);
              const timeAgo = sale.createdAt ? formatDistanceToNow(new Date(sale.createdAt), { addSuffix: true }) : 'recently';
              
              return (
                <li key={sale.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <ShoppingBagIcon className="h-6 w-6" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Order #{sale.orderNumber}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'} • {timeAgo}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">${totalAmount}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No recent sales found.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
