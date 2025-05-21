import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Dashboard from "@/pages/dashboard";
import POS from "@/pages/pos";
import Products from "@/pages/products";
import Inventory from "@/pages/inventory";
import Purchases from "@/pages/purchases";
import PurchaseEntry from "@/pages/purchase-entry";
import PurchaseEntryLegacy from "@/pages/purchase-entry-legacy";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import Suppliers from "@/pages/suppliers";
import Contacts from "@/pages/contacts";
import Customers from "@/pages/customers";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/pos" component={POS} />
      <ProtectedRoute path="/products" component={Products} />
      <ProtectedRoute path="/inventory" component={Inventory} />
      <ProtectedRoute path="/purchases" component={Purchases} />
      <ProtectedRoute path="/purchase-entry" component={PurchaseEntry} />
      <ProtectedRoute path="/purchase-entry-legacy" component={PurchaseEntryLegacy} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/users" component={Users} adminOnly />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/suppliers" component={Suppliers} />
      <ProtectedRoute path="/contacts" component={Contacts} />
      <ProtectedRoute path="/customers" component={Customers} />
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
