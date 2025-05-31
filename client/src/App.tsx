import React from "react";
import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { AuthProvider } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/auth/protected-route";

// Import pages
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import AddProduct from "@/pages/add-product";
import Inventory from "@/pages/inventory";
import POS from "@/pages/pos";
import POSClassic from "@/pages/pos-classic";
import POSGofrugal from "@/pages/pos-gofrugal";
import POSEnhanced from "@/pages/pos-enhanced";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/suppliers";
import SupplierForm from "@/pages/supplier-form";
import PurchaseEntry from "@/pages/purchase-entry";
import PurchaseDashboard from "@/pages/purchase-dashboard";
import Purchases from "@/pages/purchases";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import BusinessSettings from "@/pages/business-settings";
import CurrencySettings from "@/pages/currency-settings";
import Users from "@/pages/users";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import PrintLabels from "@/pages/print-labels";
import InventoryForecasting from "@/pages/inventory-forecasting";
import ReppackingDashboard from "@/pages/repacking-dashboard";
import Repacking from "@/pages/repacking";
import AddItemDashboard from "@/pages/add-item-dashboard";
import AddItemProfessional from "@/pages/add-item-professional";
import RepackingProfessional from "@/pages/repacking-professional";
import RepackingSystem from "@/pages/repacking-system";
import RepackingManagement from "@/pages/repacking-management";
import RepackingAnalytics from "@/pages/repacking-analytics";
import RepackingSystemComplete from "@/pages/repacking-system-complete";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <Route>
              <ProtectedRoute>
                <DashboardLayout>
                  <Switch>
                    <Route path="/" component={Dashboard} />
                    <Route path="/dashboard" component={Dashboard} />
                    <Route path="/products" component={Products} />
                    <Route path="/add-product" component={AddProduct} />
                    <Route path="/inventory" component={Inventory} />
                    <Route path="/pos" component={POS} />
                    <Route path="/pos-classic" component={POSClassic} />
                    <Route path="/pos-gofrugal" component={POSGofrugal} />
                    <Route path="/pos-enhanced" component={POSEnhanced} />
                    <Route path="/customers" component={Customers} />
                    <Route path="/suppliers" component={Suppliers} />
                    <Route path="/suppliers/new" component={SupplierForm} />
                    <Route path="/suppliers/:id" component={SupplierForm} />
                    <Route path="/purchase-entry" component={PurchaseEntry} />
                    <Route path="/purchase-dashboard" component={PurchaseDashboard} />
                    <Route path="/purchases" component={Purchases} />
                    <Route path="/reports" component={Reports} />
                    <Route path="/settings" component={Settings} />
                    <Route path="/business-settings" component={BusinessSettings} />
                    <Route path="/currency-settings" component={CurrencySettings} />
                    <Route path="/users" component={Users} />
                    <Route path="/print-labels" component={PrintLabels} />
                    <Route path="/inventory-forecasting" component={InventoryForecasting} />
                    <Route path="/repacking-dashboard" component={ReppackingDashboard} />
                    <Route path="/repacking" component={Repacking} />
                    <Route path="/add-item-dashboard" component={AddItemDashboard} />
                    <Route path="/add-item-professional" component={AddItemProfessional} />
                    <Route path="/repacking-professional" component={RepackingProfessional} />
                    <Route path="/repacking-system" component={RepackingSystem} />
                    <Route path="/repacking-management" component={RepackingManagement} />
                    <Route path="/repacking-analytics" component={RepackingAnalytics} />
                    <Route path="/repacking-system-complete" component={RepackingSystemComplete} />
                    <Route component={NotFound} />
                  </Switch>
                </DashboardLayout>
              </ProtectedRoute>
            </Route>
          </Switch>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;