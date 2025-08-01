import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
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
import UpdatePriceProfessional from "@/pages/update-price-professional";
import Units from "@/pages/units";
import Inventory from "@/pages/inventory";
import Purchases from "@/pages/purchases";
import PurchaseDashboard from "@/pages/purchase-dashboard";
import PurchaseEntry from "@/pages/purchase-entry";
import PurchaseEntryProfessional from "@/pages/purchase-entry-professional";
import Reports from "./pages/reports";
import SalesReports from "./pages/sales-reports";
import PurchaseReports from "./pages/purchase-reports";
import StockReports from "./pages/stock-reports";
import CustomerReports from "./pages/customer-reports";
import SupplierReports from "./pages/supplier-reports";
import TaxReports from "@/pages/tax-reports";
import ProductHistory from "./pages/product-history";
import SaleReturn from "./pages/sale-return";
import SalesDashboard from "./pages/sales-dashboard";
import Users from "@/pages/users";
import Roles from "@/pages/roles";
import Settings from "@/pages/settings";
import Suppliers from "@/pages/suppliers";
import Customers from "@/pages/customers";
import CustomersCRUD from "@/pages/customers-crud";
import AddProduct from "@/pages/add-product";
import PrintLabels from "@/pages/print-labels";
import PrintLabelsEnhanced from "@/pages/print-labels-enhanced";
import CustomLabelPrinting from "@/pages/custom-label-printing";
import InventoryForecasting from "@/pages/inventory-forecasting";
import Repacking from "@/pages/repacking";
import WeightBasedItems from "@/pages/weight-based-items";
import RepackingDashboard from "@/pages/repacking-dashboard";
import CurrencySettings from "@/pages/currency-settings";
import BusinessSettings from "@/pages/business-settings";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import Categories from "./pages/categories";
import Brands from "./pages/brands";
import AccountsDashboard from "./pages/accounts-dashboard";
import SaleReturnsDashboard from "./pages/sale-returns-dashboard";
import ProfitManagement from "./pages/profit-management";
import ReceiptSettings from "./pages/receipt-settings";
import PrinterReceiptEditor from "./pages/printer-receipt-editor";
import InventoryAdjustments from "./pages/inventory-adjustments";
import UnifiedPrinterSettings from "@/pages/unified-printer-settings";
import CashRegisterManagement from "@/pages/cash-register-management";
import ExpenseManagement from "@/pages/expense-management";
import ExpenseCategories from "@/pages/expense-categories";
import OfferManagement from "@/pages/offer-management";
import OfferReports from "@/pages/offer-reports";
import LoyaltyManagement from "@/pages/loyalty-management";
import LoyaltyRules from "@/pages/loyalty-rules";
import ManufacturingDashboard from "@/pages/manufacturing-dashboard";
import CreateProductFormula from "@/pages/create-product-formula";
import RawMaterialsManagement from "@/pages/raw-materials-management";
import PayrollDashboard from "@/pages/payroll-dashboard";

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
      <ProtectedRoute path="/print-labels-enhanced" component={PrintLabelsEnhanced} />
      <ProtectedRoute path="/custom-label-printing" component={CustomLabelPrinting} />
      <ProtectedRoute path="/inventory" component={Inventory} />
      <ProtectedRoute path="/inventory-adjustments" component={InventoryAdjustments} />
      <ProtectedRoute path="/inventory-forecasting" component={InventoryForecasting} />
      <ProtectedRoute path="/weight-based-items" component={WeightBasedItems} />
      <ProtectedRoute path="/purchases" component={Purchases} />
      <ProtectedRoute path="/purchase-dashboard" component={PurchaseDashboard} />
      <ProtectedRoute path="/purchase-entry" component={PurchaseEntry} />
      <ProtectedRoute path="/purchase-entry-professional" component={PurchaseEntryProfessional} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/sales-reports" component={SalesReports} />
      <ProtectedRoute path="/purchase-reports" component={PurchaseReports} />
      <ProtectedRoute path="/stock-reports" component={StockReports} />
      <ProtectedRoute path="/customer-reports" component={CustomerReports} />
      <ProtectedRoute path="/supplier-reports" component={SupplierReports} />
      <ProtectedRoute path="/tax-reports" component={TaxReports} />
      <ProtectedRoute path="/product-history" component={ProductHistory} />
      <ProtectedRoute path="/sales/return" component={SaleReturn} />
      <ProtectedRoute path="/sale-return" component={SaleReturn} />
      <ProtectedRoute path="/sale-returns-dashboard" component={SaleReturnsDashboard} />
      <ProtectedRoute path="/sales-dashboard" component={SalesDashboard} />
      <ProtectedRoute path="/profit-management" component={ProfitManagement} />
      <ProtectedRoute path="/users" component={Users} adminOnly />
      <ProtectedRoute path="/roles" component={Roles} adminOnly />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/suppliers" component={Suppliers} />
      <ProtectedRoute path="/customers" component={CustomersCRUD} />
      <ProtectedRoute path="/update-price-professional" component={UpdatePriceProfessional} />
      <ProtectedRoute path="/settings/currency" component={CurrencySettings} />
      <ProtectedRoute path="/settings/business" component={BusinessSettings} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/categories" component={Categories} />
      <ProtectedRoute path="/brands" component={Brands} />
      <ProtectedRoute path="/accounts-dashboard" component={AccountsDashboard} />
      <ProtectedRoute path="/receipt-settings" component={ReceiptSettings} />
      <ProtectedRoute path="/printer-receipt-editor" component={PrinterReceiptEditor} />
      <ProtectedRoute path="/printer-settings" component={UnifiedPrinterSettings} />
      <ProtectedRoute path="/cash-register-management" component={CashRegisterManagement} />
      <ProtectedRoute path="/expense-management" component={ExpenseManagement} />
      <ProtectedRoute path="/expense-categories" component={ExpenseCategories} />
      <ProtectedRoute path="/offer-management" component={OfferManagement} />
      <ProtectedRoute path="/offer-reports" component={OfferReports} />
      <ProtectedRoute path="/loyalty-management" component={LoyaltyManagement} />
      <ProtectedRoute path="/loyalty-rules" component={LoyaltyRules} />
      <ProtectedRoute path="/manufacturing-dashboard" component={ManufacturingDashboard} />
      <ProtectedRoute path="/create-product-formula" component={CreateProductFormula} />
      <ProtectedRoute path="/raw-materials-management" component={RawMaterialsManagement} />
      <ProtectedRoute path="/payroll-dashboard" component={PayrollDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="pos-theme">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;