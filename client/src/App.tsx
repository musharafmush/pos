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
import ListProducts from "@/pages/list-products";
import Inventory from "@/pages/inventory";
import Purchases from "@/pages/purchases";
import PurchaseDashboard from "@/pages/purchase-dashboard";
import PurchaseEntry from "@/pages/purchase-entry";
import PurchaseEntryLegacy from "@/pages/purchase-entry-legacy";
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

function Router() {
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
      <ProtectedRoute path="/list-products" component={ListProducts} />
      <ProtectedRoute path="/products/add" component={AddProduct} />
      <ProtectedRoute path="/add-product" component={AddProduct} />
      <ProtectedRoute path="/products/repacking" component={Repacking} />
      <ProtectedRoute path="/products/repacking-dashboard" component={RepackingDashboard} />
      <ProtectedRoute path="/repacking" component={Repacking} />
      <ProtectedRoute path="/repacking-dashboard" component={RepackingDashboard} />
      <ProtectedRoute path="/print-labels" component={PrintLabels} />
      <ProtectedRoute path="/inventory" component={Inventory} />
      <ProtectedRoute path="/inventory-forecasting" component={InventoryForecasting} />
      <ProtectedRoute path="/purchases" component={Purchases} />
      <ProtectedRoute path="/purchase-dashboard" component={PurchaseDashboard} />
      <ProtectedRoute path="/purchase-entry" component={PurchaseEntry} />
      <ProtectedRoute path="/purchase-entry-legacy" component={PurchaseEntryLegacy} />
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
  return (
    <ThemeProvider defaultTheme="light" storageKey="pos-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
