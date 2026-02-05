import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Package } from 'lucide-react';
import { Product } from '@/types';
import { useCategories } from '@/hooks/useCategories';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useProductSizes, useBulkUpdateProductSizes } from '@/hooks/useProductSizes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

interface SizeRow {
  size: string;
  stock: number;
  is_enabled: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  compare_at_price: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  images: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  category_id: z.string().optional(),
  stock: z.coerce.number().int().min(0, 'Stock must be 0 or more'),
  shipping_price: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  is_featured: z.boolean(),
  is_active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const isEditing = !!product;
  const { data: categories = [] } = useCategories();
  const { data: existingSizes = [] } = useProductSizes(product?.id);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const bulkUpdateSizes = useBulkUpdateProductSizes();

  const [autoSlug, setAutoSlug] = useState(true);
  const [sizeRows, setSizeRows] = useState<SizeRow[]>(() =>
    DEFAULT_SIZES.map((size) => ({ size, stock: 0, is_enabled: true }))
  );
  const [images, setImages] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState('');
  const lastSyncedProductIdRef = useRef<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      price: 0,
      compare_at_price: undefined,
      image_url: '',
      images: [],
      colors: [],
      category_id: '',
      stock: 0,
      shipping_price: undefined,
      is_featured: false,
      is_active: true,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        slug: product.slug,
        description: product.description ?? '',
        price: Number(product.price),
        compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : undefined,
        image_url: product.image_url ?? '',
        images: product.images ?? [],
        colors: product.colors ?? [],
        category_id: product.category_id ?? '',
        stock: product.stock,
        shipping_price: product.shipping_price != null ? Number(product.shipping_price) : undefined,
        is_featured: product.is_featured,
        is_active: product.is_active,
      });
      setImages(product.images ?? []);
      setColors(product.colors ?? []);
    }
  }, [product, form]);

  // Sync size rows only when product changes (avoid overwriting user input on refetch)
  useEffect(() => {
    const productKey = product?.id ?? 'create';
    if (lastSyncedProductIdRef.current === productKey) return;
    lastSyncedProductIdRef.current = productKey;

    if (isEditing && existingSizes.length > 0) {
      setSizeRows(
        DEFAULT_SIZES.map((size) => {
          const existing = existingSizes.find((s) => s.size === size);
          return existing
            ? { size: existing.size, stock: Number(existing.stock), is_enabled: Boolean(existing.is_enabled) }
            : { size, stock: 0, is_enabled: true };
        })
      );
    } else {
      setSizeRows(DEFAULT_SIZES.map((size) => ({ size, stock: 0, is_enabled: true })));
    }
  }, [product?.id, isEditing, existingSizes]);

  const nameValue = form.watch('name');
  useEffect(() => {
    if (autoSlug && nameValue) {
      form.setValue('slug', slugify(nameValue));
    }
  }, [nameValue, autoSlug, form]);

  const onSubmit = async (values: ProductFormValues) => {
    const normalizedImages = values.images && values.images.length > 0 ? values.images : [];
    const primaryImage = values.image_url || normalizedImages[0] || null;
    const payload = {
      name: values.name,
      slug: values.slug,
      description: values.description || null,
      price: values.price,
      compare_at_price: values.compare_at_price === '' || values.compare_at_price == null ? null : Number(values.compare_at_price),
      image_url: primaryImage,
      images: normalizedImages,
      colors: values.colors && values.colors.length > 0 ? values.colors : [],
      category_id: values.category_id || null,
      stock: values.stock,
      shipping_price: values.shipping_price === '' || values.shipping_price == null ? null : Number(values.shipping_price),
      is_featured: values.is_featured,
      is_active: values.is_active,
    };

    try {
      let productId: string;
      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...payload });
        productId = product.id;
      } else {
        const created = await createProduct.mutateAsync(payload);
        productId = created.id;
      }
      await bulkUpdateSizes.mutateAsync({ productId, sizes: sizeRows });
      onSuccess?.();
      if (!isEditing) {
        form.reset();
        setSizeRows(DEFAULT_SIZES.map((size) => ({ size, stock: 0, is_enabled: true })));
        setImages([]);
        setImageInput('');
        setColors([]);
        setColorInput('');
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleSizeStockChange = (size: string, value: string) => {
    const parsed = value === '' ? 0 : parseInt(value, 10);
    const stock = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    setSizeRows((prev) => prev.map((r) => (r.size === size ? { ...r, stock } : r)));
  };

  const handleSizeEnabledChange = (size: string) => {
    setSizeRows((prev) => prev.map((r) => (r.size === size ? { ...r, is_enabled: !r.is_enabled } : r)));
  };

  const isValidImageUrl = (value: string) => {
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const updateImages = (next: string[]) => {
    setImages(next);
    form.setValue('images', next);
  };

  const handleAddImage = () => {
    const entries = imageInput
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (entries.length === 0) return;

    const next = [...images];
    let added = 0;
    entries.forEach((entry) => {
      if (!isValidImageUrl(entry)) {
        toast.error(`"${entry}" is not a valid image URL.`);
        return;
      }
      if (!next.includes(entry)) {
        next.push(entry);
        added += 1;
      }
    });

    if (added > 0) {
      updateImages(next);
      setImageInput('');
    }
  };

  const handleRemoveImage = (value: string) => {
    updateImages(images.filter((img) => img !== value));
  };

  const isValidColor = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const hexMatch = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
    if (hexMatch) return true;
    if (typeof window === 'undefined') return false;
    const tester = new Option().style;
    tester.color = trimmed;
    return tester.color !== '';
  };

  const updateColors = (next: string[]) => {
    setColors(next);
    form.setValue('colors', next);
  };

  const handleAddColor = () => {
    const entries = colorInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (entries.length === 0) return;

    const next = [...colors];
    let added = 0;
    entries.forEach((entry) => {
      if (!isValidColor(entry)) {
        toast.error(`"${entry}" is not a valid color. Use hex (e.g. #111111) or a CSS color name.`);
        return;
      }
      if (!next.includes(entry)) {
        next.push(entry);
        added += 1;
      }
    });

    if (added > 0) {
      updateColors(next);
      setColorInput('');
    }
  };

  const handleRemoveColor = (value: string) => {
    updateColors(colors.filter((color) => color !== value));
  };

  const isSubmitting = createProduct.isPending || updateProduct.isPending || bulkUpdateSizes.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Name & Slug */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            placeholder="e.g. Drip Hoodie Classic"
            {...form.register('name')}
            className={cn(form.formState.errors.name && 'border-destructive')}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug *</Label>
          <div className="flex gap-2">
            <Input
              id="slug"
              placeholder="drip-hoodie-classic"
              {...form.register('slug')}
              className={cn(form.formState.errors.slug && 'border-destructive')}
              onChange={(e) => {
                form.setValue('slug', e.target.value);
                setAutoSlug(false);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAutoSlug(true);
                form.setValue('slug', slugify(form.getValues('name')));
              }}
              title="Generate from name"
            >
              Auto
            </Button>
          </div>
          {form.formState.errors.slug && (
            <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Product description..."
          rows={3}
          {...form.register('description')}
          className={cn(form.formState.errors.description && 'border-destructive')}
        />
      </div>

      {/* Price (L.E.) & Compare at price */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Price (L.E.) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...form.register('price')}
            className={cn(form.formState.errors.price && 'border-destructive')}
          />
          {form.formState.errors.price && (
            <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="compare_at_price">Compare at Price (L.E.) – optional</Label>
          <Input
            id="compare_at_price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Original price for sale display"
            {...form.register('compare_at_price')}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="shipping_price">Shipping price (L.E.) – optional</Label>
          <Input
            id="shipping_price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Leave empty to use site default (200 L.E.)"
            {...form.register('shipping_price')}
          />
          <p className="text-xs text-muted-foreground">
            Per-item shipping for this product. If empty, the default shipping cost is used at checkout.
          </p>
        </div>
      </div>

      {/* Image URL */}
      <div className="space-y-2">
        <Label htmlFor="image_url">Image URL</Label>
        <div className="flex gap-2">
          <Input
            id="image_url"
            type="url"
            placeholder="https://..."
            {...form.register('image_url')}
            className={cn(form.formState.errors.image_url && 'border-destructive')}
          />
        </div>
        {form.watch('image_url') && (
          <div className="mt-2 rounded-lg border border-border overflow-hidden w-24 h-24 bg-muted">
            <img
              src={form.watch('image_url')}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}
      </div>

      {/* Gallery Images */}
      <div className="space-y-2">
        <Label htmlFor="gallery_images">Gallery Images</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            id="gallery_images"
            placeholder="Add image URLs (comma or new line separated)"
            value={imageInput}
            onChange={(event) => setImageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddImage();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={handleAddImage}>
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Add multiple URLs separated by commas or new lines. If Image URL is empty, the first
          gallery image becomes the primary image.
        </p>
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((img) => (
              <div key={img} className="relative rounded-lg border border-gray-200 bg-muted overflow-hidden">
                <img src={img} alt="Gallery" className="h-20 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img)}
                  className="absolute right-1 top-1 rounded-full bg-white/90 px-1 text-xs text-gray-600 hover:text-gray-900"
                  aria-label="Remove image"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <Label htmlFor="colors">Available Colors</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            id="colors"
            placeholder="Add colors (e.g. #111111, #facc15, purple)"
            value={colorInput}
            onChange={(event) => setColorInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddColor();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={handleAddColor}>
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use hex values or CSS color names. Separate multiple colors with commas.
        </p>
        {colors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <div
                key={color}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs"
              >
                <span
                  className="h-4 w-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-700">{color}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveColor(color)}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label={`Remove ${color}`}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category & Stock */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={form.watch('category_id') || ''}
            onValueChange={(v) => form.setValue('category_id', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Total Stock (fallback)</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            {...form.register('stock')}
            className={cn(form.formState.errors.stock && 'border-destructive')}
          />
          <p className="text-xs text-muted-foreground">
            Shown when no sizes are used. Prefer per-size stock below.
          </p>
          {form.formState.errors.stock && (
            <p className="text-sm text-destructive">{form.formState.errors.stock.message}</p>
          )}
        </div>
      </div>

      {/* Size inventory */}
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Size inventory
          </h3>
          <span className="text-sm text-muted-foreground">
            {sizeRows.filter((r) => r.is_enabled).reduce((sum, r) => sum + r.stock, 0)} total
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Enable sizes and set stock per size. Customers will see these on the product page.
        </p>
        <div className="grid gap-3">
          {sizeRows.map((row) => (
            <div
              key={row.size}
              className={cn(
                'flex items-center gap-4 p-3 rounded-lg border transition-colors',
                row.is_enabled ? 'bg-card border-border' : 'bg-muted/50 border-muted'
              )}
            >
              <span className="w-10 font-display font-bold text-sm">{row.size}</span>
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  value={row.stock}
                  onChange={(e) => handleSizeStockChange(row.size, e.target.value)}
                  disabled={!row.is_enabled}
                  placeholder="Stock"
                  className={cn(!row.is_enabled && 'opacity-50')}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`size-${row.size}`}
                  checked={row.is_enabled}
                  onCheckedChange={() => handleSizeEnabledChange(row.size)}
                />
                <Label htmlFor={`size-${row.size}`} className="text-sm cursor-pointer">
                  {row.is_enabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured & Active */}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_featured"
            checked={form.watch('is_featured')}
            onCheckedChange={(checked) => form.setValue('is_featured', !!checked)}
          />
          <Label htmlFor="is_featured" className="cursor-pointer font-normal">
            Featured product
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_active"
            checked={form.watch('is_active')}
            onCheckedChange={(checked) => form.setValue('is_active', !!checked)}
          />
          <Label htmlFor="is_active" className="cursor-pointer font-normal">
            Visible in store
          </Label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
