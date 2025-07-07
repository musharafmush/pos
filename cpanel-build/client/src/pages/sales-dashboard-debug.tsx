
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SalesDataDebug() {
  const { data: salesDebug, isLoading, refetch } = useQuery({
    queryKey: ['/api/sales/debug'],
    queryFn: async () => {
      const endpoints = [
        '/api/sales',
        '/api/sales/recent',
        '/api/sales?limit=10',
        '/api/dashboard/stats'
      ];
      
      const results = await Promise.allSettled(
        endpoints.map(async (endpoint) => {
          try {
            const response = await fetch(endpoint);
            const data = await response.json();
            return {
              endpoint,
              status: response.status,
              ok: response.ok,
              data: data,
              dataType: Array.isArray(data) ? 'array' : typeof data,
              count: Array.isArray(data) ? data.length : 'N/A'
            };
          } catch (error) {
            return {
              endpoint,
              status: 'error',
              ok: false,
              error: error.message,
              data: null
            };
          }
        })
      );
      
      return results.map((result, index) => ({
        endpoint: endpoints[index],
        ...((result as any).value || { error: (result as any).reason })
      }));
    },
    enabled: false // Only run when manually triggered
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Sales Data Debug Information
          <Button onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Test API Endpoints'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {salesDebug && (
          <div className="space-y-4">
            {salesDebug.map((result: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{result.endpoint}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    result.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.status}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div>Data Type: {result.dataType}</div>
                  <div>Count: {result.count}</div>
                  {result.error && <div className="text-red-600">Error: {result.error}</div>}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-600">View Raw Data</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
