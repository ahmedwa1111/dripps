import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/contexts/FavoritesContext";
import { formatCurrency } from "@/lib/utils";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";

export default function FavoritesPage() {
  const { favorites, favoritesCount, removeFavorite } = useFavorites();

  if (favoritesCount === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white border border-gray-200">
              <Heart className="h-10 w-10 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-4">No favorites yet</h1>
            <p className="text-muted-foreground mb-8">
              Save the pieces you love and build your wish list. Your picks stay here.
            </p>
            <Link to="/shop">
              <Button variant="hero" size="lg">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Start Exploring
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold">Favorites</h1>
            <p className="text-muted-foreground mt-2">
              {favoritesCount} item{favoritesCount !== 1 ? "s" : ""} saved
            </p>
          </div>
          <Link to="/shop">
            <Button variant="ghost">Keep Shopping</Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {favorites.map((favorite) => {
            const productLink = favorite.slug ? `/product/${favorite.slug}` : "/shop";
            return (
              <div
                key={favorite.id}
                className="glass-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              >
                <Link
                  to={productLink}
                  className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-muted"
                >
                  <img
                    src={favorite.image_url || "/placeholder.svg"}
                    alt={favorite.name}
                    className="h-full w-full object-cover"
                  />
                </Link>

                <div className="flex-1">
                  {favorite.category && (
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {favorite.category.name}
                    </p>
                  )}
                  <Link
                    to={productLink}
                    className="mt-1 block font-display text-lg font-semibold hover:text-primary transition-colors"
                  >
                    {favorite.name}
                  </Link>
                  {typeof favorite.price === "number" && (
                    <p className="mt-2 font-display text-lg font-bold text-primary">
                      {formatCurrency(favorite.price)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                  <Link to={productLink}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFavorite(favorite.id)}
                    aria-label="Remove favorite"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
