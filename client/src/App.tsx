
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

// Import pages
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
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
import Units from "@/pages/units";
import AddProduct from "@/pages/add-product";
import PrintLabels from "@/pages/print-labels";
import Inventory from "@/pages/inventory";
import InventoryForecasting from "@/pages/inventory-forecasting";
import Purchases from "@/pages/purchases";
import PurchaseDashboard from "@/pages/purchase-dashboard";
import PurchaseEntry from "@/pages/purchase-entry";
import PurchaseEntryProfessional from "@/pages/purchase-entry-professional";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import BusinessSettings from "@/pages/business-settings";
import CurrencySettings from "@/pages/currency-settings";
import Suppliers from "@/pages/suppliers";
import SupplierForm from "@/pages/supplier-form";
import Customers from "@/pages/customers";
import NotFound from "@/pages/not-found";
import RepackingSystem from "@/pages/repacking-system";
import RepackingManagement from "@/pages/repacking-management";
import RepackingAnalytics from "@/pages/repacking-analytics";
import RepackingSystemComplete from "@/pages/repacking-system-complete";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="pos-theme">
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/pos" element={
                <ProtectedRoute>
                  <POS />
                </ProtectedRoute>
              } />
              <Route path="/pos-gofrugal" element={
                <ProtectedRoute>
                  <POSGofrugal />
                </ProtectedRoute>
              } />
              <Route path="/pos-enhanced" element={
                <ProtectedRoute>
                  <POSEnhanced />
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              } />
              <Route path="/products-enhanced" element={
                <ProtectedRoute>
                  <ProductsEnhanced />
                </ProtectedRoute>
              } />
              <Route path="/product-manager" element={
                <ProtectedRoute>
                  <ProductManager />
                </ProtectedRoute>
              } />
              <Route path="/add-item-professional" element={
                <ProtectedRoute>
                  <AddItemProfessional />
                </ProtectedRoute>
              } />
              <Route path="/add-item-dashboard" element={
                <ProtectedRoute>
                  <AddItemDashboard />
                </ProtectedRoute>
              } />
              <Route path="/repacking-professional" element={
                <ProtectedRoute>
                  <RepackingProfessional />
                </ProtectedRoute>
              } />
              <Route path="/repacking-dashboard-professional" element={
                <ProtectedRoute>
                  <RepackingDashboardProfessional />
                </ProtectedRoute>
              } />
              <Route path="/repacking-system" element={
                <ProtectedRoute>
                  <RepackingSystem />
                </ProtectedRoute>
              } />
              <Route path="/repacking-management" element={
                <ProtectedRoute>
                  <RepackingManagement />
                </ProtectedRoute>
              } />
              <Route path="/repacking-analytics" element={
                <ProtectedRoute>
                  <RepackingAnalytics />
                </ProtectedRoute>
              } />
              <Route path="/repacking-system-complete" element={
                <ProtectedRoute>
                  <RepackingSystemComplete />
                </ProtectedRoute>
              } />
              <Route path="/units" element={
                <ProtectedRoute>
                  <Units />
                </ProtectedRoute>
              } />
              <Route path="/products/add" element={
                <ProtectedRoute>
                  <AddProduct />
                </ProtectedRoute>
              } />
              <Route path="/add-product" element={
                <ProtectedRoute>
                  <AddProduct />
                </ProtectedRoute>
              } />
              <Route path="/print-labels" element={
                <ProtectedRoute>
                  <PrintLabels />
                </ProtectedRoute>
              } />
              <Route path="/inventory" element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              } />
              <Route path="/inventory-forecasting" element={
                <ProtectedRoute>
                  <InventoryForecasting />
                </ProtectedRoute>
              } />
              <Route path="/purchases" element={
                <ProtectedRoute>
                  <Purchases />
                </ProtectedRoute>
              } />
              <Route path="/purchase-dashboard" element={
                <ProtectedRoute>
                  <PurchaseDashboard />
                </ProtectedRoute>
              } />
              <Route path="/purchase-entry" element={
                <ProtectedRoute>
                  <PurchaseEntry />
                </ProtectedRoute>
              } />
              <Route path="/purchase-entry-professional" element={
                <ProtectedRoute>
                  <PurchaseEntryProfessional />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/business-settings" element={
                <ProtectedRoute>
                  <BusinessSettings />
                </ProtectedRoute>
              } />
              <Route path="/currency-settings" element={
                <ProtectedRoute>
                  <CurrencySettings />
                </ProtectedRoute>
              } />
              <Route path="/suppliers" element={
                <ProtectedRoute>
                  <Suppliers />
                </ProtectedRoute>
              } />
              <Route path="/suppliers/add" element={
                <ProtectedRoute>
                  <SupplierForm />
                </ProtectedRoute>
              } />
              <Route path="/suppliers/edit/:id" element={
                <ProtectedRoute>
                  <SupplierForm />
                </ProtectedRoute>
              } />
              <Route path="/customers" element={
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
