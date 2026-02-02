import { useState, useEffect, useRef } from 'react';
import { useProductSizes, useBulkUpdateProductSizes, useInitializeProductSizes } from '@/hooks/useProductSizes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Package, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SizeManagementProps {
  productId: string;
  productName: string;
}

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

interface SizeState {
  size: string;
  stock: number;
  is_enabled: boolean;
}

export function SizeManagement({ productId, productName }: SizeManagementProps) {
  const { data: sizes, isLoading } = useProductSizes(productId);
  const bulkUpdate = useBulkUpdateProductSizes();
  const initializeSizes = useInitializeProductSizes();
  
  const [localSizes, setLocalSizes] = useState<SizeState[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const lastSyncedProductIdRef = useRef<string | null>(null);

  // Sync local state from server only when product changes (not on every refetch)
  useEffect(() => {
    if (lastSyncedProductIdRef.current === productId) return;
    lastSyncedProductIdRef.current = productId;
    setHasChanges(false);

    if (sizes && sizes.length > 0) {
      setLocalSizes(
        sizes.map((s) => ({
          size: s.size,
          stock: Number(s.stock),
          is_enabled: Boolean(s.is_enabled),
        }))
      );
    } else if (sizes && sizes.length === 0) {
      setLocalSizes(
        DEFAULT_SIZES.map((size) => ({
          size,
          stock: 0,
          is_enabled: true,
        }))
      );
    }
  }, [productId, sizes]);

  const handleStockChange = (size: string, value: string) => {
    const parsed = value === '' ? 0 : parseInt(value, 10);
    const stock = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    setLocalSizes((prev) =>
      prev.map((s) => (s.size === size ? { ...s, stock } : s))
    );
    setHasChanges(true);
  };

  const handleToggleEnabled = (size: string) => {
    setLocalSizes((prev) =>
      prev.map((s) => (s.size === size ? { ...s, is_enabled: !s.is_enabled } : s))
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!sizes || sizes.length === 0) {
      await initializeSizes.mutateAsync(productId);
    }
    await bulkUpdate.mutateAsync({
      productId,
      sizes: localSizes,
    });
    setHasChanges(false);
    lastSyncedProductIdRef.current = null;
  };

  const totalStock = localSizes.reduce(
    (sum, s) => sum + (s.is_enabled ? s.stock : 0),
    0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Size Inventory</h3>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{totalStock} total</span>
        </div>
      </div>

      {/* Size Grid */}
      <div className="grid gap-4">
        {localSizes.map((sizeItem) => (
          <div
            key={sizeItem.size}
            className={cn(
              'flex items-center gap-4 p-4 rounded-lg border transition-colors',
              sizeItem.is_enabled
                ? 'bg-card border-border'
                : 'bg-muted/50 border-muted'
            )}
          >
            {/* Size Label */}
            <div className="w-16">
              <span
                className={cn(
                  'inline-flex items-center justify-center h-10 w-10 rounded-lg font-display font-bold text-sm',
                  sizeItem.is_enabled
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {sizeItem.size}
              </span>
            </div>

            {/* Stock Input */}
            <div className="flex-1">
              <Label htmlFor={`stock-${sizeItem.size}`} className="sr-only">
                Stock for {sizeItem.size}
              </Label>
              <div className="relative">
                <Input
                  id={`stock-${sizeItem.size}`}
                  type="number"
                  min={0}
                  value={sizeItem.stock}
                  onChange={(e) => handleStockChange(sizeItem.size, e.target.value)}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (v === '' || Number.isNaN(parseInt(v, 10))) {
                      handleStockChange(sizeItem.size, '0');
                    }
                  }}
                  disabled={!sizeItem.is_enabled}
                  className={cn(
                    'w-full',
                    !sizeItem.is_enabled && 'opacity-50'
                  )}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Stock Status */}
            <div className="w-24 text-right">
              {sizeItem.is_enabled && (
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    sizeItem.stock === 0
                      ? 'bg-red-100 text-red-700'
                      : sizeItem.stock <= 5
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  )}
                >
                  {sizeItem.stock === 0
                    ? 'Out of stock'
                    : sizeItem.stock <= 5
                    ? 'Low stock'
                    : 'In stock'}
                </span>
              )}
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id={`enabled-${sizeItem.size}`}
                checked={sizeItem.is_enabled}
                onCheckedChange={() => handleToggleEnabled(sizeItem.size)}
              />
              <Label
                htmlFor={`enabled-${sizeItem.size}`}
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {sizeItem.is_enabled ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || bulkUpdate.isPending}
          className="min-w-[120px]"
        >
          {bulkUpdate.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
