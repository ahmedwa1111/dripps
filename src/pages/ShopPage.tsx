import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category') || undefined;
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      searchParams.set('q', searchQuery);
    } else {
      searchParams.delete('q');
    }
    setSearchParams(searchParams);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSearchParams({});
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
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
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </form>

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
              variant={!categorySlug ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange(null)}
            >
              All
            </Button>
            {filteredCategories.map((category) => (
              <Button
                key={category.id}
                variant={categorySlug === category.slug ? 'default' : 'outline'}
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
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <h3 className="font-display font-semibold">Categories</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!categorySlug ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(null)}
              >
                All
              </Button>
              {filteredCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={categorySlug === category.slug ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryChange(category.slug)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(categorySlug || searchParams.get('q')) && (
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {categorySlug && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCategoryChange(null)}
              >
                {activeCategory?.name}
                <X className="h-3 w-3 ml-1" />
              </Button>
            )}
            {searchParams.get('q') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  searchParams.delete('q');
                  setSearchParams(searchParams);
                }}
              >
                "{searchParams.get('q')}"
                <X className="h-3 w-3 ml-1" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

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
