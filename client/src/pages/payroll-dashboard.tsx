import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Eye, 
  UserPlus,
  FileText,
  Settings,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import type { Employee, SalaryStructure, Attendance, LeaveApplication, PayrollRecord, EmployeeAdvance } from '@shared/schema';

interface PayrollStats {
  totalEmployees: number;
  activeEmployees: number;
  totalSalariesThisMonth: number;
  pendingLeaves: number;
  pendingAdvances: number;
  attendanceToday: number;
}

export default function PayrollDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isProcessPayrollOpen, setIsProcessPayrollOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees data
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['/api/employees'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Fetch payroll records for selected month
  const { data: payrollRecords = [], isLoading: payrollLoading } = useQuery({
    queryKey: ['/api/payroll/month', selectedMonth],
    refetchInterval: 3000
  });

  // Fetch pending leave applications
  const { data: pendingLeaves = [], isLoading: leavesLoading } = useQuery({
    queryKey: ['/api/leave-applications/pending'],
    refetchInterval: 3000
  });

  // Fetch pending advances
  const { data: pendingAdvances = [], isLoading: advancesLoading } = useQuery({
    queryKey: ['/api/employee-advances/pending'],
    refetchInterval: 3000
  });

  // Calculate stats
  const stats: PayrollStats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter((emp: Employee) => emp.status === 'active').length,
    totalSalariesThisMonth: payrollRecords.reduce((sum: number, record: PayrollRecord) => sum + (record.netSalaryEarned || 0), 0),
    pendingLeaves: pendingLeaves.length,
    pendingAdvances: pendingAdvances.length,
    attendanceToday: employees.length // Simplified for now
  };

  // Add employee mutation
  const addEmployeeMutation = useMutation({
    mutationFn: (employeeData: any) => apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setIsAddEmployeeOpen(false);
      toast({
        title: "Employee Added",
        description: "New employee has been successfully added to the system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add employee",
        variant: "destructive",
      });
    }
  });

  // Process payroll mutation
  const processPayrollMutation = useMutation({
    mutationFn: (payrollData: any) => apiRequest('/api/payroll', {
      method: 'POST',
      body: JSON.stringify(payrollData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/month', selectedMonth] });
      setIsProcessPayrollOpen(false);
      toast({
        title: "Payroll Processed",
        description: "Payroll has been successfully processed for the selected employee.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process payroll",
        variant: "destructive",
      });
    }
  });

  const handleAddEmployee = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const employeeData = {
      userId: parseInt(formData.get('userId') as string) || 1, // Default to admin user for now
      employeeId: formData.get('employeeId') as string,
      department: formData.get('department') as string,
      designation: formData.get('designation') as string,
      dateOfJoining: formData.get('dateOfJoining') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      employmentType: formData.get('employmentType') as string,
      status: 'active',
      isActive: true
    };

    addEmployeeMutation.mutate(employeeData);
  };

  const handleProcessPayroll = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const payrollData = {
      employeeId: parseInt(formData.get('employeeId') as string),
      salaryStructureId: 1, // Simplified for now
      payrollMonth: selectedMonth,
      workingDays: parseFloat(formData.get('workingDays') as string),
      presentDays: parseFloat(formData.get('presentDays') as string),
      basicSalaryEarned: parseFloat(formData.get('basicSalary') as string),
      allowancesEarned: parseFloat(formData.get('allowances') as string) || 0,
      deductionsApplied: parseFloat(formData.get('deductions') as string) || 0,
      grossSalaryEarned: parseFloat(formData.get('grossSalary') as string),
      netSalaryEarned: parseFloat(formData.get('netSalary') as string),
      status: 'processed'
    };

    processPayrollMutation.mutate(payrollData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">Manage employees, attendance, and salary processing</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input id="employeeId" name="employeeId" required placeholder="EMP001" />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select name="department" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="accounts">Accounts</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="designation">Designation</Label>
                  <Input id="designation" name="designation" required placeholder="Sales Executive" />
                </div>
                <div>
                  <Label htmlFor="dateOfJoining">Date of Joining</Label>
                  <Input id="dateOfJoining" name="dateOfJoining" type="date" required />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" name="phoneNumber" placeholder="9876543210" />
                </div>
                <div>
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select name="employmentType" defaultValue="full_time">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={addEmployeeMutation.isPending}>
                  {addEmployeeMutation.isPending ? 'Adding...' : 'Add Employee'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isProcessPayrollOpen} onOpenChange={setIsProcessPayrollOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <DollarSign className="h-4 w-4 mr-2" />
                Process Payroll
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Process Employee Payroll</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProcessPayroll} className="space-y-4">
                <div>
                  <Label htmlFor="employeeId">Select Employee</Label>
                  <Select name="employeeId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp: Employee) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.userName} ({emp.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="workingDays">Working Days</Label>
                    <Input id="workingDays" name="workingDays" type="number" step="0.5" defaultValue="26" required />
                  </div>
                  <div>
                    <Label htmlFor="presentDays">Present Days</Label>
                    <Input id="presentDays" name="presentDays" type="number" step="0.5" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="basicSalary">Basic Salary (₹)</Label>
                  <Input id="basicSalary" name="basicSalary" type="number" step="0.01" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="allowances">Allowances (₹)</Label>
                    <Input id="allowances" name="allowances" type="number" step="0.01" defaultValue="0" />
                  </div>
                  <div>
                    <Label htmlFor="deductions">Deductions (₹)</Label>
                    <Input id="deductions" name="deductions" type="number" step="0.01" defaultValue="0" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="grossSalary">Gross Salary (₹)</Label>
                  <Input id="grossSalary" name="grossSalary" type="number" step="0.01" required />
                </div>
                <div>
                  <Label htmlFor="netSalary">Net Salary (₹)</Label>
                  <Input id="netSalary" name="netSalary" type="number" step="0.01" required />
                </div>
                <Button type="submit" className="w-full" disabled={processPayrollMutation.isPending}>
                  {processPayrollMutation.isPending ? 'Processing...' : 'Process Payroll'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Employees</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeEmployees}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Payroll</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalSalariesThisMonth.toLocaleString('en-IN')}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Leaves</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingLeaves}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Advances</p>
                <p className="text-2xl font-bold text-red-600">{stats.pendingAdvances}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Attendance</p>
                <p className="text-2xl font-bold text-blue-600">{stats.attendanceToday}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payroll Management</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="month">Select Month:</Label>
              <Input 
                id="month"
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Records</TabsTrigger>
          <TabsTrigger value="leaves">Leave Applications</TabsTrigger>
          <TabsTrigger value="advances">Employee Advances</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>Manage your organization's employee records</CardDescription>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No employees found. Add your first employee to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employees.map((employee: Employee) => (
                    <Card key={employee.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{employee.userName || 'Unknown Name'}</h3>
                            <p className="text-sm text-gray-600">{employee.designation}</p>
                            <p className="text-sm text-gray-500">{employee.department}</p>
                            <p className="text-xs text-gray-400 mt-1">ID: {employee.employeeId}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                              {employee.status}
                            </Badge>
                            <Badge variant="outline">
                              {employee.employmentType?.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Records Tab */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Records - {selectedMonth}</CardTitle>
              <CardDescription>View and manage salary records for the selected month</CardDescription>
            </CardHeader>
            <CardContent>
              {payrollLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : payrollRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No payroll records found for {selectedMonth}.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payrollRecords.map((record: PayrollRecord) => (
                    <Card key={record.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{record.employeeName || 'Unknown Employee'}</h3>
                            <p className="text-sm text-gray-600">{record.department} - {record.designation}</p>
                            <p className="text-xs text-gray-500">Days: {record.presentDays}/{record.workingDays}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">₹{record.netSalaryEarned?.toLocaleString('en-IN')}</p>
                            <Badge variant={record.status === 'paid' ? 'default' : record.status === 'processed' ? 'secondary' : 'outline'}>
                              {record.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Applications Tab */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader>
              <CardTitle>Pending Leave Applications</CardTitle>
              <CardDescription>Review and approve employee leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              {leavesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : pendingLeaves.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending leave applications.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingLeaves.map((leave: LeaveApplication) => (
                    <Card key={leave.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{leave.employeeName || 'Unknown Employee'}</h3>
                            <p className="text-sm text-gray-600">{leave.leaveType} - {leave.totalDays} days</p>
                            <p className="text-sm text-gray-500">{leave.fromDate} to {leave.toDate}</p>
                            <p className="text-xs text-gray-400 mt-1">{leave.reason}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-600">
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600">
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Advances Tab */}
        <TabsContent value="advances">
          <Card>
            <CardHeader>
              <CardTitle>Pending Salary Advances</CardTitle>
              <CardDescription>Review and approve employee advance requests</CardDescription>
            </CardHeader>
            <CardContent>
              {advancesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : pendingAdvances.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending advance requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAdvances.map((advance: EmployeeAdvance) => (
                    <Card key={advance.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{advance.employeeName || 'Unknown Employee'}</h3>
                            <p className="text-sm text-gray-600">₹{advance.advanceAmount?.toLocaleString('en-IN')} requested</p>
                            <p className="text-sm text-gray-500">Installments: {advance.installments}</p>
                            <p className="text-xs text-gray-400 mt-1">{advance.reason}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-600">
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600">
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Settings</CardTitle>
              <CardDescription>Configure payroll processing parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="workingDays">Standard Working Days</Label>
                    <Input id="workingDays" type="number" defaultValue="26" />
                  </div>
                  <div>
                    <Label htmlFor="workingHours">Standard Working Hours</Label>
                    <Input id="workingHours" type="number" defaultValue="8" />
                  </div>
                  <div>
                    <Label htmlFor="overtimeRate">Overtime Rate Multiplier</Label>
                    <Input id="overtimeRate" type="number" step="0.1" defaultValue="1.5" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pfRate">PF Rate (%)</Label>
                    <Input id="pfRate" type="number" step="0.1" defaultValue="12" />
                  </div>
                  <div>
                    <Label htmlFor="esiRate">ESI Rate (%)</Label>
                    <Input id="esiRate" type="number" step="0.1" defaultValue="3.25" />
                  </div>
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" defaultValue="Awesome Shop" />
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Settings className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}