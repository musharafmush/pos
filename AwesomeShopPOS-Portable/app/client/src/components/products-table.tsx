
import React from "react";
import { Product } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { 
  PackageIcon, 
  EditIcon, 
  TrashIcon, 
  EyeIcon 
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface ProductsTableProps {
  products: Product[];
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: number) => void;
}

export function ProductsTable({ products, onView, onEdit, onDelete }: ProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <PackageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No products found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>MRP</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product: Product) => (
          <TableRow key={product.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <PackageIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500">{product.description}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {product.sku}
              </div>
            </TableCell>
            <TableCell>{formatCurrency(parseFloat(product.price.toString()))}</TableCell>
            <TableCell>{formatCurrency(parseFloat(product.mrp?.toString() || product.price.toString()))}</TableCell>
            <TableCell>
              <Badge variant={product.stockQuantity <= 5 ? "destructive" : "secondary"}>
                {product.stockQuantity}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={product.active ? "default" : "secondary"}>
                {product.active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {onView && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onView(product)}
                    title="View Product"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </Button>
                )}
                {onEdit && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onEdit(product)}
                    title="Edit Product"
                  >
                    <EditIcon className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" title="Delete Product">
                        <TrashIcon className="w-4 h-4 text-red-600" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Product</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{product.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(product.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
