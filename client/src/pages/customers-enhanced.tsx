
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  SearchIcon, 
  UserIcon, 
  UsersIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  CalendarIcon,
  CreditCardIcon,
  StarIcon,
  GiftIcon,
  TrendingUpIcon,
  PlusIcon,
  EditIcon,
  EyeIcon,
  TrashIcon,
  RefreshCwIcon,
  DownloadIcon,
  FilterIcon,
  SortDescIcon,
  HeartIcon,
  ShoppingBagIcon,
  IndianRupeeIcon,
  CakeIcon,
  ClockIcon,
  KeyboardIcon,
  ZapIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XCircleIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import type { Customer } from "@shared/schema";

interface CustomerEnhanced extends Customer {
  totalPurchases: number;
  totalSpent: number;
  lastVisit: string;
  loyaltyPoints: number;
  customerType: 'regular' | 'vip' | 'premium' | 'new';
  averageOrderValue: number;
  visitFrequency: number;
  preferredPayment: string;
  birthDate?: string;
  anniversary?: string;
  notes: string;
  status: 'active' | 'inactive' | 'blocked';
  referralCount: number;
  discountEligible: boolean;
  lastPurchaseDate: string;
  customerSince: string;
}

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  vipCustomers: number;
  newCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
  loyaltyPointsTotal: number;
}

export default function CustomersEnhanced() {
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showEditCustomerDialog, setShowEditCustomerDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerEnhanced | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    birthDate: "",
    notes: ""
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Mock customer data with comprehensive details
  const mockCustomersData: CustomerEnhanced[] = [
    {
      id: 1,
      name: "Rajesh Kumar",
      email: "rajesh@email.com",
      phone: "+91 98765 43210",
      address: "MG Road, Bangalore",
      createdAt: new Date("2023-01-15").toISOString(),
      updatedAt: new Date().toISOString(),
      totalPurchases: 25,
      totalSpent: 15750,
      lastVisit: "Today",
      loyaltyPoints: 157,
      customerType: 'vip',
      averageOrderValue: 630,
      visitFrequency: 15,
      preferredPayment: "UPI",
      birthDate: "1985-03-15",
      anniversary: "2010-12-01",
      notes: "Prefers organic products",
      status: 'active',
      referralCount: 3,
      discountEligible: true,
      lastPurchaseDate: "2024-01-20",
      customerSince: "Jan 2023"
    },
    {
      id: 2,
      name: "Priya Sharma",
      email: "priya@email.com", 
      phone: "+91 87654 32109",
      address: "Brigade Road, Bangalore",
      createdAt: new Date("2023-06-10").toISOString(),
      updatedAt: new Date().toISOString(),
      totalPurchases: 12,
      totalSpent: 6840,
      lastVisit: "Yesterday",
      loyaltyPoints: 68,
      customerType: 'regular',
      averageOrderValue: 570,
      visitFrequency: 8,
      preferredPayment: "Card",
      birthDate: "1992-07-22",
      notes: "Bulk buyer for family",
      status: 'active',
      referralCount: 1,
      discountEligible: true,
      lastPurchaseDate: "2024-01-19",
      customerSince: "Jun 2023"
    },
    {
      id: 3,
      name: "Amit Patel",
      email: "amit@email.com",
      phone: "+91 76543 21098", 
      address: "Koramangala, Bangalore",
      createdAt: new Date("2022-11-05").toISOString(),
      updatedAt: new Date().toISOString(),
      totalPurchases: 45,
      totalSpent: 28900,
      lastVisit: "2 days ago",
      loyaltyPoints: 289,
      customerType: 'premium',
      averageOrderValue: 642,
      visitFrequency: 25,
      preferredPayment: "Cash",
      birthDate: "1978-11-30",
      anniversary: "2005-02-14",
      notes: "Restaurant owner, bulk orders",
      status: 'active',
      referralCount: 5,
      discountEligible: true,
      lastPurchaseDate: "2024-01-18",
      customerSince: "Nov 2022"
    },
    {
      id: 4,
      name: "Sunita Singh",
      email: "",
      phone: "+91 65432 10987",
      address: "Indiranagar, Bangalore",
      createdAt: new Date("2024-01-10").toISOString(),
      updatedAt: new Date().toISOString(),
      totalPurchases: 2,
      totalSpent: 890,
      lastVisit: "1 week ago",
      loyaltyPoints: 9,
      customerType: 'new',
      averageOrderValue: 445,
      visitFrequency: 1,
      preferredPayment: "UPI",
      notes: "New customer, health conscious",
      status: 'active',
      referralCount: 0,
      discountEligible: false,
      lastPurchaseDate: "2024-01-13",
      customerSince: "Jan 2024"
    }
  ];

  const [customersData, setCustomersData] = useState<CustomerEnhanced[]>(mockCustomersData);

  // Calculate statistics
  const stats: CustomerStats = {
    totalCustomers: customersData.length,
    activeCustomers: customersData.filter(c => c.status === 'active').length,
    vipCustomers: customersData.filter(c => c.customerType === 'vip' || c.customerType === 'premium').length,
    newCustomers: customersData.filter(c => c.customerType === 'new').length,
    totalRevenue: customersData.reduce((sum, c) => sum + c.totalSpent, 0),
    averageOrderValue: customersData.reduce((sum, c) => sum + c.averageOrderValue, 0) / customersData.length,
    loyaltyPointsTotal: customersData.reduce((sum, c) => sum + c.loyaltyPoints, 0)
  };

  // Filter and sort customers
  const filteredCustomers = customersData
    .filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.phone.includes(searchTerm) ||
                          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = customerTypeFilter === "all" || customer.customerType === customerTypeFilter;
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "spent":
          aValue = a.totalSpent;
          bValue = b.totalSpent;
          break;
        case "visits":
          aValue = a.totalPurchases;
          bValue = b.totalPurchases;
          break;
        case "loyalty":
          aValue = a.loyaltyPoints;
          bValue = b.loyaltyPoints;
          break;
        case "lastVisit":
          aValue = new Date(a.lastPurchaseDate).getTime();
          bValue = new Date(b.lastPurchaseDate).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Add new customer
  const addNewCustomer = () => {
    if (!newCustomer.name.trim()) {
      toast({
        title: "⚠️ Name Required",
        description: "Please enter customer name",
        variant: "destructive"
      });
      return;
    }

    const customer: CustomerEnhanced = {
      id: Date.now(),
      name: newCustomer.name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      address: newCustomer.address,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalPurchases: 0,
      totalSpent: 0,
      lastVisit: "Never",
      loyaltyPoints: 0,
      customerType: 'new',
      averageOrderValue: 0,
      visitFrequency: 0,
      preferredPayment: "Cash",
      birthDate: newCustomer.birthDate,
      notes: newCustomer.notes,
      status: 'active',
      referralCount: 0,
      discountEligible: false,
      lastPurchaseDate: "",
      customerSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };

    setCustomersData(prev => [customer, ...prev]);
    setNewCustomer({ name: "", email: "", phone: "", address: "", birthDate: "", notes: "" });
    setShowAddCustomerDialog(false);

    toast({
      title: "✅ Customer Added",
      description: `${customer.name} has been added successfully`
    });
  };

  // Get customer type badge
  const getCustomerTypeBadge = (type: string) => {
    switch (type) {
      case 'premium':
        return <Badge className="bg-purple-500 text-white">👑 Premium</Badge>;
      case 'vip':
        return <Badge className="bg-yellow-500 text-white">⭐ VIP</Badge>;
      case 'regular':
        return <Badge variant="outline" className="border-blue-400 text-blue-700">👤 Regular</Badge>;
      case 'new':
        return <Badge variant="outline" className="border-green-400 text-green-700">🆕 New</Badge>;
      default:
        return <Badge variant="outline">Customer</Badge>;
    }
  };

  // Time update
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'f':
            if (e.ctrlKey) {
              e.preventDefault();
              searchInputRef.current?.focus();
            }
            break;
          case 'n':
            if (e.ctrlKey) {
              e.preventDefault();
              setShowAddCustomerDialog(true);
            }
            break;
        }
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'F2':
          e.preventDefault();
          setShowAddCustomerDialog(true);
          break;
        case 'F3':
          e.preventDefault();
          setViewMode(viewMode === 'table' ? 'cards' : 'table');
          break;
        case 'F9':
          e.preventDefault();
          setShowKeyboardShortcuts(true);
          break;
        case 'Escape':
          setShowAddCustomerDialog(false);
          setShowEditCustomerDialog(false);
          setShowKeyboardShortcuts(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [viewMode]);

  const keyboardShortcuts = [
    { key: "F1", action: "Focus Search" },
    { key: "F2", action: "Add New Customer" },
    { key: "F3", action: "Toggle View Mode" },
    { key: "F9", action: "Show Shortcuts" },
    { key: "Ctrl+F", action: "Quick Search" },
    { key: "Ctrl+N", action: "New Customer" },
    { key: "Esc", action: "Close Dialogs" }
  ];

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 via-white to-pink-50">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200 shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg">
                  <UsersIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    👥 Customer Relationship Manager
                  </h1>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                    Build lasting relationships with your customers
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1">
                  👥 {stats.totalCustomers} Total
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                  ✅ {stats.activeCustomers} Active
                </Badge>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 px-3 py-1">
                  ⭐ {stats.vipCustomers} VIP
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-center bg-white rounded-lg p-3 shadow-sm border">
                <div className="text-xs text-gray-500 font-medium">💰 Total Revenue</div>
                <div className="font-bold text-purple-600 text-lg">{formatCurrency(stats.totalRevenue)}</div>
              </div>
              <div className="text-center bg-white rounded-lg p-3 shadow-sm border">
                <div className="text-xs text-gray-500 font-medium">📊 Avg Order</div>
                <div className="font-bold text-pink-600 text-lg">{formatCurrency(stats.averageOrderValue)}</div>
              </div>
              <div className="text-center bg-white rounded-lg p-3 shadow-sm border">
                <div className="text-xs text-gray-500 font-medium">🎁 Loyalty Points</div>
                <div className="font-bold text-green-600 text-lg">{stats.loyaltyPointsTotal}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyboardShortcuts(true)}
                className="bg-white hover:bg-purple-50 border-purple-200"
              >
                <KeyboardIcon className="h-4 w-4 mr-1" />
                🔑 Help (F9)
              </Button>
            </div>
          </div>
        </div>

        {/* Smart Filters & Search */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-purple-200 p-4">
          <div className="grid grid-cols-6 gap-4 items-end">
            <div className="col-span-2">
              <Label className="text-sm font-bold text-purple-700">🔍 Smart Customer Search</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="🔍 Search by name, phone, email, or address... (F1)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 border-2 border-purple-200 focus:border-purple-500"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-bold text-purple-700">👑 Customer Type</Label>
              <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                <SelectTrigger className="h-10 border-2 border-purple-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="premium">👑 Premium</SelectItem>
                  <SelectItem value="vip">⭐ VIP</SelectItem>
                  <SelectItem value="regular">👤 Regular</SelectItem>
                  <SelectItem value="new">🆕 New</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-bold text-purple-700">📊 Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 border-2 border-purple-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">✅ Active</SelectItem>
                  <SelectItem value="inactive">⏸️ Inactive</SelectItem>
                  <SelectItem value="blocked">🚫 Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-bold text-purple-700">🔄 Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 border-2 border-purple-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">📝 Name</SelectItem>
                  <SelectItem value="spent">💰 Total Spent</SelectItem>
                  <SelectItem value="visits">🛍️ Total Visits</SelectItem>
                  <SelectItem value="loyalty">🎁 Loyalty Points</SelectItem>
                  <SelectItem value="lastVisit">⏰ Last Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => setShowAddCustomerDialog(true)}
                className="h-10 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Customer (F2)
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">No Customers Found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
                <Button onClick={() => setShowAddCustomerDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Your First Customer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Enhanced Customer Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      👥 Customer Database ({filteredCustomers.length})
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                        title="F3"
                      >
                        {viewMode === 'table' ? "🔲" : "📋"} 
                        {viewMode === 'table' ? ' Cards' : ' Table'}
                      </Button>
                      <Button variant="outline" size="sm">
                        <DownloadIcon className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCwIcon className="h-4 w-4 mr-1" />
                        Refresh
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer Details</TableHead>
                        <TableHead>Contact Information</TableHead>
                        <TableHead>Purchase History</TableHead>
                        <TableHead>Loyalty & Rewards</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-purple-50">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <div className="font-bold text-gray-900">{customer.name}</div>
                                {getCustomerTypeBadge(customer.customerType)}
                              </div>
                              <div className="text-sm text-gray-600">
                                Customer since {customer.customerSince}
                              </div>
                              <div className="text-xs text-gray-500">
                                Last visit: {customer.lastVisit}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <PhoneIcon className="h-3 w-3 mr-1 text-green-600" />
                                {customer.phone}
                              </div>
                              {customer.email && (
                                <div className="flex items-center text-sm">
                                  <MailIcon className="h-3 w-3 mr-1 text-blue-600" />
                                  {customer.email}
                                </div>
                              )}
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPinIcon className="h-3 w-3 mr-1" />
                                {customer.address}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-bold text-purple-600">{customer.totalPurchases}</span>
                                <span className="text-gray-600"> visits</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-bold text-green-600">{formatCurrency(customer.totalSpent)}</span>
                                <span className="text-gray-600"> spent</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Avg: {formatCurrency(customer.averageOrderValue)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <GiftIcon className="h-3 w-3 mr-1 text-yellow-600" />
                                <span className="font-bold">{customer.loyaltyPoints}</span>
                                <span className="text-gray-600 ml-1">points</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                💳 {customer.preferredPayment}
                              </div>
                              {customer.discountEligible && (
                                <Badge variant="outline" className="text-xs border-green-400 text-green-700">
                                  🎯 Discount Eligible
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setShowEditCustomerDialog(true);
                                }}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <EditIcon className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                <EyeIcon className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-purple-600 border-purple-300 hover:bg-purple-50"
                              >
                                <GiftIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Add Customer Dialog */}
        <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">👤 Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new customer profile for better service
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="font-medium">Customer Name *</Label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  placeholder="Enter customer name..."
                  className="h-10"
                />
              </div>
              <div>
                <Label className="font-medium">Phone Number</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  placeholder="Enter phone number..."
                  className="h-10"
                />
              </div>
              <div>
                <Label className="font-medium">Email Address</Label>
                <Input
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  placeholder="Enter email address..."
                  className="h-10"
                  type="email"
                />
              </div>
              <div>
                <Label className="font-medium">Address</Label>
                <Input
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  placeholder="Enter address..."
                  className="h-10"
                />
              </div>
              <div>
                <Label className="font-medium">Birth Date (Optional)</Label>
                <Input
                  value={newCustomer.birthDate}
                  onChange={(e) => setNewCustomer({...newCustomer, birthDate: e.target.value})}
                  type="date"
                  className="h-10"
                />
              </div>
              <div>
                <Label className="font-medium">Notes</Label>
                <Textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                  placeholder="Additional notes about customer..."
                  className="h-20"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCustomerDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addNewCustomer} className="bg-purple-600 hover:bg-purple-700">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Keyboard Shortcuts Dialog */}
        <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">⌨️ Keyboard Shortcuts</DialogTitle>
              <DialogDescription>Speed up your customer management</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {keyboardShortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{shortcut.action}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {shortcut.key}
                  </Badge>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Status Bar */}
        <div className="bg-gray-900 text-white text-xs p-2 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <span className="text-purple-400 flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
              Customer System Active
            </span>
            <span>👥 Total: {stats.totalCustomers}</span>
            <span>✅ Active: {stats.activeCustomers}</span>
            <span>⭐ VIP: {stats.vipCustomers}</span>
          </div>
          <div className="flex items-center space-x-6">
            <span>💰 Revenue: {formatCurrency(stats.totalRevenue)}</span>
            <span className="font-mono bg-purple-900 px-2 py-1 rounded">
              ⏰ {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
