import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from "@/components/ui/table";
import { PackageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LowStockItemsProps {
  className?: string;
}

export function LowStockItems({ className }: LowStockItemsProps) {
  const { data: lowStockItems, isLoading } = useQuery({
    queryKey: ['/api/products/low-stock'],
    queryFn: async () => {
      const response = await fetch('/api/products/low-stock');
      if (!response.ok) {
        throw new Error('Failed to fetch low stock items');
      }
      return response.json();
    }
  });

  return (
    <Card className={`shadow ${className}`}>
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-100">Low Stock Items</CardTitle>
        <a href="/inventory" className="text-sm font-medium text-primary hover:text-blue-600 dark:hover:text-blue-400">View All</a>
      </CardHeader>
      <CardContent className="p-3">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Loading low stock items...
          </div>
        ) : lowStockItems && lowStockItems.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-800">
                <TableRow>
                  <TableHead className="w-[40%] py-3">Product</TableHead>
                  <TableHead className="w-[30%] py-3">Category</TableHead>
                  <TableHead className="w-[20%] py-3">Stock</TableHead>
                  <TableHead className="w-[10%] py-3 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item: any) => {
                  // Determine if the stock is critically low (less than 30% of threshold)
                  const criticallyLow = item.stockQuantity <= (item.alertThreshold * 0.3);
                  // Determine if the stock is moderately low (between 30% and 70% of threshold)
                  const moderatelyLow = item.stockQuantity <= (item.alertThreshold * 0.7) && !criticallyLow;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="py-3">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-10 w-10 rounded-md object-cover" />
                            ) : (
                              <PackageIcon className="h-6 w-6" />
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.category?.name || 'Uncategorized'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          criticallyLow && "bg-red-100 text-red-700 dark:bg-red-900 dark:bg-opacity-30 dark:text-red-400",
                          moderatelyLow && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:bg-opacity-30 dark:text-yellow-400",
                          !criticallyLow && !moderatelyLow && "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        )}>
                          {item.stockQuantity} units
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Button variant="link" className="text-primary hover:text-blue-700 dark:hover:text-blue-400 p-0 h-auto">
                          Order
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No low stock items found.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
