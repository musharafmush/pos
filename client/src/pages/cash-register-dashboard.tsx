import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { POSRegisterDashboard } from "@/components/pos/pos-register-dashboard";

export default function CashRegisterDashboard() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cash Register</h1>
            <p className="text-muted-foreground">
              Manage your cash register operations and track real-time sales
            </p>
          </div>
        </div>

        <POSRegisterDashboard />
      </div>
    </DashboardLayout>
  );
}