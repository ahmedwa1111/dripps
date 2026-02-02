import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductSlider } from '@/components/product/ProductSlider';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ArrowRight, Truck, Shield, RotateCcw, Sparkles } from 'lucide-react';

export default function HomePage() {
  const { data: featuredProducts = [], isLoading: loadingProducts } = useProducts({ featured: true });
  const { data: allProducts = [] } = useProducts({});
  const { data: categories = [] } = useCategories();

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden drip-hero-gradient">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
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
              <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-secondary/20 rounded-full blur-3xl" />
              <div className="relative z-10 grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden shadow-drip-lg transform hover:scale-105 transition-transform">
                    <img
                      src="https://ik.imagekit.io/u0uzeoqia/AmplifyLeggingBlack3_25e0933f-d3e2-40e8-972d-22716d14d0b0.webp"
                      alt="Tops & more"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-drip-lg transform hover:scale-105 transition-transform">
                    <img
                      src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600"
                      alt="Pants"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="rounded-2xl overflow-hidden shadow-drip-lg transform hover:scale-105 transition-transform">
                    <img
                      src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600"
                      alt="Leggings"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-drip-lg transform hover:scale-105 transition-transform">
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
      <section className="border-y border-border bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Fast Shipping</h3>
                <p className="text-sm text-muted-foreground">On orders over 1,500 L.E.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20">
                <RotateCcw className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Easy Returns</h3>
                <p className="text-sm text-muted-foreground">30-day return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
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
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/shop?category=${category.slug}`}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl"
              >
                <img
                  src={category.image_url || '/placeholder.svg'}
                  alt={category.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display text-2xl font-bold text-background">{category.name}</h3>
                  <p className="text-background/70 text-sm mt-1">{category.description}</p>
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
        className="bg-muted/30"
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

      {/* CTA Section */}
      <section className="py-20 bg-foreground text-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl lg:text-5xl font-bold mb-6">
            Join the <span className="text-primary">Drip</span><span className="text-secondary">pss</span> Family
          </h2>
          <p className="text-background/70 text-lg mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter and get 10% off your first order, 
            plus exclusive access to new drops and special offers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg bg-background/10 border border-background/20 text-background placeholder:text-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button variant="hero" size="lg">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
