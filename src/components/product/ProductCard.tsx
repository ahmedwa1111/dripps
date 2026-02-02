import { Link, useNavigate } from 'react-router-dom';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  featured?: boolean;
}

export function ProductCard({ product, featured = false }: ProductCardProps) {
  const navigate = useNavigate();
  const isOnSale = product.compare_at_price && product.compare_at_price > product.price;
  const discount = isOnSale
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl bg-card transition-all duration-300',
        featured ? 'drip-card' : 'border border-border hover:shadow-drip-lg hover:-translate-y-1'
      )}
    >
      {/* Image */}
      <Link to={`/product/${product.slug}`} className="block aspect-square overflow-hidden">
        <img
          src={product.image_url || '/placeholder.svg'}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </Link>

      {/* Badges */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        {isOnSale && (
          <span className="drip-badge bg-destructive text-destructive-foreground">
            -{discount}%
          </span>
        )}
        {product.is_featured && (
          <span className="drip-badge drip-badge-purple">
            Featured
          </span>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="drip-badge drip-badge-yellow">
            Low Stock
          </span>
        )}
        {product.stock === 0 && (
          <span className="drip-badge bg-muted text-muted-foreground">
            Sold Out
          </span>
        )}
      </div>

      {/* Quick View Button - navigates to product page for size selection */}
      <button
        onClick={(e) => {
          e.preventDefault();
          navigate(`/product/${product.slug}`);
        }}
        disabled={product.stock === 0}
        className={cn(
          'absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-drip-md transition-all duration-300',
          'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0',
          'hover:bg-primary hover:text-primary-foreground',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Select size"
      >
        <ShoppingBag className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="p-4">
        {product.category && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {product.category.name}
          </p>
        )}
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-display font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-display font-bold text-lg">
            {formatCurrency(product.price)}
          </span>
          {isOnSale && (
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(product.compare_at_price!)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
