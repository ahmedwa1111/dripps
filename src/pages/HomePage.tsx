import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductSlider } from '@/components/product/ProductSlider';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ArrowRight, Truck, Shield, RotateCcw, Sparkles } from 'lucide-react';
import { getFreeShippingThreshold } from '@/lib/utils';

export default function HomePage() {
  const { data: featuredProducts = [], isLoading: loadingProducts } = useProducts({ featured: true });
  const { data: allProducts = [] } = useProducts({});
  const { data: categories = [] } = useCategories();
  const freeShippingThreshold = getFreeShippingThreshold();
  const freeShippingLabel = freeShippingThreshold.toLocaleString('en-US');

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="drip-hero-gradient">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-up">
              <div className="drip-badge drip-badge-purple">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">New Collection 2026</span>
              </div>
              
              <h1 className="font-display text-5xl lg:text-7xl font-bold tracking-tight">
                <span className="block">Elevate Your</span>
                <span className="drip-gradient-text">Street Style</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg">
                Premium streetwear designed for those who dare to stand out. 
                Bold designs, quality materials, endless confidence.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/shop">
                  <Button variant="hero" size="xl">
                    Shop Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/shop?category=Products">
                  <Button variant="heroOutline" size="xl">
                    View Products
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative z-10 grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <img
                      src="https://ik.imagekit.io/u0uzeoqia/AmplifyLeggingBlack3_25e0933f-d3e2-40e8-972d-22716d14d0b0.webp"
                      alt="Tops & more"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <img
                      src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600"
                      alt="Pants"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <img
                      src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600"
                      alt="Leggings"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <img
                      src="https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600"
                      alt="Pants"
                      className="w-full h-64 object-cover"
                    />
                  </div>
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




