import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "../theme-toggle";
import { useQuery } from "@tanstack/react-query";
import {
  BellIcon,
  MenuIcon,
  ChevronDownIcon,
  SearchIcon
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

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    <header className="bg-white shadow-sm z-10 dark:bg-gray-800 dark:border-b dark:border-gray-700">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="text-gray-500 dark:text-gray-400"
          >
            <MenuIcon className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex-1 flex justify-center px-2 md:ml-6 md:justify-end">
          <div className="max-w-lg w-full relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="search"
              placeholder="Search for products, sales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-700"
            />
          </div>
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-2 p-1 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" />
          </Button>
          <div className="ml-3 relative hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center max-w-xs text-sm focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser?.image || ""} alt="User avatar" />
                    <AvatarFallback>{currentUser?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{currentUser?.name || "Anonymous"}</span>
                  <ChevronDownIcon className="ml-1 h-5 w-5 text-gray-400" />
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
