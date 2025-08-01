import { Link, useLocation } from "wouter";
import { ThemeToggle } from "../theme-toggle";
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  PackageIcon, 
  ClipboardCheckIcon, 
  GalleryHorizontalIcon, 
  BarChart4Icon, 
  UsersIcon,
  SettingsIcon,
  Printer,
  LogOutIcon,
  UserIcon,
  ArrowRightLeft,
  ArrowDownIcon,
  PlusIcon,
  Loader2,
  Calculator,
  Scale
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logout successful",
        description: "You have been logged out successfully."
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred while logging out.",
        variant: "destructive"
      });
    }
  };

  const currentUser = queryClient.getQueryData<{ user: any }>(["/api/auth/user"])?.user;

  const sidebarClass = cn(
    "bg-blue-700 shadow-md z-30 transition-all duration-300 text-white",
    open 
      ? "w-64 fixed md:relative inset-0" 
      : "hidden md:block w-0 md:w-20"
  );

  const navGroups = [
    {
      id: "home",
      items: [{ href: "/", icon: <HomeIcon className="h-5 w-5" />, label: "Home" }]
    },
    {
      id: "users",
      label: "User Management",
      icon: <UserIcon className="h-5 w-5" />,
      items: [
        { href: "/users", icon: <UsersIcon className="h-5 w-5" />, label: "Users" },
        { href: "/roles", icon: <ArrowRightLeft className="h-5 w-5" />, label: "Roles" }
      ]
    },
    {
      id: "contacts",
      label: "Contacts",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>,
      items: [
        { href: "/suppliers", icon: <GalleryHorizontalIcon className="h-5 w-5" />, label: "Suppliers" },
        { href: "/customers", icon: <UsersIcon className="h-5 w-5" />, label: "Customers" }
      ]
    },
    {
      id: "products",
      label: "Products",
      icon: <PackageIcon className="h-5 w-5" />,
      items: [
        { href: "/add-item-dashboard", icon: <BarChart4Icon className="h-5 w-5" />, label: "Add Item Dashboard" },
        { href: "/add-item-professional", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>, label: "Add Item Professional" },
        { href: "/update-price-professional", icon: <Calculator className="h-5 w-5" />, label: "Update Price" },
        { href: "/print-labels-enhanced", icon: <Printer className="h-5 w-5" />, label: "Print Labels Enhanced" },
        { href: "/product-history", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>, label: "Product History" },
        { href: "/units", icon: <Calculator className="h-5 w-5" />, label: "Units" },
        { href: "/categories", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>, label: "Categories" },
        { href: "/brands", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>, label: "Brands" }
      ]
    },
    {
      id: "repacking",
      label: "Repacking",
      icon: <Calculator className="h-5 w-5" />,
      items: [
        { href: "/repacking-dashboard-professional", icon: <BarChart4Icon className="h-5 w-5" />, label: "Professional Dashboard" },
        { href: "/repacking-professional", icon: <Calculator className="h-5 w-5" />, label: "Professional Repacking" }
      ]
    },
    {
      id: "purchases",
      label: "Purchases",
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5"/></svg>,
      items: [
        { href: "/purchase-dashboard", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>, label: "Purchase Dashboard" },
        { href: "/purchase-entry-professional", icon: <PlusIcon className="h-5 w-5" />, label: "Professional Purchase Entry" }
      ]
    },
    {
      id: "sales",
      label: "Sales",
      icon: <ShoppingBagIcon className="h-5 w-5" />,
      items: [
        { href: "/sales-dashboard", icon: <BarChart4Icon className="h-5 w-5" />, label: "Sales Dashboard" },
        { href: "/pos-enhanced", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>, label: "Enhanced Desktop POS" },
        { href: "/sales/return", icon: <ArrowRightLeft className="h-5 w-5" />, label: "Sale Returns" },
        { href: "/sale-returns-dashboard", icon: <BarChart4Icon className="h-5 w-5" />, label: "Sale Returns Dashboard" }
      ]
    },
    {
      id: "manufacturing",
      label: "Manufacturing",
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20"/><path d="M7 16v4"/><path d="M12 12v8"/><path d="M17 8v12"/><path d="M7 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/><path d="M12 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/><path d="M17 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>,
      items: [
        { href: "/manufacturing-dashboard", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8h10M7 12h4m1 8l-4-4H2l3-3h14l3 3v4z"/></svg>, label: "Manufacturing Dashboard" },
        { href: "/raw-materials-management", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>, label: "Raw Materials Management" },
        { href: "/create-product-formula", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13l-3.5 3.5-2-2L8 17"/></svg>, label: "Create Product Formula" }
      ]
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: <PackageIcon className="h-5 w-5" />,
      items: [
        { href: "/inventory", icon: <ArrowRightLeft className="h-5 w-5" />, label: "Stock Transfers" },
        { href: "/inventory-forecasting", icon: <BarChart4Icon className="h-5 w-5" />, label: "Inventory Forecasting" },
        { href: "/inventory-adjustments", icon: <ClipboardCheckIcon className="h-5 w-5" />, label: "Stock Adjustment" },
        { href: "/weight-based-items", icon: <Scale className="h-5 w-5" />, label: "Weight-Based Items" }
      ]
    },
    {
      id: "reports",
      label: "Reports",
      icon: <BarChart4Icon className="h-5 w-5" />,
      items: [
        { href: "/reports", icon: <BarChart4Icon className="h-5 w-5" />, label: "Reports" },
        { href: "/sales-reports", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>, label: "Sales Reports" },
        { href: "/purchase-reports", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5"/></svg>, label: "Purchase Reports" },
        { href: "/stock-reports", icon: <PackageIcon className="h-5 w-5" />, label: "Stock Reports" },
        { href: "/customer-reports", icon: <UsersIcon className="h-5 w-5" />, label: "Customer Reports" },
        { href: "/supplier-reports", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: "Supplier Reports" },
        { href: "/tax-reports", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13l-3.5 3.5-2-2L8 17"/></svg>, label: "Tax Reports" }
      ]
    },
    {
      id: "offers",
      label: "Offers & Promotions",
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
      items: [
        { href: "/offer-management", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, label: "Manage Offers" },
        { href: "/loyalty-management", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: "Customer Loyalty" },
        { href: "/loyalty-rules", icon: <SettingsIcon className="h-5 w-5" />, label: "Loyalty Rules" },
        { href: "/offer-reports", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>, label: "Offer Reports" }
      ]
    },
    {
      id: "accounts",
      label: "Accounts",
      icon: <Calculator className="h-5 w-5" />,
      items: [
        { href: "/accounts-dashboard", icon: <Calculator className="h-5 w-5" />, label: "Accounts Dashboard" },
        { href: "/cash-register-management", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>, label: "Cash Register Management" },
        { href: "/payroll-dashboard", icon: <UsersIcon className="h-5 w-5" />, label: "Payroll Management" }
      ]
    },
    {
      id: "expenses",
      label: "Expense Management",
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"/><path d="M3 10h18"/><path d="M16 19l2 2 4-4"/></svg>,
      items: [
        { href: "/expense-management", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"/><path d="M3 10h18"/><path d="M16 19l2 2 4-4"/></svg>, label: "Expenses" },
        { href: "/expense-categories", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h4"/></svg>, label: "Expense Categories" }
      ]
    },
    {
      id: "settings",
      label: "Settings",
      icon: <SettingsIcon className="h-5 w-5" />,
      items: [
        { href: "/settings", icon: <SettingsIcon className="h-5 w-5" />, label: "General Settings" },
        { href: "/settings/currency", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 0 0 1 0 7H6"/></svg>, label: "Currency Settings" }
      ]
    },
    // Adding Profit Management here as a new navigation group
    {
      id: "profit",
      items: [{ href: "/profit-management", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 0 0 1 0 7H6"/></svg>, label: "Profit Management" }]
    }
  ];

  const toggleAccordion = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  return (
    <div className={sidebarClass}>
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
          onClick={onClose}
        />
      )}
      <div className={cn(
        "flex flex-col h-full z-30 relative",
        open ? "w-64" : "w-20"
      )}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            {!open ? (
              <div className="hidden md:flex justify-center">
                <Calculator className="h-8 w-8 text-white" />
              </div>
            ) : (
              <>
                <div className="rounded-full w-8 h-8 bg-green-400 flex items-center justify-center mr-2">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">
                  Awesome Shop
                </h1>
              </>
            )}
          </div>
          {open && (
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onClose}
              className="md:hidden text-white hover:bg-blue-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>

        <div className="overflow-y-auto h-full">
          <nav className="mt-2 space-y-1">
            {navGroups.map((group) => {
              if (group.items.length === 1) {
                // For groups with single items, render a simple link
                const item = group.items[0];
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => onClose()}
                    className={cn(
                      "flex items-center px-4 py-3 hover:bg-blue-600 transition-colors",
                      location === item.href && "bg-blue-800"
                    )}
                  >
                    <div className="flex-shrink-0 text-white">{item.icon}</div>
                    <span className={cn(
                      "ml-3 text-white",
                      !open && "md:hidden"
                    )}>{item.label}</span>
                  </Link>
                );
              } else if (group.items.length > 1 && group.label) {
                // For groups with multiple items, render an accordion
                const isExpanded = expandedItems.includes(group.id);
                return (
                  <div key={group.id}>
                    <button
                      onClick={() => toggleAccordion(group.id)}
                      className={cn(
                        "w-full flex items-center px-4 py-3 hover:bg-blue-600 transition-colors",
                        isExpanded && "bg-blue-800"
                      )}
                    >
                      <div className="flex-shrink-0 text-white">{group.icon}</div>
                      {open && (
                        <>
                          <span className="ml-3 text-white">{group.label}</span>
                          <svg
                            className={`ml-auto h-5 w-5 text-white transform ${isExpanded ? 'rotate-90' : ''}`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>

                    {isExpanded && open && (
                      <div className="bg-blue-800">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => onClose()}
                            className={cn(
                              "flex items-center pl-10 pr-4 py-2 hover:bg-blue-600 transition-colors",
                              location === item.href && "bg-blue-700"
                            )}
                          >
                            <div className="flex-shrink-0 text-white">{item.icon}</div>
                            <span className="ml-3 text-white">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </nav>
        </div>

        <div className="p-4 mt-auto border-t border-blue-600">
          <div className="flex items-center">
            <Avatar className="w-8 h-8 border-2 border-white">
              <AvatarImage src={currentUser?.image || ""} alt="User avatar" />
              <AvatarFallback className="bg-blue-500 text-white">{currentUser?.name?.charAt(0) || "A"}</AvatarFallback>
            </Avatar>
            {open && (
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{currentUser?.name || "Admin"}</p>
                <p className="text-xs text-blue-200">{currentUser?.role || "Admin"}</p>
              </div>
            )}
            {open ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-auto text-white hover:bg-blue-600"
                onClick={handleLogout}
              >
                <LogOutIcon className="h-5 w-5" />
              </Button>
            ) : (
              <div className="ml-auto hidden md:flex">
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}