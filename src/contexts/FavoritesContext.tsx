import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/types";

const STORAGE_KEY = "drippss_favorites_v1";

export interface FavoriteItem {
  id: string;
  name: string;
  slug?: string;
  price?: number;
  image_url?: string | null;
  category?: {
    name: string;
    slug: string;
  };
}

interface FavoritesContextValue {
  favorites: FavoriteItem[];
  favoritesCount: number;
  addFavorite: (product: Product) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (product: Product) => void;
  isFavorite: (id: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

const normalizeFavorite = (product: Product): FavoriteItem => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  price: Number(product.price ?? 0),
  image_url: product.image_url ?? null,
  category: product.category
    ? { name: product.category.name, slug: product.category.slug }
    : undefined,
});

const loadFavorites = (): FavoriteItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
};

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => loadFavorites());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Ignore write errors (private mode, quota).
    }
  }, [favorites]);

  const value = useMemo<FavoritesContextValue>(() => {
    const addFavorite = (product: Product) => {
      setFavorites((prev) => {
        if (prev.some((item) => item.id === product.id)) return prev;
        return [normalizeFavorite(product), ...prev];
      });
    };

    const removeFavorite = (id: string) => {
      setFavorites((prev) => prev.filter((item) => item.id !== id));
    };

    const toggleFavorite = (product: Product) => {
      setFavorites((prev) => {
        const exists = prev.some((item) => item.id === product.id);
        if (exists) return prev.filter((item) => item.id !== product.id);
        return [normalizeFavorite(product), ...prev];
      });
    };

    const isFavorite = (id: string) => favorites.some((item) => item.id === id);

    return {
      favorites,
      favoritesCount: favorites.length,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      isFavorite,
    };
  }, [favorites]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
