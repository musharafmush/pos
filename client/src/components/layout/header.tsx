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
    <header className="bg-blue-700 shadow-sm z-10 text-white border-b border-blue-600">
      <div className="flex items-center justify-between px-4 py-3 max-w-full">
        {/* Left Section */}
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="text-white hover:bg-blue-600 shrink-0"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          
          <div className="hidden lg:flex items-center">
            <div className="text-sm text-white/80 font-medium">
              {format(currentDate, "MM/dd/yyyy")}
            </div>
          </div>
        </div>
        
        {/* Center Section - Action Buttons */}
        <div className="flex items-center space-x-2 overflow-hidden">
          <Link href="/pos">
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden md:flex text-white border-white/50 hover:bg-blue-600 hover:border-white transition-colors"
            >
              <ShoppingCartIcon className="h-4 w-4 mr-1" />
              <span className="hidden lg:inline">POS</span>
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="hidden md:flex text-white border-white/50 hover:bg-blue-600 hover:border-white transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            <span className="hidden lg:inline">Add</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-white border-white/50 hover:bg-blue-600 hover:border-white transition-colors"
          >
            <CalculatorIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Calculator</span>
          </Button>
        </div>
        
        {/* Right Section - User Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="hidden xl:flex items-center border-white/50 text-white hover:bg-blue-600 hover:border-white transition-colors"
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            <span className="text-xs">Filter</span>
            <ChevronDownIcon className="h-3 w-3 ml-1" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-blue-600 transition-colors"
          >
            <BellIcon className="h-5 w-5" />
          </Button>
          
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center text-white hover:bg-blue-600 transition-colors">
                <span className="hidden md:inline mr-2 font-medium text-sm">
                  {currentUser?.name || "Admin"}
                </span>
                <Avatar className="h-7 w-7 border-2 border-white/50">
                  <AvatarImage src={currentUser?.image || ""} alt="User avatar" />
                  <AvatarFallback className="bg-blue-500 text-white text-sm">
                    {currentUser?.name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
