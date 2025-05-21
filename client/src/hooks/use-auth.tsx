import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: User }, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ user: User }, Error, RegisterData>;
};

type LoginData = {
  usernameOrEmail: string;
  password: string;
};

type RegisterData = {
  username?: string;
  password: string;
  name: string;
  email: string;
  role?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data,
    error,
    isLoading,
  } = useQuery<{ user: User } | null, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const res = await apiRequest("POST", "/api/auth/login", credentials);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Login failed. Please check your credentials.");
        }
        return await res.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Login failed. Please try again.");
      }
    },
    onSuccess: (data: { user: User }) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      toast({
        title: "Welcome back!",
        description: `You are now logged in as ${data.user.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      try {
        const res = await apiRequest("POST", "/api/auth/register", userData);
        if (!res.ok) {
          const errorData = await res.json();
          // Check if we have detailed validation errors
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const errorMessages = errorData.errors.map((err: any) => 
              `${err.field}: ${err.message}`
            ).join(', ');
            throw new Error(errorMessages);
          }
          throw new Error(errorData.message || "Registration failed. Please try again.");
        }
        return await res.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Registration failed. Please try again.");
      }
    },
    onSuccess: (data: { user: User }) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      toast({
        title: "Account created",
        description: `Welcome, ${data.user.name}! Your account has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await apiRequest("POST", "/api/auth/logout");
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Logout failed. Please try again.");
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Logout failed. Please try again.");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      // Redirect to login page (handled by protected routes)
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: data?.user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
