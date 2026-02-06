import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductSlider } from '@/components/product/ProductSlider';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ArrowRight, Truck, Shield, RotateCcw, Sparkles } from 'lucide-react';
import { formatCurrency, getFreeShippingThreshold } from '@/lib/utils';

type HeroItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  slug?: string;
};

const fallbackHeroItems: HeroItem[] = [
  {
    id: 'hero-tee',
    name: 'Essential Oversized Tee',
    price: 800,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600',
  },
  {
    id: 'hero-hoodie',
    name: 'Stacked Logo Hoodie',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600',
  },
  {
    id: 'hero-pants',
    name: 'Cargo Street Pants',
    price: 950,
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600',
  },
];

export default function HomePage() {
  const { data: featuredProducts = [], isLoading: loadingProducts } = useProducts({ featured: true });
  const { data: allProducts = [] } = useProducts({});
  const { data: categories = [] } = useCategories();
  const freeShippingThreshold = getFreeShippingThreshold();
  const freeShippingLabel = freeShippingThreshold.toLocaleString('en-US');
  const heroItems: HeroItem[] = featuredProducts.length
    ? featuredProducts.slice(0, 3).map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        slug: product.slug,
        image: product.image_url || product.images?.[0] || '/placeholder.svg',
      }))
    : fallbackHeroItems;

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="street-hero">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="street-hero-frame px-6 py-8 lg:px-10 lg:py-10">
            <div className="street-hero-top">
              <div className="street-hero-mark">
                <span className="street-hero-orbit" />
                <span>DRIPPSS</span>
              </div>
              <div className="hidden md:flex items-center gap-8">
                <Link to="/" className="transition-colors hover:text-foreground">
                  Home
                </Link>
                <Link to="/shop" className="transition-colors hover:text-foreground">
                  All Products
                </Link>
                <Link to="/shop?category=tops-and-more" className="transition-colors hover:text-foreground">
                  Tops & more
                </Link>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span>Cart</span>
                <span className="text-[0.6rem]">(00)</span>
              </div>
            </div>

            <div className="street-hero-body">
              <aside className="street-hero-stack order-2 lg:order-1">
                {heroItems.map((item, index) => (
                  <Link
                    key={item.id}
                    to={item.slug ? `/product/${item.slug}` : '/shop'}
                    className="street-hero-product animate-fade-up"
                    style={{ animationDelay: `${150 + index * 90}ms` }}
                  >
                    <div className="street-hero-product-image">
                      <img src={item.image} alt={item.name} loading="lazy" />
                      <span className="street-hero-price">{formatCurrency(item.price)}</span>
                    </div>
                    <span className="street-hero-product-name">{item.name}</span>
                  </Link>
                ))}
              </aside>

              <div className="street-hero-copy order-1 lg:order-2 animate-fade-up" style={{ animationDelay: '80ms' }}>
                <div className="street-hero-kicker">
                  <Sparkles className="h-4 w-4 text-[hsl(var(--brand-highlight))]" />
                  <span>New Collection 2026</span>
                </div>

                <h1 className="street-hero-title">
                  Born from the streets
                  <span className="block">
                    Built for the <span className="street-hero-scribble">culture</span>
                  </span>
                </h1>

                <p className="street-hero-subtitle">
                  Premium streetwear with sharp silhouettes, bold prints, and everyday comfort. Designed in Cairo,
                  worn everywhere.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link to="/shop">
                    <Button
                      variant="hero"
                      size="lg"
                      className="uppercase tracking-[0.2em] bg-[hsl(var(--brand-highlight))] text-[hsl(var(--brand-highlight-foreground))] hover:bg-[hsl(var(--brand-highlight)/0.9)]"
                    >
                      Shop the drop
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/shop">
                    <Button variant="heroOutline" size="lg" className="uppercase tracking-[0.2em]">
                      View all
                    </Button>
                  </Link>
                </div>

                <div className="street-hero-metrics">
                  <div className="street-hero-metric">
                    <span>Season</span>
                    <strong>SS.26</strong>
                  </div>
                  <div className="street-hero-metric">
                    <span>Drop</span>
                    <strong>Limited</strong>
                  </div>
                  <div className="street-hero-metric">
                    <span>Shipping</span>
                    <strong>48 hrs</strong>
                  </div>
                </div>
              </div>

              <div className="street-hero-accent order-3">
                <span className="street-hero-accent-label">Collection</span>
                <div>
                  <div className="street-hero-accent-title">Culture Lab</div>
                  <p className="street-hero-accent-sub">
                    Statement pieces inspired by the city and built for the daily grind.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-gray-200 bg-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Free Shipping</h3>
                <p className="text-sm text-muted-foreground">On orders over {freeShippingLabel} L.E.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200">
                <RotateCcw className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Easy Returns</h3>
                <p className="text-sm text-muted-foreground">30-day return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Secure Payment</h3>
                <p className="text-sm text-muted-foreground">100% protected</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-display text-3xl lg:text-4xl font-bold">Shop by Category</h2>
              <p className="text-muted-foreground mt-2">Find your perfect style</p>
            </div>
            <Link to="/shop" className="hidden md:block">
              <Button variant="ghost">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${category.slug}`}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-gray-200"
              >
                <img
                  src={category.image_url || '/placeholder.svg'}
                  alt={category.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display text-2xl font-bold text-white">{category.name}</h3>
                  <p className="text-white/70 text-sm mt-1">{category.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products Slider */}
      <ProductSlider
        products={allProducts.slice(0, 8)}
        title="Trending Now"
        subtitle="Discover what's hot this season"
        autoplayDelay={5000}
        className="bg-muted"
      />

      {/* Featured Products */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-display text-3xl lg:text-4xl font-bold">Featured Products</h2>
              <p className="text-muted-foreground mt-2">Handpicked by our stylists</p>
            </div>
            <Link to="/shop" className="hidden md:block">
              <Button variant="ghost">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <ProductGrid products={featuredProducts.slice(0, 4)} loading={loadingProducts} />
        </div>
      </section>
    </MainLayout>
  );
}




