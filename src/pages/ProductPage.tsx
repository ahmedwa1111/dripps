import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProduct, useProducts } from '@/hooks/useProducts';
import { useProductSizes } from '@/hooks/useProductSizes';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Minus, Plus, ShoppingBag, Heart, ArrowLeft, Truck, RotateCcw, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, cn } from '@/lib/utils';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, error } = useProduct(slug || '');
  const { data: relatedProducts = [] } = useProducts({
    categorySlug: product?.category?.slug,
  });
  const { data: sizes = [], isLoading: sizesLoading } = useProductSizes(product?.id);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Available sizes (enabled) – normalize stock to number for comparisons
  const availableSizes = sizes
    .filter((s) => s.is_enabled)
    .map((s) => ({ ...s, stock: Number(s.stock) }));
  const selectedSizeData = availableSizes.find((s) => s.size === selectedSize);
  const hasSizes = availableSizes.length > 0;
  const maxQuantity = hasSizes ? (selectedSizeData?.stock ?? 0) : product?.stock ?? 0;

  // Auto-select first available size when sizes load (stable deps to avoid re-running every render)
  useEffect(() => {
    if (!hasSizes || selectedSize) return;
    const firstInStock = sizes?.find((s) => s.is_enabled && Number(s.stock) > 0);
    const firstEnabled = sizes?.find((s) => s.is_enabled);
    if (firstInStock) setSelectedSize(firstInStock.size);
    else if (firstEnabled) setSelectedSize(firstEnabled.size);
  }, [hasSizes, selectedSize, sizes]);

  // Reset quantity when size changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedSize]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !product) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Product not found</h1>
          <Link to="/shop">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shop
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const isOnSale = product.compare_at_price && product.compare_at_price > product.price;
  const discount = isOnSale
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const handleAddToCart = () => {
    if (hasSizes && selectedSize) {
      addItem(product, quantity, selectedSize);
    } else if (!hasSizes) {
      addItem(product, quantity);
    }
    setQuantity(1);
  };

  const canAddToCart = hasSizes
    ? !!(selectedSize && selectedSizeData && selectedSizeData.stock > 0)
    : (product?.stock ?? 0) > 0;

  const filteredRelated = relatedProducts
    .filter(p => p.id !== product.id)
    .slice(0, 4);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-foreground">Shop</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link to={`/shop?category=${product.category.slug}`} className="hover:text-foreground">
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        {/* Product Details */}
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
              <img
                src={product.image_url || '/placeholder.svg'}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {isOnSale && (
                <span className="drip-badge bg-destructive text-destructive-foreground">
                  -{discount}% OFF
                </span>
              )}
              {product.stock <= 5 && product.stock > 0 && (
                <span className="drip-badge drip-badge-yellow">
                  Only {product.stock} left!
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {product.category && (
              <Link
                to={`/shop?category=${product.category.slug}`}
                className="text-sm font-medium text-primary uppercase tracking-wider hover:underline"
              >
                {product.category.name}
              </Link>
            )}

            <h1 className="font-display text-3xl lg:text-4xl font-bold">{product.name}</h1>

            <div className="flex items-baseline gap-4">
              <span className="font-display text-3xl font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
              {isOnSale && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatCurrency(product.compare_at_price!)}
                </span>
              )}
            </div>

            <p className="text-muted-foreground text-lg leading-relaxed">
              {product.description}
            </p>

            {/* Size Selection – shown when product has sizes */}
            {hasSizes ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Size</span>
                  {selectedSizeData && (
                    <span className={cn(
                      "text-xs",
                      selectedSizeData.stock === 0 
                        ? "text-red-500" 
                        : selectedSizeData.stock <= 5 
                        ? "text-yellow-600" 
                        : "text-green-600"
                    )}>
                      {selectedSizeData.stock === 0 
                        ? "Out of stock" 
                        : selectedSizeData.stock <= 5 
                        ? `Only ${selectedSizeData.stock} left` 
                        : "In stock"}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((sizeItem) => {
                    const stockNum = Number(sizeItem.stock);
                    const isOutOfStock = stockNum === 0;
                    const isSelected = selectedSize === sizeItem.size;
                    return (
                      <button
                        key={sizeItem.id}
                        type="button"
                        onClick={() => setSelectedSize(sizeItem.size)}
                        disabled={isOutOfStock}
                        aria-pressed={isSelected}
                        aria-label={`Size ${sizeItem.size}${isOutOfStock ? ', out of stock' : ''}`}
                        className={cn(
                          'h-12 min-w-[3rem] px-4 rounded-lg border-2 font-medium transition-all',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : isOutOfStock
                              ? 'border-muted bg-muted text-muted-foreground cursor-not-allowed line-through'
                              : 'border-border bg-background hover:border-primary/50'
                        )}
                      >
                        {sizeItem.size}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-sm font-medium">Quantity</span>
                <p className="text-xs text-muted-foreground">
                  {product.stock > 0
                    ? product.stock <= 5
                      ? `Only ${product.stock} left`
                      : "In stock"
                    : "Out of stock"}
                </p>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-muted transition-colors"
                  disabled={quantity <= 1 || !canAddToCart}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  className="p-3 hover:bg-muted transition-colors"
                  disabled={quantity >= maxQuantity || !canAddToCart}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                variant="hero"
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={!canAddToCart}
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                {hasSizes && !selectedSize
                  ? "Select Size"
                  : canAddToCart
                  ? "Add to Cart"
                  : "Out of Stock"}
              </Button>

              <Button variant="outline" size="lg">
                <Heart className="h-5 w-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Fast Shipping</p>
                  <p className="text-xs text-muted-foreground">On orders 3,000 L.E.+</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <RotateCcw className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Easy Returns</p>
                  <p className="text-xs text-muted-foreground">30-day policy</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Secure</p>
                  <p className="text-xs text-muted-foreground">SSL protected</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {filteredRelated.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl lg:text-3xl font-bold mb-8">You May Also Like</h2>
            <ProductGrid products={filteredRelated} />
          </section>
        )}
      </div>
    </MainLayout>
  );
}
