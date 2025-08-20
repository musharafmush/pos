import { DashboardLayout } from "@/components/layout/dashboard-layout";
import PaymentStatusRecordManager from "@/components/payment/PaymentStatusRecordManager";

export default function PaymentManagement() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <PaymentStatusRecordManager showFullDashboard={true} />
      </div>
    </DashboardLayout>
  );
}