import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Dashboard from "@/pages/dashboard";
import POS from "@/pages/pos";
import POSGofrugal from "@/pages/pos-gofrugal";
import POSEnhanced from "@/pages/pos-enhanced";
import Products from "@/pages/products";
import ProductsEnhanced from "@/pages/products-enhanced";
import ProductManager from "@/pages/product-manager";
import AddItemProfessional from "@/pages/add-item-professional";
import AddItemDashboard from "@/pages/add-item-dashboard";
import RepackingProfessional from "@/pages/repacking-professional";
import RepackingDashboardProfessional from "@/pages/repacking-dashboard-professional";
import RepackingMainDashboard from "./pages/repacking-main-dashboard";

import Units from "@/pages/units";

import Inventory from "@/pages/inventory";
import Purchases from "@/pages/purchases";
import PurchaseDashboard from "@/pages/purchase-dashboard";
import PurchaseEntry from "@/pages/purchase-entry";
import PurchaseEntryProfessional from "@/pages/purchase-entry-professional";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import Suppliers from "@/pages/suppliers";
import Customers from "@/pages/customers";
import AddProduct from "@/pages/add-product";
import PrintLabels from "@/pages/print-labels";
import InventoryForecasting from "@/pages/inventory-forecasting";
import Repacking from "@/pages/repacking";
import RepackingDashboard from "@/pages/repacking-dashboard";
import CurrencySettings from "@/pages/currency-settings";
import BusinessSettings from "@/pages/business-settings";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import React from "react";
import { BrowserRouter as MainRouter, Routes, Route as MainRoute, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/dashboard-layout";
// Enhanced QueryClient with error handling
const queryClientEnhanced = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        console.error('Query error:', error);
      }
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
      }
    }
  }
});

// Error Boundary Component
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">🚨</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Application Error
              </h1>
              <p className="text-gray-600 mb-6">
                Something went wrong with the POS application. Please try reloading the page.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Reload Application
              </button>

              <button
                onClick={() => {
                  // Clear local storage and reload
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/auth';
                }}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                🔑 Clear Data & Login Again
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                  Technical Details (Development)
                </summary>
                <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 overflow-auto max-h-32">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppRouter() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/pos" component={POS} />
      <ProtectedRoute path="/pos-gofrugal" component={POSGofrugal} />
      <ProtectedRoute path="/pos-enhanced" component={POSEnhanced} />
      <ProtectedRoute path="/products" component={Products} />
      <ProtectedRoute path="/products-enhanced" component={ProductsEnhanced} />
      <ProtectedRoute path="/product-manager" component={ProductManager} />
      <ProtectedRoute path="/add-item-professional" component={AddItemProfessional} />
      <ProtectedRoute path="/add-item-dashboard" component={AddItemDashboard} />
      <ProtectedRoute path="/repacking-professional" component={RepackingProfessional} />
      <ProtectedRoute path="/repacking-dashboard-professional" component={RepackingDashboardProfessional} />
      <ProtectedRoute path="/units" component={Units} />

      <ProtectedRoute path="/products/add" component={AddProduct} />
      <ProtectedRoute path="/add-product" component={AddProduct} />
      <ProtectedRoute path="/products/repacking" component={Repacking} />
      <ProtectedRoute path="/products/repacking-dashboard" component={RepackingDashboard} />
      <ProtectedRoute path="/products/repacking-professional" component={RepackingProfessional} />
      <ProtectedRoute path="/products/repacking-dashboard-professional" component={RepackingDashboardProfessional} />
      <ProtectedRoute path="/repacking" component={RepackingMainDashboard} />
      <ProtectedRoute path="/repacking/main" component={RepackingMainDashboard} />
      <ProtectedRoute path="/repacking/repacking-professional" component={RepackingProfessional} />
      <ProtectedRoute path="/repacking/repacking-dashboard-professional" component={RepackingDashboardProfessional} />
      <ProtectedRoute path="/print-labels" component={PrintLabels} />
      <ProtectedRoute path="/inventory" component={Inventory} />
      <ProtectedRoute path="/inventory-forecasting" component={InventoryForecasting} />
      <ProtectedRoute path="/purchases" component={Purchases} />
      <ProtectedRoute path="/purchase-dashboard" component={PurchaseDashboard} />
      <ProtectedRoute path="/purchase-entry" component={PurchaseEntry} />
      <ProtectedRoute path="/purchase-entry-professional" component={PurchaseEntryProfessional} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/users" component={Users} adminOnly />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/suppliers" component={Suppliers} />
      <ProtectedRoute path="/customers" component={Customers} />
      <ProtectedRoute path="/settings/currency" component={CurrencySettings} />
      <ProtectedRoute path="/settings/business" component={BusinessSettings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Global error handler for unhandled promises
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);

      // Prevent default browser behavior (showing error in console)
      event.preventDefault();

      // Handle specific common errors gracefully
      if (typeof event.reason === 'string') {
        if (event.reason.includes('fetch') || event.reason.includes('NetworkError')) {
          console.warn('Network request failed, continuing...');
          return;
        }
        if (event.reason.includes('Unauthorized') || event.reason.includes('401')) {
          console.warn('Authentication error, redirecting to login...');
          window.location.href = '/auth';
          return;
        }
      }
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClientEnhanced}>
        <ThemeProvider defaultTheme="light" storageKey="pos-theme">
          <AuthProvider>
            <AppRouter />
            <Toaster />
          </AuthProvider>
      </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;