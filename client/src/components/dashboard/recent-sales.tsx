import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ShoppingCartIcon, 
  RefreshCwIcon, 
  FileTextIcon, 
  PrinterIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  CreditCardIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from "lucide-react";
import { format } from "date-fns";
import { useFormatCurrency } from "@/lib/currency";

interface RecentSalesProps {
  className?: string;
}

export function RecentSales({ className }: RecentSalesProps) {
  const formatCurrency = useFormatCurrency();
  
  const { data: recentSales, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/sales/recent'],
    queryFn: async () => {
      console.log('Fetching recent sales data...');
      
      try {
        // First try the recent sales endpoint with credentials included
        const response = await fetch('/api/sales/recent', { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('Recent sales response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Recent sales data received:', data);
          const salesArray = Array.isArray(data) ? data : 
                           data.sales ? data.sales :
                           data.data ? data.data : [];
          console.log('Processed recent sales array:', salesArray);
          return salesArray;
        }
        
        // If recent sales fails, try main sales endpoint
        console.log('Recent sales failed, trying main sales endpoint...');
        const fallbackResponse = await fetch('/api/sales?limit=10', { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('Fallback sales response status:', fallbackResponse.status);
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log('Fallback sales data received:', fallbackData);
          const salesArray = Array.isArray(fallbackData) ? fallbackData : 
                           fallbackData.sales ? fallbackData.sales :
                           fallbackData.data ? fallbackData.data : [];
          console.log('Processed fallback sales array:', salesArray);
          return salesArray.slice(0, 10);
        }
        
        // If both fail, return empty array
        console.warn('Both sales endpoints failed');
        return [];
        
      } catch (err) {
        console.error('Error fetching recent sales:', err);
        
        // Last resort - try to get any sales data
        try {
          const lastResortResponse = await fetch('/api/sales', { 
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (lastResortResponse.ok) {
            const lastResortData = await lastResortResponse.json();
            const salesArray = Array.isArray(lastResortData) ? lastResortData : [];
            console.log('Last resort sales data:', salesArray);
            return salesArray.slice(0, 10);
          }
        } catch (lastResortErr) {
          console.error('Last resort fetch also failed:', lastResortErr);
        }
        
        return [];
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60, // Refresh every minute
  });

  return (
    <Card className={`shadow-lg border-0 ${className}`}>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShoppingCartIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">Recent Sales Transactions</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Latest sales activity with detailed billing information</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live Data
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
            >
              <RefreshCwIcon className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/pos-enhanced', '_blank')}
              className="text-green-600 hover:text-green-800 border-green-200 hover:bg-green-50"
            >
              <ShoppingCartIcon className="h-4 w-4 mr-1" />
              New Sale
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading recent transactions...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">Failed to load transactions</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : recentSales && recentSales.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow className="border-b border-gray-200">
                  <TableHead className="font-semibold text-gray-700 py-3 px-4">Date & Time</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3 px-4">Invoice#</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3 px-4">Customer Details</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3 px-4">Items</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3 px-4 text-right">Subtotal</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3 px-4 text-right">Tax</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3 px-4 text-right">Discount</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3 px-4 text-right">Total</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3 px-4">Payment</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3 px-4">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700 py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale: any, index: number) => {
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
                      <TableCell className="py-3 px-4">
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
                      
                      <TableCell className="py-3 px-4">
                        <div className="font-mono text-sm font-medium text-blue-600">
                          {sale.orderNumber || sale.invoiceNumber || `INV-${sale.id}`}
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              {sale.customerName || sale.customer_name || "Walk-in Customer"}
                            </span>
                            {sale.customerPhone && (
                              <span className="text-sm text-gray-500">{sale.customerPhone}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{itemCount} items</span>
                          <div className="text-xs text-gray-500 mt-1">
                            {sale.items?.slice(0, 2).map((item: any, idx: number) => (
                              <div key={idx}>
                                {item.productName || item.name} (×{item.quantity})
                              </div>
                            ))}
                            {itemCount > 2 && (
                              <div className="text-blue-600 font-medium">+{itemCount - 2} more</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-3 px-4 text-right">
                        <span className="font-medium text-gray-800">
                          {formatCurrency(isNaN(saleSubtotal) ? saleTotal : saleSubtotal)}
                        </span>
                      </TableCell>
                      
                      <TableCell className="py-3 px-4 text-right">
                        <span className="font-medium text-gray-600">
                          {formatCurrency(isNaN(saleTax) ? 0 : saleTax)}
                        </span>
                      </TableCell>
                      
                      <TableCell className="py-3 px-4 text-right">
                        <span className="font-medium text-gray-600">
                          {saleDiscount > 0 ? formatCurrency(saleDiscount) : "—"}
                        </span>
                      </TableCell>
                      
                      <TableCell className="py-3 px-4 text-right">
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(isNaN(saleTotal) ? 0 : saleTotal)}
                        </span>
                      </TableCell>
                      
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <CreditCardIcon className="h-4 w-4 text-gray-400" />
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
                        </div>
                      </TableCell>
                      
                      <TableCell className="py-3 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          (sale.status || "completed") === 'completed' 
                            ? 'bg-green-100 text-green-800' :
                          (sale.status || "completed") === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' :
                          (sale.status || "completed") === 'cancelled' 
                            ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          {sale.status || "Completed"}
                        </span>
                      </TableCell>
                      
                      <TableCell className="py-3 px-4">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <EyeIcon className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.print()}
                            className="h-8 px-2 text-xs text-green-600 hover:text-green-800 hover:bg-green-50"
                          >
                            <PrinterIcon className="h-3 w-3 mr-1" />
                            Print
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Quick Stats Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{recentSales.length}</div>
                  <div className="text-sm text-gray-600">Recent Transactions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(recentSales.reduce((sum: number, sale: any) => 
                      sum + parseFloat(sale.total || sale.totalAmount || sale.amount || 0), 0
                    ))}
                  </div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {recentSales.reduce((sum: number, sale: any) => 
                      sum + (sale.items?.length || sale.saleItems?.length || 0), 0
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Items Sold</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {recentSales.filter((sale: any) => {
                      const saleDate = new Date(sale.createdAt || sale.created_at || sale.date);
                      const today = new Date();
                      return saleDate.toDateString() === today.toDateString();
                    }).length}
                  </div>
                  <div className="text-sm text-gray-600">Today's Sales</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCartIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Recent Transactions</h3>
            <p className="text-gray-600 mb-4">Start making sales to see transaction history here</p>
            <Button
              onClick={() => window.open('/pos-enhanced', '_blank')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ShoppingCartIcon className="h-4 w-4 mr-2" />
              Create First Transaction
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
