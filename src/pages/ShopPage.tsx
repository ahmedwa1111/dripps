import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category') || undefined;
  const searchQuery = searchParams.get('q') || '';
  const [showFilters, setShowFilters] = useState(false);

  const { data: products = [], isLoading } = useProducts({
    categorySlug,
    search: searchQuery || undefined,
  });
  const { data: categories = [] } = useCategories();

  // Filter out removed categories
  const filteredCategories = categories.filter(c => c.slug !== 'accessories' && c.slug !== 'tops');

  const activeCategory = filteredCategories.find(c => c.slug === categorySlug);

  const handleCategoryChange = (slug: string | null) => {
    if (slug) {
      searchParams.set('category', slug);
    } else {
      searchParams.delete('category');
    }
    setSearchParams(searchParams);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl lg:text-5xl font-bold">
            {activeCategory ? activeCategory.name : 'All Products'}
          </h1>
          {activeCategory && (
            <p className="text-muted-foreground mt-2">{activeCategory.description}</p>
          )}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 glass-card p-4">
          {/* Filter Toggle (Mobile) */}
          <Button
            variant="outline"
            className="md:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>

          {/* Category Pills (Desktop) */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto">
            <Button
              variant={!categorySlug ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange(null)}
            >
              All
            </Button>
            {filteredCategories.map((category) => (
              <Button
                key={category.id}
                variant={categorySlug === category.slug ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(category.slug)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Mobile Filters */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300 mb-6',
            showFilters ? 'max-h-96' : 'max-h-0'
          )}
        >
          <div className="p-4 glass-card space-y-4">
            <h3 className="font-display font-semibold">Categories</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!categorySlug ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(null)}
              >
                All
              </Button>
              {filteredCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={categorySlug === category.slug ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryChange(category.slug)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-6">
          {products.length} product{products.length !== 1 ? 's' : ''} found
        </p>

        {/* Products Grid */}
        <ProductGrid products={products} loading={isLoading} />
      </div>
    </MainLayout>
  );
}
