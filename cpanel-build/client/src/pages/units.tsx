import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Calculator,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ScaleIcon,
  PackageIcon,
  RulerIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const unitFormSchema = z.object({
  name: z.string().min(1, "Unit name is required"),
  abbreviation: z.string().min(1, "Abbreviation is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  baseUnit: z.string().optional(),
  conversionFactor: z.number().min(0, "Conversion factor must be positive").optional(),
});

type UnitFormValues = z.infer<typeof unitFormSchema>;

interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  description?: string;
  category: string;
  baseUnit?: string;
  conversionFactor?: number;
  active: boolean;
  createdAt: string;
}

export default function Units() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Sample units data (in a real app, this would come from an API)
  const unitsData: Unit[] = [
    {
      id: 1,
      name: "Kilogram",
      abbreviation: "kg",
      description: "Standard unit of mass",
      category: "Weight",
      active: true,
      createdAt: "2025-05-24T00:00:00Z"
    },
    {
      id: 2,
      name: "Gram",
      abbreviation: "g",
      description: "Smaller unit of mass",
      category: "Weight",
      baseUnit: "kg",
      conversionFactor: 0.001,
      active: true,
      createdAt: "2025-05-24T00:00:00Z"
    },
    {
      id: 3,
      name: "Pieces",
      abbreviation: "pcs",
      description: "Individual items or units",
      category: "Quantity",
      active: true,
      createdAt: "2025-05-24T00:00:00Z"
    },
    {
      id: 4,
      name: "Liter",
      abbreviation: "L",
      description: "Unit of volume",
      category: "Volume",
      active: true,
      createdAt: "2025-05-24T00:00:00Z"
    },
    {
      id: 5,
      name: "Milliliter",
      abbreviation: "ml",
      description: "Smaller unit of volume",
      category: "Volume",
      baseUnit: "L",
      conversionFactor: 0.001,
      active: true,
      createdAt: "2025-05-24T00:00:00Z"
    },
    {
      id: 6,
      name: "Meter",
      abbreviation: "m",
      description: "Unit of length",
      category: "Length",
      active: true,
      createdAt: "2025-05-24T00:00:00Z"
    },
    {
      id: 7,
      name: "Centimeter",
      abbreviation: "cm",
      description: "Smaller unit of length",
      category: "Length",
      baseUnit: "m",
      conversionFactor: 0.01,
      active: true,
      createdAt: "2025-05-24T00:00:00Z"
    },
    {
      id: 8,
      name: "Dozen",
      abbreviation: "doz",
      description: "Set of 12 items",
      category: "Quantity",
      baseUnit: "pcs",
      conversionFactor: 12,
      active: true,
      createdAt: "2025-05-24T00:00:00Z"
    }
  ];

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      description: "",
      category: "",
      baseUnit: "",
      conversionFactor: 1,
    },
  });

  const addUnitMutation = useMutation({
    mutationFn: async (data: UnitFormValues) => {
      // In a real app, this would make an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id: Date.now(), ...data, active: true, createdAt: new Date().toISOString() };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit added successfully",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async (data: UnitFormValues) => {
      // In a real app, this would make an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { ...editingUnit, ...data };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit updated successfully",
      });
      setEditingUnit(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: number) => {
      // In a real app, this would make an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return unitId;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Unit deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UnitFormValues) => {
    if (editingUnit) {
      updateUnitMutation.mutate(data);
    } else {
      addUnitMutation.mutate(data);
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    form.reset({
      name: unit.name,
      abbreviation: unit.abbreviation,
      description: unit.description || "",
      category: unit.category,
      baseUnit: unit.baseUnit || "",
      conversionFactor: unit.conversionFactor || 1,
    });
  };

  const handleDelete = (unitId: number) => {
    deleteUnitMutation.mutate(unitId);
  };

  const groupedUnits = unitsData.reduce((acc, unit) => {
    if (!acc[unit.category]) {
      acc[unit.category] = [];
    }
    acc[unit.category].push(unit);
    return acc;
  }, {} as Record<string, Unit[]>);

  const categoryIcons = {
    Weight: <ScaleIcon className="h-5 w-5" />,
    Volume: <PackageIcon className="h-5 w-5" />,
    Length: <RulerIcon className="h-5 w-5" />,
    Quantity: <Calculator className="h-5 w-5" />,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Units Management</h1>
            <p className="text-gray-500">Manage units of measurement for your products</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
                <DialogDescription>
                  Create a new unit of measurement for your products.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Kilogram" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="abbreviation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Abbreviation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., kg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Weight, Volume, Length" {...field} />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Optional description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="baseUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Unit (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., kg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="conversionFactor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conversion Factor</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.001"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addUnitMutation.isPending}>
                      {addUnitMutation.isPending ? "Adding..." : "Add Unit"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Units</p>
                  <p className="text-2xl font-bold">{unitsData.length}</p>
                </div>
                <Calculator className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Categories</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Object.keys(groupedUnits).length}
                  </p>
                </div>
                <PackageIcon className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Units</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {unitsData.filter(u => u.active).length}
                  </p>
                </div>
                <ScaleIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Base Units</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {unitsData.filter(u => !u.baseUnit).length}
                  </p>
                </div>
                <RulerIcon className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Units by Category */}
        <div className="space-y-6">
          {Object.entries(groupedUnits).map(([category, units]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {categoryIcons[category as keyof typeof categoryIcons] || <Calculator className="h-5 w-5" />}
                  {category} Units ({units.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Abbreviation</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Base Unit</TableHead>
                      <TableHead>Conversion</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.name}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {unit.abbreviation}
                          </code>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {unit.description || "—"}
                        </TableCell>
                        <TableCell>
                          {unit.baseUnit ? (
                            <code className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {unit.baseUnit}
                            </code>
                          ) : (
                            <Badge variant="outline">Base Unit</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {unit.conversionFactor && unit.baseUnit ? (
                            <span className="text-sm">
                              1 {unit.abbreviation} = {unit.conversionFactor} {unit.baseUnit}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={unit.active ? "default" : "secondary"}>
                            {unit.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog open={editingUnit?.id === unit.id} onOpenChange={(open) => !open && setEditingUnit(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(unit)}>
                                  <EditIcon className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Unit</DialogTitle>
                                  <DialogDescription>
                                    Update the unit information.
                                  </DialogDescription>
                                </DialogHeader>
                                <Form {...form}>
                                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Unit Name</FormLabel>
                                            <FormControl>
                                              <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name="abbreviation"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Abbreviation</FormLabel>
                                            <FormControl>
                                              <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                    
                                    <FormField
                                      control={form.control}
                                      name="category"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Category</FormLabel>
                                          <FormControl>
                                            <Input {...field} />
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
                                          <FormLabel>Description</FormLabel>
                                          <FormControl>
                                            <Textarea {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                      <FormField
                                        control={form.control}
                                        name="baseUnit"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Base Unit</FormLabel>
                                            <FormControl>
                                              <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name="conversionFactor"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Conversion Factor</FormLabel>
                                            <FormControl>
                                              <Input 
                                                type="number" 
                                                step="0.001"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    <DialogFooter>
                                      <Button type="button" variant="outline" onClick={() => setEditingUnit(null)}>
                                        Cancel
                                      </Button>
                                      <Button type="submit" disabled={updateUnitMutation.isPending}>
                                        {updateUnitMutation.isPending ? "Updating..." : "Update Unit"}
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{unit.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(unit.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}