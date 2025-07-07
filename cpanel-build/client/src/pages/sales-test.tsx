
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SalesTest() {
  const { data: debugData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/sales/debug'],
    queryFn: async () => {
      const response = await fetch('/api/sales/debug', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: false
  });

  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: ['/api/sales/recent'],
    queryFn: async () => {
      const response = await fetch('/api/sales/recent', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: false
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Sales Data Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
          <Button onClick={() => refetch()} size="sm">Refresh Debug Info</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading debug info...</p>
          ) : error ? (
            <div className="text-red-600">
              <p>Error: {error.message}</p>
            </div>
          ) : (
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales Data</CardTitle>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <p>Loading sales data...</p>
          ) : (
            <div>
              <p>Sales count: {recentSales?.length || 0}</p>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto mt-4">
                {JSON.stringify(recentSales, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
