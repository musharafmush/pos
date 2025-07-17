import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Factory, Package, Settings } from "lucide-react";

export default function ProductsManufacturing() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manufacturing</h1>
          <p className="text-gray-600">Manage production orders and bill of materials</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "orders"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Production Orders
            </button>
            <button
              onClick={() => setActiveTab("bom")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "bom"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Bill of Materials
            </button>
          </nav>
        </div>

        {/* Content Area */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No active production orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Orders completed today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">BOMs</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Bill of materials defined
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Production Orders</h2>
              <Button>
                <Factory className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Factory className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No production orders</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create your first production order to start manufacturing.
                  </p>
                  <div className="mt-6">
                    <Button>
                      <Factory className="w-4 h-4 mr-2" />
                      Create Order
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "bom" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Bill of Materials</h2>
              <Button>
                <Settings className="w-4 h-4 mr-2" />
                New BOM
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Settings className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No BOMs defined</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create bill of materials to define product recipes and manufacturing instructions.
                  </p>
                  <div className="mt-6">
                    <Button>
                      <Settings className="w-4 h-4 mr-2" />
                      Create BOM
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}