import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem } from '@/types';
import { toast } from 'sonner';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, size?: string) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'drippss-cart';

// Helper to create a unique key for cart items (product + size)
const getCartItemKey = (productId: string, size?: string) => 
  size ? `${productId}-${size}` : productId;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, quantity = 1, size?: string) => {
    setItems(prev => {
      // Find existing item with same product AND size
      const existingItem = prev.find(
        item => item.product.id === product.id && item.size === size
      );
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        
        toast.success(`Updated ${product.name}${size ? ` (${size})` : ''} quantity`);
        return prev.map(item =>
          item.product.id === product.id && item.size === size
            ? { ...item, quantity: newQuantity }
            : item
        );
      }

      toast.success(`Added ${product.name}${size ? ` (${size})` : ''} to cart`);
      return [...prev, { product, quantity, size }];
    });
  };

  const removeItem = (productId: string, size?: string) => {
    setItems(prev => {
      const item = prev.find(
        i => i.product.id === productId && i.size === size
      );
      if (item) {
        toast.success(`Removed ${item.product.name}${size ? ` (${size})` : ''} from cart`);
      }
      return prev.filter(
        item => !(item.product.id === productId && item.size === size)
      );
    });
  };

  const updateQuantity = (productId: string, quantity: number, size?: string) => {
    if (quantity < 1) {
      removeItem(productId, size);
      return;
    }

    setItems(prev => {
      return prev.map(item =>
        item.product.id === productId && item.size === size
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
