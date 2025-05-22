import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from "@/components/ui/table";
import { PackageIcon } from "lucide-react";
import { useFormatCurrency } from "@/lib/currency";

interface TopSellingProductsProps {
  className?: string;
}

export function TopSellingProducts({ className }: TopSellingProductsProps) {
  const formatCurrency = useFormatCurrency();
  const { data: topProducts, isLoading } = useQuery({
    queryKey: ['/api/dashboard/top-products'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/top-products');
      if (!response.ok) {
        throw new Error('Failed to fetch top selling products');
      }
      return response.json();
    }
  });

  return (
    <Card className={`shadow ${className}`}>
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-100">Top Selling Products</CardTitle>
        <a href="/reports" className="text-sm font-medium text-primary hover:text-blue-600 dark:hover:text-blue-400">View All</a>
      </CardHeader>
      <CardContent className="p-3">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Loading top selling products...
          </div>
        ) : topProducts && topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-800">
                <TableRow>
                  <TableHead className="w-[40%] py-3">Product</TableHead>
                  <TableHead className="w-[20%] py-3">Price</TableHead>
                  <TableHead className="w-[20%] py-3">Sold</TableHead>
                  <TableHead className="w-[20%] py-3 text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((item: any) => (
                  <TableRow key={item.product.id}>
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400">
                          {item.product.image ? (
                            <img src={item.product.image} alt={item.product.name} className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <PackageIcon className="h-6 w-6" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.product.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formatCurrency(typeof item.product.price === 'number' 
                          ? item.product.price.toFixed(2) 
                          : parseFloat(item.product.price).toFixed(2))}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {item.soldQuantity} units
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(parseFloat(item.revenue).toFixed(2))}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No sales data available.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
