import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { useFormatCurrency } from "@/lib/currency";

interface SalesChartProps {
  className?: string;
}

export function SalesChart({ className }: SalesChartProps) {
  const [timeRange, setTimeRange] = useState<string>("7");
  const formatCurrency = useFormatCurrency();
  
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['/api/dashboard/sales-chart', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/sales-chart?days=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales chart data');
      }
      return response.json();
    }
  });

  // Create a filled dataset with proper date range
  const chartData = (() => {
    const today = new Date();
    const filledData = [];
    
    for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const formattedDate = format(date, "EEE");
      const dateString = format(date, "yyyy-MM-dd");
      
      // Find existing data for this date
      const existingEntry = salesData?.find((item: { date: string; total: string }) => 
        format(new Date(item.date), "yyyy-MM-dd") === dateString
      );
      
      const total = existingEntry ? parseFloat(existingEntry.total) : 0;
      
      filledData.push({
        date: formattedDate,
        total: total
      });
    }
    
    return filledData;
  })();

  return (
    <Card className={`shadow ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-100">Sales Overview</CardTitle>
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="w-full h-72 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Loading chart data...</p>
          </div>
        ) : chartData.some(item => item.total > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 10,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickLine={false}
                axisLine={false}
                dy={10}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                dx={-10}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(value) => formatCurrency(value)}
                domain={[0, 'dataMax']}
              />
              <Tooltip 
                formatter={(value) => {
                  const numValue = Array.isArray(value) ? value[0] : value;
                  return [formatCurrency(Number(numValue)), 'Sales'];
                }}
                labelFormatter={(label) => `${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="total" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-72 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-gray-400 mb-2">📊</div>
              <p className="text-gray-600 font-medium">No sales data available</p>
              <p className="text-gray-500 text-sm">Sales will appear here once transactions are made</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
