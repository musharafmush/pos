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
  LogOutIcon,
  UserIcon,
  ArrowRightLeft,
  Loader2,
  Calculator
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
      id: "products",
      items: [{ href: "/products", icon: <PackageIcon className="h-5 w-5" />, label: "Products" }]
    },
    {
      id: "purchases",
      items: [{ href: "/purchases", icon: <GalleryHorizontalIcon className="h-5 w-5" />, label: "Purchases" }]
    },
    {
      id: "sales",
      items: [{ href: "/pos", icon: <ShoppingBagIcon className="h-5 w-5" />, label: "Sell" }]
    },
    {
      id: "stockTransfers",
      items: [{ href: "/inventory", icon: <ArrowRightLeft className="h-5 w-5" />, label: "Stock Transfers" }]
    },
    {
      id: "stockAdjustment",
      items: [{ href: "/adjustments", icon: <ClipboardCheckIcon className="h-5 w-5" />, label: "Stock Adjustment" }]
    },
    {
      id: "reports",
      items: [{ href: "/reports", icon: <BarChart4Icon className="h-5 w-5" />, label: "Reports" }]
    },
    {
      id: "settings",
      items: [{ href: "/settings", icon: <SettingsIcon className="h-5 w-5" />, label: "Settings" }]
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
