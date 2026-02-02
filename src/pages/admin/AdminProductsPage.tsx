import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SizeManagement } from '@/components/admin/SizeManagement';
import { ProductForm } from '@/components/admin/ProductForm';
import { useProducts, useDeleteProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, MoreHorizontal, Plus, Trash2, Eye, EyeOff, Ruler, Pencil } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [sizeDialogProduct, setSizeDialogProduct] = useState<Product | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useProducts({ includeInactive: true, search: search || undefined });
  const { data: categories = [] } = useCategories();
  const deleteProductMutation = useDeleteProduct();
  const updateProduct = useUpdateProduct();

  const handleToggleActive = (product: Product) => {
    updateProduct.mutate({ id: product.id, is_active: !product.is_active });
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteProduct(product);
  };

  const handleDeleteConfirm = () => {
    if (deleteProduct) {
      deleteProductMutation.mutate(deleteProduct.id);
      setDeleteProduct(null);
    }
  };

  const handleManageSizes = (product: Product) => {
    setSizeDialogProduct(product);
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden md:table-cell">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No products found. Add your first product above.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={product.image_url || '/placeholder.svg'}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">{product.name}</p>
                            {product.is_featured && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {product.category?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{formatCurrency(product.price)}</span>
                          {product.compare_at_price && (
                            <span className="text-sm text-muted-foreground line-through ml-2">
                              {formatCurrency(product.compare_at_price)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span
                          className={
                            product.stock > 10
                              ? 'text-green-600'
                              : product.stock > 0
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }
                        >
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageSizes(product)}>
                              <Ruler className="mr-2 h-4 w-4" />
                              Manage Sizes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleActive(product)}>
                              {product.is_active ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(product)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Create Product Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add Product</DialogTitle>
          </DialogHeader>
          <ProductForm
            onSuccess={() => setCreateDialogOpen(false)}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Product</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <ProductForm
              product={editProduct}
              onSuccess={() => setEditProduct(null)}
              onCancel={() => setEditProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Size Management Dialog */}
      <Dialog open={!!sizeDialogProduct} onOpenChange={(open) => !open && setSizeDialogProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Manage Size Inventory</DialogTitle>
          </DialogHeader>
          {sizeDialogProduct && (
            <SizeManagement
              productId={sizeDialogProduct.id}
              productName={sizeDialogProduct.name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProduct} onOpenChange={(open) => !open && setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteProduct?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
