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
  LogOutIcon
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    "bg-white shadow-md dark:bg-gray-800 dark:border-r dark:border-gray-700 z-30 transition-all duration-300",
    open 
      ? "w-64 fixed md:relative inset-0" 
      : "hidden md:block w-0 md:w-20"
  );

  const navItems = [
    { href: "/", icon: <HomeIcon className="h-5 w-5" />, label: "Dashboard" },
    { href: "/pos", icon: <ShoppingBagIcon className="h-5 w-5" />, label: "POS / Sales" },
    { href: "/products", icon: <PackageIcon className="h-5 w-5" />, label: "Products" },
    { href: "/inventory", icon: <ClipboardCheckIcon className="h-5 w-5" />, label: "Inventory" },
    { href: "/purchases", icon: <GalleryHorizontalIcon className="h-5 w-5" />, label: "Purchases" },
    { href: "/reports", icon: <BarChart4Icon className="h-5 w-5" />, label: "Reports" },
    { href: "/users", icon: <UsersIcon className="h-5 w-5" />, label: "Users" },
    { href: "/settings", icon: <SettingsIcon className="h-5 w-5" />, label: "Settings" }
  ];

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
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h1 className={cn(
            "text-2xl font-bold text-primary",
            !open && "md:hidden"
          )}>
            POS System
          </h1>
          {!open && (
            <div className="hidden md:flex justify-center w-full">
              <PackageIcon className="h-8 w-8 text-primary" />
            </div>
          )}
          {open && (
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onClose}
              className="md:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>
        <div className="overflow-y-auto h-full scrollbar-hide">
          <nav className="mt-4">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => onClose()}
                className={cn(
                  "flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors",
                  location === item.href && "sidebar-active"
                )}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <span className={cn(
                  "ml-3",
                  !open && "md:hidden"
                )}>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 mt-auto">
          <div className="flex items-center">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser?.image || ""} alt="User avatar" />
              <AvatarFallback>{currentUser?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            {open && (
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser?.name || "User"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.role || "Cashier"}</p>
              </div>
            )}
            {open ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-auto text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
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
