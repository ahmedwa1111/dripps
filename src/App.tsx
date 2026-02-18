import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider as LegacyAuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AnalyticsSessionTracker } from "@/components/AnalyticsSessionTracker";
import { AuthProvider as SupabaseAuthProvider } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { supabase } from "@/lib/supabase";

// User pages
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import OrderInvoicePage from "./pages/OrderInvoicePage";
import PaymentResultPage from "./pages/PaymentResultPage";
import FavoritesPage from "./pages/FavoritesPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminOrderDetailsPage from "./pages/admin/AdminOrderDetailsPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import AdminCouponDetailsPage from "./pages/admin/AdminCouponDetailsPage";

const queryClient = new QueryClient();

function HomeRouteGate() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setIsAuthenticated(false);
          setCheckingSession(false);
          return;
        }

        setIsAuthenticated(Boolean(data.session?.user));
        setCheckingSession(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setIsAuthenticated(false);
        setCheckingSession(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <HomePage />;
  }

  return <HomePage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SupabaseAuthProvider>
      <LegacyAuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AnalyticsSessionTracker />
                <ScrollToTop />
                <Routes>
                  {/* User Routes */}
                  <Route path="/" element={<HomeRouteGate />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/product/:slug" element={<ProductPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/payment-result" element={<PaymentResultPage />} />
                  <Route path="/login" element={<Navigate to="/auth" replace />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/order/:id" element={<OrderInvoicePage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsPage />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/products" element={<AdminProductsPage />} />
                  <Route path="/admin/orders" element={<AdminOrdersPage />} />
                  <Route path="/admin/orders/:id" element={<AdminOrderDetailsPage />} />
                  <Route path="/admin/categories" element={<AdminCategoriesPage />} />
                  <Route path="/admin/coupons" element={<AdminCouponsPage />} />
                  <Route path="/admin/coupons/:id" element={<AdminCouponDetailsPage />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </FavoritesProvider>
        </CartProvider>
      </LegacyAuthProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
);

export default App;
