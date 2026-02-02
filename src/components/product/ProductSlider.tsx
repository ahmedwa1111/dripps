import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ShoppingBag } from 'lucide-react';
import { Product } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

interface ProductSliderProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  autoplayDelay?: number;
  className?: string;
}

export function ProductSlider({
  products,
  title,
  subtitle,
  autoplayDelay = 4000,
  className,
}: ProductSliderProps) {
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = React.useState(0);

  const autoplayPlugin = React.useMemo(
    () =>
      Autoplay({
        delay: autoplayDelay,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    [autoplayDelay]
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: false,
      align: 'start',
      dragFree: true,
      containScroll: 'trimSnaps',
    },
    [autoplayPlugin]
  );

  const onScroll = React.useCallback(() => {
    if (!emblaApi) return;
    const progress = Math.max(0, Math.min(1, emblaApi.scrollProgress()));
    setScrollProgress(progress * 100);
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    onScroll();
    emblaApi.on('scroll', onScroll);
    emblaApi.on('reInit', onScroll);
    return () => {
      emblaApi.off('scroll', onScroll);
      emblaApi.off('reInit', onScroll);
    };
  }, [emblaApi, onScroll]);

  if (products.length === 0) return null;

  return (
    <section className={cn('py-12', className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-8 text-center">
            {title && (
              <h2 className="font-display text-3xl lg:text-4xl font-bold mb-2">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-muted-foreground text-lg">{subtitle}</p>
            )}
          </div>
        )}

        {/* Slider Container */}
        <div className="relative">
          {/* Carousel - Free Scroll */}
          <div 
            className="overflow-hidden cursor-grab active:cursor-grabbing" 
            ref={emblaRef}
          >
            <div className="flex -ml-4">
              {products.map((product) => {
                const isOnSale =
                  product.compare_at_price &&
                  product.compare_at_price > product.price;
                const discount = isOnSale
                  ? Math.round(
                      ((product.compare_at_price! - product.price) /
                        product.compare_at_price!) *
                        100
                    )
                  : 0;

                return (
                  <div
                    key={product.id}
                    className="flex-[0_0_50%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] xl:flex-[0_0_25%] pl-4 min-w-0"
                  >
                    <div className="group/card relative overflow-hidden rounded-2xl bg-card border border-border transition-all duration-300 hover:shadow-drip-lg hover:-translate-y-1 h-full flex flex-col">
                      {/* Image Container */}
                      <Link
                        to={`/product/${product.slug}`}
                        className="relative aspect-square overflow-hidden"
                      >
                        <img
                          src={product.image_url || '/placeholder.svg'}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          {isOnSale && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive text-destructive-foreground shadow-md">
                              -{discount}%
                            </span>
                          )}
                          {product.is_featured && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-md">
                              Featured
                            </span>
                          )}
                          {product.stock <= 5 && product.stock > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500 text-yellow-950 shadow-md">
                              Low Stock
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
                            'absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-lg transition-all duration-300',
                            'opacity-0 translate-y-2 group-hover/card:opacity-100 group-hover/card:translate-y-0',
                            'hover:bg-primary hover:text-primary-foreground hover:scale-110',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                          title="Select size"
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </button>
                      </Link>

                      {/* Content */}
                      <div className="p-4 flex flex-col flex-1">
                        {/* Category */}
                        {product.category && (
                          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
                            {product.category.name}
                          </p>
                        )}

                        {/* Product Name */}
                        <Link to={`/product/${product.slug}`}>
                          <h3 className="font-display font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 mb-2">
                            {product.name}
                          </h3>
                        </Link>

                        {/* Description */}
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
                            {product.description}
                          </p>
                        )}

                        {/* Price */}
                        <div className="flex items-center gap-2 mt-auto">
                          <span className="font-display font-bold text-lg text-primary">
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 mx-auto max-w-xs">
          <div className="h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-150 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Swipe to explore
          </p>
        </div>
      </div>
    </section>
  );
}
