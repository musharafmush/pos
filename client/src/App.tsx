import React from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import AddProduct from "@/pages/add-product";
import POS from "@/pages/pos";
import POSClassic from "@/pages/pos-classic";
import POSGofrugal from "@/pages/pos-gofrugal";
import Products from "@/pages/products";
import Customers from "@/pages/customers";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import BusinessSettings from "@/pages/business-settings";
import CurrencySettings from "@/pages/currency-settings";
import Inventory from "@/pages/inventory";
import InventoryForecasting from "@/pages/inventory-forecasting";
import PurchaseEntry from "@/pages/purchase-entry";
import Purchases from "@/pages/purchases";
import PurchaseDashboard from "@/pages/purchase-dashboard";
import Suppliers from "@/pages/suppliers";
import SupplierForm from "@/pages/supplier-form";
import Users from "@/pages/users";
import PrintLabels from "@/pages/print-labels";
import Repacking from "@/pages/repacking";
import RepackingDashboard from "@/pages/repacking-dashboard";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/components/auth/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is not authenticated and not on auth page, redirect to auth
  if (!user && location !== "/auth") {
    return <AuthPage />;
  }

  // If user is authenticated and on auth page, redirect to dashboard
  if (user && location === "/auth") {
    window.location.href = "/";
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <div className="min-h-screen bg-background">
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <Route path="/" nest>
              <ProtectedRoute>
                <DashboardLayout>
                  <Switch>
                    <Route path="/" component={Dashboard} />
                    <Route path="/add-product" component={AddProduct} />
                    <Route path="/pos" component={POS} />
                    <Route path="/pos-classic" component={POSClassic} />
                    <Route path="/pos-gofrugal" component={POSGofrugal} />
                    <Route path="/products" component={Products} />
                    <Route path="/customers" component={Customers} />
                    <Route path="/reports" component={Reports} />
                    <Route path="/settings" component={Settings} />
                    <Route path="/business-settings" component={BusinessSettings} />
                    <Route path="/currency-settings" component={CurrencySettings} />
                    <Route path="/inventory" component={Inventory} />
                    <Route path="/inventory-forecasting" component={InventoryForecasting} />
                    <Route path="/purchase-entry" component={PurchaseEntry} />
                    <Route path="/purchases" component={Purchases} />
                    <Route path="/purchase-dashboard" component={PurchaseDashboard} />
                    <Route path="/suppliers" component={Suppliers} />
                    <Route path="/supplier-form" component={SupplierForm} />
                    <Route path="/users" component={Users} />
                    <Route path="/print-labels" component={PrintLabels} />
                    <Route path="/repacking" component={Repacking} />
                    <Route path="/repacking-dashboard" component={RepackingDashboard} />
                    <Route component={NotFound} />
                  </Switch>
                </DashboardLayout>
              </ProtectedRoute>
            </Route>
          </Switch>
        </div>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;