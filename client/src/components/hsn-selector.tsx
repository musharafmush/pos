import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { 
  Search, 
  Plus, 
  Check,
  ChevronsUpDown,
  Calculator,
  Info,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
}

interface TaxCategory {
  id: number;
  name: string;
  rate: string;
  description?: string;
}

interface HSNSelectorProps {
  selectedHSN?: string;
  onHSNSelect: (hsnCode: string, taxRates: {
    cgst: string;
    sgst: string;
    igst: string;
    cess: string;
  }) => void;
  onNewHSNRequest?: (hsnCode: string) => void;
  className?: string;
}

export function HSNSelector({ selectedHSN, onHSNSelect, onNewHSNRequest, className }: HSNSelectorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newHSNInput, setNewHSNInput] = useState("");

  // Fetch HSN codes
  const { data: hsnCodes = [], refetch } = useQuery({
    queryKey: ['/api/tax/hsn-codes'],
    queryFn: async () => {
      const response = await apiRequest('/api/tax/hsn-codes');
      return response.json();
    }
  });

  // Fetch tax categories
  const { data: taxCategories = [] } = useQuery({
    queryKey: ['/api/tax/categories'],
    queryFn: async () => {
      const response = await apiRequest('/api/tax/categories');
      return response.json();
    }
  });

  // Filter HSN codes based on search
  const filteredHSNCodes = hsnCodes.filter((hsn: HSNCode) =>
    hsn.isActive && (
      hsn.hsnCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      hsn.description.toLowerCase().includes(searchValue.toLowerCase())
    )
  );

  // Find selected HSN details
  const selectedHSNDetails = hsnCodes.find((hsn: HSNCode) => hsn.hsnCode === selectedHSN);
  const selectedCategory = selectedHSNDetails?.taxCategoryId 
    ? taxCategories.find((cat: TaxCategory) => cat.id === selectedHSNDetails.taxCategoryId)
    : null;

  const handleHSNSelect = (hsn: HSNCode) => {
    onHSNSelect(hsn.hsnCode, {
      cgst: hsn.cgstRate,
      sgst: hsn.sgstRate,
      igst: hsn.igstRate,
      cess: hsn.cessRate
    });
    setOpen(false);
    setSearchValue("");

    toast({
      title: "HSN Code Selected",
      description: `${hsn.hsnCode} - ${hsn.description} (${hsn.igstRate}% GST)`
    });
  };

  const handleManualHSNEntry = () => {
    if (!newHSNInput.trim()) {
      toast({
        title: "HSN Code Required",
        description: "Please enter an HSN code",
        variant: "destructive"
      });
      return;
    }

    // Check if HSN already exists
    const existingHSN = hsnCodes.find((hsn: HSNCode) => hsn.hsnCode === newHSNInput.trim());
    if (existingHSN) {
      handleHSNSelect(existingHSN);
      setShowAddDialog(false);
      setNewHSNInput("");
      return;
    }

    // Request to add new HSN
    if (onNewHSNRequest) {
      onNewHSNRequest(newHSNInput.trim());
    }

    // Default GST rates for new HSN (18% standard rate)
    onHSNSelect(newHSNInput.trim(), {
      cgst: "9",
      sgst: "9", 
      igst: "18",
      cess: "0"
    });

    setShowAddDialog(false);
    setNewHSNInput("");

    toast({
      title: "New HSN Code Added",
      description: `${newHSNInput.trim()} will be saved for future use. Default 18% GST applied.`,
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor="hsn-selector" className="text-sm font-medium">
          HSN Code
        </Label>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New HSN Code</DialogTitle>
              <DialogDescription>
                Enter a new HSN code. It will be saved for future use with default GST rates.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newHSN">HSN Code</Label>
                <Input
                  id="newHSN"
                  placeholder="e.g., 1001, 2203, 8414"
                  value={newHSNInput}
                  onChange={(e) => setNewHSNInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualHSNEntry();
                    }
                  }}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Default Rates Applied:</p>
                    <p>• CGST: 9% | SGST: 9% | IGST: 18%</p>
                    <p>• You can edit these rates in Tax Settings later</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleManualHSNEntry}>
                Add HSN Code
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            id="hsn-selector"
          >
            {selectedHSN ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedHSN}</Badge>
                {selectedHSNDetails && (
                  <span className="text-sm text-muted-foreground truncate">
                    {selectedHSNDetails.description}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Select HSN code...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput 
              placeholder="Search HSN codes..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandEmpty>
              <div className="py-6 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No HSN codes found</p>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setNewHSNInput(searchValue);
                    setShowAddDialog(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add "{searchValue}"
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {filteredHSNCodes.map((hsn: HSNCode) => {
                const category = hsn.taxCategoryId 
                  ? taxCategories.find((cat: TaxCategory) => cat.id === hsn.taxCategoryId)
                  : null;
                
                return (
                  <CommandItem
                    key={hsn.id}
                    value={hsn.hsnCode}
                    onSelect={() => handleHSNSelect(hsn)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            selectedHSN === hsn.hsnCode ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {hsn.hsnCode}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {hsn.igstRate}% GST
                            </Badge>
                            {category && (
                              <Badge variant="outline" className="text-xs">
                                {category.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {hsn.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected HSN Details */}
      {selectedHSNDetails && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge variant="outline">{selectedHSNDetails.hsnCode}</Badge>
                  <Badge className="bg-green-100 text-green-800">
                    {selectedHSNDetails.igstRate}% Total GST
                  </Badge>
                  {selectedCategory && (
                    <Badge variant="outline">{selectedCategory.name}</Badge>
                  )}
                </div>
                <p className="text-sm text-green-800 font-medium">
                  {selectedHSNDetails.description}
                </p>
                <div className="flex gap-4 text-xs text-green-700">
                  <span>CGST: {selectedHSNDetails.cgstRate}%</span>
                  <span>SGST: {selectedHSNDetails.sgstRate}%</span>
                  <span>IGST: {selectedHSNDetails.igstRate}%</span>
                  {selectedHSNDetails.cessRate !== "0" && (
                    <span>CESS: {selectedHSNDetails.cessRate}%</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onHSNSelect("", { cgst: "0", sgst: "0", igst: "0", cess: "0" })}
                className="text-green-600 hover:text-green-700"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}