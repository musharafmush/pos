import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldIcon, 
  UserIcon, 
  CrownIcon, 
  PlusIcon, 
  SettingsIcon,
  CheckCircleIcon,
  XCircleIcon,
  EditIcon
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const roleFormSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  permissions: z.array(z.string()).default([]),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

// Available permissions for the POS system
const AVAILABLE_PERMISSIONS = [
  { id: "dashboard.view", name: "View Dashboard", category: "Dashboard" },
  { id: "sales.create", name: "Create Sales", category: "Sales" },
  { id: "sales.view", name: "View Sales", category: "Sales" },
  { id: "sales.edit", name: "Edit Sales", category: "Sales" },
  { id: "sales.delete", name: "Delete Sales", category: "Sales" },
  { id: "products.create", name: "Create Products", category: "Products" },
  { id: "products.view", name: "View Products", category: "Products" },
  { id: "products.edit", name: "Edit Products", category: "Products" },
  { id: "products.delete", name: "Delete Products", category: "Products" },
  { id: "inventory.view", name: "View Inventory", category: "Inventory" },
  { id: "inventory.adjust", name: "Adjust Inventory", category: "Inventory" },
  { id: "purchases.create", name: "Create Purchases", category: "Purchases" },
  { id: "purchases.view", name: "View Purchases", category: "Purchases" },
  { id: "purchases.edit", name: "Edit Purchases", category: "Purchases" },
  { id: "customers.create", name: "Create Customers", category: "Customers" },
  { id: "customers.view", name: "View Customers", category: "Customers" },
  { id: "customers.edit", name: "Edit Customers", category: "Customers" },
  { id: "suppliers.create", name: "Create Suppliers", category: "Suppliers" },
  { id: "suppliers.view", name: "View Suppliers", category: "Suppliers" },
  { id: "suppliers.edit", name: "Edit Suppliers", category: "Suppliers" },
  { id: "reports.view", name: "View Reports", category: "Reports" },
  { id: "reports.export", name: "Export Reports", category: "Reports" },
  { id: "users.create", name: "Create Users", category: "User Management" },
  { id: "users.view", name: "View Users", category: "User Management" },
  { id: "users.edit", name: "Edit Users", category: "User Management" },
  { id: "users.delete", name: "Delete Users", category: "User Management" },
  { id: "settings.view", name: "View Settings", category: "Settings" },
  { id: "settings.edit", name: "Edit Settings", category: "Settings" },
];

// Default roles with their permissions
const DEFAULT_ROLES = [
  {
    id: "admin",
    name: "Administrator",
    description: "Full system access with all permissions",
    permissions: AVAILABLE_PERMISSIONS.map(p => p.id),
    isSystem: true,
    color: "bg-red-500"
  },
  {
    id: "manager",
    name: "Manager",
    description: "Can manage sales, inventory, and view reports",
    permissions: [
      "dashboard.view", "sales.create", "sales.view", "sales.edit",
      "products.create", "products.view", "products.edit",
      "inventory.view", "inventory.adjust",
      "purchases.create", "purchases.view", "purchases.edit",
      "customers.create", "customers.view", "customers.edit",
      "suppliers.create", "suppliers.view", "suppliers.edit",
      "reports.view", "reports.export"
    ],
    isSystem: true,
    color: "bg-blue-500"
  },
  {
    id: "cashier",
    name: "Cashier",
    description: "Basic POS operations for sales transactions",
    permissions: [
      "dashboard.view", "sales.create", "sales.view",
      "products.view", "inventory.view",
      "customers.view", "customers.create"
    ],
    isSystem: true,
    color: "bg-green-500"
  }
];

export default function Roles() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("roles");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: []
    }
  });

  // Get users data to show role assignments
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    }
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleFormValues) => {
      return await apiRequest("POST", "/api/roles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "✅ Role created",
        description: "Role has been successfully created",
      });
    },
    onError: (error: any) => {
      console.error("Error creating role:", error);
      toast({
        title: "Error",
        description: "Failed to create role. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: RoleFormValues) => {
    createRoleMutation.mutate(data);
  };

  const getRoleIcon = (roleId: string) => {
    switch (roleId) {
      case "admin":
        return <CrownIcon className="h-5 w-5 text-red-500" />;
      case "manager":
        return <ShieldIcon className="h-5 w-5 text-blue-500" />;
      case "cashier":
        return <UserIcon className="h-5 w-5 text-green-500" />;
      default:
        return <SettingsIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getUsersInRole = (roleId: string) => {
    if (!users) return [];
    return users.filter((user: any) => user.role === roleId);
  };

  const groupPermissionsByCategory = (permissions: string[]) => {
    const grouped: Record<string, string[]> = {};
    permissions.forEach(permId => {
      const perm = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
      if (perm) {
        if (!grouped[perm.category]) {
          grouped[perm.category] = [];
        }
        grouped[perm.category].push(perm.name);
      }
    });
    return grouped;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage user roles and permissions for your POS system
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Role
          </Button>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="assignments">Role Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_ROLES.map((role) => (
              <Card key={role.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(role.id)}
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {role.isSystem ? "System" : "Custom"}
                    </Badge>
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Permissions:</span>
                      <Badge variant="outline">{role.permissions.length}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Users:</span>
                      <Badge variant="outline">{getUsersInRole(role.id).length}</Badge>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Permission Categories:</h4>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(groupPermissionsByCategory(role.permissions)).map(category => (
                          <Badge key={category} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedRole(role)}
                      >
                        <EditIcon className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Role Assignments</CardTitle>
              <CardDescription>
                View how roles are currently assigned to users in your system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DEFAULT_ROLES.map((role) => {
                  const usersInRole = getUsersInRole(role.id);
                  return (
                    <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getRoleIcon(role.id)}
                        <div>
                          <h4 className="font-medium">{role.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {usersInRole.length} user{usersInRole.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {usersInRole.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {usersInRole.map((user: any) => (
                              <Badge key={user.id} variant="outline" className="text-xs">
                                {user.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No users assigned</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Role Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role with specific permissions for your POS system
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter role name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter role description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permissions</FormLabel>
                      <div className="space-y-3 max-h-64 overflow-y-auto border rounded-md p-3">
                        {Object.entries(
                          AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
                            if (!acc[perm.category]) acc[perm.category] = [];
                            acc[perm.category].push(perm);
                            return acc;
                          }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>)
                        ).map(([category, perms]) => (
                          <div key={category} className="space-y-2">
                            <h4 className="font-medium text-sm">{category}</h4>
                            <div className="space-y-1 ml-4">
                              {perms.map((perm) => (
                                <div key={perm.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={perm.id}
                                    checked={field.value.includes(perm.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        field.onChange([...field.value, perm.id]);
                                      } else {
                                        field.onChange(field.value.filter(id => id !== perm.id));
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <label htmlFor={perm.id} className="text-sm">
                                    {perm.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRoleMutation.isPending}
                >
                  {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Role Details Dialog */}
      <Dialog open={!!selectedRole} onOpenChange={() => setSelectedRole(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRole && getRoleIcon(selectedRole.id)}
              {selectedRole?.name} Role Details
            </DialogTitle>
            <DialogDescription>{selectedRole?.description}</DialogDescription>
          </DialogHeader>
          
          {selectedRole && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Total Permissions</Label>
                  <p className="text-2xl font-bold">{selectedRole.permissions.length}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Users with this role</Label>
                  <p className="text-2xl font-bold">{getUsersInRole(selectedRole.id).length}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Permissions by Category</Label>
                <div className="space-y-2">
                  {Object.entries(groupPermissionsByCategory(selectedRole.permissions)).map(([category, perms]) => (
                    <div key={category} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2">{category}</h4>
                      <div className="flex flex-wrap gap-1">
                        {perms.map((perm) => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Users with this role</Label>
                <div className="space-y-2">
                  {getUsersInRole(selectedRole.id).map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{user.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{user.username}</Badge>
                        <Badge variant={user.active ? "default" : "secondary"} className="text-xs">
                          {user.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {getUsersInRole(selectedRole.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">No users currently have this role.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}