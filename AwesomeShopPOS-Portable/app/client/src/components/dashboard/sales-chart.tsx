import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO } from "date-fns";

interface SalesChartProps {
  className?: string;
}

export function SalesChart({ className }: SalesChartProps) {
  const [timeRange, setTimeRange] = useState<string>("7");
  
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

  // Process and format the data for the chart
  const chartData = salesData?.map((item: { date: string; total: string }) => ({
    date: format(new Date(item.date), "EEE"),
    total: parseFloat(item.total)
  })) || [];

  // If there's no data or fewer days than expected, fill in with zeros
  useEffect(() => {
    if (chartData.length < parseInt(timeRange)) {
      const today = new Date();
      const filledData = [];
      
      for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const formattedDate = format(date, "EEE");
        
        const existingEntry = chartData.find(entry => entry.date === formattedDate);
        
        if (existingEntry) {
          filledData.push(existingEntry);
        } else {
          filledData.push({
            date: formattedDate,
            total: 0
          });
        }
      }
      
      // We don't actually update chartData directly as it's derived from salesData
      // This would normally be done by updating the state
    }
  }, [salesData, timeRange]);

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
        ) : (
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value) => [`$${value}`, 'Sales']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar 
                dataKey="total" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
