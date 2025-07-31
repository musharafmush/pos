import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Users, 
  BarChart3, 
  DollarSign,
  ArrowRight,
  Store,
  Building2,
  Clock,
  Target
} from "lucide-react";

interface SalesOverview {
  retailSales: {
    today: number;
    todayRevenue: number;
    thisMonth: number;
    thisMonthRevenue: number;
  };
  wholesaleSales: {
    today: number;
    todayRevenue: number;
    thisMonth: number;
    thisMonthRevenue: number;
  };
  totalRevenue: number;
  avgOrderValue: number;
}

export default function SalesMenu() {
  // Fetch sales overview data
  const { data: overview } = useQuery<SalesOverview>({
    queryKey: ['/api/sales/overview'],
    staleTime: 30000,
    refetchInterval: 60000
  });

  const menuItems = [
    {
      title: "Retail Sales Management",
      description: "Manage individual customer transactions and daily sales",
      icon: Store,
      path: "/retail-sales",
      color: "bg-blue-500",
      stats: [
        { label: "Today's Sales", value: overview?.retailSales.today || 0 },
        { label: "Today's Revenue", value: `₹${(overview?.retailSales.todayRevenue || 0).toFixed(2)}` },
        { label: "This Month", value: overview?.retailSales.thisMonth || 0 }
      ],
      features: [
        "Transaction monitoring",
        "Customer analytics",
        "Payment tracking",
        "Daily reports"
      ]
    },
    {
      title: "Wholesale Sales Management",
      description: "Handle bulk orders and B2B customer transactions",
      icon: Building2,
      path: "/wholesale-sales",
      color: "bg-green-500",
      stats: [
        { label: "Today's Orders", value: overview?.wholesaleSales.today || 0 },
        { label: "Today's Revenue", value: `₹${(overview?.wholesaleSales.todayRevenue || 0).toFixed(2)}` },
        { label: "This Month", value: overview?.wholesaleSales.thisMonth || 0 }
      ],
      features: [
        "Bulk order management",
        "B2B pricing",
        "Credit terms",
        "Volume discounts"
      ]
    }
  ];

  const quickStats = [
    {
      title: "Total Revenue",
      value: `₹${(overview?.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Avg Order Value",
      value: `₹${(overview?.avgOrderValue || 0).toFixed(2)}`,
      icon: BarChart3,
      color: "text-blue-600"
    },
    {
      title: "Today's Sales",
      value: (overview?.retailSales.today || 0) + (overview?.wholesaleSales.today || 0),
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      title: "Active Customers",
      value: "24", // This would come from actual data
      icon: Users,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Sales Management Hub</h1>
        <p className="text-xl text-muted-foreground">
          Comprehensive retail and wholesale sales management system
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Menu Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {menuItems.map((item, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${item.color} text-white`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-50">
                  New
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                {item.stats.map((stat, statIndex) => (
                  <div key={statIndex} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Key Features
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {item.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Link href={item.path}>
                <Button className="w-full" size="lg">
                  Open {item.title.split(' ')[0]} Module
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/pos-enhanced">
              <Button variant="outline" className="w-full h-16 flex flex-col gap-1">
                <ShoppingCart className="h-5 w-5" />
                <span>POS Terminal</span>
              </Button>
            </Link>
            
            <Link href="/sales-dashboard">
              <Button variant="outline" className="w-full h-16 flex flex-col gap-1">
                <BarChart3 className="h-5 w-5" />
                <span>Sales Dashboard</span>
              </Button>
            </Link>
            
            <Link href="/customers">
              <Button variant="outline" className="w-full h-16 flex flex-col gap-1">
                <Users className="h-5 w-5" />
                <span>Customers</span>
              </Button>
            </Link>
            
            <Link href="/products">
              <Button variant="outline" className="w-full h-16 flex flex-col gap-1">
                <Package className="h-5 w-5" />
                <span>Products</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Retail Performance
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Today's Transactions:</span>
                  <span className="font-medium">{overview?.retailSales.today || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Today's Revenue:</span>
                  <span className="font-medium text-green-600">₹{(overview?.retailSales.todayRevenue || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Total:</span>
                  <span className="font-medium">{overview?.retailSales.thisMonth || 0} sales</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Wholesale Performance
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Today's Orders:</span>
                  <span className="font-medium">{overview?.wholesaleSales.today || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Today's Revenue:</span>
                  <span className="font-medium text-green-600">₹{(overview?.wholesaleSales.todayRevenue || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Total:</span>
                  <span className="font-medium">{overview?.wholesaleSales.thisMonth || 0} orders</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}