import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem } from '@/types';
import { toast } from 'sonner';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, size?: string, color?: string) => void;
  removeItem: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'drippss-cart';

// Helper to create a unique key for cart items (product + size + color)
const getCartItemKey = (productId: string, size?: string, color?: string) =>
  `${productId}::${size ?? 'nosize'}::${color ?? 'nocolor'}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, quantity = 1, size?: string, color?: string) => {
    setItems(prev => {
      // Find existing item with same product AND size
      const existingItem = prev.find(
        item => item.product.id === product.id && item.size === size && item.color === color
      );
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        const label = [size, color].filter(Boolean).join(', ');
        
        toast.success(`Updated ${product.name}${label ? ` (${label})` : ''} quantity`);
        return prev.map(item =>
          item.product.id === product.id && item.size === size && item.color === color
            ? { ...item, quantity: newQuantity }
            : item
        );
      }

      const label = [size, color].filter(Boolean).join(', ');
      toast.success(`Added ${product.name}${label ? ` (${label})` : ''} to cart`);
      return [...prev, { product, quantity, size, color }];
    });
  };

  const removeItem = (productId: string, size?: string, color?: string) => {
    setItems(prev => {
      const item = prev.find(
        i => i.product.id === productId && i.size === size && i.color === color
      );
      if (item) {
        const label = [size, color].filter(Boolean).join(', ');
        toast.success(`Removed ${item.product.name}${label ? ` (${label})` : ''} from cart`);
      }
      return prev.filter(
        item => !(item.product.id === productId && item.size === size && item.color === color)
      );
    });
  };

  const updateQuantity = (productId: string, quantity: number, size?: string, color?: string) => {
    if (quantity < 1) {
      removeItem(productId, size, color);
      return;
    }

    setItems(prev => {
      return prev.map(item =>
        item.product.id === productId && item.size === size && item.color === color
          ? { ...item, quantity }
          : item
      );
    });
  };

  const clearCart = () => {
    setItems([]);
    toast.success('Cart cleared');
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      subtotal,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
