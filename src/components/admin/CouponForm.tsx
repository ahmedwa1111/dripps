import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useCreateCoupon, useUpdateCoupon } from '@/hooks/useCoupons';
import type { Coupon } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const couponSchema = z.object({
  code: z.string().min(1, 'Code is required').regex(/^\S+$/, 'No spaces allowed'),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().positive('Value must be greater than 0'),
  min_order_amount: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  max_discount_amount: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
  usage_limit_total: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
  usage_limit_per_user: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
  is_active: z.boolean(),
});

type CouponFormValues = z.infer<typeof couponSchema>;

type CouponFormMode = 'create' | 'edit';

interface CouponFormProps {
  coupon?: Coupon | null;
  mode?: CouponFormMode;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const toDateTimeLocal = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export function CouponForm({ coupon, mode = 'create', onSuccess, onCancel }: CouponFormProps) {
  const isEditing = mode === 'edit' && !!coupon;
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const { data: products = [] } = useProducts({ includeInactive: true });
  const { data: categories = [] } = useCategories();

  const [scope, setScope] = useState<'all' | 'products' | 'categories'>('all');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      type: 'percentage',
      value: 10,
      min_order_amount: '',
      max_discount_amount: '',
      starts_at: '',
      expires_at: '',
      usage_limit_total: '',
      usage_limit_per_user: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (!coupon) return;
    form.reset({
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      min_order_amount: coupon.min_order_amount ?? '',
      max_discount_amount: coupon.max_discount_amount ?? '',
      starts_at: toDateTimeLocal(coupon.starts_at),
      expires_at: toDateTimeLocal(coupon.expires_at),
      usage_limit_total: coupon.usage_limit_total ?? '',
      usage_limit_per_user: coupon.usage_limit_per_user ?? '',
      is_active: coupon.is_active,
    });

    if (coupon.apply_to_all) {
      setScope('all');
      setSelectedProducts([]);
      setSelectedCategories([]);
    } else if (coupon.applicable_product_ids?.length) {
      setScope('products');
      setSelectedProducts(coupon.applicable_product_ids);
      setSelectedCategories([]);
    } else if (coupon.applicable_category_ids?.length) {
      setScope('categories');
      setSelectedCategories(coupon.applicable_category_ids);
      setSelectedProducts([]);
    }
  }, [coupon, form]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    if (!search) return products;
    return products.filter((product) => product.name.toLowerCase().includes(search));
  }, [productSearch, products]);

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const onSubmit = async (values: CouponFormValues) => {
    const payload = {
      code: values.code.trim().toUpperCase(),
      type: values.type,
      value: Number(values.value),
      min_order_amount: values.min_order_amount === '' ? null : Number(values.min_order_amount),
      max_discount_amount:
        values.type === 'percentage'
          ? values.max_discount_amount === ''
            ? null
            : Number(values.max_discount_amount)
          : null,
      starts_at: values.starts_at ? new Date(values.starts_at).toISOString() : null,
      expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
      usage_limit_total: values.usage_limit_total === '' ? null : Number(values.usage_limit_total),
      usage_limit_per_user:
        values.usage_limit_per_user === '' ? null : Number(values.usage_limit_per_user),
      is_active: values.is_active,
      apply_to_all: scope === 'all',
      applicable_product_ids: scope === 'products' ? selectedProducts : null,
      applicable_category_ids: scope === 'categories' ? selectedCategories : null,
    };

    if (scope === 'products' && selectedProducts.length === 0) {
      form.setError('code', { message: 'Select at least one product for this coupon.' });
      return;
    }

    if (scope === 'categories' && selectedCategories.length === 0) {
      form.setError('code', { message: 'Select at least one category for this coupon.' });
      return;
    }

    try {
      if (isEditing && coupon) {
        await updateCoupon.mutateAsync({ id: coupon.id, ...payload });
      } else {
        await createCoupon.mutateAsync(payload as any);
      }

      onSuccess?.();
    } catch {
      // Errors are surfaced via toast notifications in the hooks.
    }
  };

  const isSubmitting = createCoupon.isPending || updateCoupon.isPending;
  const typeValue = form.watch('type');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Code</Label>
          <Input
            {...form.register('code')}
            onChange={(e) => form.setValue('code', e.target.value.toUpperCase())}
            placeholder="WELCOME10"
          />
          {form.formState.errors.code && (
            <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={typeValue} onValueChange={(value) => form.setValue('type', value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Value</Label>
          <Input type="number" step="0.01" {...form.register('value')} />
          {form.formState.errors.value && (
            <p className="text-xs text-destructive">{form.formState.errors.value.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Minimum order amount</Label>
          <Input type="number" step="0.01" {...form.register('min_order_amount')} />
        </div>
        {typeValue === 'percentage' && (
          <div className="space-y-2">
            <Label>Max discount amount</Label>
            <Input type="number" step="0.01" {...form.register('max_discount_amount')} />
          </div>
        )}
        <div className="space-y-2">
          <Label>Starts at</Label>
          <Input type="datetime-local" {...form.register('starts_at')} />
        </div>
        <div className="space-y-2">
          <Label>Expires at</Label>
          <Input type="datetime-local" {...form.register('expires_at')} />
        </div>
        <div className="space-y-2">
          <Label>Total usage limit</Label>
          <Input type="number" {...form.register('usage_limit_total')} />
        </div>
        <div className="space-y-2">
          <Label>Per-user usage limit</Label>
          <Input type="number" {...form.register('usage_limit_per_user')} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.watch('is_active')} onCheckedChange={(value) => form.setValue('is_active', Boolean(value))} />
          Active
        </label>
      </div>

      <div className="space-y-3">
        <Label>Applies to</Label>
        <Select value={scope} onValueChange={(value) => setScope(value as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            <SelectItem value="products">Specific products</SelectItem>
            <SelectItem value="categories">Specific categories</SelectItem>
          </SelectContent>
        </Select>

        {scope === 'products' && (
          <div className="space-y-2">
            <Input
              placeholder="Search products"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <ScrollArea className="h-48 rounded-md border border-border p-3">
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                    <span className={cn('flex-1', selectedProducts.includes(product.id) ? 'font-medium' : '')}>
                      {product.name}
                    </span>
                  </label>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-xs text-muted-foreground">No products found.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {scope === 'categories' && (
          <ScrollArea className="h-48 rounded-md border border-border p-3">
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <span className={cn('flex-1', selectedCategories.includes(category.id) ? 'font-medium' : '')}>
                    {category.name}
                  </span>
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-muted-foreground">No categories found.</p>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEditing ? (
            'Update Coupon'
          ) : (
            'Create Coupon'
          )}
        </Button>
      </div>
    </form>
  );
}
