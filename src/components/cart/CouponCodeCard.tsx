import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface CouponCodeCardProps {
  className?: string;
}

export function CouponCodeCard({ className }: CouponCodeCardProps) {
  const { appliedCoupon, discount, applyCoupon, removeCoupon, isApplyingCoupon, couponError } = useCart();
  const [codeInput, setCodeInput] = useState('');

  const handleApply = async () => {
    await applyCoupon(codeInput);
    setCodeInput('');
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Coupon code</p>
        {appliedCoupon && (
          <Badge variant="secondary" className="text-xs">
            {appliedCoupon.code}
          </Badge>
        )}
      </div>

      {appliedCoupon ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <div>
            <p className="font-medium">Discount applied</p>
            <p className="text-xs text-muted-foreground">-
              {formatCurrency(discount)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={removeCoupon}>
            Remove
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter code"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleApply}
              disabled={isApplyingCoupon || !codeInput.trim()}
            >
              {isApplyingCoupon ? 'Applying...' : 'Apply'}
            </Button>
          </div>
          {couponError && <p className="text-xs text-destructive">{couponError}</p>}
        </div>
      )}
    </div>
  );
}
