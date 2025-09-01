import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  FileText, 
  Calculator,
  Tag,
  Percent,
  Info,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface HSNCode {
  id: number;
  hsnCode: string;
  description: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  cessRate: string;
  taxCategoryId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaxCategory {
  id: number;
  name: string;
  rate: string;
  hsnCodeRange?: string;
  description?: string;
  isActive: boolean;
}

interface HSNManagementProps {
  mode?: 'settings' | 'selector';
  onHSNSelect?: (hsn: HSNCode) => void;
  selectedHSN?: string;
}

export function HSNManagement({ mode = 'settings', onHSNSelect, selectedHSN }: HSNManagementProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAddingHSN, setIsAddingHSN] = useState(false);
  const [editingHSN, setEditingHSN] = useState<HSNCode | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Form states for new HSN
  const [newHSN, setNewHSN] = useState({
    hsnCode: "",
    description: "",
    cgstRate: "9",
    sgstRate: "9", 
    igstRate: "18",
    cessRate: "0",
    taxCategoryId: ""
  });

  // Form states for new Tax Category
  const [newCategory, setNewCategory] = useState({
    name: "",
    rate: "18",
    hsnCodeRange: "",
    description: ""
  });

  // Fetch HSN codes
  const { data: hsnCodes = [], refetch: refetchHSN } = useQuery<HSNCode[]>({
    queryKey: ['/api/tax/hsn-codes']
  });

  // Fetch tax categories
  const { data: taxCategories = [], refetch: refetchCategories } = useQuery<TaxCategory[]>({
    queryKey: ['/api/tax/categories']
  });

  // Create HSN code mutation
  const createHSNMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/tax/hsn-codes', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "HSN Code Added",
        description: "New HSN code has been successfully created"
      });
      refetchHSN();
      setIsAddingHSN(false);
      setNewHSN({
        hsnCode: "",
        description: "",
        cgstRate: "9",
        sgstRate: "9",
        igstRate: "18", 
        cessRate: "0",
        taxCategoryId: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create HSN code",
        variant: "destructive"
      });
    }
  });

  // Update HSN code mutation
  const updateHSNMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest('PUT', `/api/tax/hsn-codes/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "HSN Code Updated",
        description: "HSN code has been successfully updated"
      });
      refetchHSN();
      setEditingHSN(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update HSN code",
        variant: "destructive"
      });
    }
  });

  // Delete HSN code mutation
  const deleteHSNMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/tax/hsn-codes/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "HSN Code Deleted",
        description: "HSN code has been successfully deleted"
      });
      refetchHSN();
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to delete HSN code",
        variant: "destructive"
      });
    }
  });

  // Create tax category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/tax/categories', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tax Category Added",
        description: "New tax category has been successfully created"
      });
      refetchCategories();
      setIsAddingCategory(false);
      setNewCategory({
        name: "",
        rate: "18",
        hsnCodeRange: "",
        description: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tax category",
        variant: "destructive"
      });
    }
  });

  // Filter HSN codes based on search and category
  const filteredHSNCodes = hsnCodes.filter((hsn: HSNCode) => {
    const matchesSearch = !searchQuery || 
      hsn.hsnCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hsn.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || selectedCategory === "all" || 
      (selectedCategory === "none" && !hsn.taxCategoryId) ||
      hsn.taxCategoryId?.toString() === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleCreateHSN = () => {
    if (!newHSN.hsnCode || !newHSN.description) {
      toast({
        title: "Validation Error",
        description: "HSN code and description are required",
        variant: "destructive"
      });
      return;
    }

    createHSNMutation.mutate({
      hsnCode: newHSN.hsnCode,
      description: newHSN.description,
      cgstRate: newHSN.cgstRate,
      sgstRate: newHSN.sgstRate,
      igstRate: newHSN.igstRate,
      cessRate: newHSN.cessRate,
      taxCategoryId: newHSN.taxCategoryId ? parseInt(newHSN.taxCategoryId) : null,
      isActive: true
    });
  };

  const handleUpdateHSN = () => {
    if (!editingHSN) return;

    updateHSNMutation.mutate({
      id: editingHSN.id,
      data: {
        hsnCode: editingHSN.hsnCode,
        description: editingHSN.description,
        cgstRate: editingHSN.cgstRate,
        sgstRate: editingHSN.sgstRate,
        igstRate: editingHSN.igstRate,
        cessRate: editingHSN.cessRate,
        taxCategoryId: editingHSN.taxCategoryId || null,
        isActive: editingHSN.isActive
      }
    });
  };

  const handleCreateCategory = () => {
    if (!newCategory.name || !newCategory.rate) {
      toast({
        title: "Validation Error",
        description: "Category name and rate are required",
        variant: "destructive"
      });
      return;
    }

    createCategoryMutation.mutate({
      name: newCategory.name,
      rate: newCategory.rate,
      hsnCodeRange: newCategory.hsnCodeRange,
      description: newCategory.description,
      isActive: true
    });
  };

  if (mode === 'selector') {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search HSN codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {taxCategories.map((category: TaxCategory) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name} ({category.rate}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 max-h-96 overflow-y-auto">
          {filteredHSNCodes.map((hsn: HSNCode) => (
            <Card 
              key={hsn.id} 
              className={`cursor-pointer transition-colors hover:bg-accent ${selectedHSN === hsn.hsnCode ? 'ring-2 ring-primary' : ''}`}
              onClick={() => onHSNSelect?.(hsn)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{hsn.hsnCode}</Badge>
                      <Badge variant={hsn.isActive ? "default" : "secondary"}>
                        {hsn.igstRate}% GST
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{hsn.description}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>CGST: {hsn.cgstRate}%</span>
                      <span>SGST: {hsn.sgstRate}%</span>
                      {hsn.cessRate !== "0" && <span>CESS: {hsn.cessRate}%</span>}
                    </div>
                  </div>
                  {selectedHSN === hsn.hsnCode && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="hsn-codes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hsn-codes">HSN Codes</TabsTrigger>
          <TabsTrigger value="tax-categories">Tax Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="hsn-codes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>HSN Codes Management</CardTitle>
                  <CardDescription>
                    Manage HSN codes and their GST rates for products
                  </CardDescription>
                </div>
                <Dialog open={isAddingHSN} onOpenChange={setIsAddingHSN}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add HSN Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New HSN Code</DialogTitle>
                      <DialogDescription>
                        Create a new HSN code with GST rates
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="hsnCode">HSN Code *</Label>
                          <Input
                            id="hsnCode"
                            placeholder="e.g., 1001"
                            value={newHSN.hsnCode}
                            onChange={(e) => setNewHSN(prev => ({ ...prev, hsnCode: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taxCategory">Tax Category</Label>
                          <Select 
                            value={newHSN.taxCategoryId} 
                            onValueChange={(value) => setNewHSN(prev => ({ ...prev, taxCategoryId: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                              {taxCategories.map((category: TaxCategory) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name} ({category.rate}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                          id="description"
                          placeholder="Enter description for this HSN code"
                          value={newHSN.description}
                          onChange={(e) => setNewHSN(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="cgst">CGST Rate (%)</Label>
                          <Input
                            id="cgst"
                            type="number"
                            step="0.01"
                            value={newHSN.cgstRate}
                            onChange={(e) => setNewHSN(prev => ({ ...prev, cgstRate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sgst">SGST Rate (%)</Label>
                          <Input
                            id="sgst"
                            type="number"
                            step="0.01"
                            value={newHSN.sgstRate}
                            onChange={(e) => setNewHSN(prev => ({ ...prev, sgstRate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="igst">IGST Rate (%)</Label>
                          <Input
                            id="igst"
                            type="number"
                            step="0.01"
                            value={newHSN.igstRate}
                            onChange={(e) => setNewHSN(prev => ({ ...prev, igstRate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cess">CESS Rate (%)</Label>
                          <Input
                            id="cess"
                            type="number"
                            step="0.01"
                            value={newHSN.cessRate}
                            onChange={(e) => setNewHSN(prev => ({ ...prev, cessRate: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingHSN(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateHSN} disabled={createHSNMutation.isPending}>
                        {createHSNMutation.isPending ? "Creating..." : "Create HSN Code"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search HSN codes or descriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {taxCategories.map((category: TaxCategory) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name} ({category.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>IGST</TableHead>
                      <TableHead>CESS</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHSNCodes.map((hsn: HSNCode) => (
                      <TableRow key={hsn.id}>
                        <TableCell>
                          <Badge variant="outline">{hsn.hsnCode}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{hsn.description}</TableCell>
                        <TableCell>{hsn.cgstRate}%</TableCell>
                        <TableCell>{hsn.sgstRate}%</TableCell>
                        <TableCell>{hsn.igstRate}%</TableCell>
                        <TableCell>{hsn.cessRate}%</TableCell>
                        <TableCell>
                          {taxCategories.find((cat: TaxCategory) => cat.id === hsn.taxCategoryId)?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={hsn.isActive ? "default" : "secondary"}>
                            {hsn.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingHSN(hsn)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteHSNMutation.mutate(hsn.id)}
                              disabled={deleteHSNMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax-categories" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Tax Categories</CardTitle>
                  <CardDescription>
                    Manage tax categories for grouping HSN codes
                  </CardDescription>
                </div>
                <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Tax Category</DialogTitle>
                      <DialogDescription>
                        Create a new tax category for organizing HSN codes
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="categoryName">Category Name *</Label>
                        <Input
                          id="categoryName"
                          placeholder="e.g., Food & Groceries"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="categoryRate">Tax Rate (%) *</Label>
                          <Input
                            id="categoryRate"
                            type="number"
                            step="0.01"
                            placeholder="18"
                            value={newCategory.rate}
                            onChange={(e) => setNewCategory(prev => ({ ...prev, rate: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hsnRange">HSN Code Range</Label>
                          <Input
                            id="hsnRange"
                            placeholder="1001-2000"
                            value={newCategory.hsnCodeRange}
                            onChange={(e) => setNewCategory(prev => ({ ...prev, hsnCodeRange: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="categoryDescription">Description</Label>
                        <Textarea
                          id="categoryDescription"
                          placeholder="Description for this tax category"
                          value={newCategory.description}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingCategory(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCategory} disabled={createCategoryMutation.isPending}>
                        {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {taxCategories.map((category: TaxCategory) => (
                  <Card key={category.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{category.name}</h4>
                            <Badge>{category.rate}% GST</Badge>
                            {category.hsnCodeRange && (
                              <Badge variant="outline">{category.hsnCodeRange}</Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {hsnCodes.filter((hsn: HSNCode) => hsn.taxCategoryId === category.id).length} HSN codes assigned
                          </p>
                        </div>
                        <Badge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit HSN Dialog */}
      <Dialog open={!!editingHSN} onOpenChange={() => setEditingHSN(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit HSN Code</DialogTitle>
            <DialogDescription>
              Update HSN code information and GST rates
            </DialogDescription>
          </DialogHeader>
          {editingHSN && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editHsnCode">HSN Code</Label>
                  <Input
                    id="editHsnCode"
                    value={editingHSN.hsnCode}
                    onChange={(e) => setEditingHSN(prev => prev ? { ...prev, hsnCode: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editTaxCategory">Tax Category</Label>
                  <Select 
                    value={editingHSN.taxCategoryId?.toString() || ""} 
                    onValueChange={(value) => setEditingHSN(prev => prev ? { ...prev, taxCategoryId: value ? parseInt(value) : undefined } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {taxCategories.map((category: TaxCategory) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name} ({category.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editingHSN.description}
                  onChange={(e) => setEditingHSN(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="editCgst">CGST Rate (%)</Label>
                  <Input
                    id="editCgst"
                    type="number"
                    step="0.01"
                    value={editingHSN.cgstRate}
                    onChange={(e) => setEditingHSN(prev => prev ? { ...prev, cgstRate: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editSgst">SGST Rate (%)</Label>
                  <Input
                    id="editSgst"
                    type="number"
                    step="0.01"
                    value={editingHSN.sgstRate}
                    onChange={(e) => setEditingHSN(prev => prev ? { ...prev, sgstRate: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editIgst">IGST Rate (%)</Label>
                  <Input
                    id="editIgst"
                    type="number"
                    step="0.01"
                    value={editingHSN.igstRate}
                    onChange={(e) => setEditingHSN(prev => prev ? { ...prev, igstRate: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCess">CESS Rate (%)</Label>
                  <Input
                    id="editCess"
                    type="number"
                    step="0.01"
                    value={editingHSN.cessRate}
                    onChange={(e) => setEditingHSN(prev => prev ? { ...prev, cessRate: e.target.value } : null)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHSN(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateHSN} disabled={updateHSNMutation.isPending}>
              {updateHSNMutation.isPending ? "Updating..." : "Update HSN Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}