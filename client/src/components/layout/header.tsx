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
    <header className="bg-blue-700 shadow-sm z-10 text-white">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="text-white hover:bg-blue-600"
          >
            <MenuIcon className="h-6 w-6" />
          </Button>
          
          <div className="hidden md:flex items-center ml-4">
            <div className="text-sm text-white/80">
              {format(currentDate, "MM/dd/yyyy")}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link href="/pos">
            <Button variant="outline" size="sm" className="hidden sm:flex text-white border-white hover:bg-blue-600">
              <ShoppingCartIcon className="h-4 w-4 mr-2" />
              POS
            </Button>
          </Link>
          
          <Button variant="outline" size="sm" className="hidden sm:flex text-white border-white hover:bg-blue-600">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add
          </Button>
          
          <Button variant="outline" size="sm" className="hidden sm:flex text-white border-white hover:bg-blue-600">
            <CalculatorIcon className="h-4 w-4 mr-2" />
            Calculator
          </Button>
          
          <div className="flex items-center space-x-2 ml-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center border-white text-white hover:bg-blue-600"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Filter by date
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="p-1 rounded-full text-white hover:bg-blue-600"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" />
          </Button>
          
          <ThemeToggle />
          
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center text-white hover:bg-blue-600">
                  <span className="hidden md:inline mr-2 font-medium">Admin</span>
                  <Avatar className="h-8 w-8 border-2 border-white">
                    <AvatarImage src={currentUser?.image || ""} alt="User avatar" />
                    <AvatarFallback className="bg-blue-500">{currentUser?.name?.charAt(0) || "A"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
