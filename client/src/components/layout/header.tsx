import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "../theme-toggle";
import { useQuery } from "@tanstack/react-query";
import {
  BellIcon,
  MenuIcon,
  ChevronDownIcon,
  SearchIcon,
  CalendarIcon,
  ShoppingCartIcon,
  PlusIcon,
  CalculatorIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentDate = new Date();

  const { data } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include"
        });
        if (!response.ok) {
          if (response.status === 401) {
            return { user: null };
          }
          throw new Error("Failed to fetch user");
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return { user: null };
      }
    }
  });

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

  const currentUser = data?.user;

  return (
    <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 shadow-lg z-10 text-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left Section - Logo and Menu */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="text-white hover:bg-blue-600/50 lg:hidden"
          >
            <MenuIcon className="h-6 w-6" />
          </Button>
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-blue-700 font-bold text-sm">AS</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Awesome Shop</h1>
            </div>
          </div>
          
          {/* Date */}
          <div className="hidden lg:flex items-center text-sm text-white/80 ml-4">
            📅 {format(currentDate, "dd/MM/yyyy")}
          </div>
        </div>
        
        {/* Center Section - Search Boxes */}
        <div className="hidden md:flex items-center space-x-3 flex-1 max-w-2xl mx-8">
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white text-gray-900 border-0 h-9 text-sm placeholder:text-gray-500"
          />
          <Input
            type="text"
            placeholder="Customer search..."
            className="bg-white text-gray-900 border-0 h-9 text-sm placeholder:text-gray-500"
          />
          <Input
            type="text"
            placeholder="Invoice number..."
            className="bg-white text-gray-900 border-0 h-9 text-sm placeholder:text-gray-500"
          />
          <Input
            type="text"
            placeholder="Quick scan..."
            className="bg-white text-gray-900 border-0 h-9 text-sm placeholder:text-gray-500"
          />
        </div>
        
        {/* Right Section - Actions and User */}
        <div className="flex items-center space-x-2">
          {/* Quick Actions */}
          <Link href="/pos-enhanced">
            <Button variant="outline" size="sm" className="hidden lg:flex text-white border-white/30 hover:bg-white/10 backdrop-blur-sm">
              <ShoppingCartIcon className="h-4 w-4 mr-2" />
              POS
            </Button>
          </Link>
          
          <Button variant="outline" size="sm" className="hidden lg:flex text-white border-white/30 hover:bg-white/10 backdrop-blur-sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add
          </Button>
          
          <Button variant="outline" size="sm" className="hidden lg:flex text-white border-white/30 hover:bg-white/10 backdrop-blur-sm">
            <CalculatorIcon className="h-4 w-4 mr-2" />
            Calculator
          </Button>
          
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 relative"
          >
            <BellIcon className="h-5 w-5" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          </Button>
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* User Menu */}
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center text-white hover:bg-white/10 space-x-2 pl-2 pr-3">
                  <Avatar className="h-8 w-8 border-2 border-white/30">
                    <AvatarImage src={currentUser?.image || ""} alt="User avatar" />
                    <AvatarFallback className="bg-blue-500 text-white text-sm">
                      {currentUser?.name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline font-medium text-sm">Admin</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <span className="font-medium">{currentUser?.name || "Administrator"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>Business Settings</DropdownMenuItem>
                <DropdownMenuItem>Help & Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
